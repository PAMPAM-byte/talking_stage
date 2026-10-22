import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {writeFileSync,unlinkSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {generateReply,providerSettings} from '../lib/ai/provider.mjs';
import {digest,reservationCost,reviewSignals} from './lib/cast-evaluation.mjs';

const pack=JSON.parse(await readFile('docs/cast-50/characters.json','utf8'));
assert.equal(pack.characters.length,50);
const folder='.local-services/conversation-live-review';
const ceiling=1_900_000,callCeiling=350;
const cases=['introduction','short-acknowledgement','name-and-flirt','mood-change','farewell','next-day-memory'];
const recheck=process.argv.includes('--recheck');
if(!process.argv.includes('--run')){
 console.log('Offline live-review plan: all 50 characters, six sequential synthetic turns each (300 calls), maximum 350 attempts/$1.90 including targeted rechecks. No network calls.');
 process.exit(0);
}
await mkdir(`${folder}/cli`,{recursive:true});
const lock=`${folder}/run.lock`;
writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});
process.on('exit',()=>{try{unlinkSync(lock);}catch{/* Never remove another process lock. */}});
const env=parseEnv(await readFile('.env.local','utf8'));
const settings=providerSettings(env);assert(settings,'Existing enabled provider required.');
const query=resolve(`${folder}/configuration.sql`);
await writeFile(query,'select enabled,model,max_input_tokens,max_output_tokens,input_micro_usd_per_million,output_micro_usd_per_million,project_daily_micro_usd,user_daily_micro_usd from private.ai_configuration where singleton;');
let configuration;
try{
 const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref','hoxeembcwureucdsssct','--output','json','--file',query],{windowsHide:true,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:60000});
 configuration=JSON.parse(output.slice(output.indexOf('{'))).rows[0];
}catch{throw new Error('Read-only evaluation configuration check unavailable; private diagnostics suppressed.');}
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,'https://hoxeembcwureucdsssct.supabase.co');
assert(configuration.enabled&&configuration.model===settings.model);
const cost=reservationCost(configuration);
assert(cost*callCeiling<=ceiling&&ceiling<=configuration.user_daily_micro_usd&&ceiling<=configuration.project_daily_micro_usd,'Evaluation must fit unchanged configured limits.');
const promptFiles=['provider.mjs','conversation-style.mjs','women-personalities.mjs','naija-exchanges.mjs','conversation-knowledge.mjs','lifestyle-personalities.mjs','conversation-timeline.mjs','dating-context.mjs'];
const promptFingerprint=digest((await Promise.all(promptFiles.map(file=>readFile(`lib/ai/${file}`,'utf8')))).join('\n'));
let state;
try{state=JSON.parse(await readFile(`${folder}/state.json`,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
state??={sourceFingerprint:pack.sourceFingerprint,promptFingerprint,startedAt:new Date().toISOString(),calls:0,reservedUpperBound:0,records:[]};
assert.equal(state.sourceFingerprint,pack.sourceFingerprint);
if(recheck){
 assert.equal(state.records.filter(r=>r.state==='completed').length,300,'Complete baseline before changing prompts.');
 state.recheckFingerprint??=promptFingerprint;
 assert.equal(state.recheckFingerprint,promptFingerprint,'Preserve the prospective recheck prompt.');
 state.rechecks??=[];
}else assert.equal(state.promptFingerprint,promptFingerprint,'Prompt changed: preserve baseline and use a separate targeted recheck.');
let saving=Promise.resolve();
function save(){const data=JSON.stringify(state,null,2)+'\n';saving=saving.then(()=>writeFile(`${folder}/state.json`,data,{mode:0o600}));return saving;}
await save();
let stopped=false;
async function review(character){
 const userName=character.profile.gender==='man'?'Ada':'Tobi';
 const inputs=['Hi','okay',`My name is ${userName}. You seem like someone I could enjoy talking to, you know.`,'I am a bit low today. Just wanted some company, not advice.','I need to sleep now. Goodnight.',"Hey, I'm back. Do you remember my name? How was your day yesterday?"];
 const history=[];
 for(let index=0;index<cases.length;index++){
  if(stopped)return;
  const existing=state.records.find(row=>row.key===character.key&&row.caseId===cases[index]);
  if(existing){
   if(existing.state!=='completed')return;
   history.push({role:'user',text:existing.input,created_at:existing.sentAt},{role:'character',text:existing.output,created_at:existing.sentAt});continue;
  }
  if(index===5)for(const message of history)message.created_at=new Date(Date.now()-86400000).toISOString();
  const sentAt=new Date().toISOString();
  history.push({role:'user',text:inputs[index],created_at:sentAt});
  assert(state.calls<callCeiling&&state.reservedUpperBound+cost<=ceiling);
  const record={key:character.key,name:character.profile.name,caseId:cases[index],input:inputs[index],sentAt,state:'started',promptFingerprint};
  state.records.push(record);state.calls++;state.reservedUpperBound+=cost;await save();
  const start=performance.now();
  try{
   const reply=await generateReply({character:{name:character.profile.name,gender:character.profile.gender,direction:character.direction},preferences:{language:'english'},history,memories:[],photos:[],userTimeZone:'Africa/Lagos',maxInputTokens:configuration.max_input_tokens,maxOutputTokens:configuration.max_output_tokens},settings,{
    fetcher:async(url,options)=>{
     assert.equal(url,'https://api.anthropic.com/v1/messages');
     const response=await fetch(url,options);record.httpStatus=response.status;
     if(response.ok){const body=await response.clone().json();record.usage=Object.fromEntries(['input_tokens','output_tokens','cache_creation_input_tokens','cache_read_input_tokens'].filter(k=>Number.isSafeInteger(body.usage?.[k])).map(k=>[k,body.usage[k]]));}
     return response;
    }
   });
   record.state=reply.refused?'refused':'completed';record.output=reply.text;record.signals=reviewSignals(reply.text);
   history.push({role:'character',text:reply.text,created_at:sentAt});
  }catch(error){record.state=['timeout','provider_error','invalid_output','prompt_too_large'].includes(error.code)?error.code:'evaluation_error';stopped=true;}
  record.elapsedMs=Math.round(performance.now()-start);record.finishedAt=new Date().toISOString();await save();
  if(record.state!=='completed'){stopped=true;console.log(`Review stopped: ${character.profile.name}/${cases[index]}: ${record.state}. No paid retry.`);return;}
 }
 console.log(`${state.records.filter(r=>r.state==='completed').length}/300 completed; ${character.profile.name} reviewed; reserved upper bound $${(state.reservedUpperBound/1e6).toFixed(4)}.`);
}
async function targetedReview(character,index){
 if(state.rechecks.some(r=>r.key===character.key))return;
 const baseline=state.records.filter(r=>r.key===character.key);
 const returnOutput=baseline.find(r=>r.caseId==='next-day-memory')?.output??'';
 const returnFailure=/don't have a real day|can't pull up|don't have yesterday|don't have one to recount/iu.test(returnOutput);
 const caseId=returnFailure?'next-day-memory':index%2===0?'short-acknowledgement':index%4===1?'mood-change':'next-day-memory';
 const history=[];
 if(caseId==='short-acknowledgement')history.push({role:'user',text:'How about your day?'},{role:'character',text:'Mostly work, then a quiet evening. Nothing dramatic.'});
 else for(const row of baseline.slice(0,cases.indexOf(caseId)))history.push({role:'user',text:row.input,created_at:new Date(Date.now()-86400000).toISOString()},{role:'character',text:row.output,created_at:new Date(Date.now()-86400000).toISOString()});
 const input=baseline.find(r=>r.caseId===caseId).input;
 history.push({role:'user',text:input,created_at:new Date().toISOString()});
 const record={key:character.key,name:character.profile.name,caseId,input,state:'started',promptFingerprint};
 assert(state.calls<callCeiling&&state.reservedUpperBound+cost<=ceiling);
 state.calls++;state.reservedUpperBound+=cost;state.rechecks.push(record);await save();
 const start=performance.now();
 try{
  const reply=await generateReply({character:{name:character.profile.name,gender:character.profile.gender,direction:character.direction},preferences:{language:'english'},history,memories:[],photos:[],userTimeZone:'Africa/Lagos',maxInputTokens:configuration.max_input_tokens,maxOutputTokens:configuration.max_output_tokens},settings);
  record.output=reply.text;record.state=reply.refused?'refused':'completed';record.signals=reviewSignals(reply.text);
 }catch(error){record.state=['timeout','provider_error','invalid_output'].includes(error.code)?error.code:'evaluation_error';stopped=true;}
 record.elapsedMs=Math.round(performance.now()-start);record.finishedAt=new Date().toISOString();await save();
 if(record.state!=='completed')stopped=true;
 console.log(`Targeted recheck ${state.rechecks.filter(r=>r.state==='completed').length}/50: ${character.profile.name}/${caseId}: ${record.state}.`);
}
// Two independent synthetic threads; each character's turns stay sequential.
let next=0;
await Promise.all([0,1].map(async()=>{while(!stopped&&next<pack.characters.length){const index=next++;const character=pack.characters[index];if(recheck)await targetedReview(character,index);else await review(character);}}));
state.completedAt=state.records.filter(r=>r.state==='completed').length===300?new Date().toISOString():null;await save();
await mkdir('docs/cast-50/evaluations',{recursive:true});
await writeFile('docs/cast-50/evaluations/conversation-momentum.json',JSON.stringify({version:1,sourceFingerprint:state.sourceFingerprint,promptFingerprint:state.promptFingerprint,recheckFingerprint:state.recheckFingerprint??null,startedAt:state.startedAt,completedAt:state.completedAt,model:settings.model,scope:'Live model-level evaluation of 50 published source directions, six sequential synthetic turns each, plus up to one targeted recheck per character with separately fingerprinted guidance. Next-day return uses simulated timestamps. No user messages, database writes, account creation or setting changes. This does not test job persistence or rendering.',ceilingMicroUsd:ceiling,calls:state.calls,reservedMicroUsdUpperBound:state.reservedUpperBound,accounting:'Independent evaluation cap using unchanged configured worst-case rates; not application-ledger reservations or a provider invoice.',reviewerStatus:'pending_manual_review',records:state.records,rechecks:state.rechecks??[]},null,2)+'\n');
console.log(`Live review checkpoint: ${state.records.filter(r=>r.state==='completed').length}/300 completed. No automatic paid retries.`);
if(stopped)process.exitCode=1;

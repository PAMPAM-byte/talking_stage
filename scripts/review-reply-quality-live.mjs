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
const folder='.local-services/reply-quality-review';
const ceiling=850_000,callCeiling=150;
const cases=['acknowledgement','company','return'];
if(!process.argv.includes('--run')){
 console.log('Offline quality review: all 50 characters, three targeted contexts each; maximum 150 attempts/$0.85. No network calls.');
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
const promptFiles=['provider.mjs','conversation-style.mjs','reply-quality.mjs','reply-cleanup.mjs','women-personalities.mjs','naija-exchanges.mjs','conversation-knowledge.mjs','lifestyle-personalities.mjs','conversation-timeline.mjs','dating-context.mjs'];
const fingerprint=digest((await Promise.all(promptFiles.map(file=>readFile(`lib/ai/${file}`,'utf8')))).join('\n'));
const baseline=JSON.parse(await readFile('docs/cast-50/evaluations/conversation-momentum.json','utf8'));
assert.equal(baseline.sourceFingerprint,pack.sourceFingerprint);
let state;
try{state=JSON.parse(await readFile(`${folder}/state.json`,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
state??={startedAt:new Date().toISOString(),fingerprint,sourceFingerprint:pack.sourceFingerprint,calls:0,reservedUpperBound:0,records:[]};
if(state.fingerprint!==fingerprint&&process.argv.includes('--continue-with-revision')){
 for(const row of state.records)row.fingerprint??=state.fingerprint;
 state.previousFingerprints??=[];state.previousFingerprints.push(state.fingerprint);state.fingerprint=fingerprint;
}
assert.equal(state.fingerprint,fingerprint);assert.equal(state.sourceFingerprint,pack.sourceFingerprint);
let saving=Promise.resolve();
function save(){const content=JSON.stringify(state,null,2)+'\n';saving=saving.then(()=>writeFile(`${folder}/state.json`,content,{mode:0o600}));return saving;}
await save();
let stopped=false,next=0;
async function review(character){
 const rows=baseline.records.filter(row=>row.key===character.key);
 assert.equal(rows.length,6);
 for(const caseId of cases){
  if(stopped)return;
  if(state.records.some(row=>row.key===character.key&&row.caseId===caseId))continue;
  let history=[];
  if(caseId==='acknowledgement')history=[{role:'user',text:'How about your day?'},{role:'character',text:'Mostly work, then a quiet evening. Nothing dramatic.'},{role:'user',text:'okay'}];
  else{
   for(const row of rows.slice(0,caseId==='return'?5:3))history.push({role:'user',text:row.input},{role:'character',text:row.output});
   if(caseId==='company')history.push({role:'user',text:'No advice please.'},{role:'character',text:"I'm happy to keep you company. We can just sit quietly."},{role:'user',text:'I would like to keep talking.'},{role:'character',text:"I'm happy to keep you company. We can just sit quietly."});
   for(const message of history)message.created_at=new Date(Date.now()-86400000).toISOString();
   history.push({role:'user',text:rows.find(row=>row.caseId===(caseId==='return'?'next-day-memory':'mood-change')).input,created_at:new Date().toISOString()});
  }
  assert(state.calls<callCeiling&&state.reservedUpperBound+cost<=ceiling);
  const record={key:character.key,name:character.profile.name,caseId,input:history.at(-1).text,state:'started',history,fingerprint};
  state.calls++;state.reservedUpperBound+=cost;state.records.push(record);await save();
  const start=performance.now();
  try{
   const reply=await generateReply({character:{name:character.profile.name,gender:character.profile.gender,direction:character.direction},preferences:{language:'english_pidgin'},history,memories:[],photos:[],userTimeZone:'Africa/Lagos',maxInputTokens:configuration.max_input_tokens,maxOutputTokens:configuration.max_output_tokens},settings);
   record.output=reply.text;record.state=reply.refused?'refused':'completed';record.signals=reviewSignals(reply.text);
  }catch(error){record.state=['timeout','provider_error','invalid_output','context_limit'].includes(error.code)?error.code:'evaluation_error';stopped=true;}
  record.elapsedMs=Math.round(performance.now()-start);await save();
  if(record.state!=='completed'){stopped=true;console.log(`Quality check stopped at ${character.profile.name}/${caseId}: ${record.state}. No paid retry.`);return;}
 }
 console.log(`${state.records.filter(row=>row.state==='completed').length}/150 completed: ${character.profile.name}.`);
}
await Promise.all([0,1].map(async()=>{while(!stopped&&next<pack.characters.length)await review(pack.characters[next++]);}));
state.completedAt=state.records.filter(row=>row.state==='completed').length===150?new Date().toISOString():null;await save();
await writeFile('docs/cast-50/evaluations/reply-quality.json',JSON.stringify({...state,ceilingMicroUsd:ceiling,scope:'Live model-level targeted contexts for every character: plain acknowledgement, repeated company assurances, and next-day name recall/day question. Synthetic histories and dates; no production messages, account changes, automatic paid retry or runtime-limit changes. Some histories intentionally contain prior bad replies.',reviewerStatus:'pending_agent_review'},null,2)+'\n');
console.log(`Quality checkpoint: ${state.records.filter(row=>row.state==='completed').length}/150 completed; reserved upper bound $${(state.reservedUpperBound/1e6).toFixed(4)}.`);
if(stopped)process.exitCode=1;

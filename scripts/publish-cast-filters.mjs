import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {writeFileSync,unlinkSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {loadRoster} from './build-cast-roster.mjs';
import {discoveryIdentityDirection} from '../lib/ai/discovery-identity.mjs';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';

const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`;
const runtime=parseEnv(await readFile('.env.local','utf8'));
const env=parseEnv(await readFile('.env.hosted.local','utf8'));
assert.equal(runtime.NEXT_PUBLIC_SUPABASE_URL,target);assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const pack=await loadRoster(),assignment=JSON.parse(await readFile('docs/cast-50/discovery-profiles.json','utf8'));
const receipt=JSON.parse(await readFile('docs/cast-50/publication.json','utf8'));
assert.equal(receipt.target,target);assert.equal(Object.keys(receipt.keys).length,50);
const folder='.local-services/cast-filters';await mkdir(`${folder}/cli`,{recursive:true});
const lock=`${folder}/publish.lock`;writeFileSync(lock,String(process.pid),{flag:'wx'});
process.on('exit',()=>{try{unlinkSync(lock);}catch{/* Preserve explicit lock inspection after forced exit. */}});
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ids=Object.values(receipt.keys);for(const id of ids)assert.match(id,/^[a-f0-9-]{36}$/i);
async function sql(query){
 const file=resolve(`${folder}/operator.sql`);await writeFile(file,query,{mode:0o600});
 try{const raw=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',file],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:8*1024*1024});return JSON.parse(raw.slice(raw.indexOf('{'))).rows;}
 catch{throw Error('Cast filter operation unavailable; private diagnostics suppressed.');}
}
const readSql=`select c.id,c.status,d.profile,d.direction,d.version,p.direction as published_direction,jsonb_build_object('name',c.name,'age',c.age,'gender',c.gender,'fictionalLocation',c.fictional_location,'occupation',c.occupation,'bio',c.bio,'conversationClue',c.conversation_clue,'interests',c.interests,'personalityTags',c.personality) as public_profile from public.characters c join private.cast_drafts d on d.character_id=c.id join private.character_direction p on p.character_id=c.id where c.id in (${ids.map(id=>`'${id}'`).join(',')});`;
const current=await sql(readSql);assert.equal(current.length,50);
let state;try{state=JSON.parse(await readFile(`${folder}/state.json`,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(!state){
 for(const row of current){assert.equal(row.status,'published');assert.deepEqual(row.profile,row.public_profile,'Unpublished profile edit must not be overwritten');assert.equal(row.direction,row.published_direction,'Unpublished direction edit must not be overwritten');}
 const key=await readFile('.local-services/hosted-privacy/encryption.key');
 const baseline={project,version:1,kind:'cast-filter-identity-revision',rows:current,receipt};
 const bytes=encryptBundle(baseline,key,project);await writeFile(`${folder}/baseline.tshback`,bytes,{flag:'wx',mode:0o600});assert.deepEqual(decryptBundle(bytes,key,project),baseline);
 state={target,sourceFingerprint:pack.sourceFingerprint,baselineHash:fingerprint([...bytes]),actors:[],completed:[]};
 await writeFile(`${folder}/state.json`,JSON.stringify(state,null,2));
}
assert.equal(state.target,target);assert.equal(state.sourceFingerprint,pack.sourceFingerprint,'Source changed after preparation');
const bytes=await readFile(`${folder}/baseline.tshback`);assert.equal(fingerprint([...bytes]),state.baselineHash);
const baseline=decryptBundle(bytes,await readFile('.local-services/hosted-privacy/encryption.key'),project);
const desired=pack.characters.map(c=>{
 const original=baseline.rows.find(row=>row.id===receipt.keys[c.key]);assert(original);
 assert.equal(original.profile.name,c.profile.name);
 const profile={...original.profile,personalityTags:c.profile.personalityTags,interests:c.profile.interests};
 const block=discoveryIdentityDirection(profile,assignment.characters.find(row=>row.key===c.key));
 const direction=original.direction.replace(/\n?\[Discovery identity v1\][\s\S]*?\[\/Discovery identity\]/gu,'')+'\n'+block;
 assert(direction.length<=12000);
 return {key:c.key,id:original.id,profile,direction,original};
});
if(!process.argv.includes('--publish')){console.log('Read-only filter preflight passed: 50 published baselines match, scoped profile/direction patches prepared and encrypted snapshot verified. No hosted writes.');process.exit(0);}
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(target,env.SUPABASE_SERVICE_ROLE_KEY,options),admin=createClient(target,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
function checked(result){if(result.error||result.data?.error)throw Error('Versioned cast command failed; checkpoint retained and no automatic mutation retry.');return result.data;}
async function save(){await writeFile(`${folder}/state.json`,JSON.stringify(state,null,2));}
async function cleanup(){if(!state.actors.length)return;for(const id of state.actors)assert.match(id,/^[a-f0-9-]{36}$/);await sql(`begin;delete from private.user_roles where user_id in (${state.actors.map(id=>`'${id}'`).join(',')});update auth.users set banned_until=now()+interval '100 years' where id in (${state.actors.map(id=>`'${id}'`).join(',')}) and email like 'cast-filters-%@example.test';commit;select count(*) as n from private.user_roles where user_id in (${state.actors.map(id=>`'${id}'`).join(',')});`);}
await cleanup();let actor;
try{
 const email=`cast-filters-${randomUUID()}@example.test`,password=`Ts!${randomUUID()}Aa9`;
 actor=checked(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1',synthetic_cast_maintenance:true}})).user.id;
 state.actors.push(actor);await save();checked(await admin.auth.signInWithPassword({email,password}));
 checked(await admin.rpc('save_preferences',{p_name:'Cast filter maintenance',p_genders:['woman','man'],p_language:'english',p_requests:false,p_version:1}));
 checked(await admin.rpc('complete_onboarding',{p_version:2,p_consent:true}));
 await sql(`insert into private.user_roles(user_id,role) values('${actor}','admin');select count(*) as n from private.user_roles where user_id='${actor}';`);
 const drafts=checked(await admin.rpc('admin_list_cast'));
 let start=Date.now(),mutations=0;
 async function command(operation,args){
  if(mutations>=22){while(Date.now()-start<62000){console.log('Waiting for the existing admin rate window.');await new Promise(resolve=>setTimeout(resolve,Math.min(20000,62000-(Date.now()-start))));}start=Date.now();mutations=0;}
  mutations++;return checked(await admin.rpc('admin_cast_command',{p_operation:operation,...args}));
 }
 for(const c of desired){
  const row=drafts.find(row=>row.id===c.id);assert(row);assert.equal(row.status,'published');let version=row.version;
  const original=row.direction===c.original.direction&&fingerprint(row.profile)===fingerprint(c.original.profile);
  const already=row.direction===c.direction&&fingerprint(row.profile)===fingerprint(c.profile);
  assert(original||already,'Outside cast edit detected; do not overwrite');
  if(!already){assert.equal(version,c.original.version);await command('cast.save_draft',{p_id:c.id,p_version:version,p_profile:c.profile,p_direction:c.direction});version++;}
  if(!state.completed.includes(c.key)){await command('cast.publish',{p_id:c.id,p_version:version,p_attested:true});state.completed.push(c.key);await save();}
  console.log(`${state.completed.length}/50 ${c.profile.name}: filters and individual expression published.`);
 }
 const final=await sql(readSql);
 for(const c of desired){const row=final.find(row=>row.id===c.id);assert.deepEqual(row.public_profile,c.profile);assert.equal(row.published_direction,c.direction);assert.equal(row.direction,c.direction);}
 const counts=(await sql("select (select count(*) from public.characters where status='published') as profiles,(select count(*) from public.character_assets where published and review_state='approved') as photos;"))[0];assert.equal(Number(counts.profiles),50);assert.equal(Number(counts.photos),100);
 await sql(`delete from private.user_roles where user_id='${actor}';select count(*) as n from private.user_roles where user_id='${actor}';`);
 for(const tag of [...new Set(pack.characters.flatMap(c=>c.profile.personalityTags))]){
  const result=checked(await admin.rpc('discover_cast',{p_page:1,p_personality:tag}));
  assert.equal(result.total,pack.characters.filter(c=>c.profile.personalityTags.includes(tag)).length);
  assert(result.characters.every(c=>c.personality.includes(tag)));
 }
 for(const interest of [...new Set(pack.characters.flatMap(c=>c.profile.interests))]){
  const result=checked(await admin.rpc('discover_cast',{p_page:1,p_interest:interest}));
  assert.equal(result.total,pack.characters.filter(c=>c.profile.interests.includes(interest)).length);
 }
 for(const [personality,interest,gender]of [['baddie','beauty','woman'],['reserved','books','woman'],['playful','football','man'],['Sugar daddy personality','jazz','man'],['warm','cooking','woman'],['baddie','cars','woman']]){
  const result=checked(await admin.rpc('discover_cast',{p_page:1,p_personality:personality,p_interest:interest,p_gender:gender}));
  assert.equal(result.total,pack.characters.filter(c=>c.profile.gender===gender&&c.profile.personalityTags.includes(personality)&&c.profile.interests.includes(interest)).length);
 }
 const revision={version:1,completedAt:new Date().toISOString(),sourceFingerprint:pack.sourceFingerprint,profiles:50,photos:100,encryptedBaselineVerified:true,ordinaryAdultFilterCountsVerified:true,publishedDirectionsVerified:true};
 await writeFile('docs/cast-50/filter-publication.json',JSON.stringify(revision,null,2)+'\n');
 await writeFile('docs/cast-50/publication.json',JSON.stringify({...receipt,sourceFingerprint:pack.sourceFingerprint,latestDiscoveryRevision:revision},null,2)+'\n');
 console.log('Verified all 50 profiles, every personality/interest count and all private discovery identities; 100 photos and conversation IDs preserved.');
}finally{if(actor)await cleanup();}

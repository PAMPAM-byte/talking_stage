import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {writeFileSync,unlinkSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {parseEnv,isDeepStrictEqual} from 'node:util';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {inspectImage} from '../lib/backend/inspect-image.ts';
import {encryptBundle,decryptBundle} from './lib/hosted-backup-crypto.mjs';

const project='hoxeembcwureucdsssct',target=`https://${project}.supabase.co`;
const env=parseEnv(await readFile('.env.hosted.local','utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,target);assert.equal(parseEnv(await readFile('.env.local','utf8')).NEXT_PUBLIC_SUPABASE_URL,target);
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
const expansion=process.argv.includes('--expansion');
const selected=expansion?['char-damilola','char-zainab','char-nimi','char-kiki','char-naomi','char-hauwa']:['char-tomi','char-ranti','char-adanna','char-lola'];
const expected=selected.length;
const allImages=JSON.parse(await readFile('docs/cast-50/lifestyle-images.json','utf8'));
const manifest={...allImages,photos:Object.fromEntries(Object.entries(allImages.photos).filter(([,record])=>selected.includes(record.key)))};
const receipt=JSON.parse(await readFile('docs/cast-50/publication.json','utf8'));assert.equal(receipt.target,target);
const hash=value=>createHash('sha256').update(value).digest('hex');
const photos=[];
for(const record of Object.values(manifest.photos)){
 assert.equal(record.slot,'portrait');assert.equal(record.visualReview,'passed');
 const bytes=await readFile(record.original);assert.equal(hash(bytes),record.sourceHash);
 const image=await inspectImage(bytes),id=receipt.keys[record.key];assert.match(id,/^[a-f0-9-]{36}$/);
 photos.push({...record,characterId:id,image,hash:hash(image.original)});
}
assert.equal(photos.length,expected,'Review every selected identity-preserving image before publication');
const folder=expansion?'.local-services/lifestyle-photos-sixteen':'.local-services/lifestyle-photos';await mkdir(`${folder}/cli`,{recursive:true});
const lock=`${folder}/publish.lock`;writeFileSync(lock,String(process.pid),{flag:'wx'});
process.on('exit',()=>{try{unlinkSync(lock);}catch{/* Do not remove a different process lock. */}});
async function sql(query){
 const path=resolve(`${folder}/operation.sql`);await writeFile(path,query,{mode:0o600});
 try{const raw=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:4*1024*1024});return JSON.parse(raw.slice(raw.indexOf('{'))).rows;}
 catch{throw Error('Lifestyle photo operation unavailable; private connection diagnostics suppressed.');}
}
const ids=photos.map(row=>`'${row.characterId}'`).join(',');
const readSql=`select c.id,c.status,d.profile,d.direction,d.version,p.direction as published_direction,(select jsonb_agg(to_jsonb(a)) from public.character_assets a where a.character_id=c.id and a.published) as assets from public.characters c join private.cast_drafts d on d.character_id=c.id join private.character_direction p on p.character_id=c.id where c.id in (${ids});`;
const current=await sql(readSql);assert.equal(current.length,expected);
let state;try{state=JSON.parse(await readFile(`${folder}/state.json`,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(!state){
 for(const row of current){assert.equal(row.status,'published');assert.equal(row.assets.filter(a=>a.slot==='portrait').length,1);}
 const baseline={version:1,project,kind:'lifestyle-portrait-revision',rows:current,receipt};
 const key=await readFile('.local-services/hosted-privacy/encryption.key'),encrypted=encryptBundle(baseline,key,project);assert.deepEqual(decryptBundle(encrypted,key,project),baseline);
 await writeFile(`${folder}/baseline.tshback`,encrypted,{flag:'wx',mode:0o600});
 state={project,manifestHash:hash(JSON.stringify(manifest)),baselineHash:hash(encrypted),actors:[],assets:Object.fromEntries(photos.map(row=>[row.key,{id:randomUUID(),hash:row.hash}])),completed:[]};
 await writeFile(`${folder}/state.json`,JSON.stringify(state,null,2));
}
assert.equal(state.project,project);assert.equal(state.manifestHash,hash(JSON.stringify(manifest)));
const encrypted=await readFile(`${folder}/baseline.tshback`);assert.equal(hash(encrypted),state.baselineHash);
const baseline=decryptBundle(encrypted,await readFile('.local-services/hosted-privacy/encryption.key'),project);
for(const row of current){const previous=baseline.rows.find(item=>item.id===row.id),photo=photos.find(item=>item.characterId===row.id);assert(isDeepStrictEqual(row.profile,previous.profile));assert.equal(row.direction,previous.direction);assert.equal(row.published_direction,previous.published_direction);assert.equal(row.version,previous.version);if(!state.completed.includes(photo.key))assert.deepEqual([...row.assets].sort((a,b)=>a.id.localeCompare(b.id)),[...previous.assets].sort((a,b)=>a.id.localeCompare(b.id)),'Outside photo edit or partial publication requires inspection before resuming');}
if(!process.argv.includes('--publish')){console.log('Read-only preflight passed: selected visually reviewed, decoded portraits; encrypted snapshot verified; profiles and directions unchanged. No hosted writes.');process.exit(0);}
const options={auth:{persistSession:false,autoRefreshToken:false}},service=createClient(target,env.SUPABASE_SERVICE_ROLE_KEY,options),admin=createClient(target,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
function checked(result){if(result.error||result.data?.error)throw Error('Versioned photo operation failed; checkpoint retained without automatic mutation retry.');return result.data;}
const save=()=>writeFile(`${folder}/state.json`,JSON.stringify(state,null,2));
async function cleanup(){if(!state.actors.length)return;for(const id of state.actors)assert.match(id,/^[a-f0-9-]{36}$/);await sql(`begin;delete from private.user_roles where user_id in (${state.actors.map(id=>`'${id}'`).join(',')});update auth.users set banned_until=now()+interval '100 years' where id in (${state.actors.map(id=>`'${id}'`).join(',')}) and email like 'lifestyle-photos-%@example.test';commit;select true as cleaned;`);}
await cleanup();let actor;
try{
 const email=`lifestyle-photos-${randomUUID()}@example.test`,password=`Ts!${randomUUID()}Aa9`;
 actor=checked(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1',synthetic_cast_maintenance:true}})).user.id;state.actors.push(actor);await save();
 checked(await admin.auth.signInWithPassword({email,password}));
 checked(await admin.rpc('save_preferences',{p_name:'Lifestyle photo maintenance',p_genders:['woman'],p_language:'english',p_requests:false,p_version:1}));checked(await admin.rpc('complete_onboarding',{p_version:2,p_consent:true}));
 assert.match(actor,/^[a-f0-9-]{36}$/);await sql(`insert into private.user_roles(user_id,role) values('${actor}','admin');select true as ready;`);
 const command=async(operation,args)=>checked(await admin.rpc('admin_cast_command',{p_operation:operation,...args}));
 for(const photo of photos){
  const stored=state.assets[photo.key];assert.equal(stored.hash,photo.hash);assert.match(stored.id,/^[a-f0-9-]{36}$/);
  const assets=checked(await admin.rpc('admin_list_assets',{p_character:photo.characterId}));
  const previous=baseline.rows.find(row=>row.id===photo.characterId).assets.find(row=>row.slot==='portrait');
  const original=assets.find(row=>row.id===previous.id);assert(original);if(original.published)assert.equal(original.version,previous.version,'Outside portrait edit');
  let asset=assets.find(row=>row.id===stored.id);
  if(!asset){
   await command('asset.reserve_upload',{p_id:photo.characterId});
   for(const file of [{name:'original',bytes:photo.image.original},...photo.image.variants.map(v=>({name:String(v.width),bytes:v.bytes}))]){
    const path=`${photo.characterId}/${stored.id}/${file.name}.webp`;
    const existing=await service.storage.from('cast-private').download(path);
    if(existing.data)assert.equal(hash(Buffer.from(await existing.data.arrayBuffer())),hash(file.bytes));
    else checked(await service.storage.from('cast-private').upload(path,file.bytes,{contentType:'image/webp',upsert:false}));
   }
   checked(await service.rpc('register_inspected_asset',{p_id:stored.id,p_character:photo.characterId,p_actor:actor,p_slot:'portrait',p_alt:photo.altText,p_width:photo.image.width,p_height:photo.image.height,p_hash:photo.hash}));
   asset=checked(await admin.rpc('admin_list_assets',{p_character:photo.characterId})).find(row=>row.id===stored.id);
  }
  assert(asset&&asset.source_hash===photo.hash&&asset.review_state!=='rejected');
  if(asset.review_state!=='approved'){await command('asset.approved',{p_id:asset.id,p_version:asset.version,p_attested:true});asset={...asset,version:asset.version+1};}
  if(!asset.published)await command('asset.publish',{p_id:asset.id,p_version:asset.version});
  if(original.published){assert.equal(original.version,previous.version,'Outside portrait edit');await command('asset.approved',{p_id:original.id,p_version:original.version,p_attested:true});}
  if(!state.completed.includes(photo.key)){state.completed.push(photo.key);await save();}
  console.log(`${state.completed.length}/${expected} ${photo.key}: new portrait published; previous bytes retained.`);
 }
 const final=await sql(readSql);
 for(const row of final){const previous=baseline.rows.find(item=>item.id===row.id),photo=photos.find(item=>item.characterId===row.id);assert.deepEqual(row.profile,previous.profile);assert.equal(row.direction,previous.direction);assert.equal(row.published_direction,previous.published_direction);assert.equal(row.assets.filter(a=>a.slot==='portrait').length,1);assert(row.assets.some(a=>a.id===state.assets[photo.key].id&&a.source_hash===photo.hash));assert(row.assets.some(a=>previous.assets.some(old=>old.id===a.id&&old.slot==='gallery')));}
 const totals=(await sql("select (select count(*) from public.characters where status='published') as profiles,(select count(*) from public.character_assets where published and review_state='approved') as photos;"))[0];assert.equal(Number(totals.profiles),50);assert.equal(Number(totals.photos),100);
 await sql(`delete from private.user_roles where user_id='${actor}';select true as ordinary_adult;`);
 for(const photo of photos){const visible=checked(await admin.from('character_assets').select('id').eq('character_id',photo.characterId).eq('slot','portrait'));assert.equal(visible.length,1);assert.equal(visible[0].id,state.assets[photo.key].id);}
 const revision={version:1,completedAt:new Date().toISOString(),portraits:expected,profiles:50,photos:100,previousImagesRetained:true,unchangedProfilesAndDirections:true,ordinaryAdultVisibilityVerified:true,encryptedBaselineVerified:true};
 await writeFile(expansion?'docs/cast-50/lifestyle-sixteen-photo-publication.json':'docs/cast-50/lifestyle-photo-publication.json',JSON.stringify(revision,null,2)+'\n');await writeFile('docs/cast-50/publication.json',JSON.stringify({...receipt,[expansion?'latestLifestyleExpansionPhotoRevision':'latestLifestylePhotoRevision']:revision},null,2)+'\n');
 console.log('Verified selected new portraits as an ordinary adult; all 50 character identities, existing galleries and 100 active photos preserved.');
}finally{if(actor)await cleanup();}

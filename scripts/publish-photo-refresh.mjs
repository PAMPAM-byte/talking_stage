import assert from 'node:assert/strict';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {inspectImage} from '../lib/backend/inspect-image.ts';

const approval=JSON.parse(await readFile('docs/character-photo-refresh/review-status.json','utf8'));
assert.equal(approval.status,'reviewed');assert.equal(approval.replacements.length,24);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const prompts=JSON.parse(await readFile('docs/character-photo-refresh/prompts.json','utf8'));
const details=JSON.parse(await readFile('lib/mock/character-photo-details.json','utf8'));
const original=JSON.parse(await readFile('.local-services/approved-cast-import.json','utf8'));
const expanded=JSON.parse(await readFile('.local-services/expanded-cast-drafts.json','utf8'));
const previous={...original.characters,...expanded.characters};
const plan=[];
for(const p of prompts){
 const bytes=await readFile(p.output),hash=digest(bytes);
 assert(approval.replacements.some(a=>a.key===p.key&&a.slot===p.slot&&a.sourceHash===hash),'Photo changed after visual review.');
 const owner=previous[p.key];assert(owner?.published&&owner.assets[p.slot]);
 plan.push({...p,sourceHash:hash,image:await inspectImage(bytes),owner,alt:details[`${p.key}-${p.slot}-v2`].altText});
}
assert.equal(plan.length,24);
if(process.argv.includes('--check')){console.log('24 reviewed images decoded; owner IDs and source hashes verified.');process.exit(0);}
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(['localhost','127.0.0.1'].includes(new URL(url).hostname));
// This same Docker project moved from the Windows-reserved 54321 port to 15421.
// Historical manifests retain their original endpoint; every owner/asset UUID is
// checked against the live project below before any image mutation.
for(const manifest of [original,expanded])assert(manifest.url===url||manifest.url==='http://127.0.0.1:54321'&&url==='http://127.0.0.1:15421','Unexpected local project endpoint.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const admin=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const path='.local-services/photo-refresh.json';
let state;
try{state=JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
try{const pending=JSON.parse(await readFile(`${path}.tmp`,'utf8'));assert.equal(pending.url,url);state=pending;}catch(error){if(error.code!=='ENOENT')throw error;}
state??={version:1,url,characters:{},auditActors:[]};assert.equal(state.url,url);assert.equal(state.version,1);
const save=async()=>{await writeFile(`${path}.tmp`,JSON.stringify(state,null,2));for(let attempt=0;;attempt++)try{await rename(`${path}.tmp`,path);break;}catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=10)throw error;await new Promise(resolve=>setTimeout(resolve,300));}};
const check=(r,label)=>{if(r.error||r.data?.error)throw new Error(`${label} failed; inspect the local admin audit.`);return r.data;};
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
let windowStart=Date.now(),mutations=0;
const command=async(operation,args)=>{
 if(mutations>=24){const remaining=Math.max(0,62000-(Date.now()-windowStart));console.log('Respecting the local image publication mutation window.');for(let wait=remaining;wait>0;wait-=Math.min(wait,30000))await new Promise(resolve=>setTimeout(resolve,Math.min(wait,30000)));windowStart=Date.now();mutations=0;}
 const result=check(await admin.rpc('admin_cast_command',{p_operation:operation,...args}),operation);mutations++;return result;
};
let actor;
try{
 await mkdir('.local-backups',{recursive:true});
 const backup=execFileSync('docker',['exec','supabase_db_talking_stage','pg_dump','-U','supabase_admin','-d','postgres','-Fc','--schema=auth','--schema=public','--schema=private'],{windowsHide:true,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});
 await writeFile(`.local-backups/cast-before-photo-refresh-${randomUUID()}.dump`,backup);
 const email=`local-photo-refresh-${randomUUID()}@example.test`,password=`Ts!${randomUUID()}Aa9`;
 actor=check(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1',synthetic_local_maintenance:true}}),'Maintenance identity').user.id;
 assert.match(actor,/^[a-f0-9-]{36}$/);
 check(await admin.auth.signInWithPassword({email,password}),'Maintenance sign-in');
 check(await admin.rpc('save_preferences',{p_name:'Synthetic photo refresh publisher',p_genders:['man','woman'],p_language:'english',p_requests:false,p_version:1}),'Preferences');
 check(await admin.rpc('complete_onboarding',{p_version:2,p_consent:true}),'Onboarding');
 sql(`insert into private.user_roles(user_id,role) values('${actor}','admin');`);
 state.auditActors.push(actor);await save();
 // Preflight every owner and active slot before publishing anything; preserve profiles and directions.
 for(const photo of plan){
  const draft=check(await admin.rpc('admin_get_cast',{p_id:photo.owner.id}),'Character read');assert.equal(draft.status,'published');
  const assets=check(await admin.rpc('admin_list_assets',{p_character:photo.owner.id}),'Owned assets');
  const existing=state.characters[photo.key]?.refreshedSlots.includes(photo.slot)?state.characters[photo.key].assets[photo.slot]:null;
  if(existing)assert.equal(existing.sourceHash,photo.sourceHash,'Replacement changed since import.');
  const expected=new Set([photo.owner.assets[photo.slot].id,existing?.id].filter(Boolean));
  assert(assets.filter(a=>a.slot===photo.slot&&a.published&&a.review_state==='approved').every(a=>expected.has(a.id)),'A newer operator photo exists; do not replace it.');
  assert(assets.some(a=>a.id===photo.owner.assets[photo.slot].id),'Original asset owner mismatch.');
 }
 for(const photo of plan){
  const entry=state.characters[photo.key]??={id:photo.owner.id,assets:structuredClone(photo.owner.assets),previousAssets:structuredClone(photo.owner.assets),refreshedSlots:[]};
  let saved=entry.assets[photo.slot];
  if(!entry.refreshedSlots.includes(photo.slot)){
   await command('asset.reserve_upload',{p_id:entry.id});
   const id=randomUUID(),uploaded=[];
   try{
    for(const file of [{name:'original',bytes:photo.image.original},...photo.image.variants.map(v=>({name:String(v.width),bytes:v.bytes}))]){
     const object=`${entry.id}/${id}/${file.name}.webp`;
     check(await service.storage.from('cast-private').upload(object,file.bytes,{contentType:'image/webp',upsert:false}),'Private image upload');uploaded.push(object);
    }
    check(await service.rpc('register_inspected_asset',{p_id:id,p_character:entry.id,p_actor:actor,p_slot:photo.slot,p_alt:photo.alt,p_width:photo.image.width,p_height:photo.image.height,p_hash:digest(photo.image.original)}),'Image inspection registration');
   }catch(error){if(uploaded.length)check(await service.storage.from('cast-private').remove(uploaded),'Upload cleanup');throw error;}
   saved=entry.assets[photo.slot]={id,sourceHash:photo.sourceHash};entry.refreshedSlots.push(photo.slot);await save();
  }
  let assets=check(await admin.rpc('admin_list_assets',{p_character:entry.id}),'Review image');
  let asset=assets.find(a=>a.id===saved.id);assert(asset&&asset.slot===photo.slot);assert.equal(asset.source_hash,digest(photo.image.original));assert.notEqual(asset.review_state,'rejected');
  if(asset.review_state!=='approved'){await command('asset.approved',{p_id:asset.id,p_version:asset.version,p_attested:true});asset={...asset,version:asset.version+1};}
  if(!asset.published)await command('asset.publish',{p_id:asset.id,p_version:asset.version});
  // Publish the reviewed replacement first, so the character never loses its required slot.
  const old=assets.find(a=>a.id===entry.previousAssets[photo.slot].id);assert(old);
  if(old.review_state!=='rejected')await command('asset.rejected',{p_id:old.id,p_version:old.version,p_reason:'Superseded by the owner-requested, visually reviewed photography refresh on 10 October 2026. Retain immutable source for rollback.'});
  await save();console.log(`${photo.key}: new ${photo.slot} published; previous photo retained privately.`);
 }
 for(const [key,entry] of Object.entries(state.characters)){
  const visible=check(await admin.from('character_assets').select('id,slot').eq('character_id',entry.id).eq('published',true).eq('review_state','approved'),'Current photo verification');
  assert.equal(visible.length,2,`${key} must expose exactly two current photos.`);
  for(const slot of ['portrait','gallery'])assert(visible.some(a=>a.id===entry.assets[slot].id&&a.slot===slot));
 }
 const discovery=check(await admin.rpc('discover_cast',{p_page:1,p_gender:null}),'Discovery verification');assert.equal(discovery.total,22);
 state.publishedAt=new Date().toISOString();await save();console.log('All 22 profiles still published; 44 current photos, including 24 replacements.');
}finally{
 if(actor){sql(`delete from private.user_roles where user_id='${actor}';`);check(await service.auth.admin.updateUserById(actor,{ban_duration:'876000h'}),'Disable maintenance identity');await admin.auth.signOut();}
}

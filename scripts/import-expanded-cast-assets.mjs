import assert from 'node:assert/strict';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {inspectImage} from '../lib/backend/inspect-image.ts';

const catalog=JSON.parse(await readFile('docs/cast-expansion/characters.json','utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const plan=[];
// Decode every image before any external mutation. No placeholders or substitutions.
for(const c of catalog.characters)for(const slot of ['portrait','gallery']){
 assert.match(c.key,/^char-[a-z-]+$/);
 const bytes=await readFile(`docs/cast-expansion/assets/${c.key}-${slot}.png`);
 plan.push({key:c.key,name:c.profile.name,slot,sourceHash:digest(bytes),image:await inspectImage(bytes)});
}
assert.equal(plan.length,28);
if(process.argv.includes('--check')){console.log('Decoded 28 distinct sources and all responsive variants.');process.exit(0);}
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(['localhost','127.0.0.1'].includes(new URL(url).hostname),'Local import only.');
const path='.local-services/expanded-cast-drafts.json';
const state=JSON.parse(await readFile(path,'utf8'));assert.equal(state.url,url);
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const admin=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const check=(r,label)=>{if(r.error||r.data?.error)throw new Error(`${label} failed; inspect the local admin audit.`);return r.data;};
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
const save=async()=>{await writeFile(`${path}.tmp`,JSON.stringify(state,null,2));await rename(`${path}.tmp`,path);};
let actor;
try{
 const password=`Ts!${randomUUID()}Aa9`;const email=`local-photo-drafter-${randomUUID()}@example.test`;
 const created=check(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1',synthetic_local_maintenance:true}}),'Maintenance identity');
 actor=created.user.id;assert.match(actor,/^[a-f0-9-]{36}$/);
 check(await admin.auth.signInWithPassword({email,password}),'Sign-in');
 check(await admin.rpc('save_preferences',{p_name:'Synthetic local photo drafter',p_genders:['man','woman'],p_language:'english',p_requests:false,p_version:1}),'Preferences');
 check(await admin.rpc('complete_onboarding',{p_version:2,p_consent:true}),'Onboarding');
 sql(`insert into private.user_roles(user_id,role) values('${actor}','admin');`);
 for(const photo of plan){
  const entry=state.characters[photo.key];assert(entry,'Import the character draft first.');
  const draft=check(await admin.rpc('admin_get_cast',{p_id:entry.id}),'Draft read');assert.equal(draft.status,'draft');
  entry.assets??={};
  if(entry.assets[photo.slot]){assert.equal(entry.assets[photo.slot].sourceHash,photo.sourceHash,'Saved photo changed; review replacement separately.');continue;}
  check(await admin.rpc('admin_cast_command',{p_operation:'asset.reserve_upload',p_id:entry.id}),'Upload reservation');
  const id=randomUUID();const files=[{name:'original',bytes:photo.image.original},...photo.image.variants.map(v=>({name:String(v.width),bytes:v.bytes}))];const uploaded=[];
  try{
   for(const file of files){const object=`${entry.id}/${id}/${file.name}.webp`;check(await service.storage.from('cast-private').upload(object,file.bytes,{contentType:'image/webp',upsert:false}),'Private upload');uploaded.push(object);}
   check(await service.rpc('register_inspected_asset',{p_id:id,p_character:entry.id,p_actor:actor,p_slot:photo.slot,p_alt:`${photo.name}, a fictional adult AI character, ${photo.slot}`,p_width:photo.image.width,p_height:photo.image.height,p_hash:digest(photo.image.original)}),'Inspected registration');
  }catch(error){if(uploaded.length)check(await service.storage.from('cast-private').remove(uploaded),'Upload cleanup');throw error;}
  entry.assets[photo.slot]={id,sourceHash:photo.sourceHash};await save();
  const listed=check(await admin.rpc('admin_list_assets',{p_character:entry.id}),'Verify pending image');const asset=listed.find(a=>a.id===id);assert(asset);assert.notEqual(asset.review_state,'approved');assert.equal(asset.published,false);
  console.log(`${photo.name}: ${photo.slot} uploaded for private review.`);
 }
 console.log('28 owned photos prepared. No approval or publication commands were executed.');
}finally{
 if(actor){sql(`delete from private.user_roles where user_id='${actor}';`);check(await service.auth.admin.updateUserById(actor,{ban_duration:'876000h'}),'Disable maintenance identity');await admin.auth.signOut();}
}

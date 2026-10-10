import assert from 'node:assert/strict';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {inspectImage} from '../lib/backend/inspect-image.ts';

const approval=await readFile('docs/reviews/cast-expansion-publication.md','utf8');
assert(approval.includes('Owner-authorized local publication · 10 October 2026'));
const catalog=JSON.parse(await readFile('docs/cast-expansion/characters.json','utf8'));
assert.equal(catalog.characters.length,14);
const path='.local-services/expanded-cast-drafts.json';
let state=JSON.parse(await readFile(path,'utf8'));
// Recover the complete pending manifest if OneDrive interrupted replacement.
try{const pending=JSON.parse(await readFile(`${path}.tmp`,'utf8'));assert.equal(pending.url,state.url);assert.equal(pending.version,state.version);for(const [key,entry] of Object.entries(state.characters))assert.equal(pending.characters[key].id,entry.id);state=pending;}catch(error){if(error.code!=='ENOENT')throw error;}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const plan=[];
for(const c of catalog.characters){
 const entry=state.characters[c.key];assert(entry?.snapshot,'Import the final draft snapshot first.');assert(equal(c.profile,entry.snapshot.profile));
 const photos=[];
 for(const slot of ['portrait','gallery']){
  const bytes=await readFile(`docs/cast-expansion/assets/${c.key}-${slot}.png`);
  assert.equal(digest(bytes),entry.assets[slot].sourceHash,'Photo changed since private import.');
  photos.push({slot,id:entry.assets[slot].id,image:await inspectImage(bytes)});
 }
 plan.push({key:c.key,entry,photos});
}
if(process.argv.includes('--check')){console.log('Fourteen final profiles and twenty-eight owned image hashes verified for authorized publication.');process.exit(0);}
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(['localhost','127.0.0.1'].includes(new URL(url).hostname));assert.equal(state.url,url);
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const admin=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const check=(r,label)=>{if(r.error||r.data?.error)throw new Error(`${label} failed; inspect the local admin audit.`);return r.data;};
const command=async(operation,args)=>check(await admin.rpc('admin_cast_command',{p_operation:operation,...args}),operation);
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
const save=async()=>{await writeFile(`${path}.tmp`,JSON.stringify(state,null,2));for(let attempt=0;;attempt++)try{await rename(`${path}.tmp`,path);break;}catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=10)throw error;await new Promise(resolve=>setTimeout(resolve,300));}};
let actor;
try{
 const backup=execFileSync('docker',['exec','supabase_db_talking_stage','pg_dump','-U','supabase_admin','-d','postgres','-Fc','--schema=auth','--schema=public','--schema=private'],{windowsHide:true,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});
 await writeFile(`.local-backups/cast-before-expanded-publication-${randomUUID()}.dump`,backup);
 const password=`Ts!${randomUUID()}Aa9`;const email=`local-expanded-publisher-${randomUUID()}@example.test`;
 const created=check(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1',synthetic_local_maintenance:true}}),'Maintenance identity');
 actor=created.user.id;assert.match(actor,/^[a-f0-9-]{36}$/);
 check(await admin.auth.signInWithPassword({email,password}),'Sign-in');
 check(await admin.rpc('save_preferences',{p_name:'Synthetic local expanded cast publisher',p_genders:['man','woman'],p_language:'english',p_requests:false,p_version:1}),'Preferences');
 check(await admin.rpc('complete_onboarding',{p_version:2,p_consent:true}),'Onboarding');
 sql(`insert into private.user_roles(user_id,role) values('${actor}','admin');`);
 for(let index=0;index<plan.length;index++){
  const {entry,photos}=plan[index];const draft=check(await admin.rpc('admin_get_cast',{p_id:entry.id}),'Draft read');
  assert(equal({profile:draft.profile,direction:draft.direction},entry.snapshot),'Draft changed after owner authorization.');
  assert.equal(draft.status,entry.published?'published':'draft','Do not override later deactivation.');
  for(const photo of photos){
   const listed=check(await admin.rpc('admin_list_assets',{p_character:entry.id}),'Owned assets');const asset=listed.find(a=>a.id===photo.id);
   assert(asset&&asset.slot===photo.slot);assert.equal(asset.source_hash,digest(photo.image.original));assert.notEqual(asset.review_state,'rejected');
   let version=asset.version;
   if(asset.review_state!=='approved'){await command('asset.approved',{p_id:asset.id,p_version:version,p_attested:true});version++;}
   if(!asset.published)await command('asset.publish',{p_id:asset.id,p_version:version});
  }
  const preview=check(await admin.rpc('admin_cast_preview',{p_id:entry.id}),'Public preview');assert.equal(preview.assets.length,2);assert.equal(preview.direction,undefined);
  if(!entry.published)await command('cast.publish',{p_id:entry.id,p_version:draft.version,p_attested:true});
  entry.published=true;await save();console.log(`${draft.profile.name}, ${draft.profile.age}: profile and both photos published locally.`);
  if((index+1)%5===0&&index+1<plan.length){console.log('Respecting the cast mutation window before the next publication batch.');await new Promise(resolve=>setTimeout(resolve,31000));await new Promise(resolve=>setTimeout(resolve,31000));}
 }
 const ids=new Set();let page=1;let total;
 do{const result=check(await admin.rpc('discover_cast',{p_page:page,p_gender:null}),'Published discovery');total=result.total;for(const c of result.characters)ids.add(c.id);page++;}while((page-1)*12<total);
 assert(plan.every(item=>ids.has(item.entry.id)),'Expanded cast missing from paginated discovery.');
 state.publishedAt=new Date().toISOString();await save();console.log(`Verified all fourteen additions across ${total} published characters.`);
}finally{
 if(actor){sql(`delete from private.user_roles where user_id='${actor}';`);check(await service.auth.admin.updateUserById(actor,{ban_duration:'876000h'}),'Disable maintenance identity');await admin.auth.signOut();}
}

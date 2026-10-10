import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {inspectImage} from '../lib/backend/inspect-image.ts';

process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(url&&['localhost','127.0.0.1'].includes(new URL(url).hostname),'Publication is restricted to local Supabase.');
const approval=await readFile('docs/reviews/stage-9/cast-approval.md','utf8');
assert(approval.includes('Approved by the project owner on 8 October 2026'),'Explicit recorded approval is required.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const admin=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const fixtures=JSON.parse(await readFile('docs/stage-0/characters.json','utf8')).characters;
const publicCast=JSON.parse(await readFile('lib/mock/public-cast.json','utf8')).filter(c=>fixtures.some(f=>f.id===c.id));
assert.equal(fixtures.length,8);assert.equal(publicCast.length,8);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const profileDigest=value=>digest(JSON.stringify(canonical(value)));
const plan=[];
// Inspect every approved source before creating anything. Never substitute a missing photo.
for(const c of publicCast) {
 const privateFixture=fixtures.find(f=>f.id===c.id);assert(privateFixture);
 const profile=Object.fromEntries(['name','age','gender','fictionalLocation','occupation','bio','conversationClue','interests','personalityTags'].map(k=>[k,c[k]]));
 const direction=[`Fictional adult AI character: ${c.name}, ${c.age}.`,`Appearance continuity: ${privateFixture.appearanceContinuity}`,`Voice: ${privateFixture.languageStyle}`,`Pace: ${privateFixture.warmthAndPace}`,...privateFixture.boundaries.map(b=>`Boundary: ${b}`)].join('\n');
 const photos=[];
 for(const slot of ['portrait','gallery']) {
  const source=await readFile(`public/images/characters/${c.id}-${slot}.webp`);
  photos.push({slot,sourceHash:digest(source),image:await inspectImage(source)});
 }
 plan.push({key:c.id,profile,direction,profileHash:profileDigest({profile,direction}),photos});
}
const statePath='.local-services/approved-cast-import.json';
await mkdir('.local-services',{recursive:true});await mkdir('.local-backups',{recursive:true});
let state;
try{state=JSON.parse(await readFile(statePath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
// OneDrive can temporarily lock replacement renames. A complete pending write
// preserves already-created UUIDs so retry never creates a duplicate character.
try{const pending=JSON.parse(await readFile(`${statePath}.tmp`,'utf8'));assert.equal(pending.url,url);state=pending;}catch(error){if(error.code!=='ENOENT')throw error;}
state??={version:1,url,approvalDate:'2026-10-08',characters:{}};
assert.equal(state.url,url);assert.equal(state.version,1);
const save=async()=>{
 await writeFile(`${statePath}.tmp`,JSON.stringify(state,null,2));
 for(let attempt=0;;attempt++)try{await rename(`${statePath}.tmp`,statePath);break;}catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=10)throw error;await new Promise(resolve=>setTimeout(resolve,300));}
};
const check=(result,label)=>{if(result.error||result.data?.error)throw new Error(`${label} failed; inspect the local administration audit.`);return result.data;};
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
const command=async(operation,args)=>check(await admin.rpc('admin_cast_command',{p_operation:operation,...args}),operation);
let actor;
try {
 const backup=execFileSync('docker',['exec','supabase_db_talking_stage','pg_dump','-U','supabase_admin','-d','postgres','-Fc','--schema=auth','--schema=public','--schema=private'],{windowsHide:true,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});
 await writeFile(`.local-backups/cast-before-publication-${randomUUID()}.dump`,backup);
 // A temporary, synthetic local maintenance identity; approval belongs to the owner, not this account.
 const password=`Ts!${randomUUID()}Aa9`;const email=`local-cast-publisher-${randomUUID()}@example.test`;
 const created=check(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1',synthetic_local_maintenance:true}}),'Maintenance identity');
 actor=created.user.id;assert(/^[a-f0-9-]{36}$/.test(actor));
 check(await admin.auth.signInWithPassword({email,password}),'Maintenance sign-in');
 check(await admin.rpc('save_preferences',{p_name:'Synthetic local cast publisher',p_genders:['woman','man'],p_language:'english',p_requests:false,p_version:1}),'Maintenance preferences');
 check(await admin.rpc('complete_onboarding',{p_version:2,p_consent:true}),'Maintenance onboarding');
 sql(`insert into private.user_roles(user_id,role) values('${actor}','admin');`);
 state.auditActors??=[];state.auditActors.push(actor);await save();
 let processed=0;
 for(const item of plan) {
  let entry=state.characters[item.key];
  if(entry)assert.equal(entry.profileHash,item.profileHash,'Previously imported copy must match the approved source.');
  else {
   const created=await command('cast.save_draft',{p_id:null,p_version:0,p_profile:item.profile,p_direction:item.direction});
   entry={id:created.id,profileHash:item.profileHash,assets:{}};state.characters[item.key]=entry;await save();
  }
  const draft=check(await admin.rpc('admin_get_cast',{p_id:entry.id}),'Draft read');
  assert(draft&&profileDigest({profile:draft.profile,direction:draft.direction})===item.profileHash,'Draft changed since approval; do not overwrite it.');
  if(entry.published)assert.equal(draft.status,'published','A later deactivation must not be overridden by import.');
  for(const photo of item.photos) {
   let assetEntry=entry.assets[photo.slot];
   if(assetEntry)assert.equal(assetEntry.sourceHash,photo.sourceHash,'Approved photo changed; review it again.');
   else {
    await command('asset.reserve_upload',{p_id:entry.id});
    const id=randomUUID();const prefix=`${entry.id}/${id}`;
    const files=[{name:'original',bytes:photo.image.original},...photo.image.variants.map(v=>({name:String(v.width),bytes:v.bytes}))];
    const uploaded=[];
    try {
     for(const file of files){const path=`${prefix}/${file.name}.webp`;check(await service.storage.from('cast-private').upload(path,file.bytes,{contentType:'image/webp',upsert:false}),'Image upload');uploaded.push(path);}
     check(await service.rpc('register_inspected_asset',{p_id:id,p_character:entry.id,p_actor:actor,p_slot:photo.slot,p_alt:`${item.profile.name}, a fictional adult AI character, ${photo.slot==='portrait'?'in a portrait':'in a gallery photo'}`,p_width:photo.image.width,p_height:photo.image.height,p_hash:digest(photo.image.original)}),'Inspected registration');
    }catch(error){if(uploaded.length)check(await service.storage.from('cast-private').remove(uploaded),'Upload cleanup');throw error;}
    assetEntry={id,sourceHash:photo.sourceHash};entry.assets[photo.slot]=assetEntry;await save();
   }
   const listed=check(await admin.rpc('admin_list_assets',{p_character:entry.id}),'Asset read');
   let asset=listed.find(a=>a.id===assetEntry.id);assert(asset&&asset.source_hash===digest(photo.image.original),'Stored image differs from approved inspected source.');
   assert.notEqual(asset.review_state,'rejected','A later rejection must not be overridden by rerunning import.');
   if(asset.review_state!=='approved'){await command('asset.approved',{p_id:asset.id,p_version:asset.version,p_attested:true});asset={...asset,version:asset.version+1};}
   if(!asset.published)await command('asset.publish',{p_id:asset.id,p_version:asset.version});
  }
  const preview=check(await admin.rpc('admin_cast_preview',{p_id:entry.id}),'Public preview');
  assert.equal(preview.assets.length,2);assert.equal(preview.direction,undefined);
  if(draft.status!=='published')await command('cast.publish',{p_id:entry.id,p_version:draft.version,p_attested:true});
  entry.published=true;await save();processed++;
  console.log(`${item.profile.name}: inspected, reviewed, previewed and published locally.`);
  if(processed%3===0&&processed<plan.length){console.log('Waiting for the native cast mutation window before the next batch.');await new Promise(resolve=>setTimeout(resolve,61000));}
 }
 const discovery=check(await admin.from('characters').select('id'),'Published discovery');
 assert.equal(plan.filter(item=>discovery.some(c=>c.id===state.characters[item.key].id)).length,8);
 state.completedAt=new Date().toISOString();await save();console.log('Approved local cast publication complete: eight profiles and sixteen owned photos.');
}finally {
 if(actor){sql(`delete from private.user_roles where user_id='${actor}';`);check(await service.auth.admin.updateUserById(actor,{ban_duration:'876000h'}),'Disable maintenance identity');await admin.auth.signOut();}
}

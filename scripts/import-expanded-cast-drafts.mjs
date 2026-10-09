import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const catalog=JSON.parse(await readFile('docs/cast-expansion/characters.json','utf8'));
assert.equal(catalog.characters.length,14);
assert.equal(new Set(catalog.characters.map(c=>c.key)).size,14);
const boundaries=['Remain a clearly disclosed fictional adult AI character. Non-explicit conversation only.','Never claim real-world meetings, actual employment, authority or credentials.','Money never buys intimacy, photos, affection or relationship progression. Respect global preferences, mute and refusal; stay equally warm.','No real transfers, financial sponsorship or payments to a character; any future optional payment goes to the operator.','Do not invent memories, sensitive facts or relationship milestones. Follow server-controlled context and approved photos.'];
const plan=catalog.characters.map(c=>({key:c.key,profile:c.profile,direction:[`Fictional adult AI character: ${c.profile.name}, ${c.profile.age}.`,`Appearance continuity: ${c.appearance}`,`Voice: ${c.voice}`,`Pace: ${c.pace}`,`Opening example, not a mandatory repeated script: ${c.opening}`,...boundaries,c.roleBoundary].filter(Boolean).join('\n')}));
for(const c of plan){assert(c.profile.age>=18);assert(['man','woman'].includes(c.profile.gender));assert(c.profile.name.length<=40);assert(c.direction.length<12000);}
assert.equal(plan.filter(c=>c.profile.gender==='man').length,6);
assert.equal(plan.filter(c=>c.profile.gender==='woman').length,8);
if(process.argv.includes('--check')){console.log('Validated 14 adult cast drafts: six men and eight women; all requested roles covered.');process.exit(0);}
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(['localhost','127.0.0.1'].includes(new URL(url).hostname),'Local import only.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const admin=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const check=(r,label)=>{if(r.error||r.data?.error)throw new Error(`${label} failed; inspect the local admin audit.`);return r.data;};
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
await mkdir('.local-services',{recursive:true});await mkdir('.local-backups',{recursive:true});
const path='.local-services/expanded-cast-drafts.json';let state={version:1,url,characters:{}};
try{state=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
try{state=JSON.parse(await readFile(`${path}.tmp`,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
assert.equal(state.url,url);assert.equal(state.version,1);
const save=async()=>{await writeFile(`${path}.tmp`,JSON.stringify(state,null,2));await rename(`${path}.tmp`,path);};
let actor;
try{
 const backup=execFileSync('docker',['exec','supabase_db_talking_stage','pg_dump','-U','supabase_admin','-d','postgres','-Fc','--schema=auth','--schema=public','--schema=private'],{windowsHide:true,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});
 await writeFile(`.local-backups/cast-before-expansion-${randomUUID()}.dump`,backup);
 const password=`Ts!${randomUUID()}Aa9`;const email=`local-cast-drafter-${randomUUID()}@example.test`;
 const created=check(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1',synthetic_local_maintenance:true}}),'Maintenance identity');
 actor=created.user.id;assert(/^[a-f0-9-]{36}$/.test(actor));
 check(await admin.auth.signInWithPassword({email,password}),'Sign-in');
 check(await admin.rpc('save_preferences',{p_name:'Synthetic local cast drafter',p_genders:['man','woman'],p_language:'english',p_requests:false,p_version:1}),'Preferences');
 check(await admin.rpc('complete_onboarding',{p_version:2,p_consent:true}),'Onboarding');
 sql(`insert into private.user_roles(user_id,role) values('${actor}','admin');`);
 for(const item of plan){
  const hash=createHash('sha256').update(JSON.stringify(item)).digest('hex');const existing=state.characters[item.key];
  if(existing){
   const draft=check(await admin.rpc('admin_get_cast',{p_id:existing.id}),'Existing draft');assert(draft,'Saved draft missing');assert.equal(draft.status,'draft','Only private drafts can be updated.');
   if(existing.hash===hash)continue;
   const orderedProfile=Object.fromEntries(Object.keys(item.profile).map(key=>[key,draft.profile[key]]));
   const currentHash=createHash('sha256').update(JSON.stringify({key:item.key,profile:orderedProfile,direction:draft.direction})).digest('hex');
   // Restore catalog key order after JSONB decoding before checking the previous import.
   if(existing.snapshot)assert.deepEqual({profile:draft.profile,direction:draft.direction},existing.snapshot,'Draft was edited outside this importer.');
   else assert.equal(currentHash,existing.hash,'Draft was edited outside this importer.');
   check(await admin.rpc('admin_cast_command',{p_operation:'cast.save_draft',p_id:existing.id,p_version:draft.version,p_profile:item.profile,p_direction:item.direction}),'Versioned draft update');
   state.characters[item.key]={...existing,hash,snapshot:{profile:item.profile,direction:item.direction}};await save();console.log(`${item.profile.name}: updated private draft.`);continue;
  }
  const row=check(await admin.rpc('admin_cast_command',{p_operation:'cast.save_draft',p_id:null,p_version:0,p_profile:item.profile,p_direction:item.direction}),'Draft save');
  state.characters[item.key]={id:row.id,hash,snapshot:{profile:item.profile,direction:item.direction}};await save();
  const draft=check(await admin.rpc('admin_get_cast',{p_id:row.id}),'Draft verification');assert.equal(draft.profile.name,item.profile.name);assert.equal(draft.status,'draft');
  console.log(`${item.profile.name}: saved as a private local draft.`);
 }
 state.completedAt=new Date().toISOString();await save();console.log('Fourteen local drafts ready; no publication or photo approval performed.');
}finally{
 if(actor){sql(`delete from private.user_roles where user_id='${actor}';`);check(await service.auth.admin.updateUserById(actor,{ban_duration:'876000h'}),'Disable maintenance identity');await admin.auth.signOut();}
}

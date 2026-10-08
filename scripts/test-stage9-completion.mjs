import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();const admin='00000000-0000-4000-8000-000000000001',member='00000000-0000-4000-8000-000000000002';
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of ['202610080001_foundation.sql','202610080002_cast_drafts.sql','202610080003_cast_assets.sql','202610080004_operations.sql','202610080005_cast_completion.sql'])await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users values('${admin}','{"adult_declaration":"18-plus-v1"}'),('${member}','{"adult_declaration":"18-plus-v1"}');
 update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;
 insert into private.user_roles values('${admin}','admin',now());`);
 const profile={name:'Synthetic adult',age:26,gender:'woman',fictionalLocation:'Lagos',occupation:'Designer',bio:'Synthetic biography',conversationClue:'A conversation clue',interests:['Art'],personalityTags:['Warm']};
 for(let n=1;n<=70;n++) {
  const name=`Synthetic ${String(n).padStart(2,'0')}`;
  const row=(await db.query("insert into public.characters(name,age,gender,status,interests,personality) values($1,26,'woman','published',$2,array['Warm']) returning id",[name,[n===70?'Rare interest':'Art']])).rows[0];
  await db.query('insert into private.cast_drafts(character_id,profile,direction) values($1,$2,$3)',[row.id,JSON.stringify({...profile,name}),'SECRET DIRECTION EXCLUDED']);
  for(const slot of ['portrait','gallery'])await db.query("insert into public.character_assets(character_id,storage_path,slot,review_state,published,review_attested,source_hash,alt_text) values($1,$2,$3,'approved',true,true,$4,'Synthetic photo')",[row.id,`${row.id}/${slot}/original.webp`,slot,'a'.repeat(64)]);
 }
 const actor=async(id,role='authenticated')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
 await actor(member);
 const discover=async(page,interest=null)=>(await db.query('select public.discover_cast($1,null,$2,null) as value',[page,interest])).rows[0].value;
 const first=await discover(1),second=await discover(2);
 assert.equal(first.total,70);assert.equal(first.characters.length,12);assert.equal(first.interests.includes('Rare interest'),true);
 assert.equal(second.characters.some(c=>first.characters.some(a=>a.id===c.id)),false);
 assert.equal((await discover(6)).characters.length,10);assert.equal((await discover(999)).page,6);
 assert.equal((await discover(1,'Rare interest')).characters[0].name,'Synthetic 70');
 await assert.rejects(db.query('select public.discover_cast(0)'),/invalid_filter/);
 const id=first.characters[0].id;
 await assert.rejects(db.query('select public.admin_cast_preview($1)',[id]),/forbidden/);
 await assert.rejects(db.query("select public.admin_cast_command('cast.deactivate',$1,1)",[id]),/forbidden/);
 await assert.rejects(db.query('select public.record_upload_failure($1,$2,$3)',[admin,id,'inspection_failed']),/permission denied/);
 await actor(admin);
 const page=(await db.query('select public.admin_cast_page(2) as value')).rows[0].value;
 assert.equal(page.characters.length,12);assert.equal(page.total,70);assert.equal(JSON.stringify(page).includes('SECRET DIRECTION'),false);
 const preview=(await db.query('select public.admin_cast_preview($1) as value',[id])).rows[0].value;
 assert.equal(preview.assets.length,2);assert.equal(JSON.stringify(preview).includes('SECRET DIRECTION'),false);
 assert.equal(preview.direction,undefined);
 await assert.rejects(db.query('select public.admin_deactivate_cast($1,1)',[id]),/permission denied/);
 for(const [operation,expected] of [['cast.deactivate','conflict'],['asset.publish','conflict_or_unapproved'],['cast.publish','review_required']]) {
  const result=(await db.query('select public.admin_cast_command($1,$2,999) as value',[operation,id])).rows[0].value;
  assert.equal(result.error,expected);
 }
 const failed=(await db.query("select public.admin_list_audit(null,'failed') as value")).rows[0].value;
 assert.equal(failed.events.length,3);assert.equal(JSON.stringify(failed).includes('SECRET DIRECTION'),false);
 assert.equal((await db.query('select public.admin_get_cast($1) as value',[id])).rows[0].value.version,1);
 const created=(await db.query("select public.admin_cast_command('cast.save_draft',null,0,$1,$2) as value",[JSON.stringify(profile),'NEW SECRET DIRECTION'])).rows[0].value;
 assert.ok(created.id);
 await actor('', 'service_role');await db.query('select public.record_upload_failure($1,$2,$3)',[admin,id,'inspection_failed']);
 await actor(admin);assert.equal((await db.query("select public.admin_list_audit(null,'failed') as value")).rows[0].value.events.length,4);
 await actor('', 'anon');await assert.rejects(db.query('select public.discover_cast()'),/permission denied/);
 console.log('Stage 9 completion checks passed: 70-character filtered pagination, public-only preview, role denial, mandatory audited command path, persistent failures and unchanged rejected mutations.');
}finally{await db.close();}

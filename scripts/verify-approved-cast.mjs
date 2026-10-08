import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {chromium} from '@playwright/test';
import sharp from 'sharp';
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(url&&['localhost','127.0.0.1'].includes(new URL(url).hostname),'Verification requires local Supabase.');
const state=JSON.parse(await readFile('.local-services/approved-cast-import.json','utf8'));assert(state.completedAt);
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const member=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const fixtures=JSON.parse(await readFile('lib/mock/public-cast.json','utf8'));
const ids=fixtures.map(c=>state.characters[c.id].id);
const check=(result,label)=>{if(result.error||result.data?.error)throw new Error(`${label} failed.`);return result.data;};
const password=`Ts!${randomUUID()}Aa9`;const email=`local-cast-verifier-${randomUUID()}@example.test`;
let user,browser,server;
try {
 assert(state.auditActors.every(id=>/^[a-f0-9-]{36}$/.test(id)));
 const roleCount=execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-At'],{input:`select count(*) from private.user_roles where user_id in (${state.auditActors.map(id=>`'${id}'`).join(',')});`,encoding:'utf8',windowsHide:true}).trim();
 assert.equal(roleCount,'0','Publication maintenance roles must be revoked.');
 for(const id of state.auditActors){const actor=check(await service.auth.admin.getUserById(id),'Maintenance identity state');assert(Date.parse(actor.user.banned_until)>Date.now(),'Maintenance identities must be disabled.');}
 user=check(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1',synthetic_verification:true}}),'Create synthetic verifier').user;
 check(await member.auth.signInWithPassword({email,password}),'Verifier sign-in');
 check(await member.rpc('save_preferences',{p_name:'Synthetic cast verification',p_genders:['woman','man'],p_language:'english',p_requests:false,p_version:1}),'Verifier preferences');
 check(await member.rpc('complete_onboarding',{p_version:2,p_consent:true}),'Verifier onboarding');
 const cast=check(await member.from('characters').select('*').in('id',ids),'Customer profiles');assert.equal(cast.length,8);
 assert.equal(cast.filter(c=>c.gender==='woman').length,4);assert.equal(cast.filter(c=>c.gender==='man').length,4);
 for(const fixture of fixtures){const row=cast.find(c=>c.id===state.characters[fixture.id].id);assert.equal(row.name,fixture.name);assert.equal(row.bio,fixture.bio);assert.equal(row.status,'published');}
 const assets=check(await member.from('character_assets').select('*').in('character_id',ids),'Customer photos');assert.equal(assets.length,16);
 let objects=0;
 for(const asset of assets) {
  assert.equal(asset.review_state,'approved');assert.equal(asset.review_attested,true);assert.equal(asset.published,true);
  assert(asset.storage_path.startsWith(`${asset.character_id}/${asset.id}/`));
  assert.ok((await member.storage.from('cast-private').download(asset.storage_path)).error);
  for(const width of ['original','320','640','1280']) {
   const bytes=Buffer.from(await check(await service.storage.from('cast-private').download(asset.storage_path.replace('original.webp',`${width}.webp`)),'Stored object').arrayBuffer());
   const meta=await sharp(bytes).metadata();assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);
   if(width==='original')assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.source_hash);
   else assert(meta.width<=Number(width));objects++;
  }
 }
 assert.equal(objects,64);assert.ok((await member.rpc('admin_list_cast')).error);
 for(const id of ids){const caps=check(await member.rpc('effective_capabilities',{p_character:id}),'Effective permissions');assert.equal(typeof caps.photos,'boolean');}
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3101'],{windowsHide:true,stdio:'ignore'});
 let ready=false;for(let n=0;n<80;n++){if(server.exitCode!==null)throw new Error('Verification server stopped.');try{if((await fetch('http://localhost:3101/sign-in')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert(ready);
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:3101/sign-in');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.waitForURL('**/discover');await page.getByRole('heading',{name:/A little spark/}).waitFor();
 for(const fixture of fixtures)assert.equal(await page.getByRole('link',{name:`Meet ${fixture.name}`,exact:true}).count(),1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const image of await page.locator('.connected-cast-photo').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(element=>element.decode());}
 await page.evaluate(()=>scrollTo(0,0));
 await mkdir('docs/reviews/stage-9',{recursive:true});await page.screenshot({path:'docs/reviews/stage-9/approved-discovery-390.png',fullPage:true,caret:'initial'});
 await page.getByRole('link',{name:'Meet Amara',exact:true}).click();await page.getByRole('heading',{name:'Amara, 28',exact:true}).waitFor();
 await page.getByText(fixtures.find(c=>c.name==='Amara').bio,{exact:true}).waitFor();
 const photo=assets.find(a=>a.character_id===state.characters['char-amara'].id&&a.slot==='portrait');
 assert.equal((await page.request.get(`http://localhost:3101/api/cast-assets/${photo.id}?w=320`)).status(),200);
 await page.screenshot({path:'docs/reviews/stage-9/approved-profile-390.png',fullPage:true,caret:'initial'});
 await page.goto(`http://localhost:3101/admin/characters/${photo.character_id}/preview`);await page.getByText('Administrator access required',{exact:true}).waitFor();
 assert(!(await page.content()).includes('Appearance continuity:'));
 const anonymous=await browser.newContext();assert.equal((await anonymous.request.get(`http://localhost:3101/api/cast-assets/${photo.id}`)).status(),401);await anonymous.close();
 assert.equal(errors.length,0,'No browser page errors');
 await writeFile('.local-services/approved-cast-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),profiles:8,approvedPhotos:16,objects:64,memberBucketDenied:true,anonymousImageDenied:true,memberAdminDenied:true,browserErrors:0},null,2));
 console.log('Approved cast verified: eight published profiles, sixteen reviewed photos, 64 private inspected objects, customer discovery/profile, authenticated delivery and member/anonymous denial.');
}finally{
 if(browser)await browser.close();if(server){server.kill();await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});}
 await member.auth.signOut();if(user)check(await service.auth.admin.deleteUser(user.id),'Remove synthetic verifier');
}

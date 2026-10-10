import {expect,test} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import cast from '../lib/mock/public-cast.json';

test('refreshed photography loads the current owned pair for all 22 adult profiles',async({page})=>{
 test.setTimeout(240000);
 const state=JSON.parse(readFileSync('.local-services/photo-refresh.json','utf8'));
 expect(state.publishedAt).toBeTruthy();expect(Object.keys(state.characters)).toHaveLength(22);
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const endpoint=process.env.NEXT_PUBLIC_SUPABASE_URL!;
 const service=createClient(endpoint,process.env.SUPABASE_SERVICE_ROLE_KEY!,options);
 const viewer=createClient(endpoint,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,options);
 const email=`photo-refresh-${randomUUID()}@example.test`,password=`Ts!${randomUUID()}Aa9`;
 const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1'}});
 expect(created.error).toBeNull();const id=created.data.user!.id;
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  expect((await viewer.auth.signInWithPassword({email,password})).error).toBeNull();
  expect((await viewer.rpc('save_preferences',{p_name:'Synthetic photography check',p_genders:['man','woman'],p_language:'english',p_requests:false,p_version:1})).error).toBeNull();
  expect((await viewer.rpc('complete_onboarding',{p_version:2,p_consent:true})).error).toBeNull();
  await page.setViewportSize({width:390,height:844});
  await page.goto('/sign-in');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/discover$/);
  for(const c of cast){
   const entry=state.characters[c.id];
   const visible=await viewer.from('character_assets').select('id,slot').eq('character_id',entry.id);
   expect(visible.error).toBeNull();expect(visible.data).toHaveLength(2);
   for(const slot of ['portrait','gallery'])expect(visible.data).toContainEqual({id:entry.assets[slot].id,slot});
   await page.goto(`/characters/${entry.id}`);
   await expect(page.getByRole('heading',{name:`${c.name}, ${c.age}`,exact:true})).toBeVisible();
   const photos=page.locator('img.cast-review-photo');await expect(photos).toHaveCount(2);
   for(const photo of await photos.all())await photo.scrollIntoViewIfNeeded();
   await expect.poll(()=>photos.evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
   for(const slot of ['portrait','gallery'])expect(await photos.evaluateAll((images,asset)=>images.some(image=>image.getAttribute('src')?.includes(asset)),entry.assets[slot].id)).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(['char-zuri','char-ranti','char-vivian','char-ifeoma'].includes(c.id))await page.screenshot({path:`docs/character-photo-refresh/${c.id}-390.png`,fullPage:true});
  }
  for(const key of ['char-seyi','char-tunde']){
   const entry=state.characters[key],name=cast.find(c=>c.id===key)!.name;
   await page.setViewportSize({width:1280,height:900});await page.goto(`/characters/${entry.id}`);
   for(const photo of await page.locator('img.cast-review-photo').all()){await photo.scrollIntoViewIfNeeded();await photo.evaluate(image=>(image as HTMLImageElement).decode());}
   await page.screenshot({path:`docs/character-photo-refresh/${key}-1280.png`,fullPage:true});
   await page.getByRole('button',{name:'Start conversation',exact:true}).click();
   await expect(page).toHaveURL(/\/messages\/[a-f0-9-]+$/);
   const portrait=page.getByRole('img',{name:`${name}’s character portrait`,exact:true});
   await expect(portrait).toHaveAttribute('src',new RegExp(entry.assets.portrait.id));
   await expect.poll(()=>portrait.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
   const retired=await page.request.get(`/api/cast-assets/${entry.previousAssets.portrait.id}?w=320`);
   expect([403,404]).toContain(retired.status());
  }
  expect(errors).toEqual([]);
 }finally{
  await viewer.auth.signOut();expect(id).toMatch(/^[a-f0-9-]{36}$/);
  execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:`delete from public.memory_preferences where user_id='${id}';delete from public.messages where conversation_id in(select id from public.conversations where user_id='${id}');delete from public.conversations where user_id='${id}';`,windowsHide:true,stdio:['pipe','pipe','pipe']});
  expect((await service.auth.admin.deleteUser(id)).error).toBeNull();
 }
});

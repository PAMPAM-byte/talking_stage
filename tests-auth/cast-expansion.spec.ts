import {expect,test} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import catalog from '../docs/cast-expansion/characters.json';

test('expanded cast exposes matching photos and public profiles to an ordinary adult account',async({page})=>{
 test.setTimeout(180000);
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const endpoint=process.env.NEXT_PUBLIC_SUPABASE_URL!;
 const service=createClient(endpoint,process.env.SUPABASE_SERVICE_ROLE_KEY!,options);
 const viewer=createClient(endpoint,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,options);
 const state=JSON.parse(readFileSync('.local-services/expanded-cast-drafts.json','utf8'));
 const email=`cast-expansion-${randomUUID()}@example.test`;const password=`Ts!${randomUUID()}Aa9`;
 const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1'}});
 expect(created.error).toBeNull();const id=created.data.user!.id;
 try{
  expect((await viewer.auth.signInWithPassword({email,password})).error).toBeNull();
  expect((await viewer.rpc('save_preferences',{p_name:'Synthetic cast review',p_genders:['man','woman'],p_language:'english',p_requests:false,p_version:1})).error).toBeNull();
  expect((await viewer.rpc('complete_onboarding',{p_version:2,p_consent:true})).error).toBeNull();
  await page.setViewportSize({width:390,height:844});
  await page.goto('/sign-in');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.locator('.character-card')).toHaveCount(12);
  await page.getByRole('link',{name:'Next page',exact:true}).click();
  await expect(page.locator('.character-card')).toHaveCount(10);
  await page.getByRole('link',{name:'Previous page',exact:true}).click();
  await expect(page.locator('.character-card')).toHaveCount(12);
  for(const c of catalog.characters){
   const entry=state.characters[c.key];
   await page.goto(`/characters/${entry.id}`);
   await expect(page.getByRole('heading',{name:`${c.profile.name}, ${c.profile.age}`,exact:true})).toBeVisible();
   await expect(page.getByText(`${c.profile.fictionalLocation} · ${c.profile.occupation}`,{exact:true})).toBeVisible();
   const photos=page.locator('img.cast-review-photo');await expect(photos).toHaveCount(2);
   await photos.evaluateAll(images=>images.forEach(image=>(image as HTMLImageElement).loading='eager'));
   await expect.poll(()=>photos.evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
   for(const slot of ['portrait','gallery'])expect(await photos.evaluateAll((images,asset)=>images.some(image=>image.getAttribute('src')?.includes(asset)),entry.assets[slot].id)).toBe(true);
   const music=page.getByRole('region',{name:'Favourite artists'});
   if(c.favouriteArtists.length){await expect(music).toBeVisible();for(const artist of c.favouriteArtists)await expect(music.getByText(artist,{exact:true})).toBeVisible();}else await expect(music).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(c.key==='char-zuri')await page.screenshot({path:'docs/cast-expansion/profile-live-390.png',fullPage:true});
  }
  const first=state.characters['char-adaora'];const image=await page.request.get(`/api/cast-assets/${first.assets.portrait.id}?w=320`);
  expect(image.status()).toBe(200);expect(image.headers()['cache-control']).toContain('no-store');expect(image.headers()['content-type']).toContain('image/webp');
  const denied=await viewer.rpc('admin_get_cast',{p_id:first.id});expect(denied.error).not.toBeNull();
 }finally{expect((await service.auth.admin.deleteUser(id)).error).toBeNull();}
});

import {expect,test} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

test('real conversation persistence, retries, ownership and lifecycle',async({page})=>{
 test.setTimeout(180000);
 const endpoint=process.env.NEXT_PUBLIC_SUPABASE_URL!;
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const service=createClient(endpoint,process.env.SUPABASE_SERVICE_ROLE_KEY!,options);
 const a=createClient(endpoint,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,options);
 const b=createClient(endpoint,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,options);
 const importState=JSON.parse(readFileSync('.local-services/approved-cast-import.json','utf8'));
 const character=importState.characters['char-amara'].id;
 const password=`Ts!${randomUUID()}Aa9`;const email=`stage10-a-${randomUUID()}@example.test`;
 const users:string[]=[];const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 try {
  for(const [client,address] of [[a,email],[b,`stage10-b-${randomUUID()}@example.test`]] as const) {
   const created=await service.auth.admin.createUser({email:address,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1'}});
   expect(created.error).toBeNull();users.push(created.data.user!.id);
   expect((await client.auth.signInWithPassword({email:address,password})).error).toBeNull();
   expect((await client.rpc('save_preferences',{p_name:'Synthetic stage ten',p_genders:['woman'],p_language:'english',p_requests:false,p_version:1})).error).toBeNull();
   expect((await client.rpc('complete_onboarding',{p_version:2,p_consent:true})).error).toBeNull();
  }
  const starts=await Promise.all([a.rpc('start_conversation',{p_character:character}),a.rpc('start_conversation',{p_character:character})]);
  expect(starts[0].error).toBeNull();expect(starts[1].error).toBeNull();expect(starts[0].data).toBe(starts[1].data);
  const id=starts[0].data as string;
  expect((await b.rpc('conversation_thread',{p_id:id})).error).not.toBeNull();
  expect((await b.rpc('save_user_message',{p_conversation:id,p_client_id:randomUUID(),p_generation:1,p_text:'Foreign synthetic input'})).error).not.toBeNull();
  await page.setViewportSize({width:390,height:844});
  await page.goto('/sign-in');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL('**/discover');await page.goto(`/characters/${character}`);await page.getByRole('button',{name:'Start conversation'}).click();
  await expect(page).toHaveURL(new RegExp(`/messages/${id}$`),{timeout:45000});
  await page.getByLabel('Message Amara').fill('A synthetic message that survives refresh.');await page.getByRole('button',{name:'Save message',exact:true}).click();
  await expect(page.locator('.message-bubble')).toHaveText('A synthetic message that survives refresh.');
  await page.reload();await expect(page.locator('.message-bubble')).toHaveText('A synthetic message that survives refresh.');
  const saved=(await a.from('messages').select('id,client_message_id').eq('conversation_id',id)).data![0];
  const retry=await a.rpc('save_user_message',{p_conversation:id,p_client_id:saved.client_message_id,p_generation:1,p_text:'A synthetic message that survives refresh.'});
  expect(retry.error).toBeNull();expect(retry.data.id).toBe(saved.id);
  expect((await a.from('messages').select('id').eq('conversation_id',id)).data).toHaveLength(1);
  expect((await b.from('messages').select('id').eq('conversation_id',id)).data).toEqual([]);
  expect((await a.rpc('claim_reply',{p_message:saved.id,p_actor:users[0],p_model:'synthetic'})).error).not.toBeNull();
  const disabled=await service.rpc('claim_reply',{p_message:saved.id,p_actor:users[0],p_model:'synthetic'});
  expect(disabled.error).toBeNull();expect(disabled.data.state).toBe('blocked_provider');
  const missingFinish=await service.rpc('finish_reply',{p_job:randomUUID(),p_actor:users[0],p_lease:randomUUID(),p_text:null,p_failure:null,p_asset:null});expect(missingFinish.error).toBeNull();expect(missingFinish.data).toBe('discarded');
  expect((await a.rpc('claim_summary',{p_message:saved.id,p_actor:users[0],p_model:'synthetic'})).error).not.toBeNull();
  const unavailableSummary=await service.rpc('claim_summary',{p_message:saved.id,p_actor:users[0],p_model:'synthetic'});expect(unavailableSummary.error).toBeNull();expect(unavailableSummary.data).toEqual({state:'unavailable'});
  const missingSummary=await service.rpc('finish_summary',{p_conversation:id,p_actor:users[0],p_lease:randomUUID(),p_excerpts:[],p_failure:null});expect(missingSummary.error).toBeNull();expect(missingSummary.data).toBe('discarded');
  const replyPath=`/api/conversations/${id}/replies/${saved.id}`;
  const ownedReply=await page.request.post(replyPath,{headers:{Origin:'http://localhost:3102'}});expect(ownedReply.status()).toBe(200);expect(await ownedReply.json()).toEqual({state:'blocked_provider'});
  expect((await page.request.post(replyPath,{headers:{Origin:'https://untrusted.example'}})).status()).toBe(403);
  expect((await page.request.post(replyPath)).status()).toBe(403);
  expect((await page.request.post(`/api/conversations/${id}/replies/${randomUUID()}`,{headers:{Origin:'http://localhost:3102'}})).status()).toBe(404);
  const foreignStart=await b.rpc('start_conversation',{p_character:character});expect(foreignStart.error).toBeNull();
  const foreignMessage=await b.rpc('save_user_message',{p_conversation:foreignStart.data,p_client_id:randomUUID(),p_generation:1,p_text:'Synthetic foreign reply target'});expect(foreignMessage.error).toBeNull();
  expect((await page.request.post(`/api/conversations/${foreignStart.data}/replies/${foreignMessage.data.id}`,{headers:{Origin:'http://localhost:3102'}})).status()).toBe(404);
  const anonymous=await page.context().browser()!.newContext();try{expect((await anonymous.request.post(`http://localhost:3102${replyPath}`,{headers:{Origin:'http://localhost:3102'}})).status()).toBe(401);}finally{await anonymous.close();}
  // Trusted synthetic message fixture exercises real approved Storage/UI while AI stays disabled.
  const gallery=(await a.from('character_assets').select('id').eq('character_id',character).eq('slot','gallery').single()).data!.id;
  for(const fixtureId of [id,users[0],gallery])expect(/^[a-f0-9-]{36}$/.test(fixtureId)).toBe(true);
  execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:`begin;insert into public.messages(conversation_id,sequence,role,kind,asset_id) select id,next_sequence,'character','photo','${gallery}' from public.conversations where id='${id}' and user_id='${users[0]}';update public.conversations set next_sequence=next_sequence+1 where id='${id}' and user_id='${users[0]}';commit;`,windowsHide:true,stdio:['pipe','pipe','pipe']});
  await page.reload();const photo=page.locator('.chat-photo__image img');await expect.poll(()=>photo.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const photoButton=page.getByRole('button',{name:'View Amara’s character photo'});await photoButton.click();await expect(page.getByRole('dialog',{name:'Amara’s character photo'})).toBeVisible();await expect.poll(()=>page.locator('.connected-photo-viewer').evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);await page.keyboard.press('Escape');await expect(photoButton).toBeFocused();
  const photoRoute=`**/api/cast-assets/${gallery}?*`;await page.route(photoRoute,route=>route.fulfill({status:503,body:''}));const failedPhotoResponse=page.waitForResponse(response=>response.url().includes(`/api/cast-assets/${gallery}`)&&response.status()===503);await page.reload();await failedPhotoResponse;await expect(page.getByText('Photo is unavailable.',{exact:true})).toBeVisible();await page.unroute(photoRoute);await page.getByRole('button',{name:'Reload photo',exact:true}).click();await expect.poll(()=>photo.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  mkdirSync('docs/reviews/stage-10',{recursive:true});await page.screenshot({path:'docs/reviews/stage-10/photo-390.png',fullPage:true,caret:'initial'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  mkdirSync('docs/reviews/stage-10',{recursive:true});await page.screenshot({path:'docs/reviews/stage-10/thread-390.png',fullPage:true,caret:'initial'});
  await page.getByRole('link',{name:'Manage memories with Amara'}).click();
  await expect(page.getByText('Memory is off',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Turn memory on',exact:true}).click();
  await page.getByLabel('A fact to remember').fill('Synthetic fact to delete.');
  await page.getByRole('checkbox',{name:'I give permission to save this fact and use it in future chats with this character.'}).check();await page.getByRole('button',{name:'Save memory',exact:true}).click();
  await expect(page.getByText('Synthetic fact to delete.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Turn memory off',exact:true}).click();await expect(page.getByLabel('A fact to remember')).toHaveCount(0);await expect(page.getByText('Synthetic fact to delete.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Turn memory on',exact:true}).click();await page.getByRole('button',{name:'Delete memory',exact:true}).click();await expect(page.getByText('Synthetic fact to delete.',{exact:true})).toHaveCount(0);
  await page.getByLabel('A fact to remember').fill('Synthetic Sunday walks.');await page.getByRole('checkbox',{name:'I give permission to save this fact and use it in future chats with this character.'}).check();await page.getByRole('button',{name:'Save memory',exact:true}).click();
  await expect(page.getByText('Synthetic Sunday walks.',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Synthetic Sunday walks.',{exact:true})).toBeVisible();
  expect((await b.from('memories').select('id').eq('character_id',character)).data).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/reviews/stage-10/memories-390.png',fullPage:true,caret:'initial'});
  await page.goto(`/messages/${id}`);
  await page.getByText('Conversation options',{exact:true}).click();await page.getByRole('button',{name:'Archive conversation',exact:true}).click();
  await expect(page.getByLabel('Message Amara')).toBeDisabled();await expect(page.locator('.message-bubble')).toBeVisible();
  await page.getByRole('button',{name:'Restore conversation',exact:true}).click();await expect(page.getByLabel('Message Amara')).toBeEnabled();
  await page.getByText('Reset conversation',{exact:true}).click();await expect(page.getByRole('checkbox',{name:'Also clear saved memories for this character'}).first()).not.toBeChecked();
  await page.getByRole('button',{name:'Confirm reset',exact:true}).click();await expect(page.locator('.message-bubble')).toHaveCount(0);
  await expect(page.locator('.chat-photo')).toHaveCount(0);
  expect((await a.from('memories').select('content').eq('character_id',character)).data).toEqual([{content:'Synthetic Sunday walks.'}]);
  expect((await a.rpc('save_user_message',{p_conversation:id,p_client_id:saved.client_message_id,p_generation:1,p_text:'A synthetic message that survives refresh.'})).error).not.toBeNull();
  await page.getByText('Delete conversation',{exact:true}).click();await page.getByRole('button',{name:'Confirm delete',exact:true}).click();await expect(page).toHaveURL(/\/messages$/);
  await expect(page.getByText('Your first conversation starts here',{exact:true})).toBeVisible();
  expect((await a.rpc('conversation_thread',{p_id:id})).error).not.toBeNull();
  expect(errors).toEqual([]);
 }finally {
  await a.auth.signOut();await b.auth.signOut();
  for(const id of users) {
   expect(/^[a-f0-9-]{36}$/.test(id)).toBe(true);
   execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:`delete from public.memories where user_id='${id}';delete from public.memory_preferences where user_id='${id}';delete from public.messages where conversation_id in(select id from public.conversations where user_id='${id}');delete from public.conversations where user_id='${id}';`,windowsHide:true,stdio:['pipe','pipe','pipe']});
   expect((await service.auth.admin.deleteUser(id)).error).toBeNull();
  }
 }
});

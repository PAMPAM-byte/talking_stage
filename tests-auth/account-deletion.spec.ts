import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

test('account deletion confirms password, erases owned data and rejects old access',async({page})=>{
 test.setTimeout(150000);
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
 const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,options),viewer=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,options);
 const email=`deletion-${randomUUID()}@example.test`,password=`Ts!${randomUUID()}Aa9`;
 const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1'}});
 expect(created.error).toBeNull();const id=created.data.user!.id;let deleted=false;
 try {
  expect((await viewer.auth.signInWithPassword({email,password})).error).toBeNull();
  expect((await viewer.rpc('save_preferences',{p_name:'Synthetic deletion',p_genders:['woman'],p_language:'english',p_requests:false,p_version:1})).error).toBeNull();
  expect((await viewer.rpc('complete_onboarding',{p_version:2,p_consent:true})).error).toBeNull();
  const manifest=JSON.parse(readFileSync('.local-services/photo-refresh.json','utf8')),character=manifest.characters['char-amara'].id;
  const conversation=await viewer.rpc('start_conversation',{p_character:character});expect(conversation.error).toBeNull();
  const message=await viewer.rpc('save_user_message',{p_conversation:conversation.data,p_client_id:randomUUID(),p_generation:1,p_text:'Synthetic private message to erase'});expect(message.error).toBeNull();
  expect((await viewer.rpc('manage_memory',{p_character:character,p_operation:'enable'})).error).toBeNull();
  expect((await viewer.rpc('manage_memory',{p_character:character,p_operation:'save',p_content:'Synthetic private memory',p_consent:true})).error).toBeNull();
  const report=await viewer.rpc('submit_report',{p_kind:'message',p_target:message.data.id,p_reason:'Other',p_details:'Synthetic private detail',p_operation:randomUUID()});expect(report.error).toBeNull();
  await page.setViewportSize({width:390,height:844});await page.goto('/sign-in');await page.getByRole('textbox',{name:'Email address',exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/discover$/);
  await page.getByRole('link',{name:'Settings',exact:true}).click();await page.getByRole('link',{name:'Delete account',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Delete account',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Review account deletion',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Delete my account',exact:true})).toBeDisabled();
  await dialog.getByRole('button',{name:'Keep account',exact:true}).click();await expect(dialog).toHaveCount(0);
  await page.getByRole('button',{name:'Review account deletion',exact:true}).click();
  await dialog.getByRole('textbox',{name:'Type DELETE to confirm',exact:true}).fill('DELETE');
  await dialog.getByLabel('Current password',{exact:true}).fill('Incorrect-synthetic-password!');await dialog.getByRole('button',{name:'Delete my account',exact:true}).click();
  await expect(dialog.getByText('Your password could not be confirmed. Check it and try again.',{exact:true})).toBeVisible();
  await expect(dialog.getByRole('textbox',{name:'Type DELETE to confirm',exact:true})).toHaveValue('DELETE');
  expect((await service.auth.admin.getUserById(id)).data.user?.id).toBe(id);
  await dialog.getByLabel('Current password',{exact:true}).fill(password);
  // An interrupted response cannot establish whether a deletion committed.
  await page.route('**/settings/account', route => route.request().headers()['next-action'] ? route.abort('failed') : route.continue());
  await dialog.getByRole('button',{name:'Delete my account',exact:true}).click();
  await expect(dialog.getByText('We could not confirm deletion. Check your connection and sign in again to check your account.',{exact:true})).toBeVisible();
  await expect(dialog.getByRole('textbox',{name:'Type DELETE to confirm',exact:true})).toHaveValue('DELETE');
  await page.unroute('**/settings/account');
  expect((await service.auth.admin.getUserById(id)).data.user?.id).toBe(id);
  mkdirSync('docs/reviews/account-deletion',{recursive:true});await page.screenshot({path:'docs/reviews/account-deletion/confirmation-390.png'});
  await dialog.getByRole('button',{name:'Delete my account',exact:true}).click();await expect(page).toHaveURL(/\/account-deleted$/);deleted=true;
  await expect(page.getByRole('heading',{name:'Account deleted',exact:true})).toBeVisible();await page.screenshot({path:'docs/reviews/account-deletion/deleted-390.png'});
  expect((await service.auth.admin.getUserById(id)).data.user).toBeNull();
  for(const table of ['profiles','conversations','memories','memory_preferences','reports']){const field=table==='profiles'?'id':table==='reports'?'reporter_id':'user_id';const result=await service.from(table).select(field).eq(field,id);expect(result.error).toBeNull();expect(result.data).toEqual([]);}
  expect((await viewer.rpc('conversation_thread',{p_id:conversation.data})).error).not.toBeNull();
  expect((await viewer.auth.signInWithPassword({email,password})).error).not.toBeNull();
  await page.goto('/settings');await expect(page).toHaveURL(/\/sign-in$/);
 } finally {
  if(!deleted){expect(/^[a-f0-9-]{36}$/.test(id)).toBe(true);execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:`delete from private.report_resolutions where report_id in(select id from public.reports where reporter_id='${id}');delete from public.reports where reporter_id='${id}';delete from public.memories where user_id='${id}';delete from public.memory_preferences where user_id='${id}';delete from public.messages where conversation_id in(select id from public.conversations where user_id='${id}');delete from public.conversations where user_id='${id}';`,windowsHide:true,stdio:['pipe','pipe','pipe']});expect((await service.auth.admin.deleteUser(id)).error).toBeNull();}
 }
});

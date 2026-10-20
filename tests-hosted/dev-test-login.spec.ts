import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.skip(process.env.TALKINGSTAGE_DEV_LOGIN_TEST !== '1', 'Uses the dedicated development-login configuration.');

test('ordinary sign-in visits never submit the development account automatically', async ({page}) => {
 let posts=0;
 page.on('request',request=>{if(request.method()==='POST')posts++;});
 await page.goto('/sign-in');
 await expect(page.getByLabel('Email address')).toBeVisible();
 await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Sign in with test account'})).toBeHidden();
 await page.evaluate(()=>window.history.pushState(null,'','/sign-in?manual=1'));
 await page.evaluate(()=>window.history.pushState(null,'','/sign-in'));
 await page.getByText('Development options',{exact:true}).click();
 await expect(page.getByRole('button',{name:'Sign in with test account'})).toBeVisible();
 await expect(page.locator('.notice [role="alert"]')).toHaveCount(0);
 expect(posts).toBe(0);
});

test('a stalled explicit test login leaves regular sign-in available', async ({page}) => {
 await page.clock.install();
 let release!:()=>void;
 const blocked=new Promise<void>(resolve=>{release=resolve;});
 let posts=0;
 await page.route('**/sign-in*',async route=>{
  if(route.request().method()!=='POST')return route.continue();
  posts++;await blocked;await route.abort('failed');
 });
 await page.goto('/sign-in');
 await page.getByText('Development options',{exact:true}).click();
 await page.getByRole('button',{name:'Sign in with test account'}).click();
 await expect.poll(()=>posts).toBe(1);
 await page.clock.fastForward(26000);
 await expect(page.locator('.notice [role="alert"]')).toContainText('taking too long');
 await expect(page.getByLabel('Email address')).toBeEnabled();
 await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Try test sign-in again'})).toBeEnabled();
 release();
 await expect(page.locator('.notice [role="alert"]')).toContainText('taking too long');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('using the normal form cancels a pending test-login continuation',async({page})=>{
 let release!:()=>void;
 const blocked=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/sign-in*',async route=>{
  if(route.request().method()!=='POST')return route.continue();
  await blocked;await route.abort('failed');
 });
 await page.goto('/sign-in');
 await page.getByText('Development options',{exact:true}).click();
 await page.getByRole('button',{name:'Sign in with test account'}).click();
 await expect(page.getByRole('status')).toHaveText('Signing in to the test account...');
 await page.getByLabel('Email address').fill('someone@example.com');
 release();
 await expect(page.getByRole('status')).toHaveCount(0);
 await expect(page.locator('.notice [role="alert"]')).toHaveCount(0);
 await expect(page.getByLabel('Email address')).toHaveValue('someone@example.com');
 await expect(page).toHaveURL(/\/sign-in$/);
});

test('explicit test login keeps credentials private and sign-out stays signed out',async({page,context})=>{
 const credentials=JSON.parse(readFileSync('.local-services/hosted-cast/test-account.json','utf8')) as {password:string};
 let posts=0,browserSentCredential=false;
 page.on('request',request=>{
  if(request.method()==='POST'&&new URL(request.url()).pathname==='/sign-in'){
   posts++;browserSentCredential||=(request.postData()??'').includes(credentials.password);
  }
 });
 const response=await page.goto('/sign-in');
 expect((await response!.text()).includes(credentials.password)).toBe(false);
 await expect(page.getByLabel('Email address')).toHaveValue('');
 await expect(page.getByLabel('Password',{exact:true})).toHaveValue('');
 expect(posts).toBe(0);
 await page.getByText('Development options',{exact:true}).click();
 await page.getByRole('button',{name:'Sign in with test account'}).click();
 await page.waitForURL('**/discover',{timeout:90000});
 expect(posts).toBe(1);expect(browserSentCredential).toBe(false);
 const auth=(await context.cookies()).filter(cookie=>/^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name));
 expect(auth.length>0).toBe(true);
 expect(auth.every(cookie=>cookie.httpOnly&&cookie.sameSite==='Lax')).toBe(true);
 await page.goto('/settings');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page).toHaveURL(/\/sign-in\?manual=1$/);
 await expect(page.getByLabel('Email address')).toBeVisible();
 await page.goto('/sign-in');
 await expect(page.getByLabel('Email address')).toBeVisible();
 await expect(page.getByRole('button',{name:'Sign in with test account'})).toBeHidden();
 expect(posts).toBe(1);
});

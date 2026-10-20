import {test,expect} from '@playwright/test';

test('a stalled conversation exposes recovery without reloading or sending automatically',async({page})=>{
 await page.clock.install();
 let posts=0,navigations=0;
 page.on('request',request=>{if(request.method()==='POST')posts++;if(request.isNavigationRequest())navigations++;});
 await page.goto('/dev/chat-delivery?scenario=loading');
 await expect(page.getByRole('status')).toHaveText('Loading conversation');
 await expect(page.locator('[data-recovery-ready="true"]')).toBeVisible();
 await page.clock.fastForward(16000);
 await expect(page.getByRole('heading',{name:'This is taking longer than expected.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Reload conversation'})).toBeVisible();
 expect(posts).toBe(0);expect(navigations).toBe(1);
 for(const width of [320,390,900]){
  await page.setViewportSize({width,height:650});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByRole('button',{name:'Reload conversation'}).click();
 await expect(page.getByRole('status')).toHaveText('Loading conversation');
 expect(posts).toBe(0);expect(navigations).toBe(2);
});

test('conversation render recovery offers explicit reload and return navigation',async({page})=>{
 await page.goto('/dev/chat-delivery?scenario=render-error');
 await expect(page.getByRole('heading',{name:'This conversation could not load.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Reload conversation'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Back to messages'})).toHaveAttribute('href','/messages');
 await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
});

test('native recovery works before hydration on an unfinished server stream',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});
 try{
  const page=await context.newPage();
  let posts=0;
  page.on('request',request=>{if(request.method()==='POST')posts++;});
  await page.goto('http://localhost:3103/dev/chat-delivery?scenario=server-stall',{waitUntil:'commit'});
  await expect(page.getByRole('status')).toHaveText('Loading conversation');
  await expect(page.getByRole('link',{name:'Reload conversation'})).toHaveAttribute('href','');
  await expect(page.getByRole('link',{name:'Back to messages'})).toBeVisible();
  await Promise.all([
   page.waitForURL('**/messages',{waitUntil:'commit'}),
   page.getByRole('link',{name:'Back to messages'}).click({noWaitAfter:true}),
  ]);
  expect(posts).toBe(0);
 }finally{await context.close();}
});

import {test,expect} from '@playwright/test';

test('interrupted cancellation preserves observation, delivery and the next draft',async({page})=>{
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'generating'}}));
 await page.goto('/dev/chat-delivery');
 const input=page.getByRole('textbox',{name:'Message Amara'});
 await input.fill('Already saved.');await input.press('Enter');
 await expect(page.locator('.typing-bubble')).toBeVisible();
 await input.fill('My next thought.');
 await page.getByRole('button',{name:'Fail next stop'}).click();
 await page.getByRole('button',{name:'Stop reply'}).click();
 await expect(page.getByText('We couldn’t confirm the reply stopped. Reload to check.',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toBeVisible();
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(input).toHaveValue('My next thought.');
});

test('reply observation expires and an explicit retry starts a fresh window',async({page})=>{
 await page.clock.install();
 let posts=0;
 let reads=0;
 await page.route('**/api/conversations/**/replies/**',route=>{
  if(route.request().method()==='POST')posts++;
  else reads++;
  return route.fulfill({json:{state:'generating',attempts:1}});
 });
 await page.goto('/dev/chat-delivery?scenario=unstarted');
 await expect(page.locator('.typing-bubble')).toBeVisible();
 // The initial bubble is server-rendered; wait for the observer effect before
 // advancing its clock so the test measures an active observation window.
 await expect.poll(()=>reads).toBeGreaterThan(0);
 await page.clock.fastForward(61000);
 await expect(page.getByText('Your message is saved. Reload to check the reply.',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 await page.getByRole('button',{name:'Retry reply'}).click();
 await expect.poll(()=>posts).toBe(1);
 await page.clock.fastForward(3000);
 await expect(page.locator('.typing-bubble')).toBeVisible();
 await expect(page.getByText('Previously saved message.',{exact:true})).toBeVisible();
});

test('reopening recovers an unstarted saved job once without replaying failed attempts',async({page})=>{
 let posts=0;
 await page.route('**/api/conversations/**/replies/**',route=>{
  if(route.request().method()==='POST'){posts++;return route.fulfill({json:{state:'completed'}});}
  return route.fulfill({json:{state:'blocked_provider',attempts:0}});
 });
 await page.goto('/dev/chat-delivery?scenario=unstarted');
 await expect(page.getByText('Previously saved message.',{exact:true})).toBeVisible();
 await expect.poll(()=>posts).toBe(1);
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 await page.goto('/dev/chat-delivery?scenario=failed');
 await expect(page.getByText('Previously saved message.',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 await page.goto('/dev/chat-delivery?scenario=attempted');
 await expect(page.getByText('Previously saved message.',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 expect(posts).toBe(1);
});

test('status access loss stops polling without turning delivery into failure',async({page})=>{
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({status:401,json:{state:'unauthorized'}}));
 await page.goto('/dev/chat-delivery');
 await page.getByRole('textbox',{name:'Message Amara'}).fill('A saved message.');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByText('Your message is saved. Reload to check this conversation.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Retry sending'})).toHaveCount(0);
});

test('optimistic bubble, saved tick and typing have independent lifetimes',async({page})=>{
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'generating'}}));
 await page.goto('/dev/chat-delivery');
 const input=page.getByRole('textbox',{name:'Message Amara'});
 await input.fill('A little hello.');await input.press('Enter');
 await expect(page.getByText('A little hello.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Sending',{exact:true})).toBeVisible();
 await expect(input).toHaveValue('');
 await input.fill('I can keep writing.');
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toBeVisible();
 await expect(page.getByRole('button',{name:'Send message'})).toBeEnabled();
 await expect(page.locator('.message-turn--user')).toHaveCount(1);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(input).toBeInViewport();
 }
 await page.screenshot({path:'docs/reviews/chat-delivery-1440.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'docs/reviews/chat-delivery-390.png'});
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await page.locator('.typing-bubble > span').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'completed'}}));
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 await expect(input).toHaveValue('I can keep writing.');
});

test('delivery failure keeps text in its bubble and retries without duplication',async({page})=>{
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'generating'}}));
 await page.goto('/dev/chat-delivery');await page.getByRole('button',{name:'Fail next save'}).click();
 await page.getByRole('textbox',{name:'Message Amara'}).fill('Keep this message.');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByRole('button',{name:'Retry sending'})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 const clientId=await page.locator('[data-delivery="failed"]').getAttribute('data-client-id');
 await page.getByRole('button',{name:'Retry sending'}).click();
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(page.locator('.message-turn--user')).toHaveCount(1);
 await expect(page.locator('.message-turn--user')).toHaveAttribute('data-client-id',clientId!);
 await expect(page.locator('.typing-bubble')).toBeVisible();
});

test('a failed AI reply does not turn a saved message into a delivery failure',async({page})=>{
 let postRequests=0;
 await page.route('**/api/conversations/**/replies/**',route=>{
  if(route.request().method()==='POST')postRequests++;
  return route.fulfill({json:{state:'failed'}});
 });
 await page.goto('/dev/chat-delivery');
 await page.getByRole('textbox',{name:'Message Amara'}).fill('Delivery and reply are separate.');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByText('Your message is saved. You can retry the reply below it.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Retry sending'})).toHaveCount(0);
 expect(postRequests).toBe(0);
});

test('stopping a reply preserves delivery and the next draft',async({page})=>{
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'generating'}}));
 await page.goto('/dev/chat-delivery');
 const input=page.getByRole('textbox',{name:'Message Amara'});
 await input.fill('Hello again.');await input.press('Enter');
 await expect(page.locator('.typing-bubble')).toBeVisible();await input.fill('My next thought.');
 await page.getByRole('button',{name:'Stop reply'}).click();
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(input).toHaveValue('My next thought.');
});

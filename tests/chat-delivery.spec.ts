import {test,expect} from '@playwright/test';

test('queued replies stay saved until the server confirms generation',async({page})=>{
 let started=false;
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:started?{state:'generating',attempts:1}:{state:'earlier_reply_pending',attempts:0}}));
 await page.goto('/dev/chat-delivery');
 await page.getByRole('textbox',{name:'Message Amara'}).fill('A queued message.');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByText('Preparing a reply…',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Seen',{exact:true})).toHaveCount(0);
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 started=true;
 await expect(page.getByLabel('Seen',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toBeVisible();
});

test('a saved message keeps one tick when no reply starts',async({page})=>{
 await page.goto('/dev/chat-delivery?scenario=disabled');
 await page.getByRole('textbox',{name:'Message Amara'}).fill('Saved without a reply.');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Seen',{exact:true})).toHaveCount(0);
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
});

test('reopened generating messages already have double ticks and retain them after stopping',async({page})=>{
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'generating',attempts:1}}));
 await page.goto('/dev/chat-delivery?scenario=generating');
 await expect(page.locator('.typing-bubble')).toBeVisible();
 await expect(page.getByLabel('Seen',{exact:true})).toBeVisible();
 await expect(page.locator('.message-delivery--seen svg path')).toHaveCount(2);
 await page.getByRole('button',{name:'Stop reply'}).click();
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 await expect(page.getByLabel('Seen',{exact:true})).toBeVisible();
});

test('each receipt belongs to its own message',async({page})=>{
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'generating',attempts:1}}));
 await page.goto('/dev/chat-delivery?scenario=failed');
 const previous=page.locator('.message-turn--user').filter({hasText:'Previously saved message.'});
 await expect(previous.getByLabel('Seen',{exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'Message Amara'}).fill('A new message.');
 await page.getByRole('button',{name:'Send message'}).click();
 const next=page.locator('.message-turn--user').filter({hasText:'A new message.'});
 await expect(next.getByLabel('Sending',{exact:true})).toBeVisible();
 await expect(previous.getByLabel('Seen',{exact:true})).toBeVisible();
 await expect(next.getByLabel('Seen',{exact:true})).toBeVisible();
});

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
 await expect(page.getByLabel('Seen',{exact:true})).toBeVisible();
 await expect(input).toHaveValue('My next thought.');
});

test('late replies continue updating after sixty seconds without regeneration',async({page})=>{
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
 await expect(page.locator('.typing-bubble')).toBeVisible();
 const priorReads=reads;
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'completed',attempts:1}}));
 await page.clock.fastForward(11000);
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 expect(reads).toBeGreaterThanOrEqual(priorReads);
 expect(posts).toBe(0);
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

test('conversation access loss reconciles automatically without turning delivery into failure',async({page})=>{
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({status:404,json:{state:'unavailable'}}));
 await page.goto('/dev/chat-delivery');
 await page.getByRole('textbox',{name:'Message Amara'}).fill('A saved message.');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Retry sending'})).toHaveCount(0);
});

test('pending clock becomes double ticks alongside typing before a reply arrives',async({page})=>{
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'generating'}}));
 await page.goto('/dev/chat-delivery');
 const input=page.getByRole('textbox',{name:'Message Amara'});
 await input.fill('A little hello.');await input.press('Enter');
 await expect(page.getByText('A little hello.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Sending',{exact:true})).toBeVisible();
 await expect(input).toHaveValue('');
 await input.fill('I can keep writing.');
 await expect(page.getByLabel('Seen',{exact:true})).toBeVisible();
 await expect(page.locator('.typing-bubble')).toBeVisible();
 await expect(page.getByRole('button',{name:'Send message'})).toBeEnabled();
 await expect(page.locator('.message-turn--user')).toHaveCount(1);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(input).toBeInViewport();
 }
 await page.screenshot({path:'test-results/chat-receipts-1440.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/chat-receipts-390.png'});
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
 await expect(page.getByLabel('Seen',{exact:true})).toBeVisible();
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
 await expect(page.getByLabel('Saved',{exact:true})).toBeVisible();
 await expect(page.locator('.chat-delivery-notice')).toHaveCount(0);
 await expect(page.getByLabel('Seen',{exact:true})).toHaveCount(0);
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
 await expect(page.getByLabel('Seen',{exact:true})).toBeVisible();
 await expect(input).toHaveValue('My next thought.');
});

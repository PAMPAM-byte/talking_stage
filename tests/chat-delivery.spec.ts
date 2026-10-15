import {test,expect} from '@playwright/test';

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

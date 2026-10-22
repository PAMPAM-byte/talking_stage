import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`send recovers a transient session check at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const requests:string[]=[];
 await page.route('**/api/conversations/*/messages',route=>{
  requests.push(route.request().postData()!);
  return requests.length===1?route.fulfill({status:503,json:{code:'unavailable',error:'Synthetic identity lookup interrupted'}}):route.fulfill({json:{messageId:'00000000-0000-4000-8000-000000000002'}});
 });
 await page.route('**/api/conversations/**/replies/**',route=>route.fulfill({json:{state:'generating'}}));
 await page.goto('/dev/chat-delivery?scenario=transport');
 const input=page.getByRole('textbox',{name:'Message Amara'});await input.fill('Keep my introduction.');await page.getByRole('button',{name:'Send message'}).click();
 await input.fill('My next thought');
 await expect(page.getByLabel('Seen',{exact:true})).toBeVisible();
 expect(requests).toHaveLength(2);expect(requests[0]).toBe(requests[1]);
 await expect(page.locator('.message-turn--user')).toHaveCount(1);
 await expect(page.getByText('Sign in with an eligible account.')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Retry sending'})).toHaveCount(0);
 await expect(input).toHaveValue('My next thought');await expect(page).toHaveURL(/scenario=transport/);
});

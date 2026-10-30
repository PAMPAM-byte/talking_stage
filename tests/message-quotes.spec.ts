import {test,expect,type Page} from '@playwright/test';
test.use({hasTouch:true});
const first='00000000-0000-4000-8000-000000000011';
async function swipe(page:Page,dx:number,dy=0){
 await expect(page.locator(`#message-${first}`).getByRole('button')).toBeEnabled();
 const bubble=page.locator(`#message-${first} .message-bubble`);await bubble.scrollIntoViewIfNeeded();const box=(await bubble.boundingBox())!;
 const session=await page.context().newCDPSession(page);const x=box.x+box.width/2,y=box.y+box.height/2;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let step=1;step<=5;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step/5,y:y+dy*step/5}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
}
test('desktop reply, cancel, keyboard and quote navigation preserve the draft',async({page})=>{
 await page.goto('/dev/chat-delivery?scenario=quotes');const input=page.getByRole('textbox',{name:'Message Amara'});await input.fill('My next thought');
 await page.locator(`#message-${first}`).hover();await page.locator(`#message-${first}`).getByRole('button',{name:'Reply to Amara’s message'}).click();
 const draft=page.getByLabel('Replying to message',{exact:true});await expect(draft).toContainText('Coffee tomorrow');await expect(input).toBeFocused();await expect(input).toHaveValue('My next thought');
 await input.press('Escape');await expect(draft).toHaveCount(0);await expect(input).toHaveValue('My next thought');
 await page.locator(`#message-${first}`).getByRole('button').focus();await page.keyboard.press('Enter');await expect(draft).toBeVisible();
 await page.getByRole('button',{name:'Cancel reply'}).click();await expect(input).toBeFocused();
 await page.getByRole('link',{name:/View quoted message from You/}).click();await expect(page.locator('#message-00000000-0000-4000-8000-000000000012')).toBeFocused();
});
test('a quoted send and retry retain the original quote without overwriting a new selection',async({page})=>{
 await page.goto('/dev/chat-delivery?scenario=quotes');await page.getByRole('button',{name:'Fail next quoted save'}).click();
 await page.locator(`#message-${first}`).getByRole('button').click();const input=page.getByRole('textbox',{name:'Message Amara'});await input.fill('Yes, about that coffee.');await input.press('Enter');
 const failed=page.locator('[data-delivery="failed"]');await expect(failed).toContainText('Coffee tomorrow');await expect(failed).toContainText('Yes, about that coffee.');
 await page.locator('#message-00000000-0000-4000-8000-000000000014').getByRole('button').click();
 await expect(page.getByLabel('Replying to message',{exact:true})).toContainText('Sticker');
 await failed.getByRole('button',{name:'Retry sending'}).click();
 const saved=page.locator('.message-turn--user').filter({hasText:'Yes, about that coffee.'});await expect(saved).toHaveCount(1);await expect(saved).toContainText('Coffee tomorrow');
 await expect(page.getByLabel('Replying to message',{exact:true})).toContainText('Sticker');
});
test('users can quote their own message and stickers render as media summaries',async({page})=>{
 await page.goto('/dev/chat-delivery?scenario=quotes');await page.locator('#message-00000000-0000-4000-8000-000000000012').getByRole('button',{name:'Reply to your message'}).click();
 await expect(page.getByLabel('Replying to message',{exact:true})).toContainText('You');
 await page.getByRole('button',{name:'Cancel reply'}).click();await page.locator('#message-00000000-0000-4000-8000-000000000014').getByRole('button').click();
 await expect(page.getByLabel('Replying to message',{exact:true})).toContainText('Sticker');await expect(page.getByLabel('Replying to message',{exact:true})).not.toContainText('[[ts:');
});
test('touch swipe respects threshold, cancellation and vertical scrolling',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/dev/chat-delivery?scenario=quotes');
 await swipe(page,25);await expect(page.getByLabel('Replying to message',{exact:true})).toHaveCount(0);
 await swipe(page,10,70);await expect(page.getByLabel('Replying to message',{exact:true})).toHaveCount(0);
 await swipe(page,70);await expect(page.getByLabel('Replying to message',{exact:true})).toContainText('Coffee tomorrow');
 await expect(page.getByRole('textbox',{name:'Message Amara'})).toBeFocused();
 await page.getByRole('button',{name:'Cancel reply'}).click();await swipe(page,-70);await expect(page.getByLabel('Replying to message',{exact:true})).toHaveCount(0);
});
for(const width of [320,390,768,1440])test(`quoted messages and composer fit ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/dev/chat-delivery?scenario=quotes');await page.locator(`#message-${first}`).getByRole('button').click();
 await expect(page.getByLabel('Replying to message',{exact:true})).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await page.locator(`#message-${first}`).locator('[data-dragging]').count()).toBe(0);
 await page.screenshot({path:`.local-services/message-quotes-${width}.png`});
});
test('each bubble of a texted burst can be quoted on its own',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/dev/chat-delivery?scenario=quotes');
 const burst=page.locator('#message-00000000-0000-4000-8000-000000000015');const draft=page.getByLabel('Replying to message',{exact:true});
 await expect(burst.locator('.message-bubble')).toHaveCount(3);await expect(burst.getByRole('button',{name:'Reply to Amara’s message'})).toBeHidden();
 const swipeBubble=async(index:number)=>{const bubble=burst.locator('.message-bubble').nth(index);await expect(bubble.getByRole('button',{name:/React to Amara’s text/})).toBeEnabled();await bubble.scrollIntoViewIfNeeded();const box=(await bubble.boundingBox())!;
  const session=await page.context().newCDPSession(page);const x=box.x+20,y=box.y+box.height/2;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let step=1;step<=5;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+70*step/5,y}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();};
 await swipeBubble(1);
 await expect(draft).toContainText('I burnt the jollof last night');await expect(draft).not.toContainText('small confession');
 await page.getByRole('button',{name:'Cancel reply'}).click();
 // On touch the per-bubble reply button gives way to the react button; swiping replies.
 await expect(burst.getByRole('button',{name:/Reply to Amara’s text/}).first()).toBeHidden();await swipeBubble(0);
 await expect(draft).toContainText('Okay small confession');await expect(draft).not.toContainText('jollof');
 const input=page.getByRole('textbox',{name:'Message Amara'});await input.fill('Tell me everything');await input.press('Enter');
 const saved=page.locator('.message-turn--user').filter({hasText:'Tell me everything'});await expect(saved).toHaveCount(1);
 await expect(saved).toContainText('Okay small confession');await expect(saved).not.toContainText('jollof');
 await page.screenshot({path:'.local-services/message-quotes-burst-390.png'});
});

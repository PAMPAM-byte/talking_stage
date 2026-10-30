import {test,expect} from '@playwright/test';
// Each bubble of a texted burst takes its own reaction (founder request, 30 Oct).
const burstId='#message-00000000-0000-4000-8000-000000000015';
test('desktop: react to one bubble, change it and remove it',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/dev/chat-delivery?scenario=quotes');
 const burst=page.locator(burstId);const first=burst.locator('.message-bubble').nth(0);const second=burst.locator('.message-bubble').nth(1);
 await expect(first.getByRole('button',{name:/React to Amara’s text: Okay small confession/})).toBeEnabled();
 await first.hover();await first.getByRole('button',{name:/React to Amara’s text/}).click();
 const picker=page.getByRole('region',{name:'Choose a reaction for this text'});
 await expect(picker).toContainText('Reacting to “Okay small confession”');
 await picker.getByRole('button',{name:'React 😂'}).click();await expect(picker).toHaveCount(0);
 await expect(first.getByRole('button',{name:/Your reaction 😂/})).toBeVisible();
 await expect(second.getByRole('button',{name:/Your reaction/})).toHaveCount(0);
 await first.getByRole('button',{name:/Your reaction 😂/}).click();await picker.getByRole('button',{name:'React ❤️'}).click();
 await expect(first.getByRole('button',{name:/Your reaction ❤️/})).toBeVisible();
 await first.getByRole('button',{name:/Your reaction ❤️/}).click();await picker.getByRole('button',{name:'React ❤️'}).click();
 await expect(first.getByRole('button',{name:/Your reaction/})).toHaveCount(0);
 // The whole-message picker still opens on its own, without a bubble target.
 await burst.getByRole('button',{name:'React to message'}).click();
 await expect(page.getByRole('region',{name:'Choose a reaction',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('region',{name:/Choose a reaction/})).toHaveCount(0);
});
test.describe('touch',()=>{
 test.use({hasTouch:true,isMobile:true});
 for(const width of [320,390])test(`a tapped bubble reacts instead of showing a reply button at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});await page.goto('/dev/chat-delivery?scenario=quotes');
  const second=page.locator(burstId).locator('.message-bubble').nth(1);await expect(second.getByRole('button',{name:/React to Amara’s text/})).toBeEnabled();
  await expect(second.getByRole('button',{name:/Reply to Amara’s text/})).toBeHidden();
  await second.tap();await second.getByRole('button',{name:/React to Amara’s text: I burnt the jollof/}).tap();
  await page.getByRole('region',{name:'Choose a reaction for this text'}).getByRole('button',{name:'React 😮'}).tap();
  await expect(second.getByRole('button',{name:/Your reaction 😮/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.chat-shell__messages').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:`.local-services/bubble-reactions-${width}.png`});
 });
});

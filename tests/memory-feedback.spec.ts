import {expect,test} from '@playwright/test';
const consent='I give permission to save this fact and use it in future chats with this character.';

test('saving without a conversation target confirms success and clears the fact and consent',async({page})=>{
 await page.goto('/dev/chat-delivery?scenario=memory-form');
 await page.getByLabel('A fact to remember').fill('A synthetic preference.');
 await page.getByLabel(consent).check();
 await page.getByRole('button',{name:'Save memory',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Memory saved');
 await expect(page.getByLabel('A fact to remember')).toHaveValue('');
 await expect(page.getByLabel(consent)).not.toBeChecked();
 await expect(page).toHaveURL(/scenario=memory-form$/);
});

test('a failed save keeps the fact and consent for correction',async({page})=>{
 await page.goto('/dev/chat-delivery?scenario=memory-failure');
 await page.getByLabel('A fact to remember').fill('Keep my unsaved synthetic fact.');
 await page.getByLabel(consent).check();
 await page.getByRole('button',{name:'Save memory',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Memory not updated'})).toContainText('Synthetic save unavailable.');
 await expect(page.getByLabel('A fact to remember')).toHaveValue('Keep my unsaved synthetic fact.');
 await expect(page.getByLabel(consent)).toBeChecked();
 await expect(page.getByRole('status')).toHaveCount(0);
});

test('a confirmed save returns to the supplied conversation',async({page})=>{
 const destination='/messages/00000000-0000-4000-8000-000000000001?memory=saved';
 await page.route('**/messages/00000000-0000-4000-8000-000000000001?**',route=>route.fulfill({contentType:'text/html',body:'<p>Conversation destination</p>'}));
 await page.goto('/dev/chat-delivery?scenario=memory-form');
 await page.goto('/dev/chat-delivery?scenario=memory-return');
 await page.getByLabel('A fact to remember').fill('A synthetic preference.');
 await page.getByLabel(consent).check();
 await page.getByRole('button',{name:'Save memory',exact:true}).click();
 await expect(page).toHaveURL(new RegExp(destination.replace('?','\\?')+'$'));
 await page.goBack();
 await expect(page).toHaveURL(/scenario=memory-form$/);
});

test('the conversation confirmation removes its one-time URL flag and dismisses',async({page})=>{
 await page.clock.install();
 await page.goto('/dev/chat-delivery?scenario=memory-saved&memory=saved');
 await expect(page.getByRole('status')).toHaveText('Memory saved');
 await expect(page).toHaveURL(/scenario=memory-saved$/);
 await page.clock.fastForward(5100);
 await expect(page.getByRole('status')).toHaveCount(0);
});

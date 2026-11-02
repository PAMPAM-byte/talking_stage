import {test,expect} from '@playwright/test';
// One-screen payment (founder request, 2 Nov): pick an amount, see the recipient, pay.
test.beforeEach(async({page})=>{
 await page.goto('/dev/gifts');
 await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');
});
const custom=(page:import('@playwright/test').Page)=>page.getByRole('textbox',{name:'Or enter another amount'});
test('payment shows the character and registered recipient and requires an amount',async({page})=>{
 await page.getByRole('button',{name:'Pay',exact:true}).click();
 await expect(page.getByText('Choose or enter an amount to continue.',{exact:true})).toBeVisible();
 await expect(custom(page)).toBeFocused();
 await page.getByRole('button',{name:'₦5,000',exact:true}).click();
 await expect(page.getByRole('button',{name:'₦5,000',exact:true})).toHaveAttribute('aria-pressed','true');
 const form=page.locator('form.gift-form');await expect(form.getByText('Amara · TalkingStage',{exact:true})).toBeVisible();
 await expect(form.getByText('Synthetic registered operator',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Pay ₦5,000'})).toBeVisible();
 await expect(page.getByLabel('Synthetic attempt identifiers')).toBeEmpty();
});
test('uncertain checkout retries retain the operation and lock the amount',async({page})=>{
 await page.getByRole('button',{name:'₦5,000',exact:true}).click();await page.getByRole('button',{name:'Pay ₦5,000'}).click();
 await expect(page.getByRole('button',{name:'Retry payment'})).toBeVisible();
 const first=await page.getByLabel('Synthetic attempt identifiers').textContent();
 await expect(custom(page)).toBeDisabled();await expect(page.getByRole('button',{name:'₦10,000',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Retry payment'}).click();
 await expect(page.getByLabel('Synthetic attempt identifiers')).toHaveText(`${first},${first}`);
});
test('payment limits and responsive layout remain usable',async({page})=>{
 const amount=custom(page);
 for(const [value,message] of [['1','The minimum payment is'],['1999.99','The minimum payment is'],['1000000.01','The maximum payment is'],['5000.001','Enter a valid amount'],['1e4','Enter a valid amount'],['50,00','Enter a valid amount']]){
  await amount.fill(value);await expect(amount).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('.field__error')).toContainText(message);
  await page.getByRole('button',{name:'Pay',exact:true}).click();
  await expect(amount).toBeFocused();await expect(page.getByLabel('Synthetic attempt identifiers')).toBeEmpty();
 }
 for(const value of ['2000','1,000,000','50,000','50,000.50']){await amount.fill(value);await expect(amount).not.toHaveAttribute('aria-invalid');await expect(page.locator('.field__error')).toHaveCount(0);}
 await amount.fill('5000');await expect(page.getByRole('button',{name:'₦5,000',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Pay ₦5,000'}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Pay ₦5,000'})).toBeInViewport();}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/gift-pay-390.png',fullPage:true});
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'test-results/gift-pay-1440.png',fullPage:true});
});
test('comma-separated amounts work and stay within limits',async({page})=>{
 await custom(page).fill('50,000');
 await expect(page.getByRole('button',{name:'Pay ₦50,000',exact:true})).toBeVisible();
 await custom(page).fill('1,000,000.01');
 await expect(page.locator('.field__error')).toContainText('The maximum payment is ₦1,000,000');
});
test('receipts lead with the verified state and keep ledger facts readable',async({page})=>{
 const receipts=page.getByLabel('Receipt examples');
 for(const heading of ['Payment received','Payment pending','Payment failed'])await expect(receipts.getByText(heading,{exact:true})).toBeVisible();
 await expect(receipts.getByText('Paid to',{exact:true})).toHaveCount(1);
 await expect(receipts.getByText('TS-6f1c2a9e-4b7d-4e21-9c3a-1d2e3f4a5b6c').first()).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await receipts.screenshot({path:'test-results/gift-receipts-390.png'});
});

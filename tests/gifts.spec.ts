import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.goto('/dev/gifts');
 await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');
});
test('gift review distinguishes the character from the registered recipient and requires a chosen amount',async({page})=>{
 await page.getByRole('button',{name:'Review payment'}).click();
 await expect(page.getByText('Enter an amount to continue.',{exact:true})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Amount in NGN'})).toBeFocused();
 await page.getByRole('textbox',{name:'Amount in NGN'}).fill('5000');
 await page.getByRole('button',{name:'Review payment'}).click();
 await expect(page.getByText('Amara TalkingStage',{exact:true})).toBeVisible();
 await expect(page.getByText('Synthetic registered operator',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue to checkout (₦5,000)'})).toBeVisible();
 await expect(page.getByLabel('Synthetic attempt identifiers')).toBeEmpty();
 await page.getByRole('button',{name:'Change amount'}).click();
 await expect(page.getByRole('textbox',{name:'Amount in NGN'})).toHaveValue('5000');
});
test('uncertain checkout retries retain the operation and confirmed amount',async({page})=>{
 await page.getByRole('textbox',{name:'Amount in NGN'}).fill('5000');await page.getByRole('button',{name:'Review payment'}).click();await page.getByRole('button',{name:'Continue to checkout (₦5,000)'}).click();
 await expect(page.getByRole('button',{name:'Retry this checkout'})).toBeVisible();
 const first=await page.getByLabel('Synthetic attempt identifiers').textContent();
 await expect(page.getByRole('button',{name:'Change amount'})).toHaveCount(0);
 await page.getByRole('button',{name:'Retry this checkout'}).click();
 await expect(page.getByLabel('Synthetic attempt identifiers')).toHaveText(`${first},${first}`);
});
test('gift limits and responsive review remain usable',async({page})=>{
 const amount=page.getByRole('textbox',{name:'Amount in NGN'});
 for(const [value,message] of [['1','The minimum payment is'],['1999.99','The minimum payment is'],['1000000.01','The maximum payment is'],['5000.001','Enter a valid amount'],['1e4','Enter a valid amount'],['50,00','Enter a valid amount']]){
  await amount.fill(value);await expect(amount).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('.field__error')).toContainText(message);
  await page.getByRole('button',{name:'Review payment'}).click();
  await expect(amount).toBeFocused();await expect(page.getByLabel('Synthetic attempt identifiers')).toBeEmpty();
 }
 for(const value of ['2000','1,000,000','50,000','50,000.50']){await amount.fill(value);await expect(amount).not.toHaveAttribute('aria-invalid');await expect(page.locator('.field__error')).toHaveCount(0);}
 await amount.fill('5000');await page.getByRole('button',{name:'Review payment'}).click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Continue to checkout (₦5,000)'})).toBeInViewport();}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/gift-review-390.png'});
});

test('comma-separated payment amount reaches review and survives changing amount',async({page})=>{
 await page.getByRole('textbox',{name:'Amount in NGN'}).fill('50,000');
 await page.getByRole('button',{name:'Review payment'}).click();
 await expect(page.getByRole('button',{name:'Continue to checkout (₦50,000)',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Change amount'}).click();
 await expect(page.getByRole('textbox',{name:'Amount in NGN'})).toHaveValue('50,000');
 await page.getByRole('textbox',{name:'Amount in NGN'}).fill('1,000,000.01');
 await page.setViewportSize({width:390,height:844});
 await expect(page.locator('.field__error')).toContainText('The maximum payment is ₦1,000,000');
 await page.screenshot({path:'test-results/payment-amount-validation-390.png'});
});

import {test,expect} from '@playwright/test';
test('gift review distinguishes the character from the registered recipient and requires a chosen amount',async({page})=>{
 await page.goto('/dev/gifts');
 await expect(page.getByRole('button',{name:'Review gift'})).toBeDisabled();
 await page.getByRole('textbox',{name:'Gift amount in NGN'}).fill('5000');
 await page.getByRole('button',{name:'Review gift'}).click();
 await expect(page.getByText('Amara',{exact:true})).toBeVisible();
 await expect(page.getByText('Synthetic registered operator',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Confirm ₦5,000'})).toBeVisible();
 await expect(page.getByLabel('Synthetic attempt identifiers')).toBeEmpty();
 await page.getByRole('button',{name:'Change amount'}).click();
 await expect(page.getByRole('textbox',{name:'Gift amount in NGN'})).toHaveValue('5000');
});
test('uncertain checkout retries retain the operation and confirmed amount',async({page})=>{
 await page.goto('/dev/gifts');await page.getByRole('textbox',{name:'Gift amount in NGN'}).fill('5000');await page.getByRole('button',{name:'Review gift'}).click();await page.getByRole('button',{name:'Confirm ₦5,000'}).click();
 await expect(page.getByRole('button',{name:'Retry this checkout'})).toBeVisible();
 const first=await page.getByLabel('Synthetic attempt identifiers').textContent();
 await expect(page.getByRole('button',{name:'Change amount'})).toHaveCount(0);
 await page.getByRole('button',{name:'Retry this checkout'}).click();
 await expect(page.getByLabel('Synthetic attempt identifiers')).toHaveText(`${first},${first}`);
});
test('gift limits and responsive review remain usable',async({page})=>{
 await page.goto('/dev/gifts');const amount=page.getByRole('textbox',{name:'Gift amount in NGN'});
 for(const value of ['1','1999.99','1000000.01','5000.001','1e4']){await amount.fill(value);await expect(page.getByRole('button',{name:'Review gift'})).toBeDisabled();}
 for(const value of ['2000','1000000']){await amount.fill(value);await expect(page.getByRole('button',{name:'Review gift'})).toBeEnabled();}
 await amount.fill('5000');await page.getByRole('button',{name:'Review gift'}).click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Confirm ₦5,000'})).toBeInViewport();}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/gift-review-390.png'});
});

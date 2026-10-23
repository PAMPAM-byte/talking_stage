import {test,expect} from '@playwright/test';

for(const width of [320,390,1440])test(`photo viewer has a visible working close control at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:800});
 await page.goto('/sign-in');
 await page.getByLabel('Email address').fill('demo@talkingstage.example');
 await page.getByLabel('Password',{exact:true}).fill('TalkingStage123!');
 await page.getByRole('button',{name:'Sign in to preview'}).click();
 await expect(page).toHaveURL(/\/discover$/);
 await page.goto('/characters/char-amara');
 const opener=page.getByRole('button',{name:/View photos/});
 await opener.click();
 const dialog=page.getByRole('dialog');
 const close=dialog.getByRole('button',{name:/^Close .*photos/});
 await expect(close).toBeVisible();
 // A button can be visible while its glyph is squeezed to almost zero width.
 const bounds=await close.locator('svg').boundingBox();
 expect(bounds?.width).toBeGreaterThanOrEqual(20);
 expect(bounds?.height).toBeGreaterThanOrEqual(20);
 expect((await close.boundingBox())?.width).toBeGreaterThanOrEqual(44);
 await close.click();
 await expect(dialog).not.toBeVisible();
 await expect(opener).toBeFocused();
 await expect(page).toHaveURL(/\/characters\/char-amara$/);
 expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
 await opener.click();
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
 await expect(opener).toBeFocused();
});

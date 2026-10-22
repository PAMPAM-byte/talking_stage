import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`conversation dates and new-day outbox at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.clock.install({time:new Date('2026-10-22T10:00:00Z')});
 await page.goto('/dev/chat-delivery?scenario=dates');
 const log=page.getByRole('log');
 await expect(log.locator('time')).toHaveText(['20 October 2026','Yesterday']);
 await page.getByRole('textbox',{name:'Message Amara'}).fill('Hello again');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(log.locator('time').filter({hasText:/^Today$/})).toHaveCount(1);
 await expect(log.getByText('Hello again',{exact:true})).toBeVisible();
 await expect(log.locator('time[datetime="2026-10-22"]')).toHaveAttribute('aria-label',/22 October 2026/);
 await page.clock.fastForward(86400000);
 await expect(log.locator('time[datetime="2026-10-22"]')).toHaveText('Yesterday');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`check-in preference controls at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/dev/chat-delivery?scenario=checkins');
 await expect(page.getByRole('radio',{name:/^Off/})).toBeChecked();
 await page.getByRole('radio',{name:/^Occasional check-ins/}).check();await page.getByRole('button',{name:'Save preference',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Preference saved.');
 await page.getByRole('button',{name:'Fail next preference save'}).click();await page.getByRole('radio',{name:/^A little less often/}).check();await page.getByRole('button',{name:'Save preference',exact:true}).click();
 await expect(page.getByText('Synthetic save unavailable.')).toBeVisible();await expect(page.getByRole('radio',{name:/^A little less often/})).toBeChecked();
 await page.getByRole('radio',{name:/^When I return/}).check();await page.getByRole('button',{name:'Save preference',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Preference saved.');
 await page.getByRole('radio',{name:/^Off/}).check();await page.getByRole('button',{name:'Save preference',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Preference saved.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:`.local-services/checkin-preferences-${width}.png`});
});

import {expect,test} from '@playwright/test';

test('curated personality and interest filters combine to show matching characters',async({page})=>{
 await page.goto('/sign-in');
 await page.getByLabel('Email address').fill('demo@talkingstage.example');
 await page.getByLabel('Password',{exact:true}).fill('TalkingStage123!');
 await page.getByRole('button',{name:'Sign in to preview'}).click();
 await expect(page).toHaveURL(/\/discover$/);
 await page.getByRole('button',{name:/Filters/}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.locator('.filter-choice-options').first()).toHaveCSS('max-height','none');
 await expect(dialog.locator('.filter-choice-options').first()).toHaveCSS('overflow-y','visible');
 await dialog.locator('.discovery-filter-fields').evaluate(element=>{element.scrollTop=0;});
 await dialog.getByRole('group',{name:'Personality',exact:true}).getByRole('radio',{name:'baddie',exact:true}).check();
 await expect(dialog.getByText(/each character keeps her own temperament/)).toBeVisible();
 await dialog.getByRole('group',{name:'Interest',exact:true}).getByRole('radio',{name:'beauty',exact:true}).check();
 await dialog.getByRole('button',{name:'Apply filters',exact:true}).click();
 await expect(page.locator('.character-card h2')).toHaveText(/Ranti/);
 await page.getByRole('button',{name:'Pass Ranti',exact:true}).click();
 await expect(page.locator('.character-card h2')).toHaveText(/Zuri/);
 await page.getByRole('button',{name:/Filters/}).click();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(dialog.getByRole('button',{name:'Apply filters',exact:true})).toBeInViewport();
  if(width===390){await dialog.locator('.discovery-filter-fields').evaluate(element=>{element.scrollTop=0;});await page.screenshot({path:'test-results/curated-filters-390.png'});}
 }
});

import {expect,test,type Page,type Route} from '@playwright/test';

async function checkPendingChoice(page:Page,chosen:string,other:string){
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let started!:()=>void;
  const received=new Promise<void>(resolve=>{started=resolve;});
  let requestFinished:Promise<void>|undefined;
  const handler=async(route:Route)=>{
    if(route.request().method()==='POST' && route.request().headers()['next-action']){
      started();
      requestFinished=(async()=>{await gate;await route.continue();})();
      await requestFinished;
    }else await route.continue();
  };
  await page.route('**/onboarding/age',handler);
  try{
    await page.getByRole('button',{name:chosen,exact:true}).click();
    await received;
    const active=page.getByRole('button',{name:chosen,exact:true});
    const inactive=page.getByRole('button',{name:other,exact:true});
    await expect(active).toHaveAttribute('aria-busy','true');
    await expect(active.locator('.spinner')).toHaveCount(1);
    await expect(inactive).not.toHaveAttribute('aria-busy','true');
    await expect(inactive.locator('.spinner')).toHaveCount(0);
    await expect(active).toBeDisabled();await expect(inactive).toBeDisabled();
    await expect(page.getByRole('checkbox',{name:'I am 18 or older',exact:true})).toBeDisabled();
  }finally{release();await requestFinished;await page.unroute('**/onboarding/age',handler);}
}

test('age gate shows progress only for the selected action and prevents conflicting choices',async({page})=>{
  await page.goto('/onboarding/age');
  await page.getByRole('checkbox',{name:'I am 18 or older',exact:true}).check();
  await checkPendingChoice(page,'I am under 18','Continue');
  await expect(page.getByText('You can return when you are eligible.',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Back to TalkingStage',exact:true}).click();
  await expect(page).toHaveURL('http://localhost:3102/');
  await page.getByRole('link',{name:'Find your conversation'}).click();
  await page.getByRole('checkbox',{name:'I am 18 or older',exact:true}).check();
  await checkPendingChoice(page,'Continue','I am under 18');
  await expect(page).toHaveURL(/\/register$/);
});

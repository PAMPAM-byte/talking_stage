import {expect,test,type Route} from '@playwright/test';

test('return home preserves the blocked screen until landing is ready without flashing age inputs',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  let started!:()=>void;const received=new Promise<void>(resolve=>{started=resolve;});
  const pending:Promise<void>[]=[];
  const handler=async(route:Route)=>{
    if(new URL(route.request().url()).pathname==='/' && route.request().method()==='GET'){
      started();const work=(async()=>{await gate;await route.continue();})();pending.push(work);await work;
    }else await route.continue();
  };
  await page.route('**/*',handler);
  try{
    await page.goto('/onboarding/age');
    await page.getByRole('button',{name:'I am under 18',exact:true}).click();
    await expect(page.getByText('You can return when you are eligible.',{exact:true})).toBeVisible();
    await page.evaluate(()=>{
      const tracker={flashed:false};
      Object.assign(window,{ageExitTracker:tracker});
      const observer=new MutationObserver(()=>{
        if(location.pathname==='/onboarding/age' && document.querySelector('input[name="adult"]'))tracker.flashed=true;
      });
      observer.observe(document.querySelector('main')!,{childList:true,subtree:true});
    });
    const resetCompleted=page.waitForResponse(response=>response.request().method()==='POST' && !!response.request().headers()['next-action']);
    await page.getByRole('link',{name:'Back to TalkingStage',exact:true}).click();
    await resetCompleted;await received;
    await expect(page.getByText('You can return when you are eligible.',{exact:true})).toBeVisible();
    await expect(page.getByRole('checkbox',{name:'I am 18 or older',exact:true})).toHaveCount(0);
    release();await Promise.all(pending);await page.unroute('**/*',handler);
    await expect(page).toHaveURL('http://localhost:3102/');
    await expect(page.getByRole('link',{name:'Find your conversation'})).toBeVisible();
    expect(await page.evaluate(()=>(window as unknown as {ageExitTracker:{flashed:boolean}}).ageExitTracker.flashed)).toBe(false);
    await page.getByRole('link',{name:'Find your conversation'}).click();
    await expect(page.getByRole('checkbox',{name:'I am 18 or older',exact:true})).not.toBeChecked();
    await expect(page.getByText('You can return when you are eligible.',{exact:true})).toHaveCount(0);
  }finally{release();await Promise.all(pending);await page.unroute('**/*',handler);}
});

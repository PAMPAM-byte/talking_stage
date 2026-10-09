import {expect,test} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';

test('discovery follows saved gender preferences and explicit all-character choices',async({page})=>{
  test.setTimeout(60000);
  const options={auth:{persistSession:false,autoRefreshToken:false}};
  const endpoint=process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service=createClient(endpoint,process.env.SUPABASE_SERVICE_ROLE_KEY!,options);
  const viewer=createClient(endpoint,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,options);
  const email=`discovery-filter-${randomUUID()}@example.test`;const password=`Ts!${randomUUID()}Aa9`;
  const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_declaration:'18-plus-v1'}});
  expect(created.error).toBeNull();const id=created.data.user!.id;
  try{
    await page.setViewportSize({width:390,height:844});
    await page.goto('/sign-in');await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page).toHaveURL(/\/onboarding\/preferences$/);
    await page.getByLabel('Preferred name').fill('Synthetic discovery');
    await page.getByRole('button',{name:'Men',exact:true}).click();
    await page.getByRole('button',{name:'Save preferences',exact:true}).click();
    await page.getByRole('checkbox',{name:/I understand the characters and their photos/}).check();
    await page.getByRole('button',{name:'Explore characters',exact:true}).click();
    expect((await viewer.auth.signInWithPassword({email,password})).error).toBeNull();
    const all=await viewer.rpc('discover_cast',{p_page:1,p_gender:null,p_interest:null,p_personality:null});
    expect(all.error).toBeNull();
    async function check(gender:'man'|'woman'|'all'){
      // Each gender has its own first page once the published cast exceeds twelve.
      const result=await viewer.rpc('discover_cast',{p_page:1,p_gender:gender==='all'?null:gender,p_interest:null,p_personality:null});
      expect(result.error).toBeNull();
      const expected=result.data.characters as {name:string;age:number;gender:string}[];
      expect(expected.length).toBeGreaterThan(0);
      if(gender!=='all')expect(expected.every(c=>c.gender===gender)).toBe(true);
      await expect(page.locator('.character-card')).toHaveCount(expected.length);
      for(const c of expected)await expect(page.getByRole('heading',{name:`${c.name}, ${c.age}`,exact:true})).toBeVisible();
      await expect(page.getByRole('navigation',{name:'Character gender'}).getByRole('link',{name:gender==='man'?'Men':gender==='woman'?'Women':'Everyone',exact:true})).toHaveAttribute('aria-current','page');
    }
    await check('man');
    await page.screenshot({path:'docs/reviews/stage-10/discovery-men-390.png',fullPage:false});
    await page.reload();await check('man');
    await page.getByRole('link',{name:'Women',exact:true}).click();await check('woman');
    await page.locator('select[name="interest"]').selectOption(all.data.interests[0]);
    await page.getByRole('button',{name:'Apply filters',exact:true}).click();
    await expect(page).toHaveURL(/interest=/);
    await page.getByRole('link',{name:'Everyone',exact:true}).click();await check('all');
    await expect(page).toHaveURL('http://localhost:3102/discover?gender=all');
    await page.reload();await check('all');
    await page.getByRole('button',{name:'Apply filters',exact:true}).click();await check('all');
    await page.getByRole('link',{name:'Men',exact:true}).click();await check('man');
    await page.getByRole('link',{name:'Explore all characters',exact:true}).click();await check('all');
    await page.goto('/settings/preferences');
    await page.getByRole('button',{name:'Women',exact:true}).click();await page.getByRole('button',{name:'Men',exact:true}).click();
    await page.getByRole('button',{name:'Save preferences',exact:true}).click();
    await expect(page.getByText('Your preferences are saved.',{exact:true})).toBeVisible();
    await page.goto('/discover');await check('woman');
    await page.goto('/settings/preferences');await page.getByRole('button',{name:'Men',exact:true}).click();
    await page.getByRole('button',{name:'Save preferences',exact:true}).click();
    await expect(page.getByText('Your preferences are saved.',{exact:true})).toBeVisible();
    await page.goto('/discover');await check('all');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{expect((await service.auth.admin.deleteUser(id)).error).toBeNull();}
});

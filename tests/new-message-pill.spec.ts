import {test,expect} from '@playwright/test';
// E2: a character message that arrives while the user reads older messages raises a pill instead of jumping.
test('a new character message while scrolled up shows a pill that returns to the newest message',async({page})=>{
 await page.setViewportSize({width:390,height:700});
 await page.goto('/dev/chat-delivery?scenario=quotes');
 const log=page.locator('.chat-shell__messages');await expect(page.locator('#message-00000000-0000-4000-8000-000000000011').getByRole('button')).toBeEnabled();
 const pill=page.getByRole('button',{name:'New message'});
 const add=(role:string)=>page.evaluate(role=>{const log=document.querySelector('.chat-log')!;const turn=document.createElement('article');turn.className=`message-turn${role==='user'?' message-turn--user':''}`;turn.innerHTML='<p class="message-bubble">Synthetic arrival</p>'.repeat(4);log.append(turn);},role);
 await log.evaluate(el=>new Promise(done=>{el.style.paddingBottom='900px';el.addEventListener('scroll',()=>done(null),{once:true});el.scrollTop=0;}));
 await add('user');await expect(pill).toHaveCount(0);
 await add('character');await expect(pill).toBeVisible();
 await pill.click();await expect(pill).toHaveCount(0);
 await expect.poll(()=>log.evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight)).toBeLessThan(80);
 await add('character');await expect(pill).toHaveCount(0);
});

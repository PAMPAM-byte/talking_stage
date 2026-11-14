import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Coin purchases (14 Nov): ₦50 a coin, 10+, service-only ledger steps, coins added once, events deduplicated, refunds reclaim.
const db=new PGlite();const a='00000000-0000-4000-8000-0000000000c1',b='00000000-0000-4000-8000-0000000000c2';
const op=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
  create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}',raw_app_meta_data jsonb not null default '{}',last_sign_in_at timestamptz,banned_until timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
 await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values('${a}','a@example.com','{"adult_declaration":"18-plus-v1"}'),('${b}','b@example.com','{"adult_declaration":"18-plus-v1"}');
  update public.profiles set display_name='Synthetic',genders=array['woman'],ai_consent_at=now(),onboarding_complete=true;
  update private.likes_configuration set enabled=true;
  update private.bachs_configuration set enabled=true,environment='sandbox',organization_id='acct_Synthetic',recipient_name='Synthetic operator',minimum_amount_minor=100000,maximum_amount_minor=2000000;`);
 const svc=async(sql,params=[])=>{await db.exec(`reset role;set role service_role;`);try{return (await db.query(sql,params)).rows[0];}finally{await db.exec('reset role');}};
 const svcRejects=async(sql,params,pattern,msg)=>{await db.exec(`reset role;set role service_role;`);try{await assert.rejects(db.query(sql,params),pattern,msg);}finally{await db.exec('reset role');}};
 const user=async(id,sql,params=[])=>{await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);try{return (await db.query(sql,params)).rows[0];}finally{await db.exec('reset role');}};
 const reserve=(actor,coins,n)=>svc("select public.reserve_coin_purchase($1,$2,$3,'sandbox','acct_Synthetic') v",[actor,coins,op(n)]).then(r=>r.v);
 const bind=(id,n)=>svc("select public.bind_coin_checkout($1,$2,$3,now()+interval '1 hour')",[id,`chk_Synthetic${n}`,`https://sandbox-checkout.bachs.io/c/${n}`]);
 const verify=(id,n,state,event=null,at="now()")=>svc(`select public.apply_coin_verification($1,$2,$3,$4,${at},$5,$6) v`,[id,`chk_Synthetic${n}`,state==='pending'?null:`pay_${n}`,state,event,event?'collection.updated':'reconciliation']).then(r=>r.v);
 const balance=id=>user(id,'select public.coin_shop() v').then(r=>r.v.balance);

 // Users cannot touch the ledger steps directly.
 await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`);
 await assert.rejects(db.query("select public.reserve_coin_purchase($1,10,$2,'sandbox','acct_Synthetic')",[a,op(1)]),/permission denied/);
 await assert.rejects(db.query("select public.apply_coin_verification($1,'chk_x',null,'paid',now())",[op(1)]),/permission denied/);
 await db.exec('reset role');
 assert.deepEqual((await user(a,'select public.coin_shop() v')).v,{open:true,recipient:'Synthetic operator',environment:'sandbox',maxCoins:400,balance:10});

 // Price and limits: ₦50 each, at least 10 (even below the gift minimum), within the gateway maximum.
 await svcRejects("select public.reserve_coin_purchase($1,9,$2,'sandbox','acct_Synthetic')",[a,op(2)],/invalid_amount/,'At least 10');
 await svcRejects("select public.reserve_coin_purchase($1,401,$2,'sandbox','acct_Synthetic')",[a,op(2)],/invalid_amount/,'Within the gateway maximum');
 await svcRejects("select public.reserve_coin_purchase($1,10,$2,'production','acct_Synthetic')",[a,op(2)],/payments_paused/,'Environment must match');
 const p=await reserve(a,10,3);
 assert.deepEqual([p.coins,p.amount_minor,p.status,p.reference.startsWith('TC-'),p.recipient_disclosure],[10,50000,'awaiting_checkout',true,'Synthetic operator']);
 assert.equal((await reserve(a,10,3)).id,p.id,'Same attempt, same purchase');
 await svcRejects("select public.reserve_coin_purchase($1,20,$2,'sandbox','acct_Synthetic')",[a,op(3)],/conflict/,'Same attempt cannot change the amount');
 await bind(p.id,3);await bind(p.id,3);
 await svcRejects("select public.bind_coin_checkout($1,'chk_Other','https://sandbox-checkout.bachs.io/x',now())",[p.id],/conflict/);
 assert.equal((await svc("select public.coin_purchase_for_checkout('sandbox','acct_Synthetic','chk_Synthetic3') v")).v.id,p.id);

 // Pending adds nothing; paid adds coins once; duplicate events and re-checks add nothing more.
 assert.equal(await verify(p.id,3,'pending'),'pending');assert.equal(await balance(a),10,'Welcome coins only');
 assert.equal(await verify(p.id,3,'paid','evt_1'),'paid');assert.equal(await balance(a),20);
 assert.equal(await verify(p.id,3,'paid','evt_1'),'paid');assert.equal(await verify(p.id,3,'paid'),'paid');assert.equal(await balance(a),20,'Added exactly once');
 assert.equal(await verify(p.id,3,'failed','evt_2'),'paid','A late failure cannot undo a payment');assert.equal(await balance(a),20);
 const mine=(await user(a,'select public.my_coin_purchase($1) v',[p.id])).v;assert.deepEqual([mine.status,mine.coins,mine.balance],['paid',10,20]);
 assert.equal((await user(b,'select public.my_coin_purchase($1) v',[p.id])).v,null,'Only the buyer sees it');

 // Refund takes the coins back; if some were already spent, the purchase is flagged for review.
 assert.equal(await verify(p.id,3,'refunded','evt_3'),'refunded');assert.equal(await balance(a),10);
 assert.equal(await verify(p.id,3,'paid','evt_4'),'refunded','A refund is final');assert.equal(await balance(a),10);
 const q=await reserve(b,20,4);await bind(q.id,4);await verify(q.id,4,'paid','evt_5');assert.equal(await balance(b),30);
 await db.query("insert into private.coin_ledger(user_id,delta,kind) values($1,-25,'admin')",[b]);assert.equal(await balance(b),5);
 await verify(q.id,4,'refunded','evt_6');assert.equal(await balance(b),0,'Never below zero');
 assert.equal((await db.query('select needs_review from private.coin_purchases where id=$1',[q.id])).rows[0].needs_review,true,'Spent coins: flagged for review');

 // Disputed/irregular payments are held for review and add no coins.
 const r=await reserve(a,10,5);await bind(r.id,5);
 assert.equal(await verify(r.id,5,'review','evt_7'),'pending');assert.equal(await balance(a),10);
 assert.equal((await user(a,'select public.my_coin_purchase($1) v',[r.id])).v.status,'review');
 // Expired and cancelled checkouts add nothing.
 const s=await reserve(a,10,6);await bind(s.id,6);assert.equal(await verify(s.id,6,'expired'),'expired');assert.equal(await balance(a),10);
 // Paused: no new purchases.
 await db.exec('update private.likes_configuration set enabled=false');
 await svcRejects("select public.reserve_coin_purchase($1,10,$2,'sandbox','acct_Synthetic')",[a,op(7)],/payments_paused/);
 for(const fn of ['coin_shop()','my_coin_purchase(uuid)','reserve_coin_purchase(uuid,integer,uuid,text,text)','apply_coin_verification(uuid,text,text,text,timestamptz,text,text)'])
  assert.equal((await db.query(`select has_function_privilege('anon','public.${fn}','execute') v`)).rows[0].v,false,fn);
 console.log('Coin purchases passed: ₦50 a coin from 10 coins, gateway maximum, ledger steps service-only, idempotent attempts and checkouts, coins added exactly once, duplicate and late events ignored, refunds reclaim and flag spent coins, review and expiry add nothing, paused means no purchases.');
}finally{await db.close();}

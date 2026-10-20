import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import ts from 'typescript';
import {createHmac} from 'node:crypto';
import {verifyBachsEvent,PaymentError} from '../lib/payments/bachs.mjs';
const id='00000000-0000-4000-8000-000000000001';
let signedIn=true,adult=true,owned=true,admin=false,starts=0,verifications=0,declines=0;
const account=()=>signedIn?{user:{id},profile:{onboarding_complete:adult,adult_declared_at:adult?'yes':null},client:{from:()=>({select(){return this;},eq(){return this;},async maybeSingle(){return {data:owned?{id,conversation_id:id}:null};}}),rpc:async name=>name==='is_admin'?{data:admin}:name==='decline_gift_proposal'?(declines++,{data:null}):{error:{message:'unknown'}}}}:null;
const context=createContext({FormData,Request,Response,Headers,Buffer,AbortSignal,process,URL});
const dependencies={
 'next/cache':{revalidatePath(){}},'./server':{currentAccount:async()=>account()},
 './trusted-client':{trustedBackendClient:()=>({from:()=>({select(){return this;},eq(){return this;},async maybeSingle(){return {data:{id,conversation_id:id}};}})})},
 './payment-service':{startGift:async()=>{starts++;return {id};},reconcileGift:async()=>{verifications++;return 'paid';}},
 '@/lib/format':{parseNaira:value=>/^\d+(\.\d{1,2})?$/.test(value)?Number(value)*100:null},
};
const modules=new Map();
for(const [name,exports]of Object.entries(dependencies)){modules.set(name,new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context}));}
const code=ts.transpileModule(readFileSync('lib/backend/payment-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const actionModule=new SourceTextModule(code,{context});await actionModule.link(name=>{const dependency=modules.get(name);if(!dependency)throw Error(name);return dependency;});await actionModule.evaluate();
const form=()=>{const data=new FormData();data.set('conversation',id);data.set('operation',id);data.set('amount','5000');data.set('confirmed','yes');data.set('id',id);return data;};
signedIn=false;assert((await actionModule.namespace.createGiftAction(form())).error);assert.equal(starts,0);
signedIn=true;adult=false;assert((await actionModule.namespace.createGiftAction(form())).error);assert.equal(starts,0);
adult=true;const unconfirmed=form();unconfirmed.delete('confirmed');assert((await actionModule.namespace.createGiftAction(unconfirmed)).error);assert.equal(starts,0);
assert.equal((await actionModule.namespace.createGiftAction(form())).id,id);assert.equal(starts,1);
owned=false;assert((await actionModule.namespace.checkGiftAction(form())).error);assert.equal(verifications,0);
owned=true;assert.deepEqual(JSON.parse(JSON.stringify(await actionModule.namespace.checkGiftAction(form()))),{});assert.equal(verifications,1);
assert((await actionModule.namespace.adminCheckGiftAction(form())).error);assert.equal(verifications,1);
admin=true;await actionModule.namespace.adminCheckGiftAction(form());assert.equal(verifications,2);
await actionModule.namespace.declineGiftAction(form());assert.equal(declines,1);
signedIn=false;await actionModule.namespace.declineGiftAction(form());assert.equal(declines,1);
const webhookSettings={organizationId:'acct_synthetic',webhookSecret:'whsec_SYNTHETIC'};
const webhookDeps={
 'next/cache':dependencies['next/cache'],
 '@/lib/payments/bachs.mjs':{verifyBachsEvent,PaymentError,bachsSettings:()=>webhookSettings},
 '@/lib/backend/trusted-client':dependencies['./trusted-client'],
 '@/lib/backend/payment-service':dependencies['./payment-service'],
};
const webhookModules=new Map();
for(const [name,exports]of Object.entries(webhookDeps))webhookModules.set(name,new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context}));
const webhookCode=ts.transpileModule(readFileSync('app/api/webhooks/bachs/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const webhookModule=new SourceTextModule(webhookCode,{context});await webhookModule.link(name=>webhookModules.get(name));await webhookModule.evaluate();
const payload=JSON.stringify({id:'evt_synthetic',organization_id:'acct_synthetic',type:'collection.succeeded',data:{checkout_id:'chk_synthetic'}});
const timestamp=String(Math.floor(Date.now()/1000));
const signature=createHmac('sha256',webhookSettings.webhookSecret).update(`${timestamp}.${payload}`).digest('hex');
const headers={'X-Bachs-Signature-V2':`t=${timestamp},v1=${signature}`};
const request=(body=payload,requestHeaders=headers)=>new Request('https://example.com/api/webhooks/bachs',{method:'POST',body,headers:requestHeaders});
const prior=verifications;
assert.equal((await webhookModule.namespace.POST(request(payload,{}))).status,400);assert.equal(verifications,prior);
assert.equal((await webhookModule.namespace.POST(request('x'.repeat(262145)))).status,413);assert.equal(verifications,prior);
assert.equal((await webhookModule.namespace.POST(request())).status,204);assert.equal(verifications,prior+1);
console.log('Payment action boundaries passed: identity/adult/amount-confirmation gates, ownership denial before reconciliation, independent admin authorization, and authenticated refusal. No network calls.');

// Exercise the actual shared wrapper: connected payment pages must render
// children after account checks, rather than an old rollout placeholder.
const jsxRuntime=await import('react/jsx-runtime');
const react=await import('react');
let wrapperAccount={profile:{adult_declared_at:'synthetic',onboarding_complete:true}};
const shell=()=>null;
const wrapperDeps={
 'server-only':{},'react':{Suspense:react.Suspense},'react/jsx-runtime':{jsx:jsxRuntime.jsx,jsxs:jsxRuntime.jsxs,Fragment:jsxRuntime.Fragment},
 'next/navigation':{redirect:path=>{throw new Error(`redirect:${path}`);}},
 'next/headers':{headers:async()=>new Headers({'x-talkingstage-path':'/gifts/synthetic'})},
 'next/link':{default:()=>null},
 '@/lib/backend/config':{usesSupabase:()=>true,supabaseConfig:()=>({url:'synthetic'})},
 '@/lib/backend/server':{renderAccount:async()=>wrapperAccount},
 '@/lib/backend/account-actions':{signOutAccount:async()=>{}},
 './shells':{AppShell:shell,PublicShell:()=>null},
 './ui/primitives':{Notice:()=>null,Skeleton:()=>null},'./chat-loading':{ChatLoading:()=>null},
 './conversation-continuity':{ConversationContinuity:()=>null},
};
const wrapperModules=new Map();
for(const [name,exports]of Object.entries(wrapperDeps))wrapperModules.set(name,new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context}));
const wrapperCode=ts.transpileModule(readFileSync('components/protected-area.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const wrapper=new SourceTextModule(wrapperCode,{context});await wrapper.link(name=>wrapperModules.get(name));await wrapper.evaluate();
const protectedPayment=()=>{
 const suspended=wrapper.namespace.ProtectedArea({area:'Payments',children:'CONNECTED_PAYMENT_CONTENT'});
 return suspended.props.children.type(suspended.props.children.props);
};
let page=await protectedPayment();
assert.equal(page.type,shell);assert.equal(page.props.children,'CONNECTED_PAYMENT_CONTENT');
wrapperAccount=null;await assert.rejects(protectedPayment(),/redirect:\/sign-in/);
wrapperAccount={profile:{adult_declared_at:null,onboarding_complete:true}};await assert.rejects(protectedPayment(),/redirect:\/onboarding\/age/);
wrapperAccount={profile:{adult_declared_at:'synthetic',onboarding_complete:false}};await assert.rejects(protectedPayment(),/redirect:\/onboarding\/preferences/);
console.log('Protected payment routes passed: gift/receipt children render only after identity, adult and onboarding checks.');

// Actual proxy must distinguish dependency failure from a missing/invalid session.
let claims={data:null,error:null},claimsThrows=false;
class TestNextResponse extends Response {
 cookies={getAll:()=>[],set(){}};
 static next(){return new TestNextResponse(null,{status:200});}
 static redirect(url){return new TestNextResponse(null,{status:307,headers:{location:String(url)}});}
 static json(value,options){return new TestNextResponse(JSON.stringify(value),options);}
}
const proxyDeps={
 '@supabase/ssr':{createServerClient:()=>({auth:{getClaims:async()=>{if(claimsThrows)throw Error('network');return claims;}}})},
 'next/server':{NextResponse:TestNextResponse},
 '@/lib/backend/config':{supabaseConfig:()=>({url:'https://example.com',key:'synthetic'}),usesSupabase:()=>true},
 '@/lib/backend/dependency-fetch.mjs':{dependencyFetch:()=>{}},
};
const proxyModules=new Map();
for(const [name,exports]of Object.entries(proxyDeps))proxyModules.set(name,new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context}));
const proxyCode=ts.transpileModule(readFileSync('proxy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const proxyModule=new SourceTextModule(proxyCode,{context});await proxyModule.link(name=>proxyModules.get(name));await proxyModule.evaluate();
const proxied=method=>proxyModule.namespace.proxy({method,url:'http://localhost:3000/payments/synthetic',nextUrl:new URL('http://localhost:3000/payments/synthetic'),headers:new Headers(),cookies:{getAll:()=>[],set(){}}});
for(const error of [{name:'AuthRetryableFetchError',status:0},{name:'AuthApiError',status:429},{name:'AuthApiError',status:503}]){
 claims={data:null,error};
 for(const method of ['GET','POST']){
  const response=await proxied(method);assert.equal(response.status,503);assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 }
}
claimsThrows=true;assert.equal((await proxied('GET')).status,503);claimsThrows=false;
for(const error of [null,{name:'AuthSessionMissingError'},{name:'AuthApiError',status:401}]){
 claims={data:null,error};const response=await proxied('GET');assert.equal(response.status,307);assert.equal(new URL(response.headers.get('location')).pathname,'/sign-in');
}
claims={data:{claims:{sub:'synthetic'}},error:null};assert.equal((await proxied('GET')).status,200);
console.log('Payment proxy passed: authenticated navigation, signed-out denial, retryable network/rate-limit/outage responses without false sign-in redirects.');

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import ts from 'typescript';
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
const module=new SourceTextModule(code,{context});await module.link(name=>{const dependency=modules.get(name);if(!dependency)throw Error(name);return dependency;});await module.evaluate();
const form=()=>{const data=new FormData();data.set('conversation',id);data.set('operation',id);data.set('amount','5000');data.set('confirmed','yes');data.set('id',id);return data;};
signedIn=false;assert((await module.namespace.createGiftAction(form())).error);assert.equal(starts,0);
signedIn=true;adult=false;assert((await module.namespace.createGiftAction(form())).error);assert.equal(starts,0);
adult=true;const unconfirmed=form();unconfirmed.delete('confirmed');assert((await module.namespace.createGiftAction(unconfirmed)).error);assert.equal(starts,0);
assert.equal((await module.namespace.createGiftAction(form())).id,id);assert.equal(starts,1);
owned=false;assert((await module.namespace.checkGiftAction(form())).error);assert.equal(verifications,0);
owned=true;assert.deepEqual(JSON.parse(JSON.stringify(await module.namespace.checkGiftAction(form()))),{});assert.equal(verifications,1);
assert((await module.namespace.adminCheckGiftAction(form())).error);assert.equal(verifications,1);
admin=true;await module.namespace.adminCheckGiftAction(form());assert.equal(verifications,2);
await module.namespace.declineGiftAction(form());assert.equal(declines,1);
signedIn=false;await module.namespace.declineGiftAction(form());assert.equal(declines,1);
console.log('Payment action boundaries passed: identity/adult/amount-confirmation gates, ownership denial before reconciliation, independent admin authorization, and authenticated refusal. No network calls.');

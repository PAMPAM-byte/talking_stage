import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import ts from 'typescript';
let state;
const reset=()=>{state={unavailable:false,account:{user:{id:'synthetic'},profile:{adult_declared_at:'accepted',onboarding_complete:true}},signOuts:0,reads:0,mutations:0,loginError:null};};
reset();
const client={auth:{signInWithPassword:async()=>({error:state.loginError}),signOut:async()=>{state.signOuts++;}},rpc:async()=>{state.mutations++;return {error:null};}};
const deps={
 'next/headers':{cookies:async()=>({delete(){},getAll:()=>[]})},
 'next/navigation':{redirect:()=>{throw Error('unexpected redirect');}},
 'next/cache':{revalidatePath(){}},
 './server':{backendClient:async()=>client,currentAccount:async options=>{state.reads++;if(state.unavailable){if(options?.failOnUnavailable)throw Error('synthetic account outage');return null;}return state.account;}},
 './flow-cookie':{setFlowCookie:async()=>{},validFlowCookie:async()=>true},
 '@/lib/monitoring/events.mjs':{observe:async(_name,work)=>work(),emit(){}},
};
const context=createContext({FormData,URL,process:{env:{TALKINGSTAGE_SITE_URL:'http://localhost:3000'}}});
const code=ts.transpileModule(readFileSync('lib/backend/account-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new SourceTextModule(code,{context});
await mod.link(name=>{const values=deps[name];assert(values,'Unexpected dependency '+name);return new SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});});
await mod.evaluate();
const form=new FormData();form.set('email','synthetic@example.test');form.set('password','SYNTHETIC-NOT-A-REAL-PASSWORD');form.set('version','1');form.set('consent','on');
state.unavailable=true;
let result=await mod.namespace.submitAccount('sign-in',form);
assert(result.error);assert.equal(result.destination,undefined);assert.equal(state.signOuts,0,'A transient read after successful login must not destroy the new session');
state.unavailable=false;result=await mod.namespace.submitAccount('sign-in',form);assert.equal(result.destination,'/discover');assert.equal(state.signOuts,0);
for(const account of [null,{user:{id:'synthetic'},profile:{adult_declared_at:null,onboarding_complete:true}}]){reset();state.account=account;result=await mod.namespace.submitAccount('sign-in',form);assert(result.error);assert.equal(state.signOuts,1,'A genuinely missing adult declaration still denies access');}
reset();state.loginError={status:401};result=await mod.namespace.submitAccount('sign-in',form);assert(result.error);assert.equal(state.reads,0);
reset();state.unavailable=true;result=await mod.namespace.submitAccount('complete',form);assert(result.error);assert.equal(result.destination,undefined);assert.equal(state.mutations,0);assert.equal(state.signOuts,0);
reset();state.account=null;result=await mod.namespace.submitAccount('complete',form);assert.equal(result.destination,'/sign-in');assert.equal(state.mutations,0);
console.log('Account boundaries passed: successful-login outage preserves session; verified adult denial still signs out; invalid credentials and unauthenticated writes denied; transient mutation reads return retryable errors without redirects or writes. No network calls.');

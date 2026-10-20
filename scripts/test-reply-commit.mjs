import assert from 'node:assert/strict';
import {commitReply} from '../lib/ai/reply-commit.mjs';
import {runReply} from '../lib/ai/reply-pipeline.mjs';
const args={p_job:'synthetic-job',p_actor:'synthetic-owner',p_lease:'synthetic-lease',p_text:'Synthetic reply.'};
for(const name of ['finish_reply','finish_reaction_reply','finish_gift_reply']){
 let calls=0,pauses=0;const events=[];
 const client={rpc:async(rpc,payload)=>{calls++;assert.equal(rpc,name);assert.deepEqual(payload,args);return calls===1?{status:0,error:{message:'TypeError: fetch failed'}}:{data:'completed'};}};
 assert.equal((await commitReply(client,name,args,{pause:async()=>{pauses++;},onAttempt:(outcome,duration)=>{assert.equal(typeof duration,'number');events.push(outcome);}})).data,'completed');
 assert.equal(calls,2);assert.equal(pauses,1);assert.deepEqual(events,['unavailable','ok']);
}
for(const status of [408,429,502,503,504]){
 let calls=0;await commitReply({rpc:async()=>{calls++;return {status,error:{message:'Temporary synthetic dependency failure'}};}},'finish_reply',args,{pause:async()=>{}});assert.equal(calls,2);
}
for(const result of [{status:403,error:{code:'42501',message:'permission denied'}},{status:500,error:{code:'P0001',message:'invalid_output'}},{status:404,error:{code:'PGRST202',message:'unknown function'}},{data:'discarded'},{data:'failed'}]){
 let calls=0;await commitReply({rpc:async()=>{calls++;return result;}},'finish_reply',args,{pause:async()=>assert.fail('Permanent denials must not retry')});assert.equal(calls,1);
}
let throws=0;assert.equal((await commitReply({rpc:async()=>{if(++throws===1)throw new TypeError('fetch failed');return {data:'completed'};}},'finish_reply',args,{pause:async()=>{},onAttempt:()=>{throw new Error('Synthetic telemetry failure');}})).data,'completed');
const context={state:'claimed',job:'job',lease:'lease',character:{name:'Synthetic adult',direction:'Warm fictional adult.'},preferences:{language:'english'},memories:[],history:[{role:'user',text:'How are you?'}],maxInputTokens:48000,maxOutputTokens:1024};
let providerCalls=0,claimCalls=0,commitCalls=0;
const client={rpc:async(name)=>{if(name==='claim_reply'){claimCalls++;return {data:context};}commitCalls++;return commitCalls===1?{status:0,error:{message:'fetch failed'}}:{data:'completed'};}};
assert.equal(await runReply(client,'synthetic-message','synthetic-owner',{key:'SYNTHETIC-NOT-A-KEY',model:'synthetic'},{commitRetryPause:async()=>{},fetcher:async()=>{providerCalls++;return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({text:'I am well, thank you.',photoAssetId:null})}]}]});}}),'completed');
assert.equal(providerCalls,1);assert.equal(claimCalls,1);assert.equal(commitCalls,2);
console.log('Reply commit passed: bounded save-only recovery, stable job/lease/payload, no duplicate provider call, retryable outages, permanent denial exclusion and telemetry isolation. No network calls.');

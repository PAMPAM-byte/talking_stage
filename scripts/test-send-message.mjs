import assert from 'node:assert/strict';
import {sendMessage} from '../lib/chat/send-message.ts';
const id='00000000-0000-4000-8000-000000000001';
const messageId='00000000-0000-4000-8000-000000000002';
const form=new FormData();for(const [key,value]of Object.entries({id,clientId:messageId,generation:'1',text:'Synthetic message',replyTo:id,timeZone:'Africa/Lagos'}))form.set(key,value);
let calls=[];
const options={wait:async()=>{},fetcher:async(url,request)=>{calls.push({url,body:request.body});assert(request.signal instanceof AbortSignal);assert.equal(request.redirect,'error');return calls.length===1?Response.json({code:'unavailable'},{status:503}):Response.json({messageId});}};
assert.equal((await sendMessage(form,options)).messageId,messageId);assert.equal(calls.length,2);assert.equal(calls[0].body,calls[1].body);assert(calls[0].url.endsWith('/messages'));assert.equal(JSON.parse(calls[0].body).replyTo,id);
for(const status of [401,403,400,409]){
 let attempts=0;const result=await sendMessage(form,{wait:async()=>{},fetcher:async()=>{attempts++;return Response.json({error:'Synthetic denied'},{status});}});assert(result.error);assert.equal(attempts,1,'Verified denials must never be automatically replayed');
}
let attempts=0;
const result=await sendMessage(form,{wait:async()=>{},fetcher:async()=>{attempts++;throw Error('PRIVATE transport internals and expired action reference');}});
assert.equal(attempts,2);assert.equal(result.code,'unavailable');assert(!result.error.includes('PRIVATE'));assert(!result.error.includes('eligible'));
assert.equal(form.get('text'),'Synthetic message');assert.equal(form.get('clientId'),messageId);
console.log('Message transport passed: stable endpoint, bounded same-ID retry, quote/generation preservation, genuine denial exclusion, safe errors and unchanged input. No network calls.');

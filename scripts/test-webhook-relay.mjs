import assert from 'node:assert/strict';
import {webhookRelay} from './bachs-webhook-relay.mjs';
let calls=0;
const raw=Buffer.from('{ "signed": true }');
const server=webhookRelay({fetcher:async(url,options)=>{
 calls++;assert.equal(url,'http://127.0.0.1:3000/api/webhooks/bachs');assert.deepEqual(options.body,raw);
 assert.equal(options.headers.cookie,undefined);assert.equal(options.headers.authorization,undefined);
 assert.equal(options.headers['x-bachs-signature-v2'],'synthetic');
 return new Response(null,{status:204});
}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
try{
 for(const path of ['/','/sign-in','/messages','/api/conversations/test','/api/webhooks/bachs?path=/messages'])assert.equal((await fetch(origin+path)).status,404);
 assert.equal((await fetch(origin+'/api/webhooks/bachs')).status,405);assert.equal(calls,0);
 assert.equal((await fetch(origin+'/api/webhooks/bachs',{method:'POST',body:raw,headers:{cookie:'private',authorization:'private','x-bachs-signature-v2':'synthetic'}})).status,204);assert.equal(calls,1);
 assert.equal((await fetch(origin+'/api/webhooks/bachs',{method:'POST',body:'x'.repeat(262145)})).status,413);assert.equal(calls,1);
 console.log('Webhook relay passed: exact path/method isolation, raw signed bytes, private-header removal and body limits. Loopback-only test.');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

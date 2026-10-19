import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

// Deliberately expose one signed webhook, not the local app, login or chat pages.
export function webhookRelay({fetcher=fetch,upstream='http://127.0.0.1:3000'}={}){
 const server=createServer(async(request,response)=>{
  const respond=(status,text='')=>{response.writeHead(status,{'Content-Type':'text/plain','Cache-Control':'no-store'});response.end(text);};
  if(request.url!=='/api/webhooks/bachs')return respond(404,'Not found');
  if(request.method!=='POST')return respond(405,'Method not allowed');
  const chunks=[];let size=0;
  try{
   for await(const chunk of request){size+=chunk.length;if(size>262144)return respond(413,'Body too large');chunks.push(chunk);}
   const headers={'Content-Type':'application/json'};
   for(const name of ['x-bachs-timestamp','x-bachs-signature','x-bachs-signature-v2']){
    const value=request.headers[name];if(typeof value==='string')headers[name]=value;
   }
   const result=await fetcher(`${upstream}/api/webhooks/bachs`,{method:'POST',headers,body:Buffer.concat(chunks),redirect:'error',signal:AbortSignal.timeout(55000)});
   await result.body?.cancel().catch(()=>{});
   respond(result.status,result.status===204?'':result.ok?'Accepted':result.status>=500?'Webhook unavailable':'Webhook rejected');
  }catch{if(!response.headersSent)respond(502,'Webhook unavailable');else response.end();}
 });
 server.requestTimeout=60000;server.headersTimeout=10000;
 return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=webhookRelay();
 server.on('error',()=>{console.error('Webhook relay could not start on 127.0.0.1:3301.');process.exitCode=1;});
 server.listen(3301,'127.0.0.1',()=>console.log('Bachs-only webhook relay listening on 127.0.0.1:3301.'));
}

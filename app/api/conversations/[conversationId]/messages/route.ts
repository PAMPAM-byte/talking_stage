import {conversationAction} from '@/lib/backend/conversation-actions';
import {isFirstPartyOrigin} from '@/lib/backend/request-origin.mjs';

export const maxDuration=60;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const respond=(body:object,status:number)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:Request,{params}:{params:Promise<{conversationId:string}>}){
 if(!isFirstPartyOrigin(request))return respond({error:'This request could not be accepted.'},403);
 const {conversationId}=await params;
 if(!uuid.test(conversationId))return respond({error:'Conversation unavailable.'},404);
 // Bound the stream itself; Content-Length is untrusted and may be absent.
 const reader=request.body?.getReader();if(!reader)return respond({error:'Message unavailable.'},400);
 let body='';let size=0;const decoder=new TextDecoder();
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();return respond({error:'This message is too long.'},413);}body+=decoder.decode(value,{stream:true});}
  body+=decoder.decode();
  const data=JSON.parse(body);
  if(!data||typeof data!=='object'||typeof data.clientId!=='string'||!uuid.test(data.clientId)||!Number.isSafeInteger(data.generation)||data.generation<1||typeof data.text!=='string'||!data.text.trim()||data.text.length>2000||(data.replyTo!=null&&(typeof data.replyTo!=='string'||!uuid.test(data.replyTo)))||(data.replyPart!=null&&(!data.replyTo||!Number.isInteger(data.replyPart)||data.replyPart<0||data.replyPart>3)))return respond({error:'Check your message and try again.'},400);
  const form=new FormData();form.set('id',conversationId);form.set('operation','send');
  form.set('clientId',data.clientId);form.set('generation',String(data.generation));form.set('text',data.text);
  if(data.replyTo)form.set('replyTo',data.replyTo);
  if(data.replyPart!=null)form.set('replyPart',String(data.replyPart));
  if(typeof data.timeZone==='string'&&data.timeZone.length<=100)form.set('timeZone',data.timeZone);
  const result=await conversationAction(form);
  return respond(result,result.code==='unavailable'?503:result.code==='signed_out'?401:result.code==='ineligible'?403:result.error?400:200);
 }catch(error){
  if(error instanceof SyntaxError)return respond({error:'Check your message and try again.'},400);
  return respond({error:'Sending is temporarily unavailable. Your message is kept here.',code:'unavailable'},503);
 }finally{reader.releaseLock();}
}

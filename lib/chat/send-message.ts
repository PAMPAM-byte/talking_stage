import type {ConversationResult} from '@/lib/backend/conversation-actions';
const unavailable='Sending is temporarily unavailable. Your message is kept here. Try sending again.';
export async function sendMessage(form:FormData,{fetcher=fetch,wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms))}={}):Promise<ConversationResult>{
 const body=JSON.stringify({clientId:form.get('clientId'),generation:Number(form.get('generation')),text:form.get('text'),replyTo:form.get('replyTo'),replyPart:form.get('replyPart')==null?undefined:Number(form.get('replyPart')),timeZone:form.get('timeZone')});
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetcher(`/api/conversations/${encodeURIComponent(String(form.get('id')))}/messages`,{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(15000)});
   if(response.status===401)return {error:'Sign in again to send your message. Your message is kept here.',code:'signed_out'};
   if([502,503,504].includes(response.status)){if(!attempt){await wait(600);continue;}return {error:unavailable,code:'unavailable'};}
   const data=await response.json();
   if(response.ok&&typeof data.messageId==='string'&&/^[a-f0-9-]{36}$/i.test(data.messageId))return {messageId:data.messageId,message:'Message saved.'};
   if(!response.ok&&typeof data.error==='string'&&data.error.length<=200)return {error:data.error};
   return {error:unavailable,code:'unavailable'};
  }catch{if(!attempt){await wait(600);continue;}}
 }
 return {error:unavailable,code:'unavailable'};
}

"use server";
import {currentAccount} from './server';
import {revalidatePath} from 'next/cache';
import { observe, emit } from '@/lib/monitoring/events.mjs';
export async function conversationAction(form:FormData):Promise<{error?:string;id?:string;message?:string;messageId?:string}> {
 try {
  const account=await currentAccount();if(!account?.profile.onboarding_complete||!account.profile.adult_declared_at)return {error:'Sign in with an eligible account.'};
  const id=String(form.get('id')??'');const operation=String(form.get('operation')??'');
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return {error:'This conversation is unavailable.'};
  if(operation==='skip'){
   const messageId=String(form.get('messageId')??'');
   if(!/^[a-f0-9-]{36}$/i.test(messageId))return {error:'This message is unavailable.'};
   const owned=await account.client.from('messages').select('id').eq('id',messageId).eq('conversation_id',id).eq('role','user').single();
   if(owned.error)return {error:'This message is unavailable.'};
   const cancelled=await observe('conversation.skip', () => account.client.rpc('cancel_reply',{p_message:messageId}));
   if(cancelled.error)return {error:'The reply could not be skipped. Try again later.'};
   revalidatePath('/messages','layout');return {message:'Reply skipped. Your message is kept.'};
  }
  const result=await observe('conversation.change', async () => operation==='start'?await account.client.rpc('start_conversation',{p_character:id})
   :operation==='send'?await account.client.rpc('save_user_message',{p_conversation:id,p_client_id:String(form.get('clientId')??''),p_generation:Number(form.get('generation')),p_text:String(form.get('text')??'')})
   :['archive','restore','reset','delete'].includes(operation)?await account.client.rpc('manage_conversation',{p_id:id,p_version:Number(form.get('version')),p_operation:operation,p_clear_memories:form.get('clearMemories')==='on'}):null);
  if(!result)return {error:'Choose an available action.'};
  if(result.error){const failure=result.error.message;return {error:failure.includes('chat_paused')?'Chat is paused. Your saved history is available.':failure.includes('archived')?'Restore this conversation before sending.':failure.includes('conflict')||failure.includes('thread_changed')?'This conversation changed. Reload before trying again.':failure.includes('rate_limited')?'Too many changes. Wait a minute and try again.':'The change was not saved. Reload and try again.'};}
  revalidatePath('/messages','layout');
  return {id:operation==='start'?result.data:id,messageId:operation==='send'?result.data.id:undefined,message:operation==='send'?'Message saved.':'Conversation updated.'};
 }catch{emit('conversation.change', 'unexpected');return {error:'Conversation services are unavailable. Please try again later.'};}
}

'use server';
import {revalidatePath} from 'next/cache';
import {currentAccount} from './server';
import {validReactionEmoji} from '@/lib/chat/message-reactions';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function setMessageReaction(conversation:string,messageId:string,emoji:string|null):Promise<{error?:string}>{
 if(!uuid.test(conversation)||!uuid.test(messageId)||(emoji!==null&&!validReactionEmoji(emoji)))return {error:'Choose a valid reaction.'};
 try{
  const account=await currentAccount({failOnUnavailable:true});
  if(!account?.profile.onboarding_complete||!account.profile.adult_declared_at)return {error:'Sign in to react.'};
  const result=await account.client.rpc('set_message_reaction',{p_conversation:conversation,p_message:messageId,p_emoji:emoji});
  if(result.error)return {error:result.error.message.includes('rate_limited')?'Wait a moment before reacting again.':'Reaction not saved. Try again.'};
  try{revalidatePath(`/messages/${conversation}`);}catch{/* The committed reaction is still saved. */}
  return {};
 }catch{return {error:'Reaction not saved. Try again.'};}
}

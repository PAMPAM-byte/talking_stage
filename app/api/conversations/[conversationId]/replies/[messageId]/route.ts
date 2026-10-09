import {currentAccount} from '@/lib/backend/server';
import {processReply,processSummary} from '@/lib/backend/reply-worker';
import {after} from 'next/server';
import {revalidatePath} from 'next/cache';
export const maxDuration=60;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function POST(request:Request,{params}:{params:Promise<{conversationId:string;messageId:string}>}) {
 const respond=(state:string,status=200)=>Response.json({state},{status,headers:{'Cache-Control':'no-store'}});
 try{
  // Cookie-authenticated mutations require the configured first-party origin.
  const site=process.env.TALKINGSTAGE_SITE_URL;
  if(!site)return respond('unavailable',503);
  if(request.headers.get('origin')!==new URL(site).origin)return respond('forbidden',403);
  const {conversationId,messageId}=await params;
  if(!uuid.test(conversationId)||!uuid.test(messageId))return respond('unavailable',404);
  const account=await currentAccount();
  if(!account)return respond('unauthorized',401);
  if(!account.profile.onboarding_complete||!account.profile.adult_declared_at)return respond('forbidden',403);
  const owned=await account.client.from('messages').select('id').eq('id',messageId).eq('conversation_id',conversationId).eq('role','user').single();
  if(owned.error)return respond('unavailable',404);
  const state=await processReply(messageId,account.user.id,request.signal);
  if(state==='completed')after(async()=>{
   // Best effort, independently budgeted and disabled by default. No raw logs.
   try{await processSummary(messageId,account.user.id);}catch{/* A summary failure never changes a delivered reply. */}
  });
  revalidatePath('/messages','layout');return respond(state);
 }catch{return respond('unavailable',503);}
}

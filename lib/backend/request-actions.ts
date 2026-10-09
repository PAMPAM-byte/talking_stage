"use server";
import {currentAccount} from './server';
import {revalidatePath} from 'next/cache';
export async function requestAction(form:FormData):Promise<{error?:string;message?:string}> {
 try{
  const account=await currentAccount();if(!account?.profile.onboarding_complete||!account.profile.adult_declared_at)return {error:'Sign in with an eligible account.'};
  const version=Number(form.get('version'));if(!Number.isSafeInteger(version)||version<1)return {error:'Reload to get your current settings.'};
  const operation=String(form.get('operation')??'');let result;
  if(operation==='preference')result=await account.client.rpc('set_request_preferences',{p_enabled:form.get('enabled')==='on',p_version:version});
  else{
   const id=String(form.get('conversation')??'');if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)||!['mute','unmute','decline','resume'].includes(operation))return {error:'This request control is unavailable.'};
   result=await account.client.rpc('manage_conversation_requests',{p_conversation:id,p_operation:operation,p_version:version});
  }
  if(result.error)return {error:result.error.message.includes('conflict')?'Your settings changed. Reload and try again.':'The change was not saved. Reload and try again.'};
  revalidatePath('/settings/requests');revalidatePath('/settings/preferences');revalidatePath('/messages','layout');return {message:'Request settings saved.'};
 }catch{return {error:'Request settings are unavailable. Try again later.'};}
}

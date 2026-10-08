"use server";
import {currentAccount} from './server';
import {revalidatePath} from 'next/cache';
export async function memoryAction(form:FormData):Promise<{error?:string;message?:string}> {
 try{
 const account=await currentAccount();if(!account?.profile.onboarding_complete||!account.profile.adult_declared_at)return {error:'Sign in with an eligible account.'};
 const id=String(form.get('character')??'');if(!/^[a-f0-9-]{36}$/i.test(id))return {error:'This character is unavailable.'};
 const result=await account.client.rpc('manage_memory',{p_character:id,p_operation:String(form.get('operation')??''),p_content:String(form.get('content')??'')||null,p_memory:form.get('memory')||null,p_consent:form.get('consent')==='on'});
 if(result.error)return {error:result.error.message.includes('consent_required')?'Confirm permission before saving.':result.error.message.includes('memory_disabled')?'Enable memory for this character before saving.':result.error.message.includes('memory_limit')?'You have 50 saved facts. Delete one before saving another.':'The change was not saved. Reload and try again.'};
 revalidatePath('/settings/memories','layout');revalidatePath('/messages','layout');return {message:'Memory updated.'};
 }catch{return {error:'Memory services are unavailable. Try again later.'};}
}

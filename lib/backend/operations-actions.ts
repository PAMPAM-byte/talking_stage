"use server";
import { revalidatePath } from 'next/cache';
import { currentAccount } from './server';
export async function saveControls(form: FormData): Promise<{error?:string;message?:string}> {
 try {
  const account=await currentAccount();
  if(!account?.profile.onboarding_complete || !account.profile.adult_declared_at) return {error:'Sign in with an eligible administrator account.'};
  const role=await account.client.rpc('is_admin');
  if(role.error || role.data!==true) return {error:'Administrator access required.'};
  const scope=String(form.get('scope')??'');const version=Number(form.get('version'));
  if((scope!=='global'&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(scope)) || !Number.isSafeInteger(version) || version<0) return {error:'Reload these controls before saving.'};
  const result=await account.client.rpc('admin_save_controls',{p_character:scope==='global'?null:scope,p_version:version,
   p_chat:form.get('chat')==='on',p_photos:form.get('photos')==='on',p_payments:form.get('payments')==='on',p_reason:String(form.get('reason')??'').trim()});
  revalidatePath('/admin','layout');revalidatePath('/discover');revalidatePath('/characters','layout');
  if(result.error || result.data?.error) return {error:result.data?.error==='conflict'?'These controls changed. Reload before saving; your choices are still here.':result.data?.error==='rate_limited'?'Too many changes. Wait a minute and try again.':'Controls were not saved. Check the reason and try again.'};
  return {message:'Controls saved.'};
 } catch {return {error:'Operations are unavailable. Please try again later.'};}
}

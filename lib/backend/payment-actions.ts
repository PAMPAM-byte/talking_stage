"use server";
import { revalidatePath } from 'next/cache';
import { currentAccount } from './server';
import { startGift, reconcileGift, type GiftIntent } from './payment-service';
import { parseNaira } from '@/lib/format';
import {trustedBackendClient} from './trusted-client';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function createGiftAction(form:FormData):Promise<{id?:string;error?:string}> {
 try{
  const account=await currentAccount({failOnUnavailable:true});
  if(!account?.profile.onboarding_complete||!account.profile.adult_declared_at)return {error:'Sign in with an eligible account.'};
  const conversation=String(form.get('conversation')??''),operation=String(form.get('operation')??''),amount=parseNaira(String(form.get('amount')??''));
  if(!uuid.test(conversation)||!uuid.test(operation)||!amount||form.get('confirmed')!=='yes')return {error:'Review and confirm the amount and recipient.'};
  const result=await startGift(account.user.id,conversation,amount,operation);
  try{revalidatePath('/settings/payments');}catch{/* A cache failure cannot undo a reservation. */}
  return result;
 }catch{return {error:'Checkout could not be confirmed. Retry this same attempt; your payment will not be duplicated.'};}
}
export async function checkGiftAction(form:FormData):Promise<{error?:string}> {
 try{
  const id=String(form.get('id')??'');if(!uuid.test(id))return {error:'Payment unavailable.'};
  const account=await currentAccount({failOnUnavailable:true});
  if(!account?.profile.onboarding_complete||!account.profile.adult_declared_at)return {error:'Sign in with an eligible account.'};
  const owned=await account.client.from('payment_intents').select('*').eq('id',id).eq('user_id',account.user.id).maybeSingle();
  if(owned.error||!owned.data)return {error:'Payment unavailable.'};
  await reconcileGift(owned.data as GiftIntent);
  try{revalidatePath(`/payments/${id}`);revalidatePath('/settings/payments');revalidatePath(`/messages/${owned.data.conversation_id}`);}catch{/* Ledger state remains authoritative. */}
  return {};
 }catch{return {error:'Verification is temporarily unavailable. The last known payment status is unchanged.'};}
}
export async function declineGiftAction(form:FormData):Promise<{error?:string}> {
 try{
  const id=String(form.get('id')??'');if(!uuid.test(id))return {error:'Request unavailable.'};
  const account=await currentAccount({failOnUnavailable:true});
  if(!account?.profile.onboarding_complete||!account.profile.adult_declared_at)return {error:'Sign in with an eligible account.'};
  const result=await account.client.rpc('decline_gift_proposal',{p_id:id});
  if(result.error)return {error:'The request could not be declined. Try again.'};
  try{revalidatePath('/messages','layout');revalidatePath('/settings/requests');}catch{/* The saved refusal remains authoritative. */}
  return {};
 }catch{return {error:'The request could not be declined. Try again.'};}
}
export async function adminCheckGiftAction(form:FormData):Promise<{error?:string}> {
 try{
  const id=String(form.get('id')??'');if(!uuid.test(id))return {error:'Payment unavailable.'};
  const account=await currentAccount({failOnUnavailable:true});
  if(!account?.profile.onboarding_complete||!account.profile.adult_declared_at||(await account.client.rpc('is_admin')).data!==true)return {error:'Administrator access required.'};
  const result=await trustedBackendClient().from('payment_intents').select('*').eq('id',id).maybeSingle();
  if(result.error||!result.data)return {error:'Payment unavailable.'};
  await reconcileGift(result.data as GiftIntent);
  try{revalidatePath('/admin/payments','layout');revalidatePath('/settings/payments');revalidatePath(`/payments/${id}`);revalidatePath(`/messages/${result.data.conversation_id}`);}catch{/* Verified state remains committed. */}
  return {};
 }catch{return {error:'Reconciliation is unavailable. The last known status is unchanged.'};}
}

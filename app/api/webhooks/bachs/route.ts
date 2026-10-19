import { verifyBachsEvent, bachsSettings, PaymentError } from '@/lib/payments/bachs.mjs';
import { trustedBackendClient } from '@/lib/backend/trusted-client';
import { reconcileGift, type GiftIntent } from '@/lib/backend/payment-service';
import { revalidatePath } from 'next/cache';
export const maxDuration=60;
export async function POST(request:Request) {
 const settings=bachsSettings();if(!settings)return new Response('Unavailable',{status:503});
 try{
  // Bound the stream before parsing or authenticating it.
  const reader=request.body?.getReader();if(!reader)return new Response('Invalid body',{status:400});
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144)return new Response('Body too large',{status:413});chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const event=verifyBachsEvent(Buffer.concat(chunks),request.headers,settings);
  // Other product/subscription/payout events do not belong to this integration.
  if(!/^(collection\.|checkout\.|refund\.|dispute\.)/.test(event.type))return new Response(null,{status:204});
  const checkoutId=event.data.checkout_id;
  if(typeof checkoutId!=='string'||!/^chk_[A-Za-z0-9]+$/.test(checkoutId))return new Response(null,{status:204});
  const client=trustedBackendClient();
  const result=await client.from('payment_intents').select('*').eq('gateway_environment',settings.environment).eq('gateway_organization_id',settings.organizationId).eq('gateway_checkout_id',checkoutId).maybeSingle();
  if(result.error)return new Response('Retry later',{status:503});
  // Creation can race its first webhook; retry instead of losing that event.
  if(!result.data){
   if(typeof event.data.reference!=='string'||!event.data.reference.startsWith('TS-'))return new Response(null,{status:204});
   const pending=await client.from('payment_intents').select('id').eq('gateway_environment',settings.environment).eq('gateway_organization_id',settings.organizationId).eq('reference',event.data.reference).maybeSingle();
   return pending.error||pending.data?new Response('Checkout not bound',{status:503}):new Response(null,{status:204});
  }
  const intent=result.data as GiftIntent;await reconcileGift(intent,{id:event.id,type:event.type});
  try{revalidatePath(`/payments/${intent.id}`);revalidatePath(`/messages/${intent.conversation_id}`);revalidatePath('/settings/payments');}catch{/* A verified commit is not reversed by cache failure. */}
  return new Response(null,{status:204});
 }catch(error){
  return new Response(error instanceof PaymentError&&error.code==='invalid_webhook'?'Invalid signature':'Retry later',{status:error instanceof PaymentError&&error.code==='invalid_webhook'?400:503});
 }
}

import 'server-only';
import { trustedBackendClient } from './trusted-client';
import { bachsSettings, createCheckout, verifyCheckout, checkoutURL } from '@/lib/payments/bachs.mjs';
import { emitGiftFailure } from '@/lib/monitoring/events.mjs';
export type GiftIntent = {
 id:string;user_id:string;conversation_id:string;character_id:string;amount_minor:number;currency:string;reference:string;
 recipient_disclosure:string;status:string;needs_review:boolean;created_at:string;verified_at:string|null;expires_at:string|null;
 gateway_environment:string;gateway_organization_id:string;gateway_checkout_id:string|null;checkout_url:string|null;
};
export async function startGift(actor:string,conversation:string,amount:number,operation:string) {
 const settings=bachsSettings();if(!settings){emitGiftFailure('configuration',{});throw new Error('Payments are not configured.');}
 const client=trustedBackendClient();
 const reserved=await client.rpc('reserve_gift',{p_actor:actor,p_conversation:conversation,p_amount:amount,p_operation:operation,p_environment:settings.environment,p_organization:settings.organizationId});
 if(reserved.error)emitGiftFailure('reserve',{code:'reserve_failed'});
 if(reserved.error)throw new Error(/invalid_amount/.test(reserved.error.message)?'Choose an amount within the payment limits.':/conflict/.test(reserved.error.message)?'This attempt has different details. Reload before trying again.':'This payment is unavailable. Reload to check availability.');
 const intent=reserved.data as GiftIntent;
 if(!intent.gateway_checkout_id){
  // A lost response retries the same intent and Bachs idempotency key.
  const checkout=await createCheckout(settings,intent,process.env.TALKINGSTAGE_SITE_URL,{allowLocalSandboxReturn:process.env.NODE_ENV==='development'}).catch(error=>{emitGiftFailure('checkout',error);throw error;});
  const bound=await client.rpc('bind_gift_checkout',{p_intent:intent.id,p_checkout:checkout.checkoutId,p_url:checkout.checkoutUrl,p_expires:checkout.expiresAt});
  if(bound.error)emitGiftFailure('bind',{code:'bind_failed'});
  if(bound.error)throw new Error('Checkout could not be confirmed. Retry this same attempt.');
 }
 return {id:intent.id};
}
export async function reconcileGift(intent:GiftIntent,event?:{id:string;type:string}) {
 const settings=bachsSettings();
 if(!settings||intent.gateway_environment!==settings.environment||intent.gateway_organization_id!==settings.organizationId)throw new Error('Payment verification unavailable.');
 const verified=await verifyCheckout(settings,intent);
 if(event?.type.startsWith('dispute.'))verified.status='review';
 const result=await trustedBackendClient().rpc('apply_gift_verification',{p_intent:intent.id,p_checkout:verified.checkoutId,p_payment:verified.paymentId,p_state:verified.status,p_verified_at:verified.verifiedAt,p_event:event?.id??null,p_event_type:event?.type??'reconciliation'});
 if(result.error)throw new Error('Payment verification unavailable.');
 return result.data as string;
}
export function safeGiftCheckout(intent:GiftIntent) {
 try{if(!intent.expires_at||Date.parse(intent.expires_at)<=Date.now())return null;return intent.checkout_url?checkoutURL(intent.checkout_url):null;}catch{return null;}
}

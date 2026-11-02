import {generateReply,ReplyError} from './provider.mjs';
import {commitReply} from './reply-commit.mjs';
import {meterTransport,settleUsage} from './usage-settlement.mjs';
/** One AI thank-you per verified payment; any unavailability posts the fixed thanks instead. */
export async function runPaymentThanks(client,intentId,settings,options={}){
 const fallback=async()=>{const posted=await client.rpc('payment_thanks_fallback',{p_intent:intentId});return posted.error?'unavailable':'fallback';};
 if(!settings)return fallback();
 const metered=meterTransport(options);const transport=metered.transport;
 const claimed=await client.rpc('claim_payment_thanks',{p_intent:intentId,p_model:settings.model});
 if(claimed.error)return 'unavailable';const context=claimed.data;
 if(context.state==='fallback')return fallback();
 if(context.state!=='claimed')return context.state;
 let text=null;let failure=null;
 try{const reply=await generateReply(context,settings,transport);if(reply.refused)throw new ReplyError('invalid_output');text=reply.text;}catch(error){failure=error instanceof ReplyError?error.code:'provider_error';}
 const result=await commitReply(client,'finish_payment_thanks',{p_job:context.job,p_lease:context.lease,p_intent:intentId,p_text:text,p_failure:failure},{pause:transport.commitRetryPause,onAttempt:transport.onCommitAttempt});
 await settleUsage(client,context.lease,context.actor,metered.usage());
 return result.error?'unavailable':result.data;
}

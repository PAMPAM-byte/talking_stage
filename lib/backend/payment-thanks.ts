import 'server-only';
import {providerSettings} from '@/lib/ai/provider.mjs';
import {runPaymentThanks} from '@/lib/ai/payment-thanks-pipeline.mjs';
import {trustedBackendClient} from './trusted-client';
import {emit,emitAIUsage,emitReplyQuality} from '@/lib/monitoring/events.mjs';
/** Runs after a verified payment from the webhook or the chat return check; the database posts it once. */
export async function thankForPayment(intentId:string){
 try{return await runPaymentThanks(trustedBackendClient(),intentId,providerSettings(),{onQuality:emitReplyQuality,onUsage:(usage:Parameters<typeof emitAIUsage>[1])=>emitAIUsage('ai.reply',usage)});}
 catch{emit('ai.reply','unavailable');return 'unavailable';}
}

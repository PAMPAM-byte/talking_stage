import 'server-only';
import {providerSettings} from '@/lib/ai/provider.mjs';
import {runCheckin} from '@/lib/ai/checkin-pipeline.mjs';
import {trustedBackendClient} from './trusted-client';
import {emit,emitAIUsage,emitReplyQuality} from '@/lib/monitoring/events.mjs';
export async function processCheckin(actor:string,conversationId?:string){
 const settings=providerSettings();if(!settings)return 'disabled';
 try{return await runCheckin(trustedBackendClient(),actor,settings,{onReturn:true,conversationId,onQuality:emitReplyQuality,onUsage:(usage:Parameters<typeof emitAIUsage>[1])=>emitAIUsage('ai.reply',usage)});}catch{emit('ai.reply','unavailable');return 'unavailable';}
}

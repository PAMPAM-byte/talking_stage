import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {supabaseConfig} from './config';
import {providerSettings} from '@/lib/ai/provider.mjs';
import {runReply} from '@/lib/ai/reply-pipeline.mjs';
import {runSummary} from '@/lib/ai/summary-pipeline.mjs';
import { observeAI, emit } from '@/lib/monitoring/events.mjs';
export function configuredReplyModel(){return providerSettings()?.model??null;}
export async function processReply(messageId:string,actorId:string,signal?:AbortSignal):Promise<string> {
 const settings=providerSettings();const config=supabaseConfig();const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!settings||!config||!key){emit('ai.reply', 'disabled');return 'blocked_provider';}
 const client=createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 return observeAI('ai.reply', () => runReply(client,messageId,actorId,settings,{signal}));
}
export async function processSummary(messageId:string,actorId:string):Promise<string> {
 const settings=providerSettings();const config=supabaseConfig();const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!settings||!config||!key){emit('ai.summary', 'disabled');return 'blocked_provider';}
 const client=createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 return observeAI('ai.summary', () => runSummary(client,messageId,actorId,settings));
}

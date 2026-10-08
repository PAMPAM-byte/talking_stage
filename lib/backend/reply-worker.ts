import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {supabaseConfig} from './config';
import {providerSettings} from '@/lib/ai/provider.mjs';
import {runReply} from '@/lib/ai/reply-pipeline.mjs';
export function configuredReplyModel(){return providerSettings()?.model??null;}
export async function processReply(messageId:string,actorId:string,signal?:AbortSignal):Promise<string> {
 const settings=providerSettings();const config=supabaseConfig();const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!settings||!config||!key)return 'blocked_provider';
 const client=createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 return runReply(client,messageId,actorId,settings,{signal});
}

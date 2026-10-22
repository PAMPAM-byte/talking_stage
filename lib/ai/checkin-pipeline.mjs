import {generateReply,ReplyError} from './provider.mjs';
import {commitReply} from './reply-commit.mjs';
export async function runCheckin(client,actor,settings,{onReturn=false,conversationId,...transport}={}){
 const claimed=await client.rpc(conversationId?'claim_character_initiative':'claim_character_checkin',{p_actor:actor,p_model:settings.model,p_on_return:onReturn,...(conversationId?{p_conversation:conversationId}:{})});
 if(claimed.error)return 'unavailable';const context=claimed.data;if(context.state!=='claimed')return context.state;
 let text=null;let failure=null;
 try{const reply=await generateReply(context,settings,transport);if(reply.refused)throw new ReplyError('invalid_output');text=reply.text;}catch(error){failure=error instanceof ReplyError?error.code:'provider_error';}
 const result=await commitReply(client,'finish_character_checkin',{p_job:context.job,p_actor:actor,p_lease:context.lease,p_text:text,p_failure:failure},{pause:transport.commitRetryPause,onAttempt:transport.onCommitAttempt});
 return result.error?'unavailable':result.data;
}

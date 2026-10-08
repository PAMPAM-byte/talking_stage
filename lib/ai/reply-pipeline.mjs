import {generateReply,ReplyError} from './provider.mjs';
// Dependencies are supplied only by the trusted server wrapper or offline tests.
export async function runReply(client,messageId,actorId,settings,transport={}) {
 const claimed=await client.rpc('claim_reply',{p_message:messageId,p_actor:actorId,p_model:settings.model});
 if(claimed.error)return 'unavailable';
 const context=claimed.data;if(context.state!=='claimed')return context.state;
 let text;let asset;let failure;
 try{const reply=await generateReply(context,settings,transport);text=reply.text;asset=reply.photoAssetId;}catch(error){failure=error instanceof ReplyError?error.code:'provider_error';}
 // Copied context cannot authorize output; the separate commit rechecks eligibility.
 const finished=await client.rpc('finish_reply',{p_job:context.job,p_actor:actorId,p_lease:context.lease,p_text:text??null,p_failure:failure??null,p_asset:asset??null});
 return finished.error?'failed':finished.data;
}

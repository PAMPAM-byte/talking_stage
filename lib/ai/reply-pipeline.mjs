import { generateReply, ReplyError } from './provider.mjs';
// Dependencies are supplied only by the trusted server wrapper or offline tests.
export async function runReply(client, messageId, actorId, settings, transport = {}) {
    const claimed = await client.rpc('claim_reply', { p_message: messageId, p_actor: actorId, p_model: settings.model });
    if (claimed.error)
        return 'unavailable';
    const context = claimed.data;
    if (context.state !== 'claimed')
        return context.state;
    let text;
    let asset;
    let failure;
    let requestAmount;
    let reaction;
    try {
        const payments = context.payments ? { ...context.payments, available: context.payments.available === true && transport.paymentsEnabled === true } : undefined;
        const reply = await generateReply({ ...context, payments, userTimeZone: transport.userTimeZone }, settings, transport);
        text = reply.text;
        asset = reply.photoAssetId;
        requestAmount = reply.requestAmountMinor;
        reaction = reply.reaction;
    }
    catch (error) {
        failure = error instanceof ReplyError ? error.code : 'provider_error';
    }
    // Copied context cannot authorize output; the separate commit rechecks eligibility.
    const finished = await client.rpc(requestAmount!=null?'finish_gift_reply':reaction?'finish_reaction_reply':'finish_reply', { p_job: context.job, p_actor: actorId, p_lease: context.lease, p_text: text ?? null, p_failure: failure ?? null, p_asset: asset ?? null, ...(requestAmount!=null?{p_request_amount:requestAmount}:{}), ...(reaction?{p_message:reaction.messageId,p_emoji:reaction.emoji}:{}) });
    return finished.error ? 'failed' : finished.data;
}

import { requestStructured, ReplyError } from './provider.mjs';
import { meterTransport, settleUsage } from './usage-settlement.mjs';

// Long-term memory per user and character (founder request, 3 November 2026). Each refresh folds
// the next unsummarised messages into the memory: key points are merged and compacted, never lost.
const memoryInstructions = name => `You maintain the long-term private memory that ${name}, a fictional adult character on a Nigerian dating app, keeps about one user. This memory must let ${name} feel continuous over months and years. Fold newMessages into it.
story (at most 2,200 characters): durable key points of the whole relationship so far, as short factual third-person notes. Cover who the user is as they described themselves (name, work, city, family, friends, goals), what they shared (past relationships, likes, dislikes, plans, worries), what ${name} shared about their own life, milestones and memorable moments with rough dates, promises and plans, inside jokes and nicknames, and how the relationship has developed. Keep every key point from previousStory that still holds. When space runs short, merge and compress older details into briefer points instead of dropping them. Update facts that changed.
recent (at most 800 characters): what has been happening in the latest messages, the current mood between them and any open threads to pick up.
topics: the cumulative list (at most 40) of subjects already discussed, e.g. "work", "weekend plans", "past relationships", "love language". Keep previousTopics and add new ones; merge near-duplicates.
If removeFacts is not empty, remove those facts and anything that repeats them completely.
Never include phone numbers, emails, addresses, bank or card details, passwords or health details.`;

export async function generateRecap(context, settings, transport = {}) {
    const sources = context.sources.slice(-60);
    const assemble = () => [{ role: 'developer', content: memoryInstructions(context.character) },
        { role: 'user', content: JSON.stringify({ userName: context.userName ?? null, previousStory: context.previousStory ?? '', previousRecent: context.previousRecent ?? '', previousTopics: context.previousTopics ?? [], removeFacts: context.removeFacts ?? [], newMessages: sources }) }];
    let input = assemble();
    while (Buffer.byteLength(JSON.stringify(input), 'utf8') + 2048 > context.maxInputTokens && sources.length > 1) {
        sources.shift();
        input = assemble();
    }
    const schema = { type: 'object', properties: { story: { type: 'string' }, recent: { type: 'string' }, topics: { type: 'array', items: { type: 'string' } } }, required: ['story', 'recent', 'topics'], additionalProperties: false };
    const result = await requestStructured(context, settings, { input, schema, name: 'talkingstage_memory' }, transport);
    if (!result || typeof result.story !== 'string' || typeof result.recent !== 'string' || !Array.isArray(result.topics))
        throw new ReplyError('invalid_output');
    const tidy = (value, limit) => value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, limit);
    const story = tidy(result.story, 2400);
    const recent = tidy(result.recent, 1000);
    const seen = new Set();
    const topics = result.topics.filter(topic => typeof topic === 'string').map(topic => topic.trim().slice(0, 40))
        .filter(topic => topic.length >= 2 && !seen.has(topic.toLowerCase()) && seen.add(topic.toLowerCase())).slice(0, 40);
    if (story.length < 20) throw new ReplyError('invalid_output');
    return { story, recent, topics };
}

/** Runs up to three refreshes so a long existing chat catches up quickly. */
export async function runRecap(client, messageId, actorId, settings, options = {}) {
    let state = 'not_needed';
    for (let round = 0; round < 3; round++) {
        const metered = meterTransport(options);
        const claimed = await client.rpc('claim_recap', { p_message: messageId, p_actor: actorId, p_model: settings.model });
        if (claimed.error) return 'unavailable';
        const context = claimed.data;
        if (context.state !== 'claimed') return round ? state : context.state;
        let memory = null; let failure = null;
        try { memory = await generateRecap(context, settings, metered.transport); }
        catch (error) { failure = error instanceof ReplyError ? error.code : 'provider_error'; }
        const finished = await client.rpc('finish_recap', { p_conversation: context.conversation, p_actor: actorId, p_lease: context.lease, p_story: memory?.story ?? null, p_recent: memory?.recent ?? null, p_topics: memory?.topics ?? null, p_failure: failure });
        await settleUsage(client, context.lease, actorId, metered.usage());
        state = finished.error ? 'failed' : finished.data;
        if (state !== 'completed' || !context.catchingUp) break;
    }
    return state;
}

import { requestStructured, ReplyError } from './provider.mjs';
import { meterTransport, settleUsage } from './usage-settlement.mjs';

// Per-conversation memory (founder request, 3 November 2026): the previous recap plus the
// messages since it are rewritten into one short recap the character reads on every reply.
const recapInstructions = name => `You keep the private chat memory for ${name}, a fictional adult character on a Nigerian dating app, about one user. Update the recap with the new messages. Write up to 900 characters of plain, factual notes in the third person: who the user is (as they said), what they shared (work, city, family, plans, past relationships, likes, dislikes), what ${name} shared about herself or himself, running jokes or nicknames, promises or plans, and where things stand between them and the current vibe. Keep facts from the previous recap that still hold; drop small talk. topics: up to 12 short labels for subjects already discussed (e.g. "work", "weekend plans", "past relationships", "love language"). Never include phone numbers, emails, addresses, bank or card details, passwords or health details.`;

export async function generateRecap(context, settings, transport = {}) {
    const sources = context.sources.slice(-40);
    const assemble = () => [{ role: 'developer', content: recapInstructions(context.character) },
        { role: 'user', content: JSON.stringify({ userName: context.userName ?? null, previousRecap: context.previousRecap, previousTopics: context.previousTopics, newMessages: sources }) }];
    let input = assemble();
    while (Buffer.byteLength(JSON.stringify(input), 'utf8') + 2048 > context.maxInputTokens && sources.length > 1) {
        sources.shift();
        input = assemble();
    }
    const schema = { type: 'object', properties: { recap: { type: 'string' }, topics: { type: 'array', items: { type: 'string' } } }, required: ['recap', 'topics'], additionalProperties: false };
    const result = await requestStructured(context, settings, { input, schema, name: 'talkingstage_recap' }, transport);
    if (!result || typeof result.recap !== 'string' || !Array.isArray(result.topics))
        throw new ReplyError('invalid_output');
    const recap = result.recap.replace(/\s+/g, ' ').trim().slice(0, 1200);
    const topics = [...new Set(result.topics.filter(topic => typeof topic === 'string').map(topic => topic.trim().slice(0, 40)).filter(topic => topic.length >= 2))].slice(0, 12);
    if (recap.length < 20) throw new ReplyError('invalid_output');
    return { recap, topics };
}

export async function runRecap(client, messageId, actorId, settings, options = {}) {
    const metered = meterTransport(options);
    const claimed = await client.rpc('claim_recap', { p_message: messageId, p_actor: actorId, p_model: settings.model });
    if (claimed.error) return 'unavailable';
    const context = claimed.data;
    if (context.state !== 'claimed') return context.state;
    let recap = null; let failure = null;
    try { recap = await generateRecap(context, settings, metered.transport); }
    catch (error) { failure = error instanceof ReplyError ? error.code : 'provider_error'; }
    const finished = await client.rpc('finish_recap', { p_conversation: context.conversation, p_actor: actorId, p_lease: context.lease, p_recap: recap?.recap ?? null, p_topics: recap?.topics ?? null, p_failure: failure });
    await settleUsage(client, context.lease, actorId, metered.usage());
    return finished.error ? 'failed' : finished.data;
}

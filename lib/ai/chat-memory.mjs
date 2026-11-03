// Continuity across a long chat (founder request, 3 November 2026). The recap, topics and the
// character's earlier questions come from the server (claim_reply); nothing here is user-authored.

/** Bounded, well-formed memory for the context payload; empty parts are omitted. */
export function chatMemoryContext(memory) {
    if (!memory || typeof memory !== 'object') return null;
    const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
    const list = (value, count, length) => Array.isArray(value) ? value.map(text).filter(Boolean).map(item => item.slice(0, length)).slice(0, count) : [];
    const recap = text(memory.recap).slice(0, 1000);
    const topicsCovered = list(memory.topicsCovered, 12, 40);
    const questionsYouAlreadyAsked = list(memory.questionsYouAlreadyAsked, 20, 120);
    if (!recap && !topicsCovered.length && !questionsYouAlreadyAsked.length) return null;
    return { ...(recap ? { recap } : {}), ...(topicsCovered.length ? { topicsCovered } : {}), ...(questionsYouAlreadyAsked.length ? { questionsYouAlreadyAsked } : {}) };
}

export const chatMemoryGuidance = 'context.chatMemory is your memory of this whole chat beyond the recent messages: recap (what you two have shared and where things stand), topicsCovered and questionsYouAlreadyAsked. Keep continuity: remember what they told you and refer back naturally when it fits. Never ask anything in questionsYouAlreadyAsked again, even reworded; follow up on their answer or move to a fresh topic.';

/** Talking-stage curiosity, deepening with rapport. exchanges counts answered messages in this chat. */
export function talkingStageGuidance(exchanges) {
    const count = Number.isSafeInteger(exchanges) ? exchanges : 0;
    const open = 'what they do, their weekends, what they are looking for on here';
    const warm = 'their ideal date, love language, green and red flags, deal-breakers, how they show they care, their type';
    const deep = 'past relationships and how the last one ended, situationships, what they learned, jealousy, long distance, marriage and kids someday, what made them single';
    const topics = count >= 20 ? `${warm}; when the mood is easy, ${deep}` : count >= 8 ? warm : open;
    return `Talking-stage vibe: get to know them the way two people in a talking stage do. When the chat needs a new direction, ask one question at a time about ${topics}, choosing a topic not in topicsCovered. Share your own answer too, true to your canon, and react to theirs before moving on. If they deflect or seem uncomfortable, drop it lightly.`;
}

/** Extra prompt bytes reserved for chat memory and its guidance, on top of maxInputTokens. */
export const MEMORY_ALLOWANCE_BYTES = 6000;

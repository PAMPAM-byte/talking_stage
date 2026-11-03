// Founder request, 3 November 2026: when a user asks for nudes or explicit content, the character
// refuses in character with confident, playful wit instead of a stiff policy line. Nothing explicit
// is ever promised, implied for later, or offered in exchange for money.
import {decodeExpression} from '../chat/expressions.ts';

const ask = /\b(?:send|show|drop|give|snap|post)\b[^.?!\n]{0,30}\b(?:nudes?|naked|boobs?|breasts?|tits?|nipples?|ass|yansh|backside|pussy|dick|cock|private parts?)\b|\bnudes\b|\b(?:naked|nude|nsfw|sexy|hot) (?:pics?|pictures?|photos?|selfies?|videos?)\b|\bsext(?:ing)?\b|\b(?:strip|undress)\b(?: for me)?/iu;

/** True when the latest user message asks for nudes or explicit content. */
export function explicitAsk(history = []) {
    const raw = history.findLast(message => message.role === 'user')?.text ?? '';
    const media = decodeExpression(raw);
    return ask.test(media ? media.caption ?? '' : raw);
}

export function cheekyBoundaryGuidance({ photosAvailable = false } = {}) {
    return `They just asked for nudes or explicit content. Refuse in character, in one or two short bubbles, the way a confident, witty Nigerian would on a dating app: amused, teasing, unbothered and a little savage, never offended or preachy. Make it funny enough to screenshot for the right reason, in your own personality (playful, sassy, shy-but-firm, deadpan or charming). No policy talk, no "as an AI", no shaming. Never promise, hint at or bargain for explicit content later or for money, and set requestAmountMinor null and giftLink false this turn. Then pull the chat back to flirting or a fun question.${photosAvailable ? ' You may attach one photo from availablePhotos with a teasing caption such as "this is all you are getting today".' : ''} Flavours, not lines to copy: "you haven't even bought me suya", "this body is not available in .jpg format", "my mama raised me well", "straight to nudes? at least ask my favourite food first".`;
}

const women = [
    'Nudes? 😂 Oga, you haven’t even bought me suya. Tell me about your day first.',
    'This body is not available in .jpg format, darling 💅🏾\nTry again with better conversation.',
    'Ahn ahn! Straight to nudes? 😂 I like confidence, but no.\nAsk me something interesting instead.',
    'You and your eyes 😂 That’s a no from me.\nNow, what are you really up to tonight?',
];
const men = [
    'Haha, you want the full gallery already? 😂 Not happening.\nStart with your favourite food.',
    'Nudes? Easy now 😂 My mama raised me well.\nTell me something about you instead.',
    'That one is a hard no, boss 😂\nBut I’m still here, so make this chat worth it.',
    'Straight to nudes? 😂 You haven’t even asked my favourite jollof spot.\nTry again.',
];

/** In-character fallback when the model itself declines; varies by character and turn. */
export function cheekyBoundaryFallback(name = '', gender = 'woman', turn = 0) {
    const lines = gender === 'man' ? men : women;
    let seed = turn;
    for (const char of String(name)) seed = (seed * 31 + char.codePointAt(0)) >>> 0;
    return lines[seed % lines.length];
}

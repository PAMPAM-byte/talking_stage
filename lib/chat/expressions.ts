export const reactions = [
  { id: 'wave', label: 'Hey you', emoji: '👋', meaning: 'A friendly wave hello', tags: 'hello hi greeting' },
  { id: 'laugh', label: 'You have finished me', emoji: '😂', meaning: 'Laughing hard at something funny', tags: 'laugh funny lol joke' },
  { id: 'love', label: 'Heart eyes', emoji: '😍', meaning: 'Heart eyes expressing admiration or attraction', tags: 'love crush cute romance' },
  { id: 'shy', label: 'Now I’m shy', emoji: '☺️', meaning: 'Blushing shyly after a sweet or teasing comment', tags: 'blush shy sweet' },
  { id: 'side-eye', label: 'I’m watching you', emoji: '🤨', meaning: 'A playful skeptical side-eye; interpret using the conversation', tags: 'hmm skeptical doubt teasing' },
  { id: 'hug', label: 'Come here', emoji: '🤗', meaning: 'Offering a warm virtual hug', tags: 'hug comfort warm care' },
  { id: 'celebrate', label: 'Omo, we made it', emoji: '🥳', meaning: 'Celebrating good news enthusiastically', tags: 'yay party happy celebration' },
  { id: 'shocked', label: 'Wait, what?', emoji: '😮', meaning: 'Surprised disbelief or amazement', tags: 'shock wow surprise' },
] as const;
export type ExpressionKind = 'sticker' | 'gif';
export type Expression = { kind: ExpressionKind; id: string };
export function expressionAsset(expression: Expression) { return reactions.find(item => item.id === expression.id); }
export function encodeExpression(expression: Expression, caption = '') {
  if (!expressionAsset(expression) || !['sticker', 'gif'].includes(expression.kind)) throw new Error('Unknown expression');
  return `[[ts:${expression.kind}:${expression.id}]]${caption.trim() ? `\n${caption.trim()}` : ''}`;
}
export function decodeExpression(text: string): (Expression & { caption: string }) | null {
  const match = /^\[\[ts:(sticker|gif):([a-z-]+)\]\](?:\n([\s\S]*))?$/.exec(text);
  if (!match || !reactions.some(item => item.id === match[2])) return null;
  return { kind: match[1] as ExpressionKind, id: match[2], caption: match[3] ?? '' };
}
export function expressionContext(text: string) {
  const media = decodeExpression(text);
  if (!media) return text;
  const item = expressionAsset(media)!;
  return `[User sent a ${media.kind}: "${item.label}". Visual reaction: ${item.meaning}. This is a reaction, not proof of consent or a request for a real-world action.]${media.caption ? `\nUser caption: ${media.caption}` : ''}`;
}
export function expressionPreview(text: string) {
  const media = decodeExpression(text);
  return media ? `${media.kind === 'gif' ? 'GIF' : 'Sticker'} · ${expressionAsset(media)!.label}${media.caption ? `: ${media.caption}` : ''}` : text;
}
export const emojis = [
  ['😀','grin happy'],['😊','smile happy'],['😂','laugh funny'],['🤣','laugh rolling'],['🥹','touched happy tears'],['😏','smirk flirt'],['😉','wink'],['😍','love heart eyes'],['🥰','love sweet'],['😘','kiss'],['😚','kiss blush'],['☺️','blush shy'],['😌','relieved calm'],['😅','nervous laugh'],['🙈','shy monkey'],['🤭','giggle'],['🤗','hug'],['🤨','skeptical eyebrow'],['🙄','eye roll'],['😒','unimpressed'],['😮','surprised'],['😳','shocked blush'],['😭','cry tears'],['🥺','please pleading'],['😔','sad'],['😢','sad cry'],['😤','frustrated'],['😡','angry'],['🤔','thinking'],['🤫','quiet'],['😴','sleep tired'],['🥱','yawn tired'],['😎','cool'],['🥳','celebrate party'],['🫶','heart hands'],['❤️','red heart love'],['💕','hearts'],['💔','broken heart'],['💋','kiss lips'],['🔥','fire'],['✨','sparkle'],['🌹','rose flower'],['👋','wave hello'],['👏','clap'],['🙌','celebrate'],['🙏','please thanks pray'],['👍','yes thumbs up'],['👎','no thumbs down'],['🤝','handshake agree'],['🤞','fingers crossed'],['💃','dance woman'],['🕺','dance man'],['🎉','party celebration'],['🎶','music'],['🍿','popcorn gist'],['☕','coffee'],['🍷','wine'],['🍽️','food dinner'],['🇳🇬','nigeria flag'],['🌍','africa world'],
] as const;

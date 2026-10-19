// Persist a presentation token, never a model-authored destination or checkout.
export const GIFT_LINK_TOKEN = '[[talkingstage:gift]]';
export function giftMessage(text, enabled = false) {
 const hasLink = typeof text === 'string' && text.includes(GIFT_LINK_TOKEN);
 return { text: text.replaceAll(GIFT_LINK_TOKEN, '').trim(), showLink: enabled && hasLink };
}

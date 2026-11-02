// Persist a presentation token, never a model-authored destination or checkout.
export const GIFT_LINK_TOKEN = '[[talkingstage:gift]]';
export const PAYMENT_DETAILS_LABEL = 'Send money';
export function giftMessage(text, enabled = false) {
 const hasLink = typeof text === 'string' && text.includes(GIFT_LINK_TOKEN);
 // Older saved replies used this stock checkout sentence. Change presentation
 // only when our trusted action token is present; never alter ordinary chat.
 const clean = text.replaceAll(GIFT_LINK_TOKEN, '').trim();
 const display = hasLink ? clean.replace(/\s*\bhere(?:'|’)s the link(?: to send (?:a gift|money))?\s*[.!]?/giu, '').trim() : clean;
 return { text: display, showLink: enabled && hasLink };
}

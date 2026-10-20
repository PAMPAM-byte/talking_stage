// Persist a presentation token, never a model-authored destination or checkout.
export const GIFT_LINK_TOKEN = '[[talkingstage:gift]]';
export const PAYMENT_DETAILS_LABEL = 'Get transfer details';
export function giftMessage(text, enabled = false) {
 const hasLink = typeof text === 'string' && text.includes(GIFT_LINK_TOKEN);
 // Older saved replies used this stock checkout sentence. Change presentation
 // only when our trusted action token is present; never alter ordinary chat.
 const clean = text.replaceAll(GIFT_LINK_TOKEN, '').trim();
 const display = hasLink ? clean.replace(/\bhere(?:'|’)s the link(?: to send (?:a gift|money))?\s*[.!]?/giu, 'You can get the transfer details below.') : clean;
 return { text: display, showLink: enabled && hasLink };
}

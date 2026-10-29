import {expressionPreview} from './expressions';
import {GIFT_LINK_TOKEN} from '../payments/gift-link.mjs';
export type MessageQuote={id:string;role:'user'|'character';kind:string;text:string;sequence?:number;part?:number};
export function quoteSnippet(quote:MessageQuote){return quote.kind==='photo'?'Photo':expressionPreview(quote.text).replaceAll(GIFT_LINK_TOKEN,'').trim().slice(0,180)||'Message';}

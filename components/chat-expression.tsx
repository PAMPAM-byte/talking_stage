import { decodeExpression, expressionAsset, type Expression } from '@/lib/chat/expressions';
import Link from 'next/link';
import {giftMessage} from '@/lib/payments/gift-link.mjs';
export function ExpressionImage({ expression }: { expression: Expression }) {
  const item = expressionAsset(expression);
  if (!item) return null;
  const poster = `/chat-reactions/${item.id}.svg`;
  return <picture>{expression.kind === 'gif' && <source media="(prefers-reduced-motion: reduce)" srcSet={poster}/>}<img src={expression.kind === 'gif' ? `/chat-reactions/${item.id}.gif` : poster} width={192} height={160} alt={`${expression.kind === 'gif' ? 'GIF' : 'Sticker'}: ${item.label}`} loading="lazy" decoding="async"/></picture>;
}
export function ChatMessageContent({ text, giftHref }: { text: string; giftHref?: string }) {
  const expression = decodeExpression(text);
  const gift=giftMessage(text,!!giftHref);
  if (!expression) return <p className="message-bubble">{gift.text}{gift.showLink&&<><br/><Link href={giftHref!} className="chat-gift-link">Send money <span aria-hidden="true">↗</span></Link></>}</p>;
  return <div className={`message-expression message-expression--${expression.kind}`}><ExpressionImage expression={expression}/>{expression.caption && <p className="message-bubble">{expression.caption}</p>}</div>;
}

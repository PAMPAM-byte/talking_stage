import { decodeExpression, expressionAsset, type Expression } from '@/lib/chat/expressions';
import Link from 'next/link';
import { BurstBubble } from './burst-bubble';
import Image from 'next/image';
import {giftMessage,PAYMENT_DETAILS_LABEL} from '@/lib/payments/gift-link.mjs';
import styles from './chat-expression.module.css';
import {stickerPhotoCredits} from '@/lib/chat/sticker-credits';
export function ExpressionImage({ expression }: { expression: Expression }) {
  const item = expressionAsset(expression);
  if (!item) return null;
  if (item.stickerSrc) {
    const credit = stickerPhotoCredits.find(row => row.id === item.credit);
    return <span className={styles.photo} role="img" aria-label={`Sticker: ${item.label}`} title={credit ? `Photo: ${credit.author} · ${credit.license}. Caption added by TalkingStage.` : item.label}><Image unoptimized src={item.stickerSrc} width={192} height={132} alt="" loading="lazy" decoding="async"/><strong aria-hidden="true">{item.label}</strong></span>;
  }
  const poster = `/chat-reactions/${item.id}.svg`;
  return <picture>{expression.kind === 'gif' && <source media="(prefers-reduced-motion: reduce)" srcSet={poster}/>}<img src={expression.kind === 'gif' ? `/chat-reactions/${item.id}.gif` : poster} width={192} height={160} alt={`${expression.kind === 'gif' ? 'GIF' : 'Sticker'}: ${item.label}`} loading="lazy" decoding="async"/></picture>;
}
export function ChatMessageContent({ text, giftHref, burst = false, fresh = false }: { text: string; giftHref?: string; burst?: boolean; fresh?: boolean }) {
  const expression = decodeExpression(text);
  const gift=giftMessage(text,!!giftHref);
  // A character's reply is texted as separate bubbles, one per line; new ones arrive in turn.
  const parts = burst && !expression ? String(gift.text).split('\n').map(part => part.trim()).filter(Boolean) : [];
  if (parts.length > 1) return <div className="message-burst" data-fresh={fresh || undefined}>{parts.map((part, index) => <BurstBubble key={index} index={index} text={part}>{part}{index === parts.length - 1 && gift.showLink && <><br/><Link href={giftHref!} className="chat-gift-link">{PAYMENT_DETAILS_LABEL} <span aria-hidden="true">↗</span></Link></>}</BurstBubble>)}</div>;
  if (!expression) return <p className="message-bubble">{gift.text}{gift.showLink&&<><br/><Link href={giftHref!} className="chat-gift-link">{PAYMENT_DETAILS_LABEL} <span aria-hidden="true">↗</span></Link></>}</p>;
  return <div className={`message-expression message-expression--${expression.kind}`}><ExpressionImage expression={expression}/>{expression.caption && <p className="message-bubble">{expression.caption}</p>}</div>;
}

import { decodeExpression, expressionAsset, type Expression } from '@/lib/chat/expressions';
export function ExpressionImage({ expression }: { expression: Expression }) {
  const item = expressionAsset(expression);
  if (!item) return null;
  const poster = `/chat-reactions/${item.id}.svg`;
  return <picture>{expression.kind === 'gif' && <source media="(prefers-reduced-motion: reduce)" srcSet={poster}/>}<img src={expression.kind === 'gif' ? `/chat-reactions/${item.id}.gif` : poster} width={192} height={160} alt={`${expression.kind === 'gif' ? 'GIF' : 'Sticker'}: ${item.label}`} loading="lazy" decoding="async"/></picture>;
}
export function ChatMessageContent({ text }: { text: string }) {
  const expression = decodeExpression(text);
  if (!expression) return <p className="message-bubble">{text}</p>;
  return <div className={`message-expression message-expression--${expression.kind}`}><ExpressionImage expression={expression}/>{expression.caption && <p className="message-bubble">{expression.caption}</p>}</div>;
}

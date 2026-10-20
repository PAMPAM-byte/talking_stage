'use client';
import { useId, useRef, useState, useEffect } from 'react';
import { emojis, reactions, supportsExpression, type Expression, type ExpressionKind } from '@/lib/chat/expressions';
import { ExpressionImage } from './chat-expression';
import { Icon } from './ui/icon';
export function ChatExpressionPicker({ disabled, onEmoji, onSelect }: { disabled: boolean; onEmoji: (value: string) => void; onSelect: (value: Expression) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'emoji' | ExpressionKind>('emoji');
  const [query, setQuery] = useState('');
  const id = useId(); const panel = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  const search = query.trim().toLowerCase();
  const visible = reactions.filter(item => supportsExpression(item,tab === 'emoji' ? 'sticker' : tab) && `${item.label} ${item.tags}`.toLowerCase().includes(search));
  const visibleEmoji = emojis.filter(([emoji, words]) => `${emoji} ${words}`.includes(search));
  return <div className="expression-picker">
    <button ref={trigger} className="expression-trigger" type="button" disabled={disabled} aria-label="Emoji, stickers and GIFs" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><Icon name="smile"/></button>
    {open && !disabled && <div ref={panel} id={id} className="expression-panel" role="region" aria-label="Emoji, stickers and GIFs" onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault(); if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }}>
      <div className="expression-panel__header"><strong>Say it your way</strong><button type="button" className="expression-trigger" aria-label="Close expressions" onClick={() => { setOpen(false); trigger.current?.focus(); }}><Icon name="close"/></button></div>
      <div className="expression-tabs" role="group" aria-label="Expression type">{(['emoji','sticker','gif'] as const).map(value => <button type="button" key={value} aria-pressed={tab === value} onClick={() => { setTab(value); setQuery(''); }}>{value === 'emoji' ? 'Emoji' : value === 'sticker' ? 'Stickers' : 'GIFs'}</button>)}</div>
      <input className="expression-search" aria-label="Search expressions" placeholder={tab === 'emoji' ? 'Find a feeling…' : 'Search reactions…'} value={query} onChange={event => setQuery(event.target.value)} maxLength={60}/>
      <div className={`expression-grid expression-grid--${tab}`}>
        {tab === 'emoji' ? visibleEmoji.map(([emoji, words]) => <button key={emoji} type="button" aria-label={`${emoji} ${words}`} title={words} onClick={() => onEmoji(emoji)}>{emoji}</button>) : visible.map(item => <button key={item.id} type="button" aria-label={`${tab === 'gif' ? 'GIF' : 'Sticker'}: ${item.label}`} onClick={() => { onSelect({ kind: tab, id: item.id }); setOpen(false); }}><ExpressionImage expression={{kind:tab,id:item.id}}/><span>{item.label}</span></button>)}
      </div>
      {!(tab === 'emoji' ? visibleEmoji.length : visible.length) && <p className="caption muted">No reactions found. Try “love” or “laugh”.</p>}
      {tab !== 'emoji' && <p className="expression-credit caption muted">{tab === 'sticker' ? <>Naija reactions · <a href="/sticker-credits" target="_blank" rel="noopener noreferrer">Sticker credits</a></> : 'TalkingStage originals'}</p>}
    </div>}
  </div>;
}

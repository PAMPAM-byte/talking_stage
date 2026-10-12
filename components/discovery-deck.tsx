"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Icon } from './ui/icon';
import { Button, EmptyState } from './ui/primitives';

export type DiscoveryCard = {
  id: string; name: string; age: number; location: string; occupation?: string;
  clue: string; interests: string[]; href: string; photo: ReactNode;
};

/** A browsing gesture, not a persisted like or a mutual matching operation. */
export function DiscoveryDeck({ cards, scope, nextHref }: { cards: DiscoveryCard[]; scope: string; nextHref?: string }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [exit, setExit] = useState<'pass' | 'meet' | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = useRef(false);
  const storageKey = `talkingstage:discovery-deck:v1:${scope}`;
  const card = cards[index];

  useEffect(() => {
    // Restore after hydration; storage is optional and contains only a cast ID.
    const frame = requestAnimationFrame(() => {
      try {
        const saved = sessionStorage.getItem(storageKey);
        const restored = saved === 'end' ? cards.length : cards.findIndex(c => c.id === saved);
        if (restored >= 0) setIndex(restored);
      } catch { /* Browsing still works when storage is unavailable. */ }
    });
    return () => { cancelAnimationFrame(frame); if (timer.current) clearTimeout(timer.current); };
  }, [storageKey, cards]);

  function move(next: number) {
    setIndex(next); setDrag(0); setExit(null); locked.current = false;
    try { sessionStorage.setItem(storageKey, cards[next]?.id ?? 'end'); } catch { /* Optional continuity. */ }
  }
  function choose(direction: 'pass' | 'meet') {
    if (!card || locked.current) return;
    locked.current = true; origin.current = null; setExit(direction);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => {
      if (direction === 'meet') {
        setExit(null); setDrag(0); locked.current = false; router.push(card.href);
      } else {
        setAnnouncement(`Passed ${card.name}. ${cards[index + 1] ? `Now showing ${cards[index + 1].name}.` : 'You have seen this selection.'}`);
        move(index + 1);
      }
    }, reduced ? 0 : 200);
  }
  function start(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || locked.current || (event.target as HTMLElement).closest('a, button')) return;
    origin.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function update(event: PointerEvent<HTMLDivElement>) {
    const start = origin.current;
    if (!start || start.id !== event.pointerId) return;
    const x = event.clientX - start.x, y = event.clientY - start.y;
    if (Math.abs(y) > Math.abs(x) && Math.abs(y) > 12) { origin.current = null; setDrag(0); return; }
    setDrag(x);
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    const start = origin.current;
    origin.current = null;
    if (!start || start.id !== event.pointerId) { setDrag(0); return; }
    const x = event.clientX - start.x, y = event.clientY - start.y;
    const threshold = Math.min(110, Math.max(70, event.currentTarget.clientWidth * .24));
    if (Math.abs(x) >= threshold && Math.abs(x) > Math.abs(y) * 1.4) choose(x > 0 ? 'meet' : 'pass');
    else setDrag(0);
  }
  const style = { '--drag-x': `${drag}px`, '--drag-angle': `${Math.max(-12, Math.min(12, drag / 22))}deg` } as CSSProperties;
  return <section className="discovery-deck" aria-label="Discover characters one at a time">
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    {card ? <>
      <div className="discovery-deck__meta"><span className="caption muted">{index + 1} of {cards.length} in this selection</span><span className="caption muted">Fictional AI characters · 18+</span></div>
      <div className="discovery-deck__layout">
        <div className="discovery-deck__stage">
          <div className={`discovery-deck__card character-card${drag ? ' is-dragging' : ''}${exit ? ` is-exiting-${exit}` : ''}`} style={style} onPointerDown={start} onPointerMove={update} onPointerUp={finish} onPointerCancel={() => { origin.current = null; setDrag(0); }} onLostPointerCapture={() => { origin.current = null; setDrag(0); }} onKeyDown={event => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); choose(event.key === 'ArrowLeft' ? 'pass' : 'meet'); }
            if (event.key === 'Escape') { origin.current = null; setDrag(0); }
          }} tabIndex={0} aria-label={`${card.name}, ${card.age}. Left arrow to pass, right arrow to meet.`} aria-describedby="deck-instructions">
            <div className="discovery-deck__photo" key={card.id}>{card.photo}</div>
            <span className="discovery-deck__badge">✦ AI character</span>
            {Math.abs(drag) > 24 && <span aria-hidden="true" className={`discovery-deck__verdict ${drag > 0 ? 'is-meet' : 'is-pass'}`}>{drag > 0 ? 'Meet' : 'Pass'}</span>}
            <div className="discovery-deck__identity"><h2>{card.name}<span>, {card.age}</span></h2><p>{card.location} · fictional setting</p><Link href={card.href} className="discovery-deck__profile">View profile <Icon name="arrow" /></Link></div>
          </div>
          <div className="discovery-deck__actions">
            <button className="deck-action deck-action--undo" disabled={index === 0 || !!exit} onClick={() => { setAnnouncement('Last pass undone.'); move(index - 1); }} aria-label="Undo last pass"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 9M4 4v6h6" /></svg><span>Undo</span></button>
            <button className="deck-action deck-action--pass" disabled={!!exit} onClick={() => choose('pass')} aria-label={`Pass ${card.name}`}><Icon name="close" /><span>Pass</span></button>
            <Link className="deck-action deck-action--meet" href={card.href} aria-label={`Meet ${card.name}`} onClick={event => { event.preventDefault(); choose('meet'); }}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21S2 15 2 8.5a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3C22 15 12 21 12 21Z" /></svg><span>Meet</span></Link>
          </div>
          <p id="deck-instructions" className="discovery-deck__hint caption muted">Swipe left to pass · right to meet. Or use the buttons.</p>
        </div>
        <aside className="discovery-deck__details stack"><div><p className="caption muted">A way into the conversation</p><blockquote>“{card.clue}”</blockquote></div>{card.occupation && <p className="supporting muted">{card.occupation}</p>}<div className="row">{card.interests.slice(0, 3).map(interest => <span className="interest-label" key={interest}>{interest}</span>)}</div><p className="caption muted">Meet opens their profile. Start a conversation when you’re ready.</p></aside>
      </div>
    </> : <div className="discovery-deck__complete"><EmptyState icon="discover" title="You’ve seen this selection" action={<div className="row">{nextHref && <Link href={nextHref} className="button button--primary">Keep discovering <Icon name="arrow" /></Link>}<Button variant="secondary" onClick={() => move(0)}>Browse again</Button>{index > 0 && <Button variant="quiet" onClick={() => move(index - 1)}>Undo last pass</Button>}</div>}>Continue exploring or change your filters to find a different personality.</EmptyState></div>}
  </section>;
}

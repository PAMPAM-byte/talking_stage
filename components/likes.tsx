"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LIKE_REVIEW_MINUTES } from '@/lib/coins';
import { markMatchesSeen, matchedCharacters, reviewDueLikes, startWithCoin, waitingCount } from '@/lib/mock/likes';
import { Coin, CoinBalance, usePreviewLikes } from './coins';
import { CharacterPhoto } from './discovery';
import { UserBoundary } from './user-boundary';
import { Button, EmptyState, Notice } from './ui/primitives';

const ago = (at: number) => {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(at);
};

export function Likes() { return <UserBoundary active="Likes"><LikesContent /></UserBoundary>; }

function LikesContent() {
  const state = usePreviewLikes(); const router = useRouter();
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const matches = matchedCharacters(state); const waiting = waitingCount(state);
  // Opening the page counts as seeing new matches; the "New" mark stays for this visit.
  const [fresh] = useState(() => new Set(matches.filter(m => !m.like.seen).map(m => m.character.id)));
  useEffect(() => { const t = setTimeout(markMatchesSeen, 400); return () => clearTimeout(t); }, [matches.length]);

  async function start(id: string) {
    if (busy) return; setBusy(id); setError('');
    const result = await startWithCoin(id);
    if (result.id) { router.push(`/messages/${encodeURIComponent(result.id)}`); return; }
    setBusy('');
    if (result.error === 'no_coins') router.push(`/coins?for=${encodeURIComponent(id)}`);
    else setError(result.message ?? 'The conversation could not open. Try again.');
  }

  return <div className="likes-page stack">
    <header className="likes-head">
      <div className="likes-head__row"><h1 className="display page-title">Likes</h1><CoinBalance coins={state.coins} /></div>
      <p className="muted">Characters go through their likes every {LIKE_REVIEW_MINUTES} minutes. Anyone who likes you back appears here.</p>
    </header>
    {state.coins < 1 && matches.some(m => !m.conversationId) && <Notice tone="warning" title="You’re out of coins">Buy coins to start a new conversation. Chats you’ve already started stay open. <Link href="/coins">Buy coins</Link></Notice>}
    {error && <Notice live tone="danger" title="Conversation couldn’t open">{error}</Notice>}
    {matches.length ? <section className="stack" aria-labelledby="matches-title">
      <h2 id="matches-title" className="likes-section-title">Liked you back <span className="likes-count">{matches.length}</span></h2>
      <ul className="likes-grid">{matches.map(({ character: c, like, conversationId }) => <li key={c.id} className="match-card">
        <Link href={`/characters/${c.id}`} className="match-card__photo" aria-label={`View ${c.name}’s profile`}><CharacterPhoto character={c} />
          {fresh.has(c.id) && <span className="match-card__new">New</span>}
          <span className="match-card__identity"><strong>{c.name}<span>, {c.age}</span></strong><span className="match-card__when">Liked you back {ago(like.reviewedAt ?? like.likedAt)}</span></span>
        </Link>
        <p className="match-card__clue">&ldquo;{c.conversationClue}&rdquo;</p>
        {conversationId ? <Link href={`/messages/${encodeURIComponent(conversationId)}`} className="button button--secondary match-card__action">Open chat</Link>
          : state.coins < 1 ? <Link href={`/coins?for=${encodeURIComponent(c.id)}`} className="button button--secondary match-card__action">Buy coins to start</Link>
          : <Button className="match-card__action" loading={busy === c.id} disabled={!!busy && busy !== c.id} onClick={() => start(c.id)} aria-label={`Start a conversation with ${c.name}, uses 1 coin`}>Start conversation<span className="match-card__cost"><Coin size={16} />1</span></Button>}
      </li>)}</ul>
    </section> : <EmptyState icon="heart" title={waiting ? 'No one has liked you back yet' : 'No likes yet'} action={<Link href="/discover" className="button button--primary">{waiting ? 'Keep discovering' : 'Go to Discover'}</Link>}>
      {waiting ? `Your likes are with the characters. They check every ${LIKE_REVIEW_MINUTES} minutes, so look back soon.` : 'Like characters in Discover. When one likes you back, you can start a conversation.'}
    </EmptyState>}
    <aside className="coin-rules" aria-label="How coins work"><Coin size={28} /><p>Starting a conversation uses <b>1 coin</b>. Carrying on a chat is free. <Link href="/coins">Buy coins</Link></p></aside>
    {process.env.NODE_ENV === 'development' && <details className="discovery-qa"><summary>Developer review scenarios</summary><Button variant="secondary" onClick={() => reviewDueLikes(true)}>Run the 30-minute check now</Button></details>}
  </div>;
}

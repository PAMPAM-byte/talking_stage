"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { LIKE_REVIEW_MINUTES } from '@/lib/coins';
import { conversationAction } from '@/lib/backend/conversation-actions';
import { likeAction, markLikesSeenAction } from '@/lib/backend/likes-actions';
import { Coin } from './coin';
import { Icon } from './ui/icon';
import { Button, Notice } from './ui/primitives';

export function LikeProfileButton({ id, name }: { id: string; name: string }) {
  const [liked, setLiked] = useState(false); const [error, setError] = useState(''); const [pending, start] = useTransition();
  if (liked) return <p className="profile-liked" role="status"><Icon name="heart" />You liked {name}. Characters check their likes every {LIKE_REVIEW_MINUTES} minutes.</p>;
  return <div className="stack">
    {error && <Notice live tone="danger" title="Like not sent">{error}</Notice>}
    <Button loading={pending} onClick={() => start(async () => { const result = await likeAction(id); if (result.error) setError(result.error); else setLiked(true); })}><Icon name="heart" />Like {name}</Button>
  </div>;
}

/** Likes page: uses 1 coin and opens the chat; out of coins goes to Buy coins. */
export function StartWithCoinButton({ id, name }: { id: string; name: string }) {
  const router = useRouter(); const [error, setError] = useState(''); const [pending, start] = useTransition();
  return <>
    <Button className="match-card__action" loading={pending} aria-label={`Start a conversation with ${name}, uses 1 coin`} onClick={() => start(async () => {
      const form = new FormData(); form.set('id', id); form.set('operation', 'start');
      const result = await conversationAction(form);
      if (result.id) router.push(`/messages/${encodeURIComponent(result.id)}`);
      else if (result.code === 'no_coins') router.push(`/coins?for=${encodeURIComponent(id)}`);
      else setError(result.error ?? 'The conversation could not open. Try again.');
    })}>Start conversation<span className="match-card__cost"><Coin size={16} />1</span></Button>
    {error && <Notice live tone="danger" title="Conversation couldn’t open">{error}</Notice>}
  </>;
}

/** Opening Likes counts as seeing new likes back; the "New" marks stay for this visit. */
export function MarkLikesSeen({ count }: { count: number }) {
  useEffect(() => { if (count > 0) { const t = setTimeout(() => { void markLikesSeenAction(); }, 400); return () => clearTimeout(t); } }, [count]);
  return null;
}

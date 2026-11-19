"use client";

import { conversationAction } from '@/lib/backend/conversation-actions';
import { likeAction } from '@/lib/backend/likes-actions';
import { DiscoveryDeck, type DiscoveryCard } from './discovery-deck';

function start(id: string) {
  const form = new FormData();
  form.set('id', id);
  form.set('operation', 'start');
  return conversationAction(form);
}

// Likes and coins (14 Nov 2026): when switched on, the right-hand action is Like, and a like back
// (answered at once since 19 Nov) can start the conversation for 1 coin straight from the deck.
export function ConnectedDiscoveryDeck({ likes = false, ...props }: { cards: DiscoveryCard[]; scope: string; likes?: boolean }) {
  if (likes) return <DiscoveryDeck {...props} onStart={start} onLike={async id => { const result = await likeAction(id); return result.error ? { error: result.error } : { match: result.status === 'match' }; }} />;
  return <DiscoveryDeck {...props} onMeet={start} />;
}

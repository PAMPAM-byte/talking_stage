"use client";

import { conversationAction } from '@/lib/backend/conversation-actions';
import { likeAction } from '@/lib/backend/likes-actions';
import { DiscoveryDeck, type DiscoveryCard } from './discovery-deck';

// Likes and coins (14 Nov 2026): when switched on, the right-hand action is Like.
export function ConnectedDiscoveryDeck({ likes = false, ...props }: { cards: DiscoveryCard[]; scope: string; likes?: boolean }) {
  if (likes) return <DiscoveryDeck {...props} onLike={async id => { const result = await likeAction(id); return result.error ? { error: result.error } : {}; }} />;
  return <DiscoveryDeck {...props} onMeet={async id => {
    const form = new FormData();
    form.set('id', id);
    form.set('operation', 'start');
    return conversationAction(form);
  }} />;
}

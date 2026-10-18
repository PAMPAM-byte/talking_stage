"use client";

import { conversationAction } from '@/lib/backend/conversation-actions';
import { DiscoveryDeck, type DiscoveryCard } from './discovery-deck';

export function ConnectedDiscoveryDeck(props: { cards: DiscoveryCard[]; scope: string }) {
  return <DiscoveryDeck {...props} onMeet={async id => {
    const form = new FormData();
    form.set('id', id);
    form.set('operation', 'start');
    return conversationAction(form);
  }} />;
}

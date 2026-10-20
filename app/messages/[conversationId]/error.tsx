'use client';
import { ConversationLoadRecovery } from '@/components/chat-loading';

export default function ConversationError() {
  // Reload fetches a fresh document even after an interrupted development stream.
  // Never automatically replay a message or regenerate a reply on recovery.
  return <ConversationLoadRecovery failed />;
}

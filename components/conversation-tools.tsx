'use client';
import { useState, type ReactNode } from 'react';
import { Overlay } from './ui/overlay';
import { IconButton } from './ui/primitives';

export function ConversationTools({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <><IconButton icon="menu" label="Conversation options" onClick={() => setOpen(true)} /><Overlay className="conversation-tools" sheet open={open} onClose={() => setOpen(false)} title="Conversation options"><div className="conversation-tools-content">{children}</div></Overlay></>;
}

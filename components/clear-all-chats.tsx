'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { clearAllChatsAction } from '@/lib/backend/conversation-actions';
import { Button, Checkbox, Notice } from './ui/primitives';
import { Overlay } from './ui/overlay';

export function ClearAllChats({ clear }: { clear?: (clearMemories: boolean) => Promise<{ error?: string; message?: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [memories, setMemories] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, startTransition] = useTransition();
  const inFlight = useRef(false);
  function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      setError('');
      try {
        const form = new FormData();
        form.set('confirmation', 'clear-all-chats');
        if (memories) form.set('clearMemories', 'on');
        const result = clear ? await clear(memories) : await clearAllChatsAction(form);
        if (result.error) { setError(result.error); return; }
        setOpen(false); setMessage(result.message ?? 'All chats cleared.');
        if (!clear) { router.replace('/messages'); router.refresh(); }
      } catch { setError('Could not connect. Please try again.'); }
      finally { inFlight.current = false; }
    });
  }
  return <div className="clear-all-chats">
    <Button variant="quiet" className="clear-all-chats__trigger" onClick={() => { setError(''); setMessage(''); setMemories(false); setOpen(true); }}>Clear all chats</Button>
    {message && <span className="caption muted" role="status">{message}</span>}
    <Overlay open={open} onClose={() => { if (!busy) setOpen(false); }} title="Clear all chats?"
      description="This removes every active and archived chat and its messages. You cannot undo this. Saved memories stay unless you select the option below. Payment history is kept."
      footer={<><Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Keep chats</Button><Button variant="danger" loading={busy} disabled={busy} onClick={confirm}>Clear all chats</Button></>}>
      <Checkbox label="Also clear saved memories for these chats" checked={memories} disabled={busy} onChange={event => setMemories(event.target.checked)} />
      {error && <Notice title="Chats could not be cleared" tone="danger" live>{error}</Notice>}
    </Overlay>
  </div>;
}

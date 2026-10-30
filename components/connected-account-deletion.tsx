"use client";
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { scheduleAccountDeletion } from '@/lib/backend/deletion-actions';
import { Button, Notice, TextField } from './ui/primitives';
import { Overlay } from './ui/overlay';
import { erasureDate } from '@/lib/account/erasure-date';

export function ConnectedAccountDeletion({ enabled }: { enabled: boolean }) {
  const [open,setOpen] = useState(false), [confirmation,setConfirmation] = useState(''), [error,setError] = useState('');
  const [pending,start] = useTransition();
  const [preview] = useState(() => erasureDate(new Date(Date.now() + 30 * 864e5).toISOString()));
  return <section className="space-page stack">
    <Link className="profile-back" href="/settings">Back to settings</Link>
    <h1 className="display page-title">Delete account</h1>
    <p className="muted">Your account is paused for 30 days first, in case you change your mind.</p>
    <article className="card stack"><h2>What happens</h2><ol className="deletion-steps">
      <li><strong>Right away.</strong> You’re signed out on every device. Your profile, chats and memories are hidden, and characters stop messaging you.</li>
      <li><strong>For 30 days.</strong> Sign in with your email and password to restore everything as it was.</li>
      <li><strong>After 30 days.</strong> Your account, chat history, photos shared in chats, saved memories, AI summaries and reports are permanently erased.</li>
    </ol></article>
    <Notice title="What we keep">If you sent a gift, its payment record (amount, date and reference) is kept for accounting, without your name, email or chats. Character profiles stay for other users. Backups may still hold your data until they expire.</Notice>
    {enabled ? <div className="account-danger stack"><h2>Ready to go?</h2><p className="supporting muted">You can also keep your account and just change your preferences.</p><Button variant="danger" onClick={()=>setOpen(true)}>Delete my account</Button></div> : <Notice title="Account deletion is not available here yet">Contact <Link href="/support">support</Link> for help with your account.</Notice>}
    <Overlay open={open} onClose={()=>{if(!pending)setOpen(false);}} title="Delete your account?" description={`You’ll be signed out everywhere. Your account will be erased on ${preview} unless you sign in and restore it before then.`}>
      <form className="stack" onSubmit={event=>{event.preventDefault();if(pending)return;const data=new FormData(event.currentTarget);setError('');start(async()=>{try{const result=await scheduleAccountDeletion(data);if(result.until){window.location.replace(`/account-deleted?until=${encodeURIComponent(result.until)}`);return;}setError(result.error??'Your account was not deleted.');}catch{setError('We could not confirm deletion. Check your connection and sign in again to check your account.');}});}}>
        <TextField name="confirmation" label="Type DELETE to confirm" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" disabled={pending} required />
        <TextField name="password" label="Current password" type="password" autoComplete="current-password" maxLength={128} required disabled={pending} />
        {error && <Notice title="Account not deleted" tone="danger" live>{error}</Notice>}
        <div className="stack"><Button type="submit" variant="danger" loading={pending} disabled={confirmation!=='DELETE'}>Delete my account</Button><Button variant="secondary" disabled={pending} onClick={()=>setOpen(false)}>Keep account</Button></div>
      </form>
    </Overlay>
  </section>;
}

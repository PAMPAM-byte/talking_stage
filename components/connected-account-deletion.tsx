"use client";
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { deleteOwnAccount } from '@/lib/backend/deletion-actions';
import { Button, Notice, TextField } from './ui/primitives';
import { Overlay } from './ui/overlay';

export function ConnectedAccountDeletion({ enabled }: { enabled: boolean }) {
  const [open,setOpen] = useState(false), [confirmation,setConfirmation] = useState(''), [error,setError] = useState('');
  const [pending,start] = useTransition();
  return <section className="space-page stack">
    <Link className="profile-back" href="/settings">Back to settings</Link>
    <h1 className="display page-title">Delete account</h1>
    <p className="muted">Review what will be removed before you decide.</p>
    <article className="card stack"><h2>What deletion removes</h2><ul><li>Your account, sign-in access and preferences.</li><li>Your chat history, including delivered photo messages, and saved memories.</li><li>Your AI summaries, pending replies and submitted reports, including saved report evidence.</li></ul><p className="supporting muted">Character profiles and shared character photos remain available to other users.</p></article>
    <Notice title="About backups and retained records">Deletion removes your data from the active service. Existing backups may still contain it; backup expiry is awaiting the final retention policy. Accounts with financial or operator records require support-assisted deletion.</Notice>
    {enabled ? <div className="account-danger stack"><h2>This cannot be undone</h2><p className="supporting muted">You can keep your account and change your preferences instead.</p><Button variant="danger" onClick={()=>setOpen(true)}>Review account deletion</Button></div> : <Notice title="Account deletion is not available here yet">Contact <Link href="/support">support</Link> for help with your account.</Notice>}
    <Overlay open={open} onClose={()=>{if(!pending)setOpen(false);}} title="Delete your account?" description="Your account and the data listed on this page will be permanently removed from the active service. You will be signed out.">
      <form className="stack" onSubmit={event=>{event.preventDefault();if(pending)return;const data=new FormData(event.currentTarget);setError('');start(async()=>{try{const result=await deleteOwnAccount(data);if(result.deleted){window.location.replace('/account-deleted');return;}setError(result.error??'Your account was not deleted.');}catch{setError('We could not confirm deletion. Check your connection and sign in again to check your account.');}});}}>
        <TextField name="confirmation" label="Type DELETE to confirm" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" disabled={pending} required />
        <TextField name="password" label="Current password" type="password" autoComplete="current-password" maxLength={128} required disabled={pending} />
        {error && <Notice title="Account not deleted" tone="danger" live>{error}</Notice>}
        <div className="stack"><Button type="submit" variant="danger" loading={pending} disabled={confirmation!=='DELETE'}>Delete my account</Button><Button variant="secondary" disabled={pending} onClick={()=>setOpen(false)}>Keep account</Button></div>
      </form>
    </Overlay>
  </section>;
}

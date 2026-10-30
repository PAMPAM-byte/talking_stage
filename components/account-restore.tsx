"use client";
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { restoreAccount } from '@/lib/backend/deletion-actions';
import { signOutAccount } from '@/lib/backend/account-actions';
import { Button, Notice } from './ui/primitives';
import { erasureDate } from '@/lib/account/erasure-date';

// Shown instead of the app while an account waits out its 30 days before erasure.
export function AccountRestore({ until }: { until: string }) {
  const [error,setError] = useState(''), [pending,start] = useTransition(), router = useRouter();
  return <div className="onboarding-boundary stack">
    <h1 className="display page-title">Welcome back</h1>
    <p>Your account is scheduled to be deleted on <strong>{erasureDate(until)}</strong>. Restore it to pick up your chats where you left off.</p>
    {error && <Notice title="Account not restored" tone="danger" live>{error}</Notice>}
    <Button loading={pending} onClick={()=>start(async()=>{setError('');const result=await restoreAccount();if(result.error){setError(result.error);return;}router.replace('/discover');router.refresh();})}>Restore my account</Button>
    <form action={signOutAccount}><Button type="submit" variant="secondary" disabled={pending}>Keep it deleted and sign out</Button></form>
  </div>;
}

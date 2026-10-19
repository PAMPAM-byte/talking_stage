'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInDevelopmentAccount } from '@/lib/backend/development-login-action';
import { Button, Notice } from './ui/primitives';

export function DevelopmentSignInGate({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return enabled ? <DevelopmentTestSignIn>{children}</DevelopmentTestSignIn> : children;
}

function DevelopmentTestSignIn({ children }: { children: ReactNode }) {
  const router = useRouter();
  const manual = useSearchParams().get('manual') === '1';
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempted = useRef(false);
  const inFlight = useRef(false);
  const attempt = useRef(0);
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => {
    attempt.current++;
    inFlight.current = false;
    clearTimeout(timer.current);
    setBusy(false);
  }, []);
  const login = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const id = ++attempt.current;
    const active = () => mounted.current && attempt.current === id;
    setBusy(true); setError('');
    // Bound both the server action and subsequent navigation. A late result
    // cannot redirect after timeout or after choosing another account.
    timer.current = setTimeout(() => {
      if (!active()) return;
      cancel();
      setError('Test sign-in is taking too long. Try again or sign in with your email below.');
    }, 25000);
    try {
      const result = await signInDevelopmentAccount();
      if (!active()) return;
      if (result.destination) {
        router.replace(result.destination);
        router.refresh();
      } else {
        clearTimeout(timer.current); inFlight.current = false; setBusy(false);
        setError(result.error ?? 'Test sign-in is unavailable. Sign in with your email below.');
      }
    } catch {
      if (!active()) return;
      clearTimeout(timer.current); inFlight.current = false; setBusy(false);
      setError('Could not connect. Try again or sign in with your email below.');
    }
  }, [cancel, router]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    // Query-only navigation reuses this component; preserve the manual choice.
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (manual) { cancel(); attempted.current = false; return; }
      if (attempted.current) return;
      attempted.current = true;
      setShowForm(false);
      void login();
    });
    return () => { active = false; };
  }, [cancel, login, manual]);
  const manualVisible = manual || showForm;
  return <>
    <Notice title={error ? 'Test sign-in could not finish' : 'Development test account'} tone={error ? 'warning' : 'neutral'}>
      <p role={error ? 'alert' : 'status'}>{error || (busy || !manualVisible ? 'Signing you in…' : 'Use your saved test account without entering any details.')}</p>
      {(manualVisible || error) && <Button variant="secondary" loading={busy} disabled={busy} onClick={() => { void login(); }}>{error ? 'Try test sign-in again' : 'Sign in with test account'}</Button>}
      {!manualVisible && <p><Link href="/sign-in?manual=1" onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        cancel(); setError(''); setShowForm(true);
        // Query-only state must not queue behind the pending server action.
        window.history.pushState(null, '', '/sign-in?manual=1');
      }}>Use another account</Link></p>}
    </Notice>
    {(manualVisible || !!error) && children}
  </>;
}

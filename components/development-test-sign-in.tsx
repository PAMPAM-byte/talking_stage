'use client';
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
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
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState('');
  const attempted = useRef(false);
  const inFlight = useRef(false);
  const login = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      setError('');
      try {
        const result = await signInDevelopmentAccount();
        if (result.destination) { router.replace(result.destination); router.refresh(); }
        else setError(result.error ?? 'Test sign-in is unavailable.');
      } catch { setError('Could not connect. Try again or use the sign-in form.'); }
      finally { inFlight.current = false; }
    });
  }, [router]);
  useEffect(() => {
    // Search-only navigation can reuse this component. An explicit manual visit
    // must not consume the next automatic sign-in attempt.
    if (manual) { attempted.current = false; return; }
    if (attempted.current) return;
    attempted.current = true;
    login();
  }, [login, manual]);
  return <>
    <Notice title="Development test account">
      <p role="status">{busy || (!manual && !error) ? 'Signing you in…' : error || 'Use your saved test account without entering any details.'}</p>
      {(manual || error) && <Button variant="secondary" loading={busy} disabled={busy} onClick={login}>{error ? 'Try test sign-in again' : 'Sign in with test account'}</Button>}
      {!manual && <p><Link href="/sign-in?manual=1">Use another account</Link></p>}
    </Notice>
    {manual && children}
  </>;
}

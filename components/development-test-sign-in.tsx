'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signInDevelopmentAccount } from '@/lib/backend/development-login-action';
import { Button, Notice } from './ui/primitives';

export function DevelopmentSignInGate({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return enabled ? <DevelopmentTestSignIn>{children}</DevelopmentTestSignIn> : children;
}

function DevelopmentTestSignIn({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
  async function login() {
    if (inFlight.current) return;
    inFlight.current = true;
    const id = ++attempt.current;
    const active = () => mounted.current && attempt.current === id;
    setBusy(true); setError('');
    timer.current = setTimeout(() => {
      if (!active()) return;
      cancel();
      setError('Test sign-in is taking too long. Try again, or use your email and password above.');
    }, 25000);
    try {
      const result = await signInDevelopmentAccount();
      if (!active()) return;
      if (result.destination) {
        router.replace(result.destination);
      } else {
        clearTimeout(timer.current); inFlight.current = false; setBusy(false);
        setError(result.error ?? 'Test sign-in is unavailable. Use your email and password above.');
      }
    } catch {
      if (!active()) return;
      clearTimeout(timer.current); inFlight.current = false; setBusy(false);
      setError('Could not connect to the test account. Try again, or use your email and password above.');
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(timer.current); };
  }, []);
  return <>
    <div onFocusCapture={() => { if (inFlight.current) { cancel(); setError(''); } }}>{children}</div>
    <details className="development-sign-in">
      <summary>Development options</summary>
      <div className="stack">
        <p className="supporting muted">Use the saved local test account to explore TalkingStage.</p>
        {error && <Notice title="Test account unavailable" tone="warning"><p role="alert">{error}</p></Notice>}
        {busy && <p className="supporting muted" role="status">Signing in to the test account...</p>}
        <Button variant="secondary" loading={busy} onClick={() => { void login(); }}>{error ? 'Try test sign-in again' : 'Sign in with test account'}</Button>
      </div>
    </details>
  </>;
}

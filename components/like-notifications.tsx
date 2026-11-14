"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { likesPulseAction } from '@/lib/backend/notification-actions';
import { likesBadge } from '@/lib/likes-badge';
import { permission, pushSupport, turnOnPush } from '@/lib/push-client';
import { Icon } from './ui/icon';

// Like-back notifications (founder request, 14 Nov 2026).

/** While the site is open: refreshes the Likes count and pops up when someone likes you back. */
export function LikesWatcher({ initial }: { initial: number }) {
  const path = usePathname(); const last = useRef(initial);
  const [toast, setToast] = useState<{ name: string } | null>(null);
  useEffect(() => { likesBadge.set(initial); last.current = initial; }, [initial]);
  useEffect(() => {
    let stopped = false;
    async function check() {
      if (document.visibilityState !== 'visible') return;
      const pulse = await likesPulseAction().catch(() => null);
      if (!pulse || stopped) return;
      if (pulse.newCount > last.current && pulse.latest && !location.pathname.startsWith('/likes')) setToast({ name: pulse.latest.name });
      last.current = pulse.newCount; likesBadge.set(pulse.newCount);
    }
    // Likes back appear at :00 and :30, so check every minute and whenever the tab comes back.
    const timer = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 9000); return () => clearTimeout(t); }, [toast]);
  // Already on Likes: the new card is right there.
  if (!toast || path.startsWith('/likes')) return null;
  return <div className="like-toast" role="status">
    <span className="like-toast__heart" aria-hidden="true"><Icon name="heart" /></span>
    <p><strong>{toast.name} liked you back</strong><span>Start your conversation from Likes.</span></p>
    <Link href="/likes" className="like-toast__go" onClick={() => setToast(null)}>See Likes</Link>
    <button type="button" className="like-toast__close" aria-label="Dismiss" onClick={() => setToast(null)}><Icon name="close" /></button>
  </div>;
}

const dismissKey = 'talkingstage:push-prompt:v1';
function recentlyDismissed() { try { return Date.now() - Number(localStorage.getItem(dismissKey) ?? 0) < 7 * 86_400_000; } catch { return false; } }
function dismiss() { try { localStorage.setItem(dismissKey, String(Date.now())); } catch { /* Shown again next time. */ } }

/** After a like: offer notifications (or, on iPhone, explain Add to Home Screen). Never on page load. */
export function PushPrompt() {
  const [state, setState] = useState<{ name: string; mode: 'ask' | 'iphone' } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  useEffect(() => {
    function onLike(event: Event) {
      const name = (event as CustomEvent<{ name: string }>).detail?.name ?? 'they';
      if (recentlyDismissed()) return;
      const support = pushSupport();
      if (support === 'supported' && permission() === 'default') setState({ name, mode: 'ask' });
      else if (support === 'needs-home-screen') setState({ name, mode: 'iphone' });
    }
    window.addEventListener('talkingstage:liked', onLike);
    return () => window.removeEventListener('talkingstage:liked', onLike);
  }, []);
  if (!state) return null;
  const close = () => { dismiss(); setState(null); };
  return <aside className="push-prompt" aria-label="Notifications">
    <span className="push-prompt__icon" aria-hidden="true"><Icon name="heart" /></span>
    {done ? <div className="push-prompt__text"><strong>Notifications are on</strong><p>We’ll let you know when someone likes you back.</p></div>
      : state.mode === 'ask' ? <div className="push-prompt__text"><strong>Know when {state.name} likes you back</strong><p>Get a notification on this device, even when TalkingStage is closed.</p>{error && <p className="push-prompt__error" role="alert">{error}</p>}</div>
      : <div className="push-prompt__text"><strong>Get notified on your iPhone</strong><p>Tap <b>Share</b>, then <b>Add to Home Screen</b>. Open TalkingStage from there and turn on notifications in Settings.</p></div>}
    <div className="push-prompt__actions">
      {done ? <button type="button" className="button button--quiet" onClick={() => setState(null)}>Close</button>
        : state.mode === 'ask' ? <><button type="button" className="button button--primary" disabled={busy} aria-busy={busy || undefined} onClick={async () => { setBusy(true); setError(''); const r = await turnOnPush(); setBusy(false); if (r.error) setError(r.error); else setDone(true); }}>Turn on notifications</button><button type="button" className="button button--quiet" onClick={close}>Not now</button></>
        : <button type="button" className="button button--quiet" onClick={close}>Got it</button>}
    </div>
  </aside>;
}

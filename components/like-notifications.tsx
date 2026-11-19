"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { likesPulseAction } from '@/lib/backend/notification-actions';
import { likesBadge } from '@/lib/likes-badge';
import { Icon } from './ui/icon';

// Like-back notifications (founder request, 14 Nov 2026). Since 19 Nov a like back shows on screen the
// moment someone likes, so the after-like push prompt is gone; Settings still offers notifications.

/** While the site is open: refreshes the Likes count and pops up when someone likes you back. */
export function LikesWatcher({ initial }: { initial: number }) {
  const path = usePathname(); const last = useRef(initial);
  const [toast, setToast] = useState<{ name: string } | null>(null);
  useEffect(() => { likesBadge.set(initial); last.current = initial; }, [initial]);
  // A like back the person has just seen on screen counts towards the badge without a second pop-up.
  useEffect(() => {
    function seen() { last.current += 1; likesBadge.set(last.current); }
    window.addEventListener('talkingstage:liked-back', seen);
    return () => window.removeEventListener('talkingstage:liked-back', seen);
  }, []);
  useEffect(() => {
    let stopped = false;
    async function check() {
      if (document.visibilityState !== 'visible') return;
      const pulse = await likesPulseAction().catch(() => null);
      if (!pulse || stopped) return;
      if (pulse.newCount > last.current && pulse.latest && !location.pathname.startsWith('/likes')) setToast({ name: pulse.latest.name });
      last.current = pulse.newCount; likesBadge.set(pulse.newCount);
    }
    // Picks up likes back from another device or tab: every minute and whenever the tab comes back.
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


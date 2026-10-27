'use client';
import {useEffect, useState} from 'react';
import styles from './ai-session-notice.module.css';

// Companion-chat disclosure (fix.md F06): once per browser session per conversation,
// and again after every three hours of visible use. Rendered outside role="log".
export const AI_REMINDER_MS = 3 * 60 * 60 * 1000;
const TICK_MS = 60 * 1000;

function read(key: string) { try { return sessionStorage.getItem(key); } catch { return null; } }
function write(key: string, value: string) { try { sessionStorage.setItem(key, value); } catch {} }

export function AiSessionNotice({conversationId, name, placement}: {conversationId: string; name: string; placement: 'start' | 'reminder'}) {
 const [shown, setShown] = useState(false);
 useEffect(() => {
  const key = `talkingstage:ai-notice:${placement}:${conversationId}`;
  if (placement === 'start') {
   if (read(key)) return;
   // Mark as seen only once it renders, so an effect cancelled by a remount doesn't swallow it.
   const timer = setTimeout(() => { write(key, '1'); setShown(true); });
   return () => clearTimeout(timer);
  }
  // Visible time accumulates across reloads in this tab; hidden time never counts.
  let visibleMs = Number(read(key)) || 0;
  let last = Date.now();
  const tick = () => {
   const now = Date.now();
   if (document.visibilityState === 'visible') visibleMs += now - last;
   last = now;
   if (visibleMs >= AI_REMINDER_MS) { visibleMs = 0; setShown(true); }
   write(key, String(visibleMs));
  };
  const visibility = () => { if (document.visibilityState === 'visible') last = Date.now(); else tick(); };
  const interval = setInterval(tick, TICK_MS);
  document.addEventListener('visibilitychange', visibility);
  return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visibility); };
 }, [conversationId, placement]);
 if (!shown) return null;
 return <p className={styles.notice} data-ai-notice={placement}>{placement === 'reminder' ? 'Reminder: you’re' : 'You’re'} chatting with {name}, a fictional AI character.</p>;
}

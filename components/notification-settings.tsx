"use client";
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { saveShowNamesAction } from '@/lib/backend/notification-actions';
import { currentSubscription, permission, pushSupport, turnOffPush, turnOnPush, type PushSupport } from '@/lib/push-client';
import { Button, Notice } from './ui/primitives';

// Settings › Notifications (14 Nov 2026): this device on/off, and names on the lock screen.
export function NotificationSettings({ showNames: initialNames }: { showNames: boolean }) {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [on, setOn] = useState<boolean | null>(null); const [blocked, setBlocked] = useState(false);
  const [showNames, setShowNames] = useState(initialNames);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    // Browser-only checks, read after hydration.
    const frame = requestAnimationFrame(() => {
      const s = pushSupport(); setSupport(s); setBlocked(permission() === 'denied');
      if (s === 'supported') currentSubscription().then(sub => setOn(!!sub && permission() === 'granted')).catch(() => setOn(false)); else setOn(false);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return <section className="space-page stack notification-settings">
    <Link href="/settings" className="profile-back">← Back to settings</Link>
    <header className="stack"><h1 className="display page-title">Notifications</h1><p className="muted">Know when a character likes you back, even when TalkingStage is closed.</p></header>
    {message && <Notice live tone={message.tone} title={message.tone === 'success' ? 'Saved' : 'Not saved'}>{message.text}</Notice>}
    <div className="setting-card stack">
      <h2>On this device</h2>
      {support === null || on === null ? <p className="muted" role="status">Checking this device…</p>
        : support === 'needs-home-screen' ? <p className="supporting">On iPhone, tap <b>Share</b>, then <b>Add to Home Screen</b>. Open TalkingStage from your Home Screen and come back here to turn notifications on.</p>
        : support === 'unsupported' ? <p className="supporting muted">This browser can’t show notifications. Try Chrome on Android or a computer.</p>
        : blocked ? <p className="supporting">Notifications are blocked for TalkingStage. Allow them in your browser’s site settings, then reload this page.</p>
        : <div className="notification-row"><p className="supporting"><b>{on ? 'On' : 'Off'}</b> · {on ? 'You’ll get a notification when someone likes you back.' : 'Turn on to hear when someone likes you back.'}</p>
          <Button variant={on ? 'secondary' : 'primary'} loading={pending} onClick={() => start(async () => {
            setMessage(null);
            if (on) { await turnOffPush(); setOn(false); setMessage({ tone: 'success', text: 'Notifications are off on this device.' }); }
            else { const r = await turnOnPush(); if (r.error) { setBlocked(permission() === 'denied'); setMessage({ tone: 'danger', text: r.error }); } else { setOn(true); setMessage({ tone: 'success', text: 'Notifications are on for this device.' }); } }
          })}>{on ? 'Turn off' : 'Turn on notifications'}</Button></div>}
    </div>
    <div className="setting-card stack">
      <h2>On the lock screen</h2>
      <fieldset className="notification-choice"><legend className="sr-only">What notifications show</legend>
        {[{ value: true, title: 'Show the character’s name', example: '“Usman liked you back 💌”' }, { value: false, title: 'Keep it private', example: '“Someone liked you back 💌”' }].map(option => <label key={String(option.value)} className={`notification-option${showNames === option.value ? ' is-selected' : ''}`}>
          <input type="radio" name="show-names" checked={showNames === option.value} onChange={() => { const previous = showNames; setShowNames(option.value); setMessage(null); start(async () => { const r = await saveShowNamesAction(option.value); if (r.error) { setShowNames(previous); setMessage({ tone: 'danger', text: r.error }); } else setMessage({ tone: 'success', text: option.value ? 'Notifications will show the character’s name.' : 'Notifications won’t show names.' }); }); }} />
          <span><b>{option.title}</b><span className="muted">{option.example}</span></span>
        </label>)}
      </fieldset>
    </div>
  </section>;
}

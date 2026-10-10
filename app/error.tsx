"use client";
import Link from 'next/link';

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main id="main-content" className="stack" style={{ maxWidth: 560, marginInline: 'auto', padding: 'clamp(48px, 12vh, 112px) 24px' }}>
    <p style={{ color: 'var(--brand)', fontWeight: 650 }}>TalkingStage</p>
    <h1 className="display page-title">Let’s try that again.</h1>
    <p style={{ color: 'var(--text-secondary)' }}>This page couldn’t load. Try again, or return home and reopen it.</p>
    <p style={{ color: 'var(--text-secondary)' }}>If you were sending a message or making a change, check its current state before repeating it.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
      <button className="button button--primary" type="button" onClick={retry}>Try again</button>
      <Link className="button button--secondary" href="/">Return home</Link>
    </div>
  </main>;
}

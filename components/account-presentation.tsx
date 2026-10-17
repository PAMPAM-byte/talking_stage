"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Brand } from './shells';
import { Icon } from './ui/icon';
import { TextField } from './ui/primitives';

export function isAccountEntry(step: string) {
  return ['age', 'register', 'sign-in', 'recover'].includes(step);
}

export function AccountPage({ step, settings = false, header, children }: {
  step: string; settings?: boolean; header: ReactNode; children: ReactNode;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  if (settings || !isAccountEntry(step)) {
    return <div className={settings ? 'space-page stack settings-preferences' : step === 'age' ? 'account-page account-page--centered' : 'account-page'}>{header}{children}</div>;
  }

  return <div className="account-page auth-page">
    <header className="auth-header">
      <Brand />
      <Link href="/support" className="auth-help"><Icon name="info" />Need a hand?</Link>
    </header>
    <div className={`auth-layout auth-layout--${step}`}>
      <aside className="auth-story" aria-label="The TalkingStage experience">
        <div className="auth-story-heading"><span className="auth-eyebrow">A little curiosity goes a long way</span><h2>Your kind of<br /><em>conversation.</em></h2><p>A little banter. A little chemistry.<br />A space to see where it goes.</p></div>
        <div className="auth-portrait">
          {photoFailed ? <div className="auth-photo-fallback"><Icon name="photo" /><span>Meet the personalities after you sign in.</span></div> : <Image src="/images/characters/char-amara-portrait.webp" alt="Amara, a fictional adult AI character" fill sizes="(min-width: 900px) 430px, 1px" quality={90} loading="eager" onError={() => setPhotoFailed(true)} />}
          <span className="auth-portrait-label">Meet Amara <span>28 · Fictional AI</span></span>
        </div>
        <div className="auth-clue"><span aria-hidden="true">“</span><blockquote>Good music is a very good opening line.</blockquote><p>A conversation clue, courtesy of Amara.</p></div>
        <p className="auth-image-disclosure">Fictional adult character · AI-generated photo</p>
      </aside>
      {children}
    </div>
    <footer className="auth-page-footer"><span>18+ · Fictional characters. Real curiosity.</span><nav aria-label="Account information"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Help</Link></nav></footer>
  </div>;
}

export function AccountIntro({ step }: { step: string }) {
  if (!isAccountEntry(step)) return null;
  return <div className="auth-intro"><span className="auth-intro-icon">{step === 'age' ? <span className="auth-age-mark">18+</span> : <Icon name={step === 'recover' ? 'shield' : 'message'} />}</span><span className="auth-eyebrow">{step === 'age' ? 'Before your first hello' : step === 'register' ? 'Your first hello' : step === 'recover' ? 'A way back in' : 'Welcome back'}</span></div>;
}

export function AccountPasswordField(props: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="auth-password-field">
    <TextField {...props} type={visible ? 'text' : 'password'} />
    <button type="button" className="auth-password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} title={visible ? 'Hide password' : 'Show password'} disabled={props.disabled} onClick={() => setVisible(current => !current)}><Icon name={visible ? 'eye-off' : 'eye'} /></button>
  </div>;
}

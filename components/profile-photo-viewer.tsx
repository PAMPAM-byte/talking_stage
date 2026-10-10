"use client";
import { useState } from 'react';
import { Button, Notice } from './ui/primitives';

export function ProfilePhotoOpen({ src, srcSet, sizes, alt, label, onOpen }: { src: string; srcSet?: string; sizes?: string; alt: string; label: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false); const [attempt, setAttempt] = useState(0);
  if (failed) return <div className="profile-photo-unavailable"><p>Photo couldn’t be loaded.</p><Button variant="secondary" onClick={() => { setAttempt(value => value + 1); setFailed(false); }}>Retry photo</Button></div>;
  return <button type="button" className="profile-photo-open" onClick={onOpen} aria-label={`View ${label}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={attempt && !src.startsWith('blob:') ? `${src}${src.includes('?') ? '&' : '?'}attempt=${attempt}` : src} srcSet={attempt ? undefined : srcSet} sizes={sizes} alt={alt} loading="lazy" className="cast-review-photo" onError={() => setFailed(true)} />
  </button>;
}

export function FullProfilePhoto({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false); const [attempt, setAttempt] = useState(0);
  if (failed) return <Notice title="Photo unavailable" tone="warning"><p>This photo could not be loaded. Please try again.</p><Button variant="secondary" onClick={() => { setAttempt(value => value + 1); setFailed(false); }}>Reload photo</Button></Notice>;
  return <div className="profile-photo-viewer">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img key={attempt} src={attempt && !src.startsWith('blob:') ? `${src}${src.includes('?') ? '&' : '?'}attempt=${attempt}` : src} alt={alt} onError={() => setFailed(true)} />
  </div>;
}

"use client";

import { useEffect, useState } from 'react';

/** Appears once a page has scrolled a screen or reached its end, so every long page has a way back up. */
export function BackToTop() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // Past one screen, or at the very end of a shorter page that still scrolled.
    const update = () => setShown(scrollY > innerHeight || (scrollY > 160 && scrollY + innerHeight >= document.documentElement.scrollHeight - 80));
    update();
    addEventListener('scroll', update, { passive: true });
    return () => removeEventListener('scroll', update);
  }, []);
  function toTop() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
  return <button type="button" className={`back-to-top${shown ? ' is-shown' : ''}`} onClick={toTop} aria-label="Back to top" title="Back to top" tabIndex={shown ? 0 : -1} aria-hidden={!shown}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
  </button>;
}

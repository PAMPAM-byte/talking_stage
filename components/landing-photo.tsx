"use client";
import Image from 'next/image';
import { useState } from 'react';
import styles from '@/components/landing-styles';
import { Icon } from './ui/icon';
export function LandingPhoto({ src, alt, name, eager = false, sizes }: { src: string; alt: string; name: string; eager?: boolean; sizes: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className={styles.photoFallback}><Icon name="photo" /><p>{name}’s photo couldn’t load.</p><button onClick={() => setFailed(false)} aria-label={`Reload ${name}’s photo`}>Reload photo</button></div> : <Image src={src} alt={alt} fill preload={eager} quality={90} sizes={sizes} className={styles.photo} onError={() => setFailed(true)} />;
}

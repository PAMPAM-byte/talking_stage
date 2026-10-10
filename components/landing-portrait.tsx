"use client";
import Image from "next/image";
import { useState } from "react";
import { Icon } from "./ui/icon";
function LandingPhoto({ src, alt, name }: { src: string; alt: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="landing-portrait__panel">
    {failed ? <div className="empty-state"><Icon name="photo" /><p>{name}’s photo couldn’t load.</p><button className="button button--secondary" onClick={() => setFailed(false)} aria-label={`Reload ${name}’s photo`}>Reload photo</button></div> : <Image src={src} alt={alt} fill preload sizes="(min-width: 1200px) 270px, (min-width: 900px) 22vw, 45vw" onError={() => setFailed(true)} />}
  </div>;
}

export function LandingPortrait() {
  return <figure className="landing-portrait">
    <div className="landing-portrait__image">
      <LandingPhoto src="/images/characters/char-zuri-gallery-v2.webp" alt="Zuri, 29, a fictional adult AI character, enjoying the beach with coconut water." name="Zuri" />
      <LandingPhoto src="/images/characters/char-kunle-portrait.webp" alt="Kunle, 35, a fictional adult AI character, wearing glasses and a navy shirt." name="Kunle" />
    </div>
    <div className="landing-clue"><span className="caption muted">A little clue to the conversation</span><blockquote className="display">“A good outfit gets attention. What keeps yours?”</blockquote><span className="supporting">Zuri, 29 · Fictional AI character</span></div>
    <figcaption className="landing-photo-caption caption muted">Zuri, 29 and Kunle, 35 · AI-generated fictional characters</figcaption>
  </figure>;
}

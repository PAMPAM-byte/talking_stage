"use client";
import Image from "next/image";
import { useState } from "react";
import { Icon } from "./ui/icon";
export function LandingPortrait() {
  const [failed, setFailed] = useState(false);
  return <figure className="landing-portrait"><div className="landing-portrait__image">{failed ? <div className="empty-state"><Icon name="photo" /><p>The character portrait couldn’t load.</p><button className="button button--secondary" onClick={() => setFailed(false)}>Reload portrait</button></div> : <Image src="/images/landing-characters.png" alt="Two fictional adult Nigerian AI characters, a woman in plum and a man in a white shirt." fill preload sizes="(min-width: 1200px) 540px, (min-width: 900px) 45vw, 90vw" onError={() => setFailed(true)} />}</div><div className="landing-clue"><span className="caption muted">A little clue to the conversation</span><blockquote className="display">“Good music is a very good opening line.”</blockquote><span className="supporting">Amara, 28 · Fictional AI character</span></div><figcaption className="landing-photo-caption caption muted">AI-generated character portraits · Draft cast</figcaption></figure>;
}

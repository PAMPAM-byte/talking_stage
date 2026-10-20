'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Skeleton } from './ui/primitives';

export function ChatLoading() {
  const [slow, setSlow] = useState(false);
  const loading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15000);
    if (loading.current) loading.current.dataset.recoveryReady = 'true';
    return () => clearTimeout(timer);
  }, []);
  if (slow) return <ConversationLoadRecovery />;
  return <div ref={loading} className="chat-shell chat-loading" aria-busy="true"><header className="chat-shell__header" aria-hidden="true"><Skeleton width={44} height={44} /><div className="stack"><Skeleton width={160} height={18} /><Skeleton width={100} height={12} /></div></header><main id="main-content" className="chat-shell__messages"><span className="sr-only" role="status">Loading conversation</span><div className="chat-thread chat-log" aria-hidden="true"><div className="message-turn"><Skeleton width={220} height={76} /></div><div className="message-turn message-turn--user"><Skeleton width={170} height={56} /></div></div></main><footer className="chat-shell__composer"><div className="chat-composer" aria-hidden="true"><Skeleton height={64} /></div><nav className="row" aria-label="Conversation loading options"><a className="button button--quiet" href="">Reload conversation</a><Link className="button button--quiet" href="/messages">Back to messages</Link></nav></footer></div>;
}

export function ConversationLoadRecovery({ failed = false }: { failed?: boolean }) {
  return <main id="main-content" className="container space-page stack chat-load-recovery">
    <p className="caption muted">TalkingStage</p>
    <h1 className="display page-title">{failed ? 'This conversation could not load.' : 'This is taking longer than expected.'}</h1>
    <p role="status">Reload the conversation to reconnect. Check your last message before sending it again.</p>
    <div className="row"><button type="button" className="button button--primary" onClick={() => window.location.reload()}>Reload conversation</button><Link className="button button--secondary" href="/messages">Back to messages</Link></div>
  </main>;
}

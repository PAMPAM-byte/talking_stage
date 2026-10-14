import { Skeleton } from './ui/primitives';

export function ChatLoading() {
  return <div className="chat-shell chat-loading" aria-busy="true"><header className="chat-shell__header" aria-hidden="true"><Skeleton width={44} height={44} /><div className="stack"><Skeleton width={160} height={18} /><Skeleton width={100} height={12} /></div></header><main id="main-content" className="chat-shell__messages"><span className="sr-only" role="status">Loading conversation</span><div className="chat-thread chat-log" aria-hidden="true"><div className="message-turn"><Skeleton width={220} height={76} /></div><div className="message-turn message-turn--user"><Skeleton width={170} height={56} /></div></div></main><footer className="chat-shell__composer" aria-hidden="true"><div className="chat-composer"><Skeleton height={64} /></div></footer></div>;
}

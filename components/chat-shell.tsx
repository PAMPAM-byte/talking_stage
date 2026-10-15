"use client";
import { useEffect, useRef, type ReactNode, type UIEventHandler } from "react";

export function ChatShell({ identity, actions, back, children, composer, onMessagesScroll, followMessages = false }: { identity: ReactNode; actions?: ReactNode; back: ReactNode; children: ReactNode; composer: ReactNode; onMessagesScroll?: UIEventHandler<HTMLElement>; followMessages?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!followMessages) return;
    const main = ref.current?.querySelector<HTMLElement>('.chat-shell__messages');
    if (!main) return;
    let following = true;
    const track = () => { following = main.scrollHeight - main.scrollTop - main.clientHeight < 80; };
    const observer = new MutationObserver(() => { if (following) main.scrollTop = main.scrollHeight; });
    observer.observe(main, { childList: true, subtree: true });
    main.scrollTop = main.scrollHeight;
    main.addEventListener('scroll', track, { passive: true });
    return () => { observer.disconnect(); main.removeEventListener('scroll', track); };
  }, [followMessages]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateHeight = () => {
      const element = ref.current;
      if (element) element.style.height = `${Math.max(200, viewport.height - Math.max(0, element.getBoundingClientRect().top - viewport.offsetTop))}px`;
    };
    updateHeight();
    viewport.addEventListener("resize", updateHeight);
    viewport.addEventListener("scroll", updateHeight);
    window.addEventListener("resize", updateHeight);
    return () => { viewport.removeEventListener("resize", updateHeight); viewport.removeEventListener("scroll", updateHeight); window.removeEventListener("resize", updateHeight); };
  }, []);
  return <div ref={ref} className="chat-shell"><header className="chat-shell__header">{back}<div className="chat-shell__identity">{identity}</div>{actions}</header><main id="main-content" className="chat-shell__messages" onScroll={onMessagesScroll}>{children}</main><footer className="chat-shell__composer">{composer}</footer></div>;
}

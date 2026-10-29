"use client";
import { useEffect, useRef, useState, type ReactNode, type UIEventHandler } from "react";

export function ChatShell({ identity, actions, back, children, composer, onMessagesScroll, followMessages = false }: { identity: ReactNode; actions?: ReactNode; back: ReactNode; children: ReactNode; composer: ReactNode; onMessagesScroll?: UIEventHandler<HTMLElement>; followMessages?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [unseen, setUnseen] = useState(false);
  useEffect(() => {
    if (!followMessages) return;
    const main = ref.current?.querySelector<HTMLElement>('.chat-shell__messages');
    if (!main) return;
    let following = true;
    const newest = () => [...main.querySelectorAll('.message-turn')].at(-1);
    let last = newest();
    const track = () => { following = main.scrollHeight - main.scrollTop - main.clientHeight < 80; if (following) setUnseen(false); };
    // Scrolled up reading older messages: a new character message raises the pill instead of jumping.
    const observer = new MutationObserver(() => {
      if (following) main.scrollTop = main.scrollHeight;
      const current = newest();
      if (current !== last && !following && current && !current.classList.contains('message-turn--user')) setUnseen(true);
      last = current;
    });
    observer.observe(main, { childList: true, subtree: true });
    main.scrollTop = main.scrollHeight;
    main.addEventListener('scroll', track, { passive: true });
    return () => { observer.disconnect(); main.removeEventListener('scroll', track); };
  }, [followMessages]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const element = ref.current;
    if (!element) return;
    const workspace = element.closest<HTMLElement>('.chat-workspace');
    const updateHeight = () => {
      if (workspace) {
        // Standalone chat owns the viewport. Measuring its position during a
        // streamed route transition can otherwise freeze a shortened height.
        workspace.style.setProperty('--chat-viewport-height', `${viewport.height}px`);
        workspace.style.setProperty('--chat-viewport-top', `${viewport.offsetTop}px`);
      } else {
        // Keep the design-system's embedded shell below its own toolbar.
        element.style.height = `${Math.max(0, viewport.height - Math.max(0, element.getBoundingClientRect().top - viewport.offsetTop))}px`;
      }
    };
    updateHeight();
    viewport.addEventListener("resize", updateHeight);
    viewport.addEventListener("scroll", updateHeight);
    window.addEventListener("resize", updateHeight);
    return () => {
      viewport.removeEventListener("resize", updateHeight); viewport.removeEventListener("scroll", updateHeight); window.removeEventListener("resize", updateHeight);
      workspace?.style.removeProperty('--chat-viewport-height');
      workspace?.style.removeProperty('--chat-viewport-top');
      element.style.removeProperty('height');
    };
  }, []);
  return <div ref={ref} className="chat-shell"><header className="chat-shell__header">{back}<div className="chat-shell__identity">{identity}</div>{actions}</header><main id="main-content" className="chat-shell__messages" onScroll={onMessagesScroll}>{children}</main><footer className="chat-shell__composer">{unseen && <button type="button" className="chat-shell__new" onClick={() => { const main = ref.current?.querySelector('.chat-shell__messages'); main?.scrollTo({ top: main.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>New message <span aria-hidden="true">↓</span></button>}{composer}</footer></div>;
}

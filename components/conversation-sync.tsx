"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ConversationSync({ id, revision }: { id: string; revision: string }) {
    const router = useRouter();
    const latest = useRef(revision);
    const [reconnecting, setReconnecting] = useState(false);
    useEffect(() => { latest.current = revision; }, [revision]);
    useEffect(() => {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        let busy = false;
        let stopped = false;
        let failures = 0;
        const poll = async () => {
            clearTimeout(timer);
            if (busy || stopped || controller.signal.aborted) return;
            if (document.hidden || !navigator.onLine) {
                timer = setTimeout(poll, 5000);
                return;
            }
            busy = true;
            try {
                const response = await fetch(`/api/conversations/${id}/sync`, {
                    cache: 'no-store', credentials: 'same-origin',
                    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
                });
                if (controller.signal.aborted) return;
                if ([401, 403, 404].includes(response.status)) {
                    stopped = true;
                    if (response.status === 401) router.replace('/sign-in');
                    else router.refresh();
                    return;
                }
                if (!response.ok) throw new Error('sync_unavailable');
                const next = await response.json();
                if (controller.signal.aborted) return;
                if (typeof next.revision !== 'string') throw new Error('sync_unavailable');
                failures = 0;
                setReconnecting(false);
                if (next.revision !== latest.current) {
                    latest.current = next.revision;
                    // Merge fresh server history while preserving the draft and scroll position.
                    router.refresh();
                }
            } catch {
                if (!controller.signal.aborted) { failures++; setReconnecting(true); }
            } finally {
                busy = false;
                if (!stopped && !controller.signal.aborted)
                    timer = setTimeout(poll, Math.min(30000, 5000 * 2 ** Math.min(failures, 3)));
            }
        };
        const resume = () => { if (!document.hidden) void poll(); };
        window.addEventListener('online', resume);
        window.addEventListener('focus', resume);
        document.addEventListener('visibilitychange', resume);
        timer = setTimeout(poll, 1000);
        return () => {
            controller.abort(); clearTimeout(timer);
            window.removeEventListener('online', resume);
            window.removeEventListener('focus', resume);
            document.removeEventListener('visibilitychange', resume);
        };
    }, [id, router]);
    return reconnecting ? <p className="chat-delivery-notice caption" role="status">Connection interrupted. Reconnecting automatically…</p> : null;
}

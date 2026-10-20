"use client";
import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function ConversationSync({ id, revision }: { id: string; revision: string }) {
    const router = useRouter();
    const latest = useRef(revision);
    const [refreshing, startRefresh] = useTransition();
    const refreshInFlight = useRef(false);
    const refreshRetry = useRef({ revision: '', attempts: 0, after: 0 });
    useEffect(() => {
        latest.current = revision;
        // Only a committed server snapshot acknowledges a successful refresh.
        if (refreshRetry.current.revision === revision)
            refreshRetry.current = { revision: '', attempts: 0, after: 0 };
    }, [revision]);
    useEffect(() => { refreshInFlight.current = refreshing; }, [refreshing]);
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
                if (refreshRetry.current.revision !== next.revision)
                    refreshRetry.current = { revision: next.revision, attempts: 0, after: 0 };
                if (next.revision !== latest.current && !refreshInFlight.current && Date.now() >= refreshRetry.current.after) {
                    // A successful metadata read is not acknowledgement that the
                    // refreshed messages rendered. Only the revision prop above
                    // can confirm that. Keep catching up if refresh is interrupted
                    // or returns an older snapshot, without regenerating replies.
                    // Repeated refreshes can cancel a slower server render before
                    // it commits. Let this transition finish while reads continue.
                    refreshInFlight.current = true;
                    // A successful metadata poll can precede a broken or stale
                    // render. Back off that same revision instead of repeatedly
                    // rebuilding the authenticated page. New revisions and a
                    // committed snapshot reset this delay; never replay a send.
                    refreshRetry.current.attempts++;
                    refreshRetry.current.after = Date.now() + Math.min(30000, 5000 * 2 ** Math.min(refreshRetry.current.attempts - 1, 3));
                    startRefresh(() => router.refresh());
                }
            } catch {
                // Background reads can briefly fail without a failed send or
                // lost reply. Recover silently; delivery owns actionable errors.
                if (!controller.signal.aborted) failures++;
            } finally {
                busy = false;
                if (!stopped && !controller.signal.aborted)
                    timer = setTimeout(poll, failures ? Math.min(30000, 1000 * 2 ** Math.min(failures, 5)) : 5000);
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
    }, [id, router, startRefresh]);
    return null;
}

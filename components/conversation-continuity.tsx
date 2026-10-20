"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ConversationLoadRecovery } from './chat-loading';

// Retain only this mounted route's previously authorized server snapshot. Never
// persist private conversations or use this as authorization for a new request.
export function ConversationContinuity({ children, unavailable = false }: { children?: ReactNode; unavailable?: boolean }) {
    const [snapshot, setSnapshot] = useState<ReactNode>(() => unavailable ? null : children);
    const hasSnapshot = snapshot !== null && snapshot !== undefined;
    if (!unavailable && children !== snapshot) setSnapshot(children);
    const router = useRouter();
    const [pending, start] = useTransition();
    const attempts = useRef(0);
    useEffect(() => {
        // An open conversation keeps its existing sync observer and draft.
        // Initial failures have no observer, so retry the account-gated render.
        if (!unavailable || hasSnapshot || pending) return;
        const delay = Math.min(15000, 2000 * 2 ** Math.min(attempts.current++, 3));
        const timer = setTimeout(() => start(() => router.refresh()), delay);
        return () => clearTimeout(timer);
    }, [unavailable, hasSnapshot, pending, router, start]);
    return unavailable ? snapshot ?? <ConversationLoadRecovery failed /> : children;
}

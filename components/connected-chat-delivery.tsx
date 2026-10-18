"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { conversationAction } from '@/lib/backend/conversation-actions';
import { Button, TextArea } from './ui/primitives';
import { Icon } from './ui/icon';
import { MessageDelivery, TypingBubble } from './message-delivery';
import { initialReplyWatch, pollReply, replyWatchMs } from '@/lib/chat/reply-polling.mjs';
type Outgoing = {
    clientId: string;
    text: string;
    time: string;
    messageId?: string;
    state: 'sending' | 'saved' | 'failed';
    error?: string;
};
type ReplyStatus = {
    messageId: string;
    state: string;
    attempts: number;
};
type Delivery = {
    outgoing: Outgoing[];
    sending: boolean;
    typing: boolean;
    active: string[];
    seen: Set<string>;
    send: (text: string, item?: Outgoing) => Promise<void>;
    watch: (messageId: string) => void;
    stop: () => Promise<void>;
};
const Context = createContext<Delivery | null>(null);
function useDelivery() {
    const value = useContext(Context);
    if (!value) throw new Error('Missing conversation delivery boundary');
    return value;
}
export function useReplyDelivery() { return useContext(Context); }
export function ConnectedChatDelivery({ id, generation, replies, savedIds, savedClientIds = [], statuses, children, action = conversationAction }: {
    id: string;
    generation: number;
    replies: boolean;
    savedIds: string[];
    savedClientIds?: string[];
    statuses: ReplyStatus[];
    children: ReactNode;
    action?: typeof conversationAction;
}) {
    const router = useRouter();
    const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
    const [sending, setSending] = useState(false);
    const [watching, setWatching] = useState<string[]>(() => initialReplyWatch(statuses, savedIds, replies));
    // Match typing immediately; stopping or failing a reply must not undo a receipt.
    const [seen, setSeen] = useState(() => new Set(initialReplyWatch(statuses, savedIds, replies)));
    const recoveryAttempts = useRef(new Set<string>());
    const watchStarted = useRef(new Map<string, number>());
    const [notice, setNotice] = useState('');
    const locked = useRef(false);
    const mounted = useRef(true);
    const latestStatuses = useRef(statuses);
    const observedStatuses = useRef(new Map(statuses.map(item => [item.messageId, item.state])));
    useEffect(() => { latestStatuses.current = statuses; }, [statuses]);
    useEffect(() => {
        const discovered = statuses.filter(item => item.state === 'generating' && observedStatuses.current.get(item.messageId) !== 'generating');
        observedStatuses.current = new Map(statuses.map(item => [item.messageId, item.state]));
        // Server history may discover a job started in another tab after mount.
        if (discovered.length) setWatching(current => [...new Set([...current, ...discovered.map(item => item.messageId)])]);
    }, [statuses]);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    // Poll metadata only. The durable database job, not an optimistic bubble, owns reply state.
    useEffect(() => {
        if (!watching.length)
            return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        for (const messageId of watching) {
            if (!watchStarted.current.has(messageId))
                watchStarted.current.set(messageId, Date.now());
        }
        const poll = async () => {
            if (document.hidden || !navigator.onLine) {
                timer = setTimeout(poll, 5000);
                return;
            }
            const finished: string[] = [];
            for (const messageId of watching) {
                if (controller.signal.aborted)
                    return;
                try {
                    const url = `/api/conversations/${id}/replies/${messageId}`;
                    const { state, httpStatus } = await pollReply(url, {
                        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
                        recover: () => {
                            if (!replies || recoveryAttempts.current.has(messageId)) return false;
                            recoveryAttempts.current.add(messageId);
                            return true;
                        },
                    });
                    if (controller.signal.aborted)
                        return;
                    if (state === 'inaccessible') {
                        finished.push(messageId);
                        if (httpStatus === 401) router.replace('/sign-in');
                        continue;
                    }
                    if (state === 'earlier_reply_pending' && latestStatuses.current.some(item => item.state === 'failed' && !watching.includes(item.messageId))) {
                        finished.push(messageId);
                        setNotice('Retry or skip the earlier reply to continue. Your messages are saved.');
                        continue;
                    }
                    if (!['generating', 'earlier_reply_pending'].includes(state)) {
                        finished.push(messageId);
                        if (!['completed', 'cancelled'].includes(state))
                            setNotice(state === 'budget_exhausted' ? 'Today’s reply limit has been reached. Your message is saved.' : 'Your message is saved. You can retry the reply below it.');
                    }
                }
                catch {
                    // A transient transport error is not a failed reply. Keep observing;
                    // the independent conversation sync also catches late completion.
                }
            }
            if (controller.signal.aborted)
                return;
            if (finished.length) {
                for (const messageId of finished) watchStarted.current.delete(messageId);
                setWatching(current => current.filter(value => !finished.includes(value)));
                router.refresh();
            }
            const slow = watching.every(messageId => Date.now() - (watchStarted.current.get(messageId) ?? Date.now()) >= replyWatchMs);
            timer = setTimeout(poll, slow ? 10000 : 2000);
        };
        timer = setTimeout(poll, 1000);
        return () => { controller.abort(); clearTimeout(timer); };
    }, [id, replies, router, watching]);
    async function send(text: string, previous?: Outgoing) {
        if (locked.current || !text.trim())
            return;
        locked.current = true;
        setSending(true);
        setNotice('');
        const item = previous ?? { clientId: crypto.randomUUID(), text, time: new Date().toISOString(), state: 'sending' as const };
        setOutgoing(current => previous ? current.map(value => value.clientId === item.clientId ? { ...item, state: 'sending', error: undefined } : value) : [...current, item]);
        const data = new FormData();
        data.set('id', id);
        data.set('operation', 'send');
        data.set('generation', String(generation));
        data.set('clientId', item.clientId);
        data.set('text', text);
        try {
            const result = await action(data);
            if (!mounted.current)
                return;
            if (result.error || !result.messageId)
                throw new Error(result.error ?? 'Message not saved. Try again.');
            setOutgoing(current => current.map(value => value.clientId === item.clientId ? { ...value, state: 'saved', messageId: result.messageId } : value));
            if (replies) {
                setSeen(current => new Set([...current, result.messageId!]));
                setWatching(current => [...new Set([...current, result.messageId!])]);
            }
        }
        catch (error) {
            if (mounted.current)
                setOutgoing(current => current.map(value => value.clientId === item.clientId ? { ...value, state: 'failed', error: error instanceof Error ? error.message : 'Connection interrupted. Retry to confirm delivery.' } : value));
        }
        finally {
            locked.current = false;
            if (mounted.current)
                setSending(false);
        }
    }
    async function stop() {
        try {
            for (const messageId of watching) {
                const data = new FormData();
                data.set('id', id);
                data.set('messageId', messageId);
                data.set('operation', 'skip');
                const result = await action(data);
                if (result.error) {
                    setNotice(result.error);
                    return;
                }
            }
            setWatching([]);
            for (const messageId of watching) watchStarted.current.delete(messageId);
            router.refresh();
        } catch {
            // An interrupted response cannot establish whether cancellation committed.
            setNotice('We couldn’t confirm the reply stopped. Reload to check.');
        }
    }
    function watch(messageId: string) {
        // Explicit retry starts a fresh observation window, and its caller owns
        // the POST. Polling must not race it with automatic recovery.
        watchStarted.current.set(messageId, Date.now());
        recoveryAttempts.current.add(messageId);
        setNotice('');
        setSeen(current => new Set([...current, messageId]));
        setWatching(current => [...new Set([...current, messageId])]);
    }
    const value = {
        outgoing: outgoing.filter(item => !savedClientIds.includes(item.clientId) && (!item.messageId || !savedIds.includes(item.messageId))),
        sending, typing: watching.length > 0, active: watching, seen, send, watch, stop,
    };
    return <Context.Provider value={value}>{children}{notice && <p className="chat-delivery-notice caption" role="status">{notice}</p>}</Context.Provider>;
}
export function ConnectedMessageDelivery({ messageId, status }: { messageId: string; status?: ReplyStatus }) {
    const { seen } = useDelivery();
    const hasSeen = seen.has(messageId) || status?.state === 'generating' || status?.state === 'completed' || (status?.attempts ?? 0) > 0;
    return <MessageDelivery state={hasSeen ? 'seen' : 'saved'}/>;
}
export function ChatOutbox({ name }: {
    name: string;
}) {
    const { outgoing, typing, send, sending, stop } = useDelivery();
    const [stopping, setStopping] = useState(false);
    const end = useRef<HTMLElement>(null);
    const newest = outgoing.at(-1)?.clientId;
    useEffect(() => { if (newest)
        end.current?.scrollIntoView({ block: 'end' }); }, [newest]);
    return <>{outgoing.map(item => <article ref={item.clientId === newest ? end : null} className="message-turn message-turn--user message-turn--outgoing" key={item.clientId} data-delivery={item.state} data-client-id={item.clientId}><p className="message-bubble">{item.text}</p><div className="message-meta caption muted"><time dateTime={item.time}>{new Date(item.time).toLocaleTimeString('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' })}</time>{item.state === 'saved' && item.messageId ? <ConnectedMessageDelivery messageId={item.messageId}/> : <MessageDelivery state={item.state}/>}</div>{item.state === 'failed' && <div className="message-send-error"><p role="alert" className="caption">{item.error}</p><Button variant="quiet" disabled={sending} onClick={() => void send(item.text, item)}>Retry sending</Button></div>}</article>)}{typing && <><TypingBubble name={name}/><Button className="chat-stop-reply" variant="quiet" loading={stopping} onClick={async () => { setStopping(true); try {
        await stop();
    }
    finally {
        setStopping(false);
    } }}>Stop reply</Button></>}</>;
}
export function LiveMessageComposer({ disabled, name }: {
    disabled: boolean;
    name: string;
}) {
    const { send, sending } = useDelivery();
    const [text, setText] = useState('');
    const form = useRef<HTMLFormElement>(null);
    useEffect(() => { const input = form.current?.querySelector('textarea'); if (input) {
        input.style.height = '0px';
        input.style.height = `${Math.min(144, Math.max(44, input.scrollHeight))}px`;
    } }, [text]);
    function submit() { if (disabled || sending || !text.trim())
        return; const value = text; setText(''); void send(value); }
    return <form ref={form} className="connected-message-composer" onSubmit={event => { event.preventDefault(); submit(); }}><div className="connected-composer-row"><TextArea label={`Message ${name}`} value={text} onChange={event => setText(event.target.value)} maxLength={2000} rows={1} disabled={disabled} placeholder={`Message ${name}…`} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
        event.preventDefault();
        if (!event.repeat)
            submit();
    } }}/><Button type="submit" className="composer-send" disabled={disabled || sending || !text.trim()} aria-label="Send message"><Icon name="arrow"/></Button></div></form>;
}

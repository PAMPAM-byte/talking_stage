"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Message, PublicCharacter } from '@/lib/contracts';
import { characters, readConversation } from '@/lib/mock/discovery';
import { archiveConversation, chatVersion, deleteConversation, loadThread, markRead, ownedPhoto, prepareReply, readThread, sampleMessages, sendMessage, serverChatVersion, subscribeChat, type ChatScenario } from '@/lib/mock/chat';
import { characterAsset } from '@/lib/mock/character-assets';
import { UserBoundary } from './user-boundary';
import { Brand } from './shells';
import { ChatShell } from './chat-shell';
import { MessageList, formatTime } from './messages';
import { CharacterPhoto } from './discovery';
import { Badge, Button, EmptyState, IconButton, Notice, SelectField, Skeleton } from './ui/primitives';
import { ChatPersonalSpace } from './chat-personal-space';
import { GiftDialog } from './payments';
import { ConversationLifecycle } from './conversation-lifecycle';
import { ReportDialog, type ReportContext } from './reporting';
import { useOperatorPreview } from './operator-preview';
import { Overlay } from './ui/overlay';
import { Icon } from './ui/icon';

function dateLabel(date: string) { return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(date)); }
export function Chat({ id }: { id: string }) { return <UserBoundary standalone active="Messages"><ChatContent key={id} id={id} /></UserBoundary>; }

function ChatPhoto({ message, conversationId, onView, broken = false }: { message: Message; conversationId: string; onView: (character: PublicCharacter) => void; broken?: boolean }) {
  const [failed, setFailed] = useState(false); const [attempt, setAttempt] = useState(0);
  const c = ownedPhoto(conversationId, message.assetId ?? '');
  if (!c) return <Notice title="Photo unavailable">This photo does not belong to this character.</Notice>;
  const asset = characterAsset(c.id, 'gallery');
  if (!asset.displayUrl) return <Notice title="Photo unavailable">This photo is not eligible for the customer preview.</Notice>;
  return <figure className="chat-photo"><div className="chat-photo__image">{failed ? <div className="photo-failure"><Icon name="photo" /><p>Photo couldn’t be loaded.</p><Button variant="secondary" onClick={() => { setFailed(false); setAttempt(v => v + 1); }}>Reload photo</Button></div> : <button type="button" aria-label={`View ${c.name}’s character photo`} onClick={() => onView(c)}><Image key={attempt} src={broken ? '/images/missing-chat-preview.webp' : asset.displayUrl} width={768} height={1024} sizes="(min-width: 900px) 320px, 70vw" alt={asset.altText} onError={() => setFailed(true)} /></button>}</div><figcaption><strong>AI-generated character photo</strong><span>{message.text}</span></figcaption></figure>;
}

function ChatContent({ id }: { id: string }) {
  const router = useRouter(); const revision = useSyncExternalStore(subscribeChat, chatVersion, serverChatVersion);
  const [loaded, setLoaded] = useState(false); const [loadError, setLoadError] = useState(''); const [loadAttempt, setLoadAttempt] = useState(0); const [draft, setDraft] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [scenario, setScenario] = useState<ChatScenario>('ready');
  const [menu, setMenu] = useState(false); const [confirmDelete, setConfirmDelete] = useState(false); const [managementBusy, setManagementBusy] = useState(false); const [viewer, setViewer] = useState<PublicCharacter | null>(null); const [brokenPhoto, setBrokenPhoto] = useState(false); const [showSamples, setShowSamples] = useState(false);
  const [reset, setReset] = useState(false); const [gift, setGift] = useState(false); const [report, setReport] = useState<ReportContext | null>(null);
  const end = useRef<HTMLDivElement>(null); const composer = useRef<HTMLTextAreaElement>(null); const nearBottom = useRef(true); const inFlight = useRef(false); const reading = useRef(true);
  useEffect(() => { let current = true; loadThread(id).then(r => { if (current) { setLoadError(r.error?.message ?? ''); setLoaded(true); } }); return () => { current = false; }; }, [id, loadAttempt]);
  const conversation = readConversation(id); const character = characters.find(c => c.id === conversation?.characterId); const thread = revision >= 0 && loaded ? readThread(id) : null;
  const pending = !!thread?.jobs.some(j => j.state === 'waiting' || j.state === 'generating');
  const operator = useOperatorPreview(conversation?.characterId ?? '');
  const archived = conversation?.status === 'archived';
  useEffect(() => { if (reading.current) markRead(id); if (nearBottom.current) end.current?.scrollIntoView({ block: 'end' }); }, [id, revision, loaded]);
  useEffect(() => { if (!draft) return; const element = composer.current; if (element) { element.style.height = 'auto'; element.style.height = `${Math.min(144, element.scrollHeight)}px`; } }, [draft]);
  async function send() {
    if (inFlight.current || pending || !draft.trim()) return;
    inFlight.current = true; setBusy(true); setError(''); const text = draft; const clientId = crypto.randomUUID();
    const result = await sendMessage(id, clientId, text, scenario);
    if (result.error) { setError(result.error.message); if (readThread(id)?.messages.some(m => m.clientMessageId === clientId)) setDraft(''); }
    else { setDraft(''); nearBottom.current = true; await prepareReply(id, result.data.id, scenario); }
    inFlight.current = false; setBusy(false); composer.current?.focus();
  }
  async function retryDelivery(m: Message) {
    if (inFlight.current) return; inFlight.current = true; setBusy(true); setError('');
    const result = await sendMessage(id, m.clientMessageId!, m.text ?? '', scenario);
    if (result.error) setError(result.error.message); else await prepareReply(id, result.data.id, scenario);
    inFlight.current = false; setBusy(false);
  }
  async function retryReply(messageId: string) { if (inFlight.current) return; inFlight.current = true; setBusy(true); setError(''); const r = await prepareReply(id, messageId, scenario); if (r.error) setError(r.error.message); inFlight.current = false; setBusy(false); }
  async function manage(kind: 'archive' | 'delete') {
    if (managementBusy || busy) return; setManagementBusy(true); const r = kind === 'delete' ? await deleteConversation(id) : await archiveConversation(id, !archived);
    setManagementBusy(false); if (r.error) setError(r.error.message); else { setMenu(false); setConfirmDelete(false); if (kind === 'delete' || !archived) router.push('/messages'); }
  }
  const chatDisabled = scenario === 'chat_paused' || archived || !operator.chat;
  const blockedCopy = archived ? 'This conversation is archived. Restore it to continue.' : (scenario === 'chat_paused' || !operator.chat) ? 'Conversation is paused. You can still read your history.' : (scenario === 'photos_paused' || !operator.photos) ? 'Character photos are paused. Text conversation is still available.' : null;
  const back = <Link onClick={() => { reading.current = false; }} href="/messages" className="button button--quiet button--icon" aria-label="Back to messages"><Icon name="back" /></Link>;
  if (loaded && (!conversation || !character || loadError)) return <main id="main-content" className="container shell__main"><EmptyState title="Conversation not found" action={<Link href="/discover" className="button button--primary">Explore characters</Link>}>{loadError || 'Start a conversation from a character’s profile.'}</EmptyState>{conversation && <Button onClick={() => { setLoaded(false); setLoadAttempt(v => v + 1); }}>Try again</Button>}</main>;
  return <div className="chat-workspace"><aside className="chat-sidebar"><div className="chat-sidebar__brand"><Brand /><Link href="/discover">Discover</Link></div><MessageList compact selected={id} /></aside><ChatShell onMessagesScroll={event => { const main = event.currentTarget; nearBottom.current = main.scrollHeight - main.scrollTop - main.clientHeight < 100; }} back={back} identity={character ? <div className="chat-identity"><span className="chat-avatar"><CharacterPhoto character={character} retryable={false} /></span><div><h1 aria-label={`Your conversation with ${character.name}`}>{character.name}, {character.age}</h1><span className="caption muted">Fictional AI character</span></div></div> : <Skeleton width="60%" />} actions={<IconButton icon="menu" label="Conversation options" onClick={() => setMenu(true)} />} composer={loaded && thread ? <div className="chat-composer stack">{blockedCopy && <Notice title={archived ? 'Conversation archived' : (scenario === 'chat_paused' || !operator.chat) ? 'Conversation paused' : 'Photos paused'}>{blockedCopy}{archived && <Button variant="secondary" onClick={() => manage('archive')}>Restore conversation</Button>}</Notice>}{error && <p className="field__error" role="alert">{error}</p>}<form onSubmit={e => { e.preventDefault(); void send(); }}><div className="composer-field"><label htmlFor="chat-message" className="sr-only">Message {character?.name}</label><textarea ref={composer} id="chat-message" value={draft} disabled={chatDisabled} maxLength={2000} rows={1} placeholder={`Say something to ${character?.name ?? 'your character'}…`} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) { e.preventDefault(); if (!e.repeat) void send(); } }} /></div><Button type="submit" className="composer-send" loading={busy} disabled={!draft.trim() || chatDisabled || pending} aria-label="Send message"><Icon name="arrow" /></Button></form><div className="composer-help"><Button variant="quiet" onClick={() => setShowSamples(v => !v)}>Sample messages</Button></div>{showSamples && <div className="sample-message-list">{sampleMessages.map(text => <button type="button" key={text} onClick={() => { setDraft(text); composer.current?.focus(); }}>{text}</button>)}</div>}</div> : <Skeleton height={48} />}>
    {!loaded || !thread ? <div role="status" aria-label="Loading conversation" className="stack"><Skeleton width="70%" height={100} /><Skeleton width="55%" height={60} /></div> : <div className="chat-thread"><div className="chat-disclosure"><Badge>Scripted conversation preview</Badge><p>Replies are samples, not live AI. Written text stays in memory until refresh; sample messages can be restored.</p></div>{character && <div className="chat-profile-link"><Link href={`/characters/${character.id}`}>View {character.name}’s profile</Link></div>}
      <div className="chat-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation messages">{thread.messages.map((m, index) => { const day = dateLabel(m.createdAt); const previous = thread.messages[index - 1]; const job = thread.jobs.find(j => j.userMessageId === m.id); return <Fragment key={m.id}>{(!previous || dateLabel(previous.createdAt) !== day) && <p className="chat-date">{day}</p>}<article className={`message-turn message-turn--${m.role}`} data-message-id={m.id} aria-label={`${m.role === 'user' ? 'You' : character?.name}, ${formatTime(m.createdAt)}`}><span className="sr-only">{m.role === 'user' ? 'You' : character?.name}: </span>{m.kind === 'photo' ? <ChatPhoto message={m} conversationId={id} onView={setViewer} broken={brokenPhoto} /> : <p className="message-bubble">{m.text}</p>}<div className="message-meta caption muted"><time dateTime={m.createdAt}>{formatTime(m.createdAt)}</time>{m.role === 'user' && <span>{m.deliveryState === 'sending' ? 'Saving…' : m.deliveryState === 'failed' ? 'Not saved' : 'Saved in preview'}</span>}</div>{m.role === 'character' && <Button variant="quiet" className="message-report" onClick={() => setReport({ target: m.kind === 'photo' ? { kind: 'photo', id: m.assetId! } : { kind: 'message', id: m.id }, label: m.kind === 'photo' ? 'character photo' : 'message', preview: m.text ?? 'AI-generated character photo' })}>Report {m.kind === 'photo' ? 'photo' : 'message'}</Button>}{m.deliveryState === 'failed' && <Button variant="secondary" disabled={busy} onClick={() => retryDelivery(m)}>Retry delivery</Button>}{job && (job.state === 'failed' || job.state === 'interrupted') && <div className="reply-failure"><p className="supporting">{job.state === 'interrupted' ? 'Reply interrupted.' : 'Reply couldn’t be prepared.'} Your message is saved.</p><Button variant="secondary" disabled={busy} onClick={() => retryReply(m.id)}>Retry reply</Button></div>}</article></Fragment>; })}</div>
      <ChatPersonalSpace conversationId={id} />{!operator.payments && <Notice title="Payments paused">Giving is temporarily unavailable. You can still read payment history and continue any available conversation.</Notice>}
      {pending && <p className="reply-progress supporting" role="status"><span className="spinner" aria-hidden="true" />Preparing a sample reply…</p>}
      {process.env.NODE_ENV === 'development' && <details className="chat-review-controls"><summary>Chat review controls</summary><SelectField label="Chat scenario" value={scenario} onChange={e => { setScenario(e.target.value as ChatScenario); setError(''); }}>{['ready', 'offline', 'delivery_failed', 'reply_failed', 'interrupted', 'rate_limit', 'usage_limit', 'chat_paused', 'photos_paused'].map(s => <option key={s}>{s}</option>)}</SelectField><Button variant="quiet" onClick={() => setBrokenPhoto(v => !v)}>Toggle broken photo</Button></details>}<div ref={end} /></div>}
  </ChatShell>
  <Overlay open={menu} onClose={() => { if (!managementBusy) setMenu(false); }} title="Conversation options" sheet><div className="stack">{character && <Link href={`/characters/${character.id}`} className="button button--secondary">View {character.name}’s profile</Link>}<Button variant="secondary" disabled={busy} loading={managementBusy} onClick={() => manage('archive')}>{archived ? 'Restore conversation' : 'Archive conversation'}</Button>{character && <><Link className="button button--secondary" href={`/settings/memories/${character.id}`}>Character memories</Link><Link className="button button--secondary" href="/settings/requests">Monetary request preferences</Link><Button variant="secondary" disabled={!operator.payments} onClick={() => { setMenu(false); setGift(true); }}>Send a voluntary gift</Button><Button variant="secondary" onClick={() => { setMenu(false); setReport({ target: { kind: 'character', id: character.id }, label: character.name, preview: character.bio }); }}>Report character</Button></>}<Button variant="secondary" disabled={busy} onClick={() => { setMenu(false); setReset(true); }}>Reset conversation</Button><Button variant="danger" disabled={busy} onClick={() => { setMenu(false); setConfirmDelete(true); }}>Delete conversation</Button></div></Overlay>
  {confirmDelete && <ConversationLifecycle id={id} action="delete" onClose={() => setConfirmDelete(false)} onComplete={() => router.push('/messages')} />}
  {reset && <ConversationLifecycle id={id} action="reset" onClose={() => setReset(false)} onComplete={() => { setReset(false); setDraft(''); setError(''); }} />}
  {gift && <GiftDialog conversationId={id} onClose={() => setGift(false)} />}
  {report && <ReportDialog context={report} onClose={() => setReport(null)} />}
  <Overlay open={!!viewer} onClose={() => setViewer(null)} title={viewer ? `${viewer.name}’s character photo` : 'Character photo'} description="AI-generated photo of a fictional adult character.">{viewer && <><CharacterPhoto character={viewer} kind="gallery" eager /><p className="caption muted photo-viewer-caption">AI-generated character photo</p><Button variant="quiet" onClick={() => { setViewer(null); setReport({ target: { kind: 'photo', id: `${viewer.id}-gallery` }, label: 'character photo', preview: `${viewer.name}’s AI-generated character photo` }); }}>Report this photo</Button></>}</Overlay>
  </div>;
}

"use client";
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Conversation } from '@/lib/contracts';
import { characters, listSavedConversations } from '@/lib/mock/discovery';
import { archiveConversation, chatVersion, deleteConversation, loadConversationList, resetChatPreview, serverChatVersion, subscribeChat } from '@/lib/mock/chat';
import { CharacterPhoto } from './discovery';
import { UserBoundary } from './user-boundary';
import { Badge, Button, Chip, EmptyState, IconButton, Notice, SelectField, Skeleton } from './ui/primitives';
import { ConversationLifecycle } from './conversation-lifecycle';
import { Overlay } from './ui/overlay';

export function formatTime(date: string) { return new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(date)); }
export function Messages() { return <UserBoundary active="Messages"><MessageList /></UserBoundary>; }
export function MessageList({ compact = false, selected }: { compact?: boolean; selected?: string }) {
  const revision = useSyncExternalStore(subscribeChat, chatVersion, serverChatVersion);
  const [loaded, setLoaded] = useState(false); const [error, setError] = useState(''); const [tab, setTab] = useState<'active' | 'archived'>('active'); const [scenario, setScenario] = useState<'ready' | 'offline' | 'error'>('ready'); const [retry, setRetry] = useState(0);
  const [action, setAction] = useState<{ row: Conversation; kind: 'menu' | 'delete' } | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { let current = true; loadConversationList(scenario).then(r => { if (current) { setError(r.error?.message ?? ''); setLoaded(true); } }); return () => { current = false; }; }, [scenario, retry]);
  // The external-store revision refreshes the list after delivery and management.
  const rows = revision >= 0 && loaded ? listSavedConversations().filter(c => c.status === tab).sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt)) : [];
  async function manage(kind: 'archive' | 'delete') {
    if (!action || busy) return; setBusy(true);
    const r = kind === 'delete' ? await deleteConversation(action.row.id) : await archiveConversation(action.row.id, action.row.status !== 'archived');
    setBusy(false); if (r.error) setError(r.error.message); else setAction(null);
  }
  return <section className={`message-list stack${compact ? ' message-list--compact' : ''}`} aria-label="Conversations"><header className="stack"><h1 className="display page-title">Messages</h1>{!compact && <p className="muted">A little banter, right where you left it.</p>}</header><div className="row"><Chip selected={tab === 'active'} onClick={() => setTab('active')}>Active</Chip><Chip selected={tab === 'archived'} onClick={() => setTab('archived')}>Archived</Chip></div>
    {!loaded ? <div role="status" aria-label="Loading conversations" className="stack">{[0, 1, 2].map(i => <Skeleton key={i} height={84} />)}</div> : error ? <Notice title="Messages unavailable" live tone="danger"><p>{error}</p><Button variant="secondary" onClick={() => { setLoaded(false); setRetry(v => v + 1); }}>Try again</Button></Notice> : rows.length ? <div className="message-list__rows">{rows.map(row => { const c = characters.find(c => c.id === row.characterId)!; return <article key={row.id} className={`conversation-row${selected === row.id ? ' conversation-row--selected' : ''}`}><Link href={`/messages/${row.id}`} className="conversation-row__link" aria-current={selected === row.id ? 'page' : undefined}><span className="conversation-avatar"><CharacterPhoto character={c} retryable={false} /></span><span className="conversation-row__body"><span className="conversation-row__name"><strong>{c.name}</strong><span className="caption muted">{formatTime(row.lastMessageAt ?? row.createdAt)}</span></span><span className="supporting muted conversation-preview">{row.lastMessagePreview ?? 'Your conversation is ready.'}</span><span className="caption muted">AI character</span></span>{row.unreadCount > 0 && <Badge>{row.unreadCount} unread</Badge>}</Link><IconButton icon="menu" label={`Manage conversation with ${c.name}`} onClick={() => setAction({ row, kind: 'menu' })} /></article>; })}</div> : <EmptyState title={tab === 'archived' ? 'No archived conversations' : 'Your first conversation starts here'} action={<Link href="/discover" className="button button--primary">Explore characters</Link>}>{tab === 'archived' ? 'Archived conversations stay available to restore.' : 'Meet a character and shoot your shot.'}</EmptyState>}
    {!compact && <p className="caption muted">Frontend preview. Replies are scripted samples. Written text is not saved across refresh.</p>}
    {!compact && process.env.NODE_ENV === 'development' && <details className="discovery-qa"><summary>Messages review controls</summary><SelectField label="Messages scenario" value={scenario} onChange={e => { setLoaded(false); setScenario(e.target.value as typeof scenario); }}>{['ready', 'offline', 'error'].map(s => <option key={s}>{s}</option>)}</SelectField><Button variant="quiet" onClick={resetChatPreview}>Reset chat preview</Button></details>}
    <Overlay open={action?.kind === 'menu'} onClose={() => { if (!busy) setAction(null); }} title="Manage conversation" description="Archiving moves this conversation out of your active list and keeps its messages." sheet>{action?.kind === 'menu' && <div className="stack"><Button variant="secondary" loading={busy} onClick={() => manage('archive')}>{action.row.status === 'archived' ? 'Restore conversation' : 'Archive conversation'}</Button><Button variant="danger" onClick={() => setAction({ ...action, kind: 'delete' })}>Delete conversation</Button></div>}</Overlay>
    {action?.kind === 'delete' && <ConversationLifecycle id={action.row.id} action="delete" onClose={() => setAction(null)} onComplete={() => setAction(null)} />}
  </section>;
}

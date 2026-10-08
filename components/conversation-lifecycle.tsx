"use client";
import { useState } from 'react';
import { manageConversation, type SpaceScenario } from '@/lib/mock/personal-space';
import { SpaceReview } from './personal-space';
import { Button, Checkbox, Notice } from './ui/primitives';
import { Overlay } from './ui/overlay';
export function ConversationLifecycle({ id, action, onClose, onComplete }: { id: string; action: 'delete' | 'reset'; onClose: () => void; onComplete: () => void }) {
  const [clear, setClear] = useState(false); const [scenario, setScenario] = useState<SpaceScenario>('ready'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function apply() { if (busy) return; setBusy(true); setError(''); const r = await manageConversation(id, action, clear, scenario); setBusy(false); if (r.error) setError(r.error.message); else onComplete(); }
  return <Overlay open onClose={() => { if (!busy) onClose(); }} title={action === 'delete' ? 'Delete conversation?' : 'Reset conversation?'} description={action === 'delete' ? 'Remove this conversation and its message history. Memories are kept unless you choose to clear them. Payment history remains available.' : 'Clear the chat and summary, restart the relationship from its introduction, and keep this character conversation. Memories are kept unless you choose to clear them. Payment history remains available.'} footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>Keep conversation</Button><Button variant="danger" loading={busy} onClick={apply}>{action === 'delete' ? 'Delete conversation' : 'Reset conversation'}</Button></>}><div className="stack"><Checkbox label="Also clear this character’s saved memories" checked={clear} onChange={e => setClear(e.target.checked)} /><p className="caption muted">Cleared facts are removed from future memory context. This action cannot restore previous chat history in the preview.</p>{error && <Notice live title="Conversation unchanged" tone="danger">{error}</Notice>}<SpaceReview value={scenario} onChange={setScenario} /></div></Overlay>;
}

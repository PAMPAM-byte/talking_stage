"use client";
import { useState } from 'react';
import { readConversation } from '@/lib/mock/discovery';
import { useOperatorPreview } from './operator-preview';
import { declineRequest, loadRequestSample, paymentsForConversation, proposalsFor } from '@/lib/mock/personal-space';
import { useMockAccount } from './account-provider';
import { usePersonalSpace } from './personal-space';
import { GiftDialog, PaymentCard } from './payments';
import { Button, Card, Checkbox, Notice } from './ui/primitives';
export function ChatPersonalSpace({ conversationId }: { conversationId: string }) {
  const space = usePersonalSpace(); const account = useMockAccount(); const [gift, setGift] = useState(false); const [ignored, setIgnored] = useState<string[]>([]); const [familiar, setFamiliar] = useState(false); const [error, setError] = useState('');
  const operator = useOperatorPreview(readConversation(conversationId)?.characterId ?? '');
  const requests = space.loaded && operator.payments ? proposalsFor(conversationId).filter(p => !ignored.includes(p.id)) : []; const payments = space.loaded ? paymentsForConversation(conversationId) : [];
  return <div className="chat-personal-space stack">{requests.map(request => <Card key={request.id}><div className="stack"><p className="caption muted">Optional request · fictional familiar-conversation sample</p><p>If you’d like, you can send a voluntary gift. It’s always optional.</p><p className="supporting muted">Received by TalkingStage’s operator. Declining or ignoring does not change our conversation.</p><div className="row"><Button variant="secondary" onClick={() => setGift(true)}>Choose amount</Button><Button variant="quiet" onClick={() => declineRequest(request.id)}>Not now</Button><Button variant="quiet" onClick={() => setIgnored(ids => [...ids, request.id])}>Ignore request</Button></div></div></Card>)}{payments.map(payment => <PaymentCard key={payment.id} payment={payment} />)}{gift && <GiftDialog conversationId={conversationId} onClose={() => setGift(false)} />}{process.env.NODE_ENV === 'development' && <details className="chat-review-controls"><summary>Request policy review controls</summary><div className="stack"><Checkbox label="Use eligible familiar-conversation sample" checked={familiar} onChange={e => setFamiliar(e.target.checked)} /><p className="caption muted">No early-chat request is generated automatically. Enable requests in Settings before loading an explicitly eligible sample.</p><Button variant="secondary" disabled={!familiar || !account.user?.allowMonetaryRequests || !operator.payments} onClick={() => { const r = loadRequestSample(conversationId, familiar); setError(r.error?.message ?? ''); }}>Load request sample</Button>{error && <Notice title="Request not offered" tone="warning">{error}</Notice>}</div></details>}</div>;
}

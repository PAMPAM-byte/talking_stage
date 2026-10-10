"use client";
import { CharacterInterests } from './character-interests';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PublicCharacter, Result } from '@/lib/contracts';
import { getCharacter, savedConversation, startConversation, type DiscoveryScenario } from '@/lib/mock/discovery';
import { UserBoundary } from './user-boundary';
import { CharacterPhoto, ScenarioControls } from './discovery';
import { Badge, Button, EmptyState, Notice, Skeleton } from './ui/primitives';
import { ReportDialog, type ReportContext } from './reporting';
import { useOperatorPreview } from './operator-preview';
import { Overlay } from './ui/overlay';
import { Icon } from './ui/icon';
export function CharacterProfile({ id, backHref = '/discover' }: { id: string; backHref?: string }) { return <UserBoundary><ProfileContent id={id} backHref={backHref} /></UserBoundary>; }
function ProfileContent({ id, backHref }: { id: string; backHref: string }) {
  const operator = useOperatorPreview(id);
  const router = useRouter(); const [result, setResult] = useState<Result<PublicCharacter> | null>(null); const [scenario, setScenario] = useState<DiscoveryScenario>('ready'); const [retry, setRetry] = useState(0); const [photo, setPhoto] = useState(0); const [viewer, setViewer] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [broken, setBroken] = useState(false);
  const [report, setReport] = useState<ReportContext | null>(null);
  useEffect(() => { let current = true; getCharacter(id, scenario).then(r => { if (current) setResult(r); }); return () => { current = false; }; }, [id, scenario, retry, operator.revision]);
  useEffect(() => {
    if (!viewer) return;
    const navigate = (event: KeyboardEvent) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setPhoto(value => value === 0 ? 1 : 0); } };
    document.addEventListener('keydown', navigate);
    return () => document.removeEventListener('keydown', navigate);
  }, [viewer]);
  async function start(c: PublicCharacter) { if (busy) return; setBusy(true); setError(''); const r = await startConversation(c.id, scenario); if (r.error) { setError(r.error.message); setBusy(false); } else router.push(`/messages/${r.data.id}`); }
  const c = result?.data; const kind = photo === 0 ? 'portrait' : 'gallery';
  return <div className="stack profile-page"><Link href={backHref} className="profile-back"><Icon name="back" />Back to discovery</Link>{!result ? <div role="status" aria-label="Loading profile"><Skeleton height={420} /><Skeleton height={32} width="60%" /></div> : result.error ? <EmptyState title={result.error.code === 'NOT_FOUND' ? 'Profile not found' : 'Character unavailable'} icon="people" action={result.error.retryable ? <Button onClick={() => { setResult(null); setRetry(v => v + 1); }}>Try again</Button> : <Link href={backHref} className="button button--primary">Explore characters</Link>}>{result.error.message}</EmptyState> : c && <div className="profile-layout"><section aria-label={`${c.name}’s photos`} className="profile-gallery stack"><div className="profile-gallery__main"><CharacterPhoto key={`${kind}-${broken}`} character={c} kind={kind} eager broken={broken} /><Button className="gallery-expand" variant="secondary" onClick={() => setViewer(true)}><Icon name="photo" />View photos · {photo + 1}/2</Button></div><div className="gallery-thumbnails" aria-label="Choose photo">{(['portrait', 'gallery'] as const).map((k, i) => <button key={k} type="button" aria-label={`Show photo ${i + 1} of ${c.name}`} aria-pressed={photo === i} onClick={() => setPhoto(i)}><CharacterPhoto character={c} kind={k} retryable={false} /></button>)}</div><p className="caption muted">AI-generated character photos. Places and biography are fictional.</p></section><section className="profile-details stack"><Badge>Fictional AI character</Badge><div><h1 className="display profile-title">{c.name}, {c.age}</h1><p className="muted">{c.occupation} · {c.fictionalLocation}</p><p className="caption muted">Fictional location</p></div><div className="row">{c.personalityTags.map(t => <Badge key={t} tone="neutral">{t}</Badge>)}</div><div className="profile-section stack"><h2>A little about me</h2><p>{c.bio}</p></div><div className="profile-section stack"><CharacterInterests interests={c.interests} /></div><blockquote className="conversation-clue profile-clue"><span className="caption">A way into the conversation</span><p>“{c.conversationClue}”</p></blockquote>{!c.availability.photos && <Notice title="Photo sharing paused">New character photo messages are temporarily unavailable. You can still read existing history.</Notice>}{!c.availability.chat && <Notice title="Conversation paused">You can still explore this profile. Try another character for now.</Notice>}{error && <Notice live tone="danger" title="Conversation couldn’t start">{error}</Notice>}<Button loading={busy} disabled={!c.availability.chat} onClick={() => start(c)}>{savedConversation(c.id) ? 'Resume conversation' : 'Shoot your shot'}<Icon name="arrow" /></Button><p className="supporting muted">A private conversation with a fictional AI character.</p><Button variant="quiet" onClick={() => setReport({ target: { kind: 'character', id: c.id }, label: c.name, preview: c.bio })}>Report character</Button></section></div>}
    {c && <Overlay open={viewer} onClose={() => setViewer(false)} title={`${c.name}’s photos`} description="AI-generated photos of a fictional adult character."><div className="stack"><CharacterPhoto key={kind} character={c} kind={kind} /><div className="gallery-viewer-controls"><Button variant="secondary" onClick={() => setPhoto(v => v === 0 ? 1 : 0)} aria-label="Previous photo"><Icon name="back" /></Button><span role="status">Photo {photo + 1} of 2</span><Button variant="secondary" onClick={() => setPhoto(v => v === 0 ? 1 : 0)} aria-label="Next photo"><Icon name="arrow" /></Button></div><Button variant="quiet" onClick={() => { setViewer(false); setReport({ target: { kind: 'photo', id: `${c.id}-${kind}` }, label: 'character photo', preview: `${c.name}’s AI-generated ${kind} photo` }); }}>Report this photo</Button></div></Overlay>}
    {report && <ReportDialog context={report} onClose={() => setReport(null)} />}
    <ScenarioControls value={scenario} onChange={s => { setResult(null); setError(''); setScenario(s); }} />{process.env.NODE_ENV === 'development' && c && <Button variant="quiet" onClick={() => setBroken(v => !v)}>Toggle failed photo preview</Button>}
  </div>;
}

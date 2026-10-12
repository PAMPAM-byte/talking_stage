"use client";
import Image from 'next/image';
import { DiscoveryDeck } from './discovery-deck';
import { characterHref, discoveryHref, type DiscoveryFilters } from '@/lib/discovery-navigation';
import { useEffect, useState } from 'react';
import type { CharacterFilters, PublicCharacter, Result } from '@/lib/contracts';
import { characters, listCharacters, startConversation, type DiscoveryScenario } from '@/lib/mock/discovery';
import { useMockAccount } from './account-provider';
import { UserBoundary } from './user-boundary';
import { Button, Chip, EmptyState, Notice, SelectField, Skeleton } from './ui/primitives';
import { useOperatorPreview } from './operator-preview';
import { Overlay } from './ui/overlay';
import { Icon } from './ui/icon';
import { characterAsset } from '@/lib/mock/character-assets';

export function CharacterPhoto({ character, kind = 'portrait', eager = false, broken = false, retryable = true }: { character: PublicCharacter; kind?: 'portrait' | 'gallery'; eager?: boolean; broken?: boolean; retryable?: boolean }) {
  const [failed, setFailed] = useState(false); const [attempt, setAttempt] = useState(0);
  const asset = characterAsset(character.id, kind);
  return <div className="character-photo">{!asset.displayUrl ? <div className="photo-failure"><Icon name="photo" /><p>Photo unavailable for this preview.</p></div> : failed ? <div className="photo-failure"><Icon name="photo" /><p>Photo couldn’t be loaded.</p>{retryable && <Button variant="secondary" onClick={() => { setFailed(false); setAttempt(v => v + 1); }}>Retry photo</Button>}</div> : <Image key={attempt} src={broken ? '/images/missing-preview.webp' : asset.displayUrl} alt={`${character.name}, ${character.age}, a fictional adult AI character${kind === 'gallery' ? ' in a lifestyle photo' : ' in a portrait'}`} fill sizes="(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw" loading={eager ? 'eager' : 'lazy'} style={{ objectFit: 'cover', objectPosition: `${asset.focalPoint.x * 100}% ${asset.focalPoint.y * 100}%` }} onError={() => setFailed(true)} />}</div>;
}
export function ScenarioControls({ value, onChange }: { value: DiscoveryScenario; onChange: (s: DiscoveryScenario) => void }) {
  return process.env.NODE_ENV === 'development' ? <details className="discovery-qa"><summary>Developer review scenarios</summary><SelectField label="Discovery scenario" value={value} onChange={e => onChange(e.target.value as DiscoveryScenario)}>{['ready', 'empty', 'offline', 'error', 'deactivated', 'paused'].map(s => <option key={s} value={s}>{s}</option>)}</SelectField></details> : null;
}
export function Discovery({ initialFilters = {} }: { initialFilters?: DiscoveryFilters }) { return <UserBoundary><DiscoveryContent initialFilters={initialFilters} /></UserBoundary>; }
function DiscoveryContent({ initialFilters }: { initialFilters: DiscoveryFilters }) {
  const account = useMockAccount(); const operator = useOperatorPreview();
  const preferred = account.user?.preferences.characterGenders;
  const [filters, setFilters] = useState<CharacterFilters>(() => ({ gender: initialFilters.gender === 'all' ? undefined : initialFilters.gender === 'woman' || initialFilters.gender === 'man' ? initialFilters.gender : preferred?.length === 1 ? preferred[0] : undefined, interest: initialFilters.interest || undefined, personality: initialFilters.personality || undefined }));
  const [draft, setDraft] = useState(filters); const [open, setOpen] = useState(false); const [scenario, setScenario] = useState<DiscoveryScenario>('ready');
  const [result, setResult] = useState<Result<PublicCharacter[]> | null>(null); const [retry, setRetry] = useState(0);
  useEffect(() => { let current = true; listCharacters(filters, scenario).then(r => { if (current) setResult(r); }); return () => { current = false; }; }, [filters, scenario, retry, operator.revision]);
  const change = (next: CharacterFilters) => { setResult(null); setFilters(next); window.history.replaceState(null, '', discoveryHref({ ...next, gender: next.gender ?? 'all' })); };
  const reset = () => change({}); const selected = Object.values(filters).filter(Boolean);
  return <div className="discovery-page discovery-page--swipe stack"><header className="discovery-heading"><div className="stack"><p className="supporting muted">Welcome, {account.user?.displayName}.</p><h1 className="display discovery-title">Find your spark.</h1><p className="muted">Meet fictional AI characters with a personality of their own.</p></div><div className="discovery-disclosure"><Icon name="info" /><span>Every character is AI.<br />Every story is fictional.</span></div></header>
    <div className="discovery-toolbar"><div className="row" aria-label="Character gender"><Chip selected={!filters.gender} onClick={() => change({ ...filters, gender: undefined })}>Everyone</Chip><Chip selected={filters.gender === 'woman'} onClick={() => change({ ...filters, gender: 'woman' })}>Women</Chip><Chip selected={filters.gender === 'man'} onClick={() => change({ ...filters, gender: 'man' })}>Men</Chip></div><Button variant="secondary" onClick={() => { setDraft(filters); setOpen(true); }}><Icon name="filter" />Filters{selected.length > 0 ? ` (${selected.length})` : ''}</Button></div>
    {(filters.personality || filters.interest) && <div className="row"><span className="supporting muted">{[filters.personality, filters.interest].filter(Boolean).join(' · ')}</span><Button variant="quiet" onClick={reset}>Reset filters</Button></div>}
    {!result ? <div className="discovery-deck discovery-deck--loading" role="status" aria-label="Loading characters"><Skeleton height={440} /><Skeleton width="55%" /></div> : result.error ? <Notice live tone="danger" title="Discovery unavailable"><p>{result.error.message}</p><Button variant="secondary" onClick={() => { setResult(null); setRetry(v => v + 1); }}>Try again</Button></Notice> : result.data.length === 0 ? <EmptyState title="No characters fit these filters" icon="discover" action={<Button onClick={() => { setScenario('ready'); reset(); }}>Reset filters</Button>}>Try a different interest or personality, or explore everyone.</EmptyState> : <DiscoveryDeck onMeet={async id => { const result = await startConversation(id, scenario); return result.error ? { error: result.error.message } : { id: result.data.id }; }} key={JSON.stringify(filters)} scope={`${account.user?.id ?? 'preview'}:${JSON.stringify(filters)}`} cards={result.data.map(c => ({ id: c.id, name: c.name, age: c.age, location: c.fictionalLocation, occupation: c.occupation, clue: c.conversationClue, bio: c.bioSnippet, interests: c.interests, href: characterHref(c.id, { ...filters, gender: filters.gender ?? 'all' }), photo: <CharacterPhoto character={c} eager /> }))} />}
    <Overlay open={open} onClose={() => setOpen(false)} title="Find your kind of conversation" description="Combine a gender, personality and interest. Changes apply when you’re ready." sheet footer={<><Button variant="quiet" onClick={() => setDraft({})}>Clear selections</Button><Button onClick={() => { change(draft); setOpen(false); }}>Apply filters</Button></>}><div className="stack"><SelectField label="Character gender" value={draft.gender ?? ''} onChange={e => setDraft({ ...draft, gender: e.target.value as CharacterFilters['gender'] || undefined })}><option value="">Everyone</option><option value="woman">Women</option><option value="man">Men</option></SelectField><SelectField label="Personality" value={draft.personality ?? ''} onChange={e => setDraft({ ...draft, personality: e.target.value || undefined })}><option value="">Any personality</option>{[...new Set(characters.flatMap(c => c.personalityTags))].sort().map(i => <option key={i}>{i}</option>)}</SelectField><SelectField label="Interest" value={draft.interest ?? ''} onChange={e => setDraft({ ...draft, interest: e.target.value || undefined })}><option value="">Any interest</option>{[...new Set(characters.flatMap(c => c.interests))].sort().map(i => <option key={i}>{i}</option>)}</SelectField></div></Overlay>
    <ScenarioControls value={scenario} onChange={s => { setResult(null); setScenario(s); }} />
  </div>;
}

import Link from 'next/link';
import { currentAccount } from '@/lib/backend/server';
import type { CastDraft } from '@/lib/backend/cast-types';
import { ConnectedCastForm } from './connected-cast-form';
import { Badge, Card, EmptyState, Notice } from '@/components/ui/primitives';
import { AssetForm } from './connected-asset-form';
import {Pagination} from '@/components/ui/pagination';

export async function ConnectedCast({ id, create = false, page=1 }: { id?: string; create?: boolean;page?:number }) {
  const account = await currentAccount();
  if (!account) return <Notice title="Sign in to manage cast" />;
  const result = id?await account.client.rpc('admin_get_cast',{p_id:id}):create?{data:null,error:null}:await account.client.rpc('admin_cast_page',{p_page:page});
  if (result.error) return <Notice title="Cast unavailable" tone="warning">Reload this page to try again.</Notice>;
  const drafts = (id?(result.data?[result.data]:[]):create?[]:result.data.characters) as CastDraft[];
  if (id || create) {
    const draft = drafts.find(item => item.id === id);
    if (id && !draft) return <EmptyState title="Character unavailable" action={<Link href="/admin/characters">Back to cast</Link>}>This draft could not be found.</EmptyState>;
    return <div className="stack"><Link href="/admin/characters">Back to cast</Link><header><p className="caption muted">Cast management{draft ? ` · Version ${draft.version} · Direction ${draft.instructionVersion}` : ''}</p><h1 className="display page-title">{draft ? draft.profile.name : 'Create a character'}</h1></header><Notice title="Draft review">Review this profile before it goes live. Saving does not publish your changes.</Notice><ConnectedCastForm draft={draft} />{draft && <><Link className="button button--secondary" href={`/admin/characters/${draft.id}/preview`}>Preview public profile</Link><Link className="button button--secondary" href={`/admin/assets?character=${draft.id}`}>Review character photos</Link><AssetForm operation="publish-cast" draft={draft} /></>}</div>;
  }
  return <div className="stack"><header className="discovery-heading"><div><p className="caption muted">Administration</p><h1 className="display page-title">Cast</h1><p className="muted">Shape the personality. Review the profile before it goes live.</p></div><Link className="button button--primary" href="/admin/characters/new">Create character</Link></header>
    {drafts.length ? <div className="character-grid">{drafts.map(draft => <Card key={draft.id}><Badge>{draft.status}</Badge><h2>{draft.profile.name}, {draft.profile.age}</h2><p className="muted">{draft.profile.fictionalLocation} · {draft.profile.occupation}</p><blockquote className="conversation-clue">{draft.profile.conversationClue}</blockquote><Link className="button button--secondary" href={`/admin/characters/${draft.id}`}>Edit {draft.profile.name}</Link></Card>)}</div> : <EmptyState title="Build your first personality" action={<Link className="button button--primary" href="/admin/characters/new">Create character</Link>}>Create a private draft, then prepare its photos for review.</EmptyState>}
    <Pagination page={result.data.page} total={result.data.total} href={p=>`/admin/characters?page=${p}`}/>
  </div>;
}

import { currentAccount } from '@/lib/backend/server';
import type { CastDraft } from '@/lib/backend/cast-types';
import type { CastAsset } from '@/lib/backend/asset-types';
import { AssetForm } from './connected-asset-form';
import { Badge, Card, EmptyState, Notice } from '@/components/ui/primitives';
export async function ConnectedAssets({ character }: { character?: string }) {
  const account = await currentAccount(); if (!account) return null;
  const [assets, cast] = await Promise.all([account.client.rpc('admin_list_assets', { p_character: character ?? null }), account.client.rpc('admin_list_cast')]);
  if (assets.error || cast.error) return <Notice title="Photos unavailable" tone="warning">Reload to try again.</Notice>;
  const drafts = cast.data as CastDraft[];
  return <div className="stack"><h1 className="display page-title">{character ? 'Character photos' : 'Photos for review'}</h1><p className="muted">Review adult appearance, identity continuity and non-explicit content before publication.</p>
    {drafts.length ? <AssetForm operation="upload" drafts={drafts} character={character} /> : <EmptyState title="Create a character first">Each photo belongs to one character.</EmptyState>}
    <div className="character-grid">{(assets.data as CastAsset[]).map(asset => <Card key={asset.id} className="stack">
      {/* Authenticated image delivery rechecks eligibility on every request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cast-review-photo" src={`/api/cast-assets/${asset.id}?w=640`} alt={asset.alt_text} loading="lazy" />
      <div className="row"><Badge>{asset.slot}</Badge><Badge>{asset.review_state}</Badge><Badge>{asset.published ? 'Published' : 'Draft'}</Badge></div>
      <p>{asset.alt_text}</p>{asset.rejection_reason && <p className="muted">{asset.rejection_reason}</p>}
      {asset.review_state !== 'approved' && <AssetForm operation="approved" asset={asset} />}<AssetForm operation="rejected" asset={asset} />
      {asset.review_state === 'approved' && !asset.published && <AssetForm operation="publish-asset" asset={asset} />}
    </Card>)}</div>
  </div>;
}

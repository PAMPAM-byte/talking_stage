"use client";
import { useState, useTransition } from 'react';
import type { CastDraft } from '@/lib/backend/cast-types';
import type { CastAsset } from '@/lib/backend/asset-types';
import { assetAction } from '@/lib/backend/asset-actions';
import { Button, Checkbox, Notice, SelectField, TextField } from '@/components/ui/primitives';
export function AssetForm({ operation, asset, draft, drafts, character }: { operation: string; asset?: CastAsset; draft?: CastDraft; drafts?: CastDraft[]; character?: string }) {
  const [result, setResult] = useState<{ error?: string; message?: string }>({}); const [pending, start] = useTransition();
  const labels: Record<string,string> = { upload: 'Upload photo', approved: 'Approve photo', rejected: 'Reject photo', 'publish-asset': 'Publish photo', 'publish-cast': 'Publish character' };
  return <form className="stack connected-cast-editor" onSubmit={event => { event.preventDefault(); const element=event.currentTarget;const data = new FormData(element); start(async () => {const next=await assetAction(data);setResult(next);if(!next.error)element.reset();}); }}>
    <input type="hidden" name="operation" value={operation} /><input type="hidden" name="id" value={asset?.id ?? draft?.id ?? ''} /><input type="hidden" name="version" value={asset?.version ?? draft?.version ?? 0} />
    {result.error && <Notice live tone="danger" title="Change not saved">{result.error}</Notice>}{result.message && <p role="status">{result.message}</p>}
    {operation === 'upload' && <><SelectField label="Character" name="character" defaultValue={character}>{drafts?.map(item => <option key={item.id} value={item.id}>{item.profile.name}</option>)}</SelectField><SelectField label="Photo type" name="slot"><option value="portrait">Portrait</option><option value="gallery">Gallery</option><option value="chat">Chat photo</option></SelectField><TextField label="Photo description" name="alt" required maxLength={240} /><TextField label="Image file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required hint="Still JPEG, PNG or WebP, up to 5 MB. At least 256 pixels per side." /></>}
    {['approved','publish-cast'].includes(operation) && <Checkbox name="attested" required label={operation === 'approved' ? 'I reviewed this photo: clearly adult, consistent with this character, and non-explicit.' : 'I reviewed this fictional adult profile, private direction and approved photos for non-explicit publication.'} />}
    {operation === 'rejected' && <TextField label="Rejection reason" name="reason" required maxLength={500} />}
    {operation.startsWith('publish') ? <details><summary>{labels[operation]}</summary><p>Confirm this reviewed content is ready to become visible to eligible adults.</p><Button type="submit" loading={pending}>Confirm {labels[operation].toLowerCase()}</Button></details> : <Button type="submit" variant={operation === 'rejected' ? 'danger' : 'primary'} loading={pending}>{labels[operation]}</Button>}
  </form>;
}

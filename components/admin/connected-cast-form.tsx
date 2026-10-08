"use client";
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CastDraft } from '@/lib/backend/cast-types';
import { saveCast, type CastSaveResult } from '@/lib/backend/cast-actions';
import { Button, Notice, TextField, TextArea, SelectField } from '@/components/ui/primitives';

export function ConnectedCastForm({ draft }: { draft?: CastDraft }) {
  const [result, setResult] = useState<CastSaveResult>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const p = draft?.profile;
  return <form className="stack connected-cast-editor" onSubmit={event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    form.set('operation', submitter?.getAttribute('value') ?? 'save');
    start(async () => {
    const next = await saveCast(form); setResult(next);
    if (next.id && !draft && !next.error) router.push(`/admin/characters/${next.id}`);
    });
  }}>
    <input type="hidden" name="id" value={draft?.id ?? ''} />
    <input type="hidden" name="version" value={draft?.version ?? 0} />
    {result.error && <Notice title="Change not saved" tone="danger" live>{result.error}<Button variant="quiet" onClick={() => router.refresh()}>Reload latest version</Button></Notice>}
    {result.message && <p role="status">{result.message}</p>}
    <TextField label="Name" name="name" defaultValue={p?.name} required maxLength={40} />
    <div className="connected-cast-editor__row"><TextField label="Age" name="age" type="number" min={18} max={120} step={1} defaultValue={p?.age} required /><SelectField label="Gender" name="gender" defaultValue={p?.gender ?? 'woman'}><option value="woman">Woman</option><option value="man">Man</option></SelectField></div>
    <TextField label="Fictional location" name="fictionalLocation" defaultValue={p?.fictionalLocation} required maxLength={100} />
    <TextField label="Occupation" name="occupation" defaultValue={p?.occupation} required maxLength={100} />
    <TextArea label="Biography" name="bio" defaultValue={p?.bio} required maxLength={1200} rows={5} />
    <TextField label="Conversation clue" name="conversationClue" defaultValue={p?.conversationClue} required maxLength={240} />
    <TextField label="Interests" hint="Separate each interest with a comma." name="interests" defaultValue={p?.interests.join(', ')} required />
    <TextField label="Personality" hint="Separate each personality tag with a comma." name="personalityTags" defaultValue={p?.personalityTags.join(', ')} required />
    <TextArea label="Private character direction" hint="Only authorised administrators can read this. Saving does not publish it." name="direction" defaultValue={draft?.direction} required maxLength={12000} rows={8} />
    <Button type="submit" name="operation" value="save" loading={pending}>Save draft</Button>
    {draft && draft.status !== 'archived' && <details><summary>Deactivate character</summary><p>This removes the character from discovery and profile access. Existing history is preserved.</p><Button type="submit" name="operation" value="deactivate" variant="danger" disabled={pending} formNoValidate>Confirm deactivation</Button></details>}
  </form>;
}

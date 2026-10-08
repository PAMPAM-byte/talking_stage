"use server";
import { randomUUID, createHash } from 'node:crypto';
import { currentAccount } from './server';
import { castBucket, trustedStorage } from './storage';
import { inspectImage } from './inspect-image';
import { revalidatePath } from 'next/cache';
export async function assetAction(form: FormData): Promise<{ error?: string; message?: string }> {
  let cleanup: string[] = [];
  let uploadFailure: {actor:string;character:string|null;reason:string}|undefined;
  async function auditUploadFailure() {
    if(!uploadFailure)return;
    const result=await trustedStorage().rpc('record_upload_failure',{p_actor:uploadFailure.actor,p_character:uploadFailure.character,p_reason:uploadFailure.reason});
    if(result.error)throw new Error('audit_unavailable');
  }
  try {
    const account = await currentAccount();
    if (!account?.profile.onboarding_complete || !account.profile.adult_declared_at || (await account.client.rpc('is_admin')).data !== true) return { error: 'Administrator access required.' };
    const operation = String(form.get('operation') ?? '');
    const id = String(form.get('id') ?? '').toLowerCase();
    const version = Number(form.get('version'));
    if (operation === 'upload') {
      const character = String(form.get('character') ?? '').toLowerCase();
      const slot = String(form.get('slot') ?? '');
      const alt = String(form.get('alt') ?? '').trim();
      const file = form.get('file');
      uploadFailure={actor:account.user.id,character:/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(character)?character:null,reason:'invalid_upload'};
      if (!uploadFailure.character || !['portrait','gallery','chat'].includes(slot) || !alt || alt.length > 240 || !(file instanceof File) || file.size > 5 * 1024 * 1024 || !file.size) {await auditUploadFailure();uploadFailure=undefined;return { error: 'Choose a character, photo type, description and image up to 5 MB.' };}
      const allowed = await account.client.rpc('admin_cast_command', { p_operation:'asset.reserve_upload',p_id:character });
      if (allowed.error || allowed.data?.error) {uploadFailure=undefined;return { error: 'This upload is unavailable. Reload the character or wait a minute and try again.' };}
      let inspected;
      try { inspected = await inspectImage(Buffer.from(await file.arrayBuffer())); } catch {uploadFailure.reason='inspection_failed';await auditUploadFailure();uploadFailure=undefined;return { error: 'Choose a valid still JPEG, PNG or WebP, 256–8192 pixels per side, up to 5 MB.' }; }
      const asset = randomUUID(); const prefix = `${character}/${asset}`;
      const client = trustedStorage();
      const files = [{ path: `${prefix}/original.webp`, bytes: inspected.original }, ...inspected.variants.map(v => ({ path: `${prefix}/${v.width}.webp`, bytes: v.bytes }))];
      cleanup = files.map(f => f.path);
      uploadFailure.reason='storage_unavailable';
      for (const item of files) {
        const result = await client.storage.from(castBucket).upload(item.path, item.bytes, { contentType: 'image/webp', upsert: false });
        if (result.error) throw new Error('storage_unavailable');
      }
      uploadFailure.reason='registration_failed';
      const registered = await client.rpc('register_inspected_asset', { p_id: asset, p_character: character, p_actor: account.user.id, p_slot: slot, p_alt: alt, p_width: inspected.width, p_height: inspected.height, p_hash: createHash('sha256').update(inspected.original).digest('hex') });
      if (registered.error) throw new Error('registration_failed');
      cleanup = [];
      uploadFailure=undefined;
    } else {
      if (!/^[a-f0-9-]{36}$/i.test(id) || !Number.isSafeInteger(version) || version < 1) return { error: 'Reload this record before changing it.' };
      const command=operation==='publish-cast'?'cast.publish':operation==='publish-asset'?'asset.publish':['approved','rejected'].includes(operation)?`asset.${operation}`:null;
      const result=command?await account.client.rpc('admin_cast_command',{p_operation:command,p_id:id,p_version:version,p_attested:form.get('attested')==='on',p_reason:String(form.get('reason')??'')}):null;
      if (!result) return { error: 'Choose an available action.' };
      const failure=result.data?.error??result.error?.message;
      if (failure) return { error: failure.includes('conflict') ? 'This record has changed or is not eligible. Reload before trying again.' : 'Review the required attestations and publish approved portrait and gallery photos before publishing the character.' };
    }
    revalidatePath('/admin', 'layout'); revalidatePath('/discover'); revalidatePath('/characters', 'layout');
    return { message: operation === 'upload' ? 'Photo uploaded. Review it before approval.' : operation === 'approved' ? 'Photo approved. Publish it when ready.' : operation === 'rejected' ? 'Photo rejected and removed from publication.' : 'Published.' };
  } catch {
    if(uploadFailure){try{await auditUploadFailure();}catch{console.error('Upload failure audit could not be recorded.');}}
    if (cleanup.length) { try { await trustedStorage().storage.from(castBucket).remove(cleanup); } catch {} }
    return { error: 'Image services are unavailable. Please try again later.' };
  }
}

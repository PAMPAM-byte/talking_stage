"use server";
import { currentAccount } from './server';
import { revalidatePath } from 'next/cache';

export type CastSaveResult = { error?: string; message?: string; id?: string };
export async function saveCast(form: FormData): Promise<CastSaveResult> {
  try {
    const account = await currentAccount();
    if (!account?.profile.onboarding_complete || !account.profile.adult_declared_at) return { error: 'Sign in with an eligible administrator account.' };
    const role = await account.client.rpc('is_admin');
    if (role.error || role.data !== true) return { error: 'Administrator access required.' };
    const value = (name: string) => String(form.get(name) ?? '').trim();
    const version = Number(value('version'));
    const id = value('id');
    if (!Number.isSafeInteger(version) || version < 0 || (id && !/^[a-f0-9-]{36}$/i.test(id))) return { error: 'Reload this character before saving.' };
    const result = form.get('operation') === 'deactivate'
      ? await account.client.rpc('admin_cast_command', { p_operation:'cast.deactivate',p_id: id, p_version: version })
      : await account.client.rpc('admin_cast_command', {
        p_operation:'cast.save_draft',
        p_id: id || null, p_version: version, p_direction: value('direction'),
        p_profile: { name: value('name'), age: Number(value('age')), gender: value('gender'),
          fictionalLocation: value('fictionalLocation'), occupation: value('occupation'), bio: value('bio'),
          conversationClue: value('conversationClue'),
          interests: value('interests').split(',').map(item => item.trim()).filter(Boolean),
          personalityTags: value('personalityTags').split(',').map(item => item.trim()).filter(Boolean) },
      });
    const failure=result.data?.error??result.error?.message;
    if (failure) return { error: failure.includes('conflict') ? 'This draft has changed. Reload it before saving; your edits are still here.' : failure.includes('rate_limited') ? 'Too many changes. Wait a minute and try again.' : 'The change was not saved. Check the required fields and try again.' };
    revalidatePath('/admin/characters', 'layout');
    revalidatePath('/discover');
    return { message: form.get('operation') === 'deactivate' ? 'Character deactivated.' : 'Draft saved. The published profile has not changed.', id: result.data?.id??id };
  } catch { return { error: 'Cast services are unavailable. Please try again later.' }; }
}

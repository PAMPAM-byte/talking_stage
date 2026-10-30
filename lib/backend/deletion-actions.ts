"use server";
import { currentAccount } from './server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { observe, emit } from '@/lib/monitoring/events.mjs';

// Deletion is scheduled 30 days ahead (founder decision, 30 Oct). Signing in before then can restore it.
export async function scheduleAccountDeletion(form: FormData): Promise<{ error?: string; until?: string }> {
  if (form.get('confirmation') !== 'DELETE') return { error: 'Type DELETE to confirm.' };
  const password = form.get('password');
  if (typeof password !== 'string' || !password || password.length > 128) return { error: 'Enter your current password.' };
  try {
    const account = await currentAccount();
    if (!account?.user.email) return { error: 'Sign in again before deleting your account.' };
    // Derive identity from verified Auth; accept no user ID or email from the form.
    const verified = await observe('auth.sign-in', () => account.client.auth.signInWithPassword({ email: account.user.email!, password }));
    if (verified.error || verified.data.user?.id !== account.user.id) return { error: 'Your password could not be confirmed. Check it and try again.' };
    const scheduled = await observe('account.delete', () => account.client.rpc('request_account_deletion', { p_confirmation: 'DELETE' }));
    if (scheduled.error || typeof scheduled.data !== 'string') return { error: /operator_account/.test(scheduled.error?.message ?? '') ? 'Administrator accounts are deleted by support. Contact support for help.' : 'Your account was not deleted. Try again or contact support.' };
    // The schedule is committed. Signing out every device must not misreport it as failure.
    try {
      await account.client.auth.signOut({ scope: 'global' });
      const jar = await cookies();
      jar.getAll().filter(c => c.name.startsWith('sb-') || ['ts-adult','ts-recovery'].includes(c.name)).forEach(c => jar.delete(c.name));
      revalidatePath('/', 'layout');
    } catch { emit('account.cleanup', 'unexpected'); }
    return { until: scheduled.data };
  } catch { emit('account.delete', 'unexpected');return { error: 'We could not confirm deletion. Check your connection and sign in again to check your account.' }; }
}

export async function restoreAccount(): Promise<{ error?: string }> {
  try {
    const account = await currentAccount();
    if (!account) return { error: 'Sign in again to restore your account.' };
    const restored = await observe('account.restore', () => account.client.rpc('restore_account'));
    if (restored.error) return { error: /not_scheduled/.test(restored.error.message) ? 'This account can no longer be restored.' : 'Your account was not restored. Try again.' };
    revalidatePath('/', 'layout');
    return {};
  } catch { emit('account.restore', 'unexpected');return { error: 'Your account was not restored. Check your connection and try again.' }; }
}

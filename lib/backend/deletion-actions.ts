"use server";
import { currentAccount } from './server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { observe, emit } from '@/lib/monitoring/events.mjs';

export async function deleteOwnAccount(form: FormData): Promise<{ error?: string; deleted?: boolean }> {
  if (form.get('confirmation') !== 'DELETE') return { error: 'Type DELETE to confirm.' };
  const password = form.get('password');
  if (typeof password !== 'string' || !password || password.length > 128) return { error: 'Enter your current password.' };
  try {
    const account = await currentAccount();
    if (!account?.user.email) return { error: 'Sign in again before deleting your account.' };
    // Derive identity from verified Auth; accept no user ID or email from the form.
    const verified = await observe('auth.sign-in', () => account.client.auth.signInWithPassword({ email: account.user.email!, password }));
    if (verified.error || verified.data.user?.id !== account.user.id) return { error: 'Your password could not be confirmed. Check it and try again.' };
    const removed = await observe('account.delete', () => account.client.rpc('delete_own_account', { p_confirmation: 'DELETE' }));
    if (removed.error) return { error: /financial_records|operator_account/.test(removed.error.message) ? 'This account needs a support-assisted deletion. Contact support to review retained records.' : 'Your account was not deleted. Try again or contact support.' };
    // The database deletion is committed. Cookie cleanup must not misreport it as failure.
    try {
      await account.client.auth.signOut({ scope: 'local' });
      const jar = await cookies();
      jar.getAll().filter(c => c.name.startsWith('sb-') || ['ts-adult','ts-recovery'].includes(c.name)).forEach(c => jar.delete(c.name));
      revalidatePath('/', 'layout');
    } catch { emit('account.cleanup', 'unexpected'); }
    return { deleted: true };
  } catch { emit('account.delete', 'unexpected');return { error: 'We could not confirm deletion. Check your connection and sign in again to check your account.' }; }
}

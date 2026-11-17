'use server';
import { developmentTestAccount } from './development-test-account';
import { submitAccount, type AccountResult } from './account-actions';
import { backendClient, currentAccount } from './server';
import { trustedBackendClient } from './trusted-client';
import { emit } from '@/lib/monitoring/events.mjs';

// The hosted project requires the Cloudflare check on password sign-in, and the localhost button
// has no widget. Only when that check is what failed, this development-only path (already gated to
// NODE_ENV=development, TALKINGSTAGE_DEV_TEST_LOGIN=1, a loopback host and the saved tester account)
// signs in with a one-time recovery token from the service role. It sends no email and, unlike a
// magic link, never creates an account that does not exist.
async function signInWithOneTimeLink(email: string): Promise<AccountResult> {
  const link = await trustedBackendClient().auth.admin.generateLink({ type: 'recovery', email });
  const tokenHash = link.data?.properties?.hashed_token;
  const client = await backendClient();
  if (link.error || !tokenHash || !client) return { error: 'Test sign-in is unavailable. Use your email and password above.' };
  const { error } = await client.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
  if (error) return { error: 'Test sign-in is unavailable. Use your email and password above.' };
  const account = await currentAccount({ failOnUnavailable: true });
  if (!account) return { error: 'Test sign-in is unavailable. Use your email and password above.' };
  // A fresh test account finishes the normal 18+ and preferences steps, like any new member.
  if (!account.profile.adult_declared_at) return { destination: '/onboarding/age' };
  return { destination: account.profile.onboarding_complete ? '/discover' : '/onboarding/preferences' };
}

export async function signInDevelopmentAccount(): Promise<AccountResult> {
  try {
    const credentials = await developmentTestAccount(true);
    if (!credentials) return { error: 'Automatic test sign-in is unavailable.' };
    const existing = await currentAccount({ failOnUnavailable: true });
    if (existing) {
      if (!existing.profile.adult_declared_at) return { error: 'Sign out of your current account before using the test account.' };
      return { destination: existing.profile.onboarding_complete ? '/discover' : '/onboarding/preferences' };
    }
    const form = new FormData();
    form.set('email', credentials.email);
    form.set('password', credentials.password);
    const result = await submitAccount('sign-in', form);
    if (result.error?.startsWith('The security check')) return await signInWithOneTimeLink(credentials.email);
    return result;
  } catch {
    emit('auth.sign-in', 'unavailable');
    return { error: 'Test account services are temporarily unavailable. Try again, or use your email and password.' };
  }
}

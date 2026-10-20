'use server';
import { developmentTestAccount } from './development-test-account';
import { submitAccount, type AccountResult } from './account-actions';
import { currentAccount } from './server';
import { emit } from '@/lib/monitoring/events.mjs';

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
    return await submitAccount('sign-in', form);
  } catch {
    emit('auth.sign-in', 'unavailable');
    return { error: 'Test account services are temporarily unavailable. Try again, or use your email and password.' };
  }
}

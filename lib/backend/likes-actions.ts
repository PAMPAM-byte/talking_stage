"use server";
import { revalidatePath } from 'next/cache';
import { currentAccount } from './server';

// Likes and coins (14 Nov 2026). Since 19 Nov a character answers a like straight away: "match"
// means they liked you back; a character who doesn't is never announced and the like reads as sent.
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export async function likeAction(characterId: string): Promise<{ error?: string; status?: 'pending' | 'match' }> {
  if (!uuid.test(characterId)) return { error: 'This character is unavailable.' };
  const account = await currentAccount();
  if (!account) return { error: 'Your session ended. Sign in again.' };
  const result = await account.client.rpc('like_character', { p_character: characterId });
  if (result.error) {
    const message = result.error.message;
    if (message.includes('rate_limited')) return { error: 'You’ve sent a lot of likes today. Try again tomorrow.' };
    if (message.includes('not_found')) return { error: 'This character is unavailable.' };
    return { error: 'Your like wasn’t sent. Try again.' };
  }
  try { revalidatePath('/likes'); } catch { /* The page refreshes on its next visit. */ }
  return { status: result.data?.status === 'match' ? 'match' : 'pending' };
}

export async function markLikesSeenAction() {
  const account = await currentAccount();
  if (account) await account.client.rpc('mark_likes_seen');
}

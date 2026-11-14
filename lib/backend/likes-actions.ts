"use server";
import { revalidatePath } from 'next/cache';
import { currentAccount } from './server';

// Likes and coins (14 Nov 2026). The database decides when a like is sent and shows the
// answer from the next half hour; a character who doesn't like someone back is never announced.
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

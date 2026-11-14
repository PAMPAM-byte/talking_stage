"use server";
import { currentAccount } from './server';

// Like-back notifications (14 Nov 2026): this browser's push subscription and preferences.
export async function savePushSubscriptionAction(sub: { endpoint: string; p256dh: string; auth: string }) {
  if (typeof sub?.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || sub.endpoint.length > 1000) return { error: 'This browser can’t receive notifications.' };
  const account = await currentAccount(); if (!account) return { error: 'Your session ended. Sign in again.' };
  const result = await account.client.rpc('save_push_subscription', { p_endpoint: sub.endpoint, p_p256dh: String(sub.p256dh ?? ''), p_auth: String(sub.auth ?? '') });
  return result.error ? { error: 'Notifications couldn’t be turned on. Try again.' } : {};
}
export async function deletePushSubscriptionAction(endpoint: string) {
  const account = await currentAccount(); if (!account || typeof endpoint !== 'string') return {};
  await account.client.rpc('delete_push_subscription', { p_endpoint: endpoint });
  return {};
}
export async function pushPublicKeyAction(): Promise<string | null> {
  const account = await currentAccount(); if (!account) return null;
  const result = await account.client.rpc('push_public_key');
  return typeof result.data === 'string' ? result.data : null;
}
export async function saveShowNamesAction(showNames: boolean) {
  const account = await currentAccount(); if (!account) return { error: 'Your session ended. Sign in again.' };
  const result = await account.client.rpc('save_notification_preferences', { p_show_names: showNames === true });
  return result.error ? { error: 'Your choice wasn’t saved. Try again.' } : {};
}
export type LikesPulse = { newCount: number; latest: { characterId: string; name: string; at: string } | null };
export async function likesPulseAction(): Promise<LikesPulse | null> {
  const account = await currentAccount(); if (!account) return null;
  const result = await account.client.rpc('likes_pulse');
  return result.error ? null : result.data as LikesPulse;
}

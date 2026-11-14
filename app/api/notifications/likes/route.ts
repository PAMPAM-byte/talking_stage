import webpush from 'web-push';
import { trustedBackendClient } from '@/lib/backend/trusted-client';

// Like-back push notifications (14 Nov 2026). Called by pg_cron at :00 and :30 with the shared
// dispatch secret. Each like back is claimed once in the database before sending, so a retry or
// overlap never notifies twice. Expired browser subscriptions are forgotten.
export const maxDuration = 60;
type Claimed = { userId: string; characterName: string; showNames: boolean; subscriptions: { endpoint: string; p256dh: string; auth: string }[] | null };

export async function POST(request: Request) {
  const secret = request.headers.get('x-talkingstage-dispatch') ?? '';
  if (secret.length < 32 || secret.length > 200) return Response.json({ state: 'forbidden' }, { status: 403 });
  let client;
  // Failures name the step and the database error code only (no user data), so the scheduler's
  // saved responses explain an outage without anyone reading logs.
  try { client = trustedBackendClient(); } catch { return Response.json({ state: 'unavailable', step: 'service-client' }, { status: 503 }); }
  const config = await client.rpc('dispatch_config', { p_secret: secret });
  const keys = config.data as { publicKey: string; privateKey: string } | null;
  if (config.error || !keys?.privateKey) return Response.json({ state: 'forbidden' }, { status: 403 });
  const site = process.env.TALKINGSTAGE_SITE_URL ?? 'https://www.talkingstage.buzz';
  try { webpush.setVapidDetails(site, keys.publicKey, keys.privateKey); } catch { return Response.json({ state: 'unavailable', step: 'vapid' }, { status: 503 }); }

  const claimed = await client.rpc('claim_like_notifications', { p_limit: 500 });
  if (claimed.error) return Response.json({ state: 'unavailable', step: 'claim', code: claimed.error.code ?? null, reason: String(claimed.error.message ?? '').slice(0, 120) }, { status: 503 });
  let sent = 0, failed = 0, forgotten = 0;
  const jobs = (claimed.data as Claimed[]).flatMap(item => (item.subscriptions ?? []).map(sub => ({ item, sub })));
  // Small batches keep within the function time limit without opening hundreds of connections.
  for (let i = 0; i < jobs.length; i += 20) {
    await Promise.all(jobs.slice(i, i + 20).map(async ({ item, sub }) => {
      const payload = JSON.stringify({
        title: item.showNames ? `${item.characterName} liked you back 💌` : 'Someone liked you back 💌',
        body: item.showNames ? `Start your conversation with ${item.characterName} on TalkingStage.` : 'Open TalkingStage to see who.',
        url: '/likes', tag: 'like-back',
      });
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 6 * 3600, urgency: 'normal' });
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) { await client.rpc('forget_push_subscription', { p_endpoint: sub.endpoint }); forgotten++; }
        else failed++;
      }
    }));
  }
  return Response.json({ state: 'ok', people: (claimed.data as Claimed[]).length, sent, failed, forgotten }, { headers: { 'Cache-Control': 'no-store' } });
}

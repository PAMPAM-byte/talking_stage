import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { currentAccount } from '@/lib/backend/server';
import { processReply, processSummary } from '@/lib/backend/reply-worker';
import { emit } from '@/lib/monitoring/events.mjs';
import { isFirstPartyOrigin } from '@/lib/backend/request-origin.mjs';

export const maxDuration = 60;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type ReplyParams = { params: Promise<{ conversationId: string; messageId: string }> };
type ReplyStatus = { messageId: string; state: string; attempts: number };

function respond(state: string, status = 200, attempts?: number) {
  return Response.json({ state, ...(attempts === undefined ? {} : { attempts }) }, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(_request: Request, { params }: ReplyParams) {
  try {
    const { conversationId, messageId } = await params;
    if (!uuid.test(conversationId) || !uuid.test(messageId)) return respond('unavailable', 404);
    const account = await currentAccount();
    if (!account) return respond('unauthorized', 401);
    if (!account.profile.onboarding_complete || !account.profile.adult_declared_at) return respond('forbidden', 403);

    // The RPC checks ownership, adult access and deletion before exposing metadata.
    const result = await account.client.rpc('reply_status', { p_conversation: conversationId });
    if (result.error) return respond('unavailable', /not_found|forbidden/.test(result.error.message) ? 404 : 503);
    const status = (result.data as ReplyStatus[]).find(item => item.messageId === messageId);
    return status ? respond(status.state, 200, status.attempts) : respond('unavailable', 404);
  } catch { return respond('unavailable', 503); }
}

export async function POST(request: Request, { params }: ReplyParams) {
  try {
    // Cookie-authenticated mutations require the configured first-party origin.
    if (!isFirstPartyOrigin(request)) return respond('forbidden', 403);
    const { conversationId, messageId } = await params;
    if (!uuid.test(conversationId) || !uuid.test(messageId)) return respond('unavailable', 404);
    const account = await currentAccount();
    if (!account) return respond('unauthorized', 401);
    if (!account.profile.onboarding_complete || !account.profile.adult_declared_at) return respond('forbidden', 403);
    const owned = await account.client.from('messages').select('id')
      .eq('id', messageId).eq('conversation_id', conversationId).eq('role', 'user').single();
    if (owned.error) return respond('unavailable', 404);

    const state = await processReply(messageId, account.user.id, request.signal);
    if (state === 'completed') {
      try {
        after(async () => {
          try { await processSummary(messageId, account.user.id); }
          catch { emit('ai.summary', 'unexpected'); }
        });
      } catch { emit('ai.summary', 'unexpected'); }
    }
    // Cache/scheduling failures cannot turn a completed reply into a reported failure.
    try { revalidatePath('/messages', 'layout'); }
    catch { emit('ai.reply', 'unexpected'); }
    return respond(state);
  } catch {
    emit('ai.reply', 'unexpected');
    return respond('unavailable', 503);
  }
}

import { currentAccount } from '@/lib/backend/server';
import { conversationRevision } from '@/lib/backend/conversation-revision';

function respond(body: object, status = 200) {
    return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
    try {
        const { conversationId } = await params;
        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(conversationId)) return respond({}, 404);
        const account = await currentAccount();
        if (!account) return respond({}, 401);
        if (!account.profile.onboarding_complete || !account.profile.adult_declared_at) return respond({}, 403);
        // Existing RPCs independently enforce adult eligibility, ownership and deletion.
        const thread = await account.client.rpc('conversation_thread', { p_id: conversationId });
        if (thread.error) return respond({}, /not_found|forbidden/.test(thread.error.message) ? 404 : 503);
        const statuses = await account.client.rpc('reply_status', { p_conversation: conversationId });
        if (statuses.error) return respond({}, /not_found|forbidden/.test(statuses.error.message) ? 404 : 503);
        return respond({ revision: conversationRevision(thread.data, statuses.data) });
    } catch { return respond({}, 503); }
}

"use server";

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { currentAccount } from './server';
import { processReply, processSummary } from './reply-worker';
import { observe, emit } from '@/lib/monitoring/events.mjs';

export type ConversationResult = { error?: string; id?: string; message?: string; messageId?: string };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const lifecycleOperations = new Set(['archive', 'restore', 'reset', 'delete']);

function mutationFailure(failure: string): ConversationResult {
  if (failure.includes('chat_paused')) return { error: 'Chat is paused. Your saved history is available.' };
  if (failure.includes('archived')) return { error: 'Restore this conversation before sending.' };
  if (failure.includes('conflict') || failure.includes('thread_changed')) {
    return { error: 'This conversation changed. Reload before trying again.' };
  }
  if (failure.includes('rate_limited')) return { error: 'Too many changes. Wait a minute and try again.' };
  return { error: 'The change was not saved. Reload and try again.' };
}

function refreshMessages() {
  // A cache failure must never misreport an already committed mutation as failed.
  try { revalidatePath('/messages', 'layout'); }
  catch { emit('conversation.change', 'unexpected'); }
}

function scheduleReply(messageId: string, actorId: string) {
  try {
    after(async () => {
      try {
        const state = await processReply(messageId, actorId);
        if (state === 'completed') {
          try { await processSummary(messageId, actorId); }
          catch { emit('ai.summary', 'unexpected'); }
        }
      } catch { emit('ai.reply', 'unexpected'); }
    });
  } catch {
    // The saved job can be recovered through the authenticated POST endpoint.
    // Scheduling is best effort and cannot undo message delivery.
    emit('ai.reply', 'unexpected');
  }
}

export async function conversationAction(form: FormData): Promise<ConversationResult> {
  try {
    const account = await currentAccount();
    if (!account?.profile.onboarding_complete || !account.profile.adult_declared_at) {
      return { error: 'Sign in with an eligible account.' };
    }

    const id = String(form.get('id') ?? '');
    const operation = String(form.get('operation') ?? '');
    if (!uuid.test(id)) return { error: 'This conversation is unavailable.' };

    if (operation === 'skip') {
      const messageId = String(form.get('messageId') ?? '');
      if (!uuid.test(messageId)) return { error: 'This message is unavailable.' };
      const owned = await account.client.from('messages').select('id')
        .eq('id', messageId).eq('conversation_id', id).eq('role', 'user').single();
      if (owned.error) return { error: 'This message is unavailable.' };
      const cancelled = await observe('conversation.skip', () => account.client.rpc('cancel_reply', { p_message: messageId }));
      if (cancelled.error) return { error: 'The reply could not be skipped. Try again later.' };
      refreshMessages();
      return { message: 'Reply skipped. Your message is kept.' };
    }

    const result = await observe('conversation.change', async () => {
      switch (operation) {
        case 'start':
          return account.client.rpc('start_conversation', { p_character: id });
        case 'send':
          return account.client.rpc('save_user_message', {
            p_conversation: id,
            p_client_id: String(form.get('clientId') ?? ''),
            p_generation: Number(form.get('generation')),
            p_text: String(form.get('text') ?? ''),
          });
        default:
          if (!lifecycleOperations.has(operation)) return null;
          return account.client.rpc('manage_conversation', {
            p_id: id,
            p_version: Number(form.get('version')),
            p_operation: operation,
            p_clear_memories: form.get('clearMemories') === 'on',
          });
      }
    });

    if (!result) return { error: 'Choose an available action.' };
    if (result.error) return mutationFailure(result.error.message);

    const messageId = operation === 'send' ? result.data?.id as string | undefined : undefined;
    if (messageId) scheduleReply(messageId, account.user.id);
    refreshMessages();
    return {
      id: operation === 'start' ? result.data : id,
      messageId,
      message: operation === 'send' ? 'Message saved.' : 'Conversation updated.',
    };
  } catch {
    emit('conversation.change', 'unexpected');
    return { error: 'Conversation services are unavailable. Please try again later.' };
  }
}

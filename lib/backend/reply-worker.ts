import 'server-only';
import { supabaseConfig } from './config';
import { trustedBackendClient } from './trusted-client';
import { providerSettings } from '@/lib/ai/provider.mjs';
import { runReply } from '@/lib/ai/reply-pipeline.mjs';
import { runSummary } from '@/lib/ai/summary-pipeline.mjs';
import { observeAI, emit } from '@/lib/monitoring/events.mjs';
import { bachsSettings } from '@/lib/payments/bachs.mjs';

export function configuredReplyModel() {
  return providerSettings()?.model ?? null;
}

function replyConfiguration() {
  const settings = providerSettings();
  if (!settings || !supabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return { settings, client: trustedBackendClient() };
}

export async function processReply(messageId: string, actorId: string, signal?: AbortSignal, userTimeZone?: string | null): Promise<string> {
  const configuration = replyConfiguration();
  if (!configuration) {
    emit('ai.reply', 'disabled');
    return 'blocked_provider';
  }

  const { client, settings } = configuration;
  // Claim and completion RPCs independently enforce ownership, leases and budgets.
  return observeAI('ai.reply', () => runReply(client, messageId, actorId, settings, { signal, userTimeZone, paymentsEnabled: !!bachsSettings() }));
}

export async function processSummary(messageId: string, actorId: string): Promise<string> {
  const configuration = replyConfiguration();
  if (!configuration) {
    emit('ai.summary', 'disabled');
    return 'blocked_provider';
  }

  const { client, settings } = configuration;
  return observeAI('ai.summary', () => runSummary(client, messageId, actorId, settings));
}

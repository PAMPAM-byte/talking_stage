# Stage 10 conversations, AI and memory

9 October 2026 · In progress. Stage 9's approved cast is published locally.

## Conversation persistence batch

Migration `202610080006_conversations.sql` is applied locally after a pre-migration database snapshot. Every public operation requires server-derived Auth identity and completed adult onboarding. Direct table writes remain revoked; reads retain user RLS. The connected profile, message list and thread routes use real adapters in Supabase mode; development mocks remain available separately.

- `start_conversation`: serializes starts for the same actor/character and returns existing active or archived history. A new conversation requires current effective chat permission. An archived conversation must be restored explicitly; starting does not discard it.
- `list_conversations`: actor-only active/archived collection, twelve entries per page, latest activity first. It retains character identity for history even when the cast is no longer available for new chat.
- `conversation_thread`: actor-only metadata and forty messages, ordered by sequence, with a before-sequence cursor for older pages. It exposes effective permissions, not private character direction. Pauses and archives preserve read access.
- `save_user_message`: locks the owned conversation, checks generation, active state and effective chat permission, then saves one sequence/message for the stable client UUID. Repeating the same UUID/text returns the same saved record; changed text is rejected. Sending creates a separate private reply job. Input is bounded at the existing 2,000-character UI limit, pending final model limits.
- `manage_conversation`: optimistic-version archive/restore/reset/delete. Reset and delete remove message/job rows and increment generation so old retry requests cannot recreate removed input. They clear thread previews and relationship state. The conversation reference remains for separate payment-record foreign keys; deleted references are hidden through RLS. Actual ledger retention and account deletion remain Stage 12.

Reset/delete keep saved factual memories by default, with an unchecked explicit clear option. Preserved facts detach their removed message provenance before deletion. Optional clear marks this actor/character's facts deleted, removing them from current RLS reads. Other actors are unaffected. New memory preferences default disabled. Migration 007 connects explicit memory saving/context and invalidation; migration 009 adds separate extractive summaries and their invalidation.

Successful mutations have a separate technical thirty-per-minute actor limit, using the existing request-limit infrastructure; idempotent retries do not consume another reservation. This is a development abuse bound, not an approved AI spending budget. Errors roll back their counter change. Future provider budgets must enforce independent quotas before any generation.

## Saved input and unavailable replies

Private reply jobs are bound to the saved user message, conversation and generation, with a composite foreign key and cascade removal. With the current disabled configuration their state is `blocked_provider`. No scripted character introduction, synthetic reply, typing indicator or paid model call is presented as real AI. The screens explicitly say messages are saved and replies are unavailable. The configured integration supports explicit retry and skip, with leases and final eligibility checks.

The composer retains input and its stable UUID after a failed submission, clearing them only on success. Enter creates a newline; Ctrl/Command+Enter submits outside IME composition. Written text stays out of browser storage and application logs; durable private database storage is now the real service behavior. The reply pipeline is implemented but not enabled or verified against a live model. Cross-device draft recovery is unimplemented.

## Remaining Stage 10 work

The owner instructed integration to continue without API keys. A replaceable adapter, optional OpenAI Responses transport, server-only reply worker, lease/idempotency/cancellation controls, bounded private context, explicit per-character memory and atomic daily budget reservations are implemented. Migration `202610080007_reply_integration.sql` is applied locally after an Auth/public/private snapshot. No launch provider/model or approved spending limit is recorded; generation remains disabled with zero database spending allowances. See [AI setup and lifecycle](./stage-10-ai-setup.md).

Remaining work includes live provider/model and spending evaluation, summary quality/privacy evaluation, automatic-memory policy if introduced, refusal/mute/request eligibility and repeated-session integration across all eight characters. The implemented worker rechecks ownership, generation, deletion, archive and effective permissions before committing output; copied context cannot authorize writing into a reset/deleted thread. Deleted/disabled saved facts are excluded from subsequent context selection. Payment checkout remains Stage 11.

## Approved photo integration

Migration `202610080008_photo_replies.sql` is applied locally after a separate Auth/public/private snapshot. Claim records at most twelve same-character published, approved, attested and inspected gallery/chat candidates and their asset versions. The structured schema requires a nullable photo ID from that exact set. Commit rechecks the snapshot and current ownership, approval/version and global/per-character photo permissions, then persists text and optional photo atomically in sequence. Private legacy functions are no longer callable by client/service roles. Connected photo cards use the existing authenticated no-store image proxy, with full-size viewing and unavailable/reload states. No live photo replies have been generated.

Approved-photo actions are now implemented; live photo behavior remains part of [model evaluation](./stage-10-evaluation.md). Request-policy foundations and live model/billing/repeated-session checks remain open.

## Extractive summaries

Migrations 009–010 add private, conversation-scoped summary leases and conservative independent spending reservations. Summaries default disabled through `private.ai_configuration.summaries_enabled`; claims also require enabled per-character memory and a completed reply under the current configuration/context. At most forty eligible older text sources are supplied, leaving the latest twenty to recent history. The model selects up to eight exact excerpts of at most 240 characters each. Both adapter and database reject invented text, foreign/unadvertised source IDs and duplicate IDs; stored roles come from actual source messages. This is compressed conversation context, not automatically saved factual memory or inferred relationship state. Durable reservation identity enforces one attempt per completed reply even after a newer summary replaces the cache or privacy invalidation erases it.

Memory/profile/status/generation/deletion changes erase cached summaries and their leases. A source-sequence barrier prevents subsequent rebuilding from pre-change history. Direction/configuration changes exclude old summaries and reject in-flight completion. Reset/delete clear summary state regardless of the explicit factual-memory retention choice. Ordinary users and service roles cannot read summary tables directly; only service-role claim/finish RPCs expose narrowly scoped worker context. Daily reservations retain consumed allowance even after failure or deleted context.

The reply route schedules best-effort processing after successful delivery using Next.js `after`, with a sixty-second route duration and a separate twenty-second provider timeout. A summary failure never changes delivered reply state. There is no durable queue, automatic retry or historical backlog processing; deployment duration/support and live usefulness remain acceptance items. The offline migration-chain suite verifies mechanics; no live summary has been generated.

Evaluate Nigerian English/Pidgin, distinct voices and prompt injection across every approved character before Stage 10 closes. The provider-unavailable persistence batch does not prove real AI quality, model safety, summary privacy or generation retry correctness.

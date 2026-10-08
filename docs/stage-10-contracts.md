# Stage 10 conversations, AI and memory

8 October 2026 · In progress. Stage 9's approved cast is published locally.

## Conversation persistence batch

Migration `202610080006_conversations.sql` is applied locally after a pre-migration database snapshot. Every public operation requires server-derived Auth identity and completed adult onboarding. Direct table writes remain revoked; reads retain user RLS. The connected profile, message list and thread routes use real adapters in Supabase mode; development mocks remain available separately.

- `start_conversation`: serializes starts for the same actor/character and returns existing active or archived history. A new conversation requires current effective chat permission. An archived conversation must be restored explicitly; starting does not discard it.
- `list_conversations`: actor-only active/archived collection, twelve entries per page, latest activity first. It retains character identity for history even when the cast is no longer available for new chat.
- `conversation_thread`: actor-only metadata and forty messages, ordered by sequence, with a before-sequence cursor for older pages. It exposes effective permissions, not private character direction. Pauses and archives preserve read access.
- `save_user_message`: locks the owned conversation, checks generation, active state and effective chat permission, then saves one sequence/message for the stable client UUID. Repeating the same UUID/text returns the same saved record; changed text is rejected. Sending creates a separate private reply job. Input is bounded at the existing 2,000-character UI limit, pending final model limits.
- `manage_conversation`: optimistic-version archive/restore/reset/delete. Reset and delete remove message/job rows and increment generation so old retry requests cannot recreate removed input. They clear thread previews and relationship state. The conversation reference remains for separate payment-record foreign keys; deleted references are hidden through RLS. Actual ledger retention and account deletion remain Stage 12.

Reset/delete keep saved factual memories by default, with an unchecked explicit clear option. Preserved facts detach their removed message provenance before deletion. Optional clear marks this actor/character's facts deleted, removing them from current RLS reads. Other actors are unaffected. New memory preferences default disabled. Migration 007 connects explicit memory saving/context and invalidation; summaries remain unimplemented.

Successful mutations have a separate technical thirty-per-minute actor limit, using the existing request-limit infrastructure; idempotent retries do not consume another reservation. This is a development abuse bound, not an approved AI spending budget. Errors roll back their counter change. Future provider budgets must enforce independent quotas before any generation.

## Saved input and unavailable replies

Private reply jobs are bound to the saved user message, conversation and generation, with a composite foreign key and cascade removal. With the current disabled configuration their state is `blocked_provider`. No scripted character introduction, synthetic reply, typing indicator or paid model call is presented as real AI. The screens explicitly say messages are saved and replies are unavailable. The configured integration supports explicit retry and skip, with leases and final eligibility checks.

The composer retains input and its stable UUID after a failed submission, clearing them only on success. Enter creates a newline; Ctrl/Command+Enter submits outside IME composition. Written text stays out of browser storage and application logs; durable private database storage is now the real service behavior. The reply pipeline is implemented but not enabled or verified against a live model. Cross-device draft recovery is unimplemented.

## Remaining Stage 10 work

The owner instructed integration to continue without API keys. A replaceable adapter, optional OpenAI Responses transport, server-only reply worker, lease/idempotency/cancellation controls, bounded private context, explicit per-character memory and atomic daily budget reservations are implemented. Migration `202610080007_reply_integration.sql` is applied locally after an Auth/public/private snapshot. No launch provider/model or approved spending limit is recorded; generation remains disabled with zero database spending allowances. See [AI setup and lifecycle](./stage-10-ai-setup.md).

Remaining work includes live provider/model and spending evaluation, summaries and their invalidation, automatic-memory policy if introduced, refusal/mute/request eligibility and repeated-session integration across all eight characters. The implemented worker rechecks ownership, generation, deletion, archive and effective permissions before committing output; copied context cannot authorize writing into a reset/deleted thread. Deleted/disabled saved facts are excluded from subsequent context selection. There are no summaries yet. Payment checkout remains Stage 11.

## Approved photo integration

Migration `202610080008_photo_replies.sql` is applied locally after a separate Auth/public/private snapshot. Claim records at most twelve same-character published, approved, attested and inspected gallery/chat candidates and their asset versions. The structured schema requires a nullable photo ID from that exact set. Commit rechecks the snapshot and current ownership, approval/version and global/per-character photo permissions, then persists text and optional photo atomically in sequence. Private legacy functions are no longer callable by client/service roles. Connected photo cards use the existing authenticated no-store image proxy, with full-size viewing and unavailable/reload states. No live photo replies have been generated.

Approved-photo actions are now implemented; live photo behavior remains part of [model evaluation](./stage-10-evaluation.md). Summaries, request-policy foundations and live model/billing/repeated-session checks remain open.

Evaluate Nigerian English/Pidgin, distinct voices and prompt injection across every approved character before Stage 10 closes. The provider-unavailable persistence batch does not prove real AI quality, model safety, summary privacy or generation retry correctness.

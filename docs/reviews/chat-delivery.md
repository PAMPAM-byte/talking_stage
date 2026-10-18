# Chat delivery and independent replies · 15 October 2026

18 October update: [automatic conversation sync](./conversation-sync.md) supersedes the bounded observation/manual-reload behavior below. Active observation slows after sixty seconds and continues; a separate revision observer catches background messages and reconnects automatically.

The founder requested immediate outgoing bubbles, WhatsApp-style delivery marks, and a separate typing state for AI replies. The design keeps TalkingStage’s white, soft rose `#FBF2F4`, red `#CF2445`, deep red `#BD2040`, ink `#242126`, and muted `#75656C`. Manrope carries messages and utility text; the existing restrained serif introduction remains. The signature interaction is the transition from a quiet pending clock to a saved tick while a small three-dot incoming bubble starts independently.

## Interaction and implementation

- Sending immediately clears the composer into an optimistic outgoing bubble. Text entry stays available while saving; the send action prevents duplicate submissions until acknowledgement. AI generation never locks the composer.
- A clock means sending, one tick means saved without a reply starting, and two ticks mean ?Seen?. Updated 18 October: double ticks now appear in the same render as the typing indicator, before the reply arrives. The fictional character?s reply flow determines this state. Stopping, interrupted cancellation, polling failure, or reply failure retain the receipt during the session. Reopened messages with generating/completed jobs or recorded attempts also show two ticks. Labels and tooltips match the receipt.
- Failed or ambiguous delivery retains the text in its bubble. Retry uses the original client message ID, relying on the database’s existing idempotency constraint. Server client-ID reconciliation also suppresses duplicates when a server render arrives before the action result.
- The existing authenticated send action commits the message and durable reply job, then schedules generation with Next.js `after`. AI failure cannot reverse successful delivery. All existing ownership, adult-access, capability, generation, budget, lease and commit checks remain in force.
- A private, uncached GET on the existing reply endpoint returns only an owner-authorized job state. Bounded polling follows generation, updates history when it ends, and can recover an unstarted job through the existing authenticated POST. Failed replies remain explicit retry/skip actions; provider failures do not automatically consume additional paid attempts.
- Typing resumes for a generating job on reload. Stopping cancels the persisted job before removing the indicator; a late provider response cannot pass the existing commit checks. Leaving the page cleans up polling; the server’s after-response task is independent of that browser request.
- Outgoing sends move into view. Incoming additions preserve the existing near-bottom scroll behavior. Reduced motion makes the dots and bubble entry static. The conversation log and concise polite status region support assistive technology.

## Research

[React’s optimistic messaging example](https://react.dev/reference/react/useOptimistic) establishes immediate local feedback followed by authoritative reconciliation. This implementation keeps an explicit outbox so failed messages remain available for retry after an action finishes.

[WAI-ARIA status and log semantics](https://www.w3.org/TR/wai-aria-1.3/) inform the existing message log and the polite reply-progress announcement. Decorative moving dots are hidden from assistive technology.

The installed Next.js `after` guide (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`) confirms after-response execution in Server Functions and its hosting-duration boundary.

## Operational limits

The conversation page permits a 60-second execution window; provider calls retain their existing timeout. Hosting must support Next.js after-response execution (`waitUntil` on compatible serverless adapters). This is not a separate continuously running queue worker: if the process stops, durable jobs remain recoverable through the client’s status/retry flow. A hosting outage cannot guarantee unattended generation. No new provider, unbounded retries, or spending limits were introduced. Unsaved text remains in component memory, consistent with the existing privacy scope; it is not written to browser storage.

The development-only browser fixture uses the actual delivery components with a synthetic save function and intercepted job metadata. It is available only in development with `TALKINGSTAGE_PREVIEW_TEST=1`; it makes no paid API requests. It tests the interaction rather than hosted AI generation.

## Validation

18 October receipt update: TypeScript, scoped ESLint, and all 11 delivery browser checks passed. One receipt-isolation check timed out during the initial run while the synthetic save was still pending; it passed unchanged on a targeted rerun. Coverage includes immediate double ticks during typing, a reopened generating job, separate receipts for separate messages, single ticks without replies, delivery retry, reply failure, cancellation, drafts, responsive widths and reduced motion. These checks use intercepted metadata and make no paid provider requests. Current test snapshots are disposable artifacts under `test-results/`; the images below remain the original 15 October review.

TypeScript and scoped ESLint completed without errors or warnings. Eleven targeted browser checks passed: four delivery-state checks plus the existing responsive chat check and six chat journeys. Checks include 320–1440px widths, compact height, reduced motion, pending/saved feedback, idempotent delivery retry, independent AI failure, stopping while preserving a draft, photos, archive/restore/delete, background unread state, and interrupted-reply recovery. The existing reply-integration database suite also passed offline. Browser snapshots are `chat-delivery-390.png` and `chat-delivery-1440.png` in this directory. Windows test-server teardown stalled after all test results were reported; the owned test processes were stopped manually.

The broader journeys exposed a stale mock gallery-ID assumption. Preview chat now resolves each character’s current gallery ID, keeping fixture photo availability, ownership and reload behavior aligned with the public cast. Hosted asset or access policies were not changed. The new after-response flow has not been verified against a deployed hosting adapter or with a paid live reply during this update.

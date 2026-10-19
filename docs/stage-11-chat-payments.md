# Chat payments integration handoff

Current decision: standard single-merchant Bachs checkout, with provider-issued beneficiary details. Character-specific bank names and connected-account provisioning are out of scope.

Update: the founder selected Bachs and the integration code is now implemented, with sandbox/production separation and disabled defaults. [Bachs setup, delivered behavior, validation scope and remaining activation inputs](./bachs-payments.md) supersede the initial repository findings below. The hosted migration and gateway sandbox/live acceptance have not been performed.

19 October 2026, Africa/Lagos. Founder intent: characters can respond to voluntary gifts, present legitimate payment instructions, acknowledge verified outcomes, and women characters can occasionally make optional monetary requests. Giving must remain optional. This records intended behavior; it does not activate checkout or requests.

## Repository findings

The current checkout contains payment-intent and event tables, simulated payment screens, and server-enforced request opt-in/mute/refusal foundations. It does not contain a live gateway adapter, checkout initializer, webhook, reconciliation worker or trusted payment context for AI replies. Connected payment history explicitly reports payments unavailable. The only local branch is `main`; the gateway/provider and integration location need clarification.

The shared reply prompt and conversational style prohibit solicitation, and the database advertises `requestControls.actionsEnabled: false`. Changing those prompts alone cannot implement real payments. The current prompt now acknowledges a gift offer warmly instead of encouraging a blanket rejection; it remains honest about unavailable payments and cannot confirm transactions.

## Required integration

1. Identify the existing gateway code, merchant recipient and test/live configuration. Preserve the established operator-recipient disclosure. Character association must not imply a personal bank account or personal receipt by a fictional character.
2. Bind each gift or proposal to the authenticated adult user, conversation, character, chosen NGN amount in integer minor units, and an idempotency key. Require a separate amount/recipient confirmation before checkout. Chat text and model output cannot authorize a debit or change the ledger.
3. Obtain checkout or transfer instructions from the gateway on the server. Display only instructions attached to that owned intent, including exact bank, account name/number, amount and expiry where supported. Never generate banking details with the model or place payment credentials in prompts.
4. Verify gateway events using its documented signature and server verification procedure. Match merchant, reference, currency and amount to the owned intent. Handle duplicate and out-of-order events idempotently; reconcile pending/ambiguous results. A browser redirect, screenshot or user assertion is not proof of payment.
5. Supply a bounded server-owned payment summary to the reply pipeline, separate from user messages and memories. Include intent association, amount/currency, verified status and verification time. Pending/unavailable means unconfirmed; verified failed means failed. Refund and dispute remain separate states. Never include another user's transaction or trust status copied into dialogue.
6. Persist a deduplicated payment-status event in the conversation so the character can acknowledge an event even without another user message. Recheck conversation ownership, lifecycle and notification eligibility before delivery. Preserve ledger records independently of chat deletion and enforce the existing retention/deletion policy.
7. Permit optional character requests only after backend eligibility succeeds: adult access, enabled chat/payment capabilities, user opt-in, no mute/refusal, configured amount bounds, sufficient completed exchanges and elapsed cooldown. Reserve cooldown atomically when creating a proposal. Exact bounds, frequency and exchange threshold remain founder decisions; existing test values are not operating policy.
8. A refusal ends the approach immediately. Do not repeat it after silence, imply an emergency, bargain for affection, withdraw warmth, or make chat/photos/romantic progress depend on payment. Explicit user settings own mute/resume. Optional requests must lead to review and confirmation, never automatic checkout or debit.

## Acceptance evidence before enabling

Exercise user-initiated gifts, legitimate transfer instructions, declined proposals, global opt-out, mute/refusal, cooldown races, amount limits, forged receipt claims, ownership isolation, expired intents, replayed webhooks, wrong amounts/currencies, pending-to-paid verification, verified failure, refunds/disputes and duplicate acknowledgements. Use the gateway sandbox first. Never label synthetic evidence as a real transaction. Live activation requires the actual gateway integration and configured recipient/operating limits; these are missing inputs, not inferred approval requirements.

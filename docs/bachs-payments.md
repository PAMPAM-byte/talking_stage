# Bachs gifts and character payment context

19 October 2026. Implemented integration code; not configured or activated against Bachs or the hosted database. No real or sandbox gateway transaction has been performed. The founder selected Bachs. The approved inclusive gift range is NGN 2,000 to 1,000,000. Registered merchant identity and optional-request frequency/exchange threshold remain inputs.

## User experience

The conversation menu offers **Send a voluntary gift**. `/gifts/[conversationId]` asks for an NGN amount, then shows a separate confirmation with **Gift for Amara** (or the current character) and **Received by [registered merchant]**. Confirmation creates an owned intent and hosted Bachs checkout. A lost response retries the same intent and gateway idempotency key. The current single-merchant checkout does not implement per-character bank names; the founder's account-name requirement below changes the intended account architecture.

### Founder amendment: character account names

The founder requests the actual transfer account name in the format **Fikayo TalkingStage**, varying with the character. This is an account-name requirement, not merely a gift label. Bachs documents that a connected account's `display_name` becomes the name senders see, and that several connected accounts can use the same verified representative/BVN. The earlier blanket statement that account names cannot vary was too broad.

To meet this requirement, obtain an active Connect capability for TalkingStage's registered business and establish a provider-approved, operator-owned connected-account arrangement for character branding. Use `display_name: "[character name] TalkingStage"`; keep the representative and legal operator real, with no fictional identity or invented verification data. Persist the character-to-connected-account mapping separately for sandbox and production. Show the actual returned `account_name` with the bank/account number, rather than asserting a locally composed name is already registered. Do not silently substitute the single merchant's bank name when this requirement is enabled.

This connected-account provision, verification and payment routing are not implemented in the current single-merchant adapter. Connected-account checkout requires account-scoped API calls and corresponding webhook/resource ownership checks. Permanent virtual accounts also change attribution: there is no checkout reference on a permanent deposit, so a shared character account cannot by itself identify which chatting user paid. Do not auto-credit a user based on a screenshot, claimed reference or sender-name coincidence. Checkout-specific transfer accounts retain attribution, but their exact bank-name presentation must be verified against Bachs sandbox/live behavior before claiming the requested name appears there.

No connected accounts have been created. The name format is founder-approved; Connect capability, Bachs acceptance of this operator-owned branding arrangement, account provisioning and observed bank-name behavior remain pending. [Provider account-name and representative documentation](https://docs.bachs.io/guides/virtual-accounts/overview); [Connect requirements](https://docs.bachs.io/connect/overview).

Bachs shows bank-transfer instructions for the chosen checkout. The model does not invent account numbers or share a permanent business account that cannot be reliably attributed to a user. Characters can guide a willing user to the gift action and respond to the latest five owned ledger records supplied on a reply claim. They distinguish paid, pending, failed, refunded and review states and explicitly distinguish sandbox results from real money. Receipts appear in chat as system payment cards; natural character acknowledgement uses the ledger context on the next user-triggered AI reply. This does not create an unattended AI acknowledgement worker.

The payment-detail screen offers an owner-only status check. Settings show the latest 50 owned intents. Administrators have a separate role-checked latest-50 ledger, event review and reconciliation action. Neither users nor administrators can manually mark a payment paid. The existing preview screens remain explicitly simulated in mock mode.

## Setup inputs and sequence

1. Supply the registered merchant name and a public HTTPS application origin. The founder-approved NGN gift range is 2,000 to 1,000,000, inclusive. Bachs rejects localhost/private success URLs even in sandbox. A public development deployment or public tunnel origin is needed for checkout callbacks. Confirm the product purpose on the merchant account; technical support for AI products is not merchant-specific approval.
2. Put server-only settings in `.env.local` (or deployment secrets), never in chat or a public `NEXT_PUBLIC_` variable:

   ```dotenv
   TALKINGSTAGE_PAYMENTS_ENABLED=false
   BACHS_ENVIRONMENT=sandbox
   BACHS_API_KEY=
   BACHS_ORGANIZATION_ID=
   BACHS_WEBHOOK_SECRET=
   TALKINGSTAGE_SITE_URL=https://your-public-development-origin.example
   ```

   Use a sandbox API key and its matching organization. API permissions must allow reading the account, creating/reading checkout sessions and reading payments. The signing secret belongs to the webhook destination and is separate from the API key. Creation checks `/v1/accounts/me` against the configured organization before creating checkout.
3. Apply `supabase/migrations/202610190017_bachs_payments.sql` and `supabase/migrations/202610190018_approved_gift_limits.sql` through the existing migration/backup workflow. It defaults disabled and grants no client writes to the ledger. It has only been applied in disposable offline test databases during this work.
4. Configure the private singleton using the database owner's SQL editor. Replace placeholders with the actual sandbox organization, registered merchant name and approved integer minor-unit limits. One naira equals 100 minor units. The limits below are founder-approved:

   ```sql
   begin;
   update private.bachs_configuration
   set enabled = false,
       environment = 'sandbox',
       organization_id = 'acct_REPLACE',
       recipient_name = 'REPLACE WITH REGISTERED MERCHANT',
       minimum_amount_minor = 200000,
       maximum_amount_minor = 100000000
   where singleton;
   commit;
   ```

   Migration 018 sets the approved gift and request amount bounds without enabling either feature. Keep the runtime environment, API-key prefix, organization and database configuration aligned. Production requires the production organization/key, explicit production environment and a separately registered webhook destination.
5. Register `https://your-origin/api/webhooks/bachs` as the Bachs webhook destination. Subscribe to collection and checkout lifecycle events; verify the exact sandbox payloads for refund/dispute events as part of acceptance. Set the destination signing secret privately. Set both the runtime flag and database flag true only when these values are ready.
6. Exercise the actual sandbox: create a gift, choose bank transfer, inspect the generated instructions, complete payment, verify the webhook, reload the owned receipt, then ask the character about the gift. Exercise pending/failure, duplicate deliveries and cancellation. Offline fixtures are not evidence of a gateway transaction.

## Optional requests

Requests are independently disabled by default through `private.monetary_request_policy`. A woman character can return a nullable `requestAmountMinor` only when the server advertises eligibility and the user opted in, has not muted/refused, has enough completed exchanges, and is outside the cooldown. The model can always choose null. The database rechecks policy, current capabilities, amount bounds, adult/owner access and the existing reply lease/context before committing a proposal and reserving its cooldown atomically. Gift and request amount ranges are intersected.

Gift and optional-request amounts share the approved NGN 2,000 to 1,000,000 range. `minimum_completed_exchanges` and `cooldown_seconds` still need founder values; requests remain disabled. Other synthetic test values are not defaults. The request card offers **Review gift** and **No thanks**. Reviewing does not debit or initialize a charge. The gift form starts blank so the user can choose an amount. No thanks saves refusal. A narrow, contextual plain-text refusal such as “no thanks” immediately after an open proposal also persists refusal; this is not a general natural-language refusal classifier. Other discomfort is handled by model instructions and the explicit stop/mute controls. Only an explicit settings action can resume requests. Affection, messages and photos never depend on giving.

## Verification and operational boundaries

The webhook verifies exact raw bytes, HMAC-SHA256, the five-minute timestamp window, V2 multi-signature rotation (legacy headers also supported), and the configured organization before any effect. Malformed V2 never downgrades to legacy. Processing retrieves the current checkout and payment from Bachs, matches the bound IDs/reference/NGN amount, and accepts paid only for exact full payment. Partial/over/under payments and partial refunds need review. Full verified refunds are distinct from paid. Database events and receipts are deduplicated; stale failures do not undo paid/refunded results. Gateway errors leave the last known state intact. Raw gateway responses, credentials and payer banking details are excluded from model context and application errors.

Recognized lifecycle deliveries are handled when they contain a checkout ID. Refund/dispute payload variants without that ID are not yet automatically correlated; use owner/admin reconciliation to retrieve current payment state. A signed dispute notification with a matching checkout moves the record to review, not a claim of a verified dispute outcome. Review is sticky until a full refund is verified; a manual dispute-resolution workflow remains future work. There is no scheduled reconciliation worker, unattended receipt-generation AI worker or complete refund/dispute administration in this slice. Do not close Stage 11 or enable public payments based on these offline results alone.

Payment verification remains available during a new-payment pause. Configuration changes invalidate copied AI context; ledger updates also invalidate it so a reply cannot commit using superseded payment facts. Deleting a conversation does not erase its financial ledger, and verified events do not recreate deleted chats. Existing account deletion with financial records remains gated by the established retention policy.

## Validation recorded

The 25-suite offline core run passed. Subsequent focused payment checks passed after review-state and administrator-isolation refinements. Three local browser checks passed for amount bounds, separate character/merchant confirmation, unchanged idempotency on uncertain retry, and responsive 320–1440px presentation. TypeScript and scoped ESLint passed. Tests use synthetic data, injected transports and disposable PGlite databases; none contacts Bachs or spends money. The mobile review screenshot is a disposable `test-results/gift-review-390.png` artifact.

## Official references

- [Checkout sessions and NGN bank-transfer checkout](https://docs.bachs.io/guides/checkout/checkout-sessions)
- [Authentication and sandbox/live key separation](https://docs.bachs.io/authentication)
- [Webhook signatures and rotation](https://docs.bachs.io/guides/webhooks/overview)
- [Payment object and lifecycle](https://docs.bachs.io/api-reference/payments/object)
- [Virtual accounts versus checkout-specific transfers](https://docs.bachs.io/guides/virtual-accounts/overview)
- [Supported businesses](https://docs.bachs.io/for-you/supported-businesses)

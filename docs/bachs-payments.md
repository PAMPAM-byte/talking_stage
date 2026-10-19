# Bachs gifts and character payment context

19 October 2026. Implemented integration code; not configured or activated against Bachs or the hosted database. No real or sandbox gateway transaction has been performed. The founder selected Bachs. The approved inclusive gift range is NGN 2,000 to 1,000,000. Registered merchant identity and optional-request frequency/exchange threshold remain inputs.

## User experience

The conversation menu offers **Send a voluntary gift**. `/gifts/[conversationId]` asks for an NGN amount, then shows a separate confirmation with **Gift for Amara** (or the current character) and **Received by [registered merchant]**. Confirmation creates an owned intent and hosted Bachs checkout. A lost response retries the same intent and gateway idempotency key. The standard merchant checkout uses the beneficiary details supplied by Bachs.

### Standard merchant checkout

The founder selected the normal single-merchant Bachs integration. Payments go to the configured registered merchant. Bank and account-holder details come directly from Bachs checkout. Character association is only gift context; it does not change the bank beneficiary. There is no per-character account provisioning, custom bank-name setting, split payment or Bachs Connect dependency. This replaces the earlier character-account-name proposal.

Bachs shows bank-transfer instructions for the chosen checkout. The model does not invent account numbers or share a permanent business account that cannot be reliably attributed to a user. Characters can guide a willing user to the gift action and respond to the latest five owned ledger records supplied on a reply claim. They distinguish paid, pending, failed, refunded and review states and explicitly distinguish sandbox results from real money. Receipts appear in chat as system payment cards; natural character acknowledgement uses the ledger context on the next user-triggered AI reply. This does not create an unattended AI acknowledgement worker.

The payment-detail screen offers an owner-only status check. Settings show the latest 50 owned intents. Administrators have a separate role-checked latest-50 ledger, event review and reconciliation action. Neither users nor administrators can manually mark a payment paid. The existing preview screens remain explicitly simulated in mock mode.

## Setup inputs and sequence

### Local webhook tunnel

The ngrok Windows agent is installed privately in `.local-services/ngrok/`. Its token stays in `NGROK_AUTHTOKEN` in `.env.local`; it is passed through the agent environment, not command-line arguments. A loopback relay on `127.0.0.1:3301` forwards only `POST /api/webhooks/bachs` to the app on port 3000. Other paths return 404 and other methods return 405. The relay preserves raw signed bytes and Bachs signature headers, removes cookies/authorization, bounds the body and returns generic errors. Agent request inspection is disabled. The current public webhook address is saved in the private `BACHS_WEBHOOK_URL` variable and `.local-services/ngrok/tunnel.json`.

Run `npm run webhook:relay` if restarting the relay. Start the local ngrok agent against `http://127.0.0.1:3301` with inspection disabled, using the saved token through its environment. The currently running relay and agent PID files are in the same private directory. Keep the app, relay and tunnel running during sandbox delivery. A changed ngrok domain requires updating the Bachs destination. Do not set `TALKINGSTAGE_SITE_URL` to this restricted webhook origin. In local sandbox development, checkout opens separately without callback URLs and the user returns to the local receipt. Production still requires a public HTTPS application origin for callback pages.

The public endpoint has been checked: app pages return 404, webhook GET returns 405, and webhook POST reaches the handler. The handler returns 503 while payment setup is disabled/incomplete; this proves tunnel reachability, not successful event processing. Register the destination and save its signing secret privately before enabling sandbox processing. The installed Next.js cache-components configuration rejects an explicit route `runtime` setting; that setting was removed and actual route compilation/reachability was checked.

### Merchant and gateway settings

1. Supply the registered merchant name. Use a public HTTPS application origin for production callbacks. Local sandbox development can keep localhost: callbacks are omitted and checkout opens in a new tab. The founder-approved NGN gift range is 2,000 to 1,000,000, inclusive. Bachs rejects localhost/private success URLs even in sandbox. A public development deployment or public tunnel origin is needed for checkout callbacks. Confirm the product purpose on the merchant account; technical support for AI products is not merchant-specific approval.
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
3. Apply `supabase/migrations/202610190017_bachs_payments.sql` and `supabase/migrations/202610190018_approved_gift_limits.sql` through the existing migration/backup workflow. It defaults disabled and grants no client writes to the ledger. These migrations were applied to the linked hosted project for sandbox testing on 20 October 2026; see the activation record below.
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

User-initiated gift links (20 October): when gifts are available, the reply schema includes a boolean `giftLink`. Character direction asks for a short, warm acknowledgement and this flag when the latest user message offers money or asks for payment details. The server converts the flag into a persisted presentation token; connected character messages render it as a keyboard-accessible link to the current conversation's owned gift form. Model-authored destinations are never used. User messages cannot render this action, and runtime-disabled payments hide it. This does not depend on optional-request opt-in, create checkout or charge the user. Amount selection and recipient confirmation still precede gateway creation. Existing replies are not rewritten. Injected provider tests cover link/no-link output, disabled gates, request-policy independence and malformed values; actual model phrasing remains subject to live acceptance.

Requests are independently disabled by default through `private.monetary_request_policy`. A woman character can return a nullable `requestAmountMinor` only when the server advertises eligibility and the user opted in, has not muted/refused, has enough completed exchanges, and is outside the cooldown. The model can always choose null. The database rechecks policy, current capabilities, amount bounds, adult/owner access and the existing reply lease/context before committing a proposal and reserving its cooldown atomically. Gift and request amount ranges are intersected.

Gift and optional-request amounts share the approved NGN 2,000 to 1,000,000 range. `minimum_completed_exchanges` and `cooldown_seconds` still need founder values; requests remain disabled. Other synthetic test values are not defaults. The request card offers **Review gift** and **No thanks**. Reviewing does not debit or initialize a charge. The gift form starts blank so the user can choose an amount. No thanks saves refusal. A narrow, contextual plain-text refusal such as “no thanks” immediately after an open proposal also persists refusal; this is not a general natural-language refusal classifier. Other discomfort is handled by model instructions and the explicit stop/mute controls. Only an explicit settings action can resume requests. Affection, messages and photos never depend on giving.

## Verification and operational boundaries

The webhook verifies exact raw bytes, HMAC-SHA256, the five-minute timestamp window, V2 multi-signature rotation (legacy headers also supported), and the configured organization before any effect. Malformed V2 never downgrades to legacy. Processing retrieves the current checkout and payment from Bachs, matches the bound IDs/reference/NGN amount, and accepts paid only for exact full payment. Partial/over/under payments and partial refunds need review. Full verified refunds are distinct from paid. Database events and receipts are deduplicated; stale failures do not undo paid/refunded results. Gateway errors leave the last known state intact. Raw gateway responses, credentials and payer banking details are excluded from model context and application errors.

Recognized lifecycle deliveries are handled when they contain a checkout ID. Refund/dispute payload variants without that ID are not yet automatically correlated; use owner/admin reconciliation to retrieve current payment state. A signed dispute notification with a matching checkout moves the record to review, not a claim of a verified dispute outcome. Review is sticky until a full refund is verified; a manual dispute-resolution workflow remains future work. There is no scheduled reconciliation worker, unattended receipt-generation AI worker or complete refund/dispute administration in this slice. Do not close Stage 11 or enable public payments based on these offline results alone.

Payment verification remains available during a new-payment pause. Configuration changes invalidate copied AI context; ledger updates also invalidate it so a reply cannot commit using superseded payment facts. Deleting a conversation does not erase its financial ledger, and verified events do not recreate deleted chats. Existing account deletion with financial records remains gated by the established retention policy.

## Validation recorded

### Gift route regression — 20 October 2026

The shared connected account wrapper had no Payments branch, so both gift and receipt routes discarded their children and displayed an old rollout placeholder. Payments now renders its connected content inside the app shell after the existing identity, adult declaration and onboarding checks. A VM regression test exercises this actual wrapper and all three denial paths. The gift page uses a bounded white card, separate amount/review steps and stacked mobile actions; ownership failure offers a return to Messages. A signed-in browser reached the real gift form, reviewed NGN 2,000, enforced the minimum, checked mobile fit and denied an inaccessible receipt without creating checkout. Bachs adapter, disposable database, action-boundary, wrapper, TypeScript and scoped ESLint checks passed.

The follow-up browser run verified the final stacked mobile actions and confirmation-button clearance above navigation, but timed out navigating to the inaccessible receipt afterwards. The earlier receipt denial check passed; uninterrupted navigation under local development load is not established by that follow-up. No checkout was created in either check.

### Sandbox activation — 20 October 2026

The linked hosted database has migrations 017 and 018, with sandbox gifts enabled for the verified registered merchant, PamPamé, and inclusive NGN 2,000–1,000,000 limits. The local runtime payment flag is enabled. Optional character requests remain disabled. The application origin remains localhost; sandbox checkout opens in a separate tab without callback URLs. The public ngrok origin exposes only the webhook relay.

Before applying the migrations together in one transaction, a read-only check found zero existing payment records. Full database export failed twice; a verified encrypted targeted rollback snapshot was saved privately instead, containing payment schema metadata, request policy and the affected reply function. This is not a full database backup. The private activation record includes its hash and the configured database flags. A successful full backup is still needed before launch.

After activation, a locally signed, unsupported setup event returned 204 both directly and through ngrok; an unsigned public request returned 400. This checks transport and signature enforcement using the configured secret, without payment effects. It does not prove that the secret matches Bachs, that Bachs delivered an event, or that a payment succeeded. Actual sandbox checkout, transfer, verified ledger state and character acknowledgement still require end-to-end acceptance.

The 25-suite offline core run passed. Subsequent focused payment checks passed after review-state and administrator-isolation refinements. Three local browser checks passed for amount bounds, separate character/merchant confirmation, unchanged idempotency on uncertain retry, and responsive 320–1440px presentation. TypeScript and scoped ESLint passed. Tests use synthetic data, injected transports and disposable PGlite databases; none contacts Bachs or spends money. The mobile review screenshot is a disposable `test-results/gift-review-390.png` artifact.

## Official references

- [Checkout sessions and NGN bank-transfer checkout](https://docs.bachs.io/guides/checkout/checkout-sessions)
- [Authentication and sandbox/live key separation](https://docs.bachs.io/authentication)
- [Webhook signatures and rotation](https://docs.bachs.io/guides/webhooks/overview)
- [Payment object and lifecycle](https://docs.bachs.io/api-reference/payments/object)
- [Virtual accounts versus checkout-specific transfers](https://docs.bachs.io/guides/virtual-accounts/overview)
- [Supported businesses](https://docs.bachs.io/for-you/supported-businesses)

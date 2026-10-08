# Stage 5 frontend contracts

8 October 2026. Local prototype operations, not implemented endpoints or security guarantees.

## Settings and memories

`savePreferences` updates the mock actor’s display name (1–40 characters), character genders and English/English with Pidgin choice; failures preserve the editor. `saveRequests` changes character-initiated request permission independently of a user choosing to give. Requests start muted.

`memoryState(characterId)` scopes inspectable facts to the signed-in mock actor and selected character. Permission starts disabled for each character. `permittedMemoryContext(characterId)` returns no facts when disabled and otherwise returns only surviving facts for that character. Deletion removes the fact from both inspection and that future-context selection. Scripted replies never extract or consume personal facts; actual context assembly belongs to Stage 10.

Only reviewer-selected synthetic ordinary/sensitive facts can be saved. Both require an explicit save; the sensitive example additionally requires an unchecked consent box to be selected. Disabling retains inspectable facts while preventing saves/context selection. Inspection describes source and consent without claiming a real message source.

## Conversation and account lifecycle

The user confirmed D13: **keep memories by default, with an explicit option to clear them**. The optional checkbox starts unchecked for both destructive actions.

| Action | Conversation/messages | Memories | Payment history |
| --- | --- | --- | --- |
| Archive | Preserved, moved to archived list; restore to chat | Preserved | Preserved |
| Reset | Old thread/jobs removed; introductory relationship and new scripted introduction; no previous summary retained | Preserved unless explicitly cleared for this character | Preserved |
| Delete | Conversation/thread/jobs removed; no previous summary retained | Preserved unless explicitly cleared for this character | Preserved, even without associated conversation |
| Delete account | Disposable profile, conversations, memories, reports and payment examples cleared; signed out | Cleared | Disposable examples cleared; real necessary-record retention remains policy work |

Account deletion needs typed `DELETE` and final confirmation. Failures preserve data and confirmation input. Success removes the four mock session keys and redirects to `/account-deleted`. Real transaction/legal exceptions have explanatory draft copy without an invented retention period. Real atomic deletion, job cancellation, identity isolation and retention enforcement belong to backend stages.

## Requests and payments

Early conversations never create requests automatically. Development-only controls can load an explicitly eligible familiar-conversation sample only after requests are enabled. Choose amount, Not now and Ignore request are equally present. Decline records a graceful continuation without changing relationship/affection; declined requests cannot be reloaded. Ignore dismisses the sample for that mounted view without a reminder or payment intent. Muting hides requests. Numeric eligibility/cooldown/amount limits remain open D15 decisions.

The user can initiate a gift while requests are muted. Amount starts empty and is parsed to positive safe-integer NGN minor units; ambiguous, negative, zero, exponent and over-precision values fail. Confirmation shows the actual amount, NGN, operator recipient, voluntary purpose and character association. Giving buys no romantic response or photo access. Not now remains available during confirmation.

`confirmGift` binds amount/conversation/mock actor to an operation key. `createGift` requires that confirmation and reuses the same payment intent on retry. Changing amount creates a fresh operation key. New attempts after failed/cancelled/expired status require a fresh amount/recipient confirmation. References use `SIM-`; `checkoutUrl` is always null. No provider/card form/external checkout exists.

`simulateCheckout` changes awaiting_checkout to pending only. A checkout click or status refresh does not mark a record paid. Development-only outcome controls illustrate all eight contract states: awaiting_checkout, pending, paid, failed, cancelled, expired, refunded, disputed. Paid/refunded/disputed timestamps are explicitly simulated. Failure leaves the last status visible. History is actor-scoped, newest first, status-filtered and displayed five records at a time.

## Reports, storage and integration

`sendReport` accepts the existing `{ kind, id }` report-target contract for a known character, an owned thread message, or a curated character asset. The selected content is previewed. Reason is required, details are optional up to 1,000 characters, and a stable operation key prevents duplicate retry records. Failures retain reason/details. Acknowledgement explicitly says no report was sent to a real moderation team. Stage 6 will implement the separate operator presentation.

`talkingstage:mock-personal-space:v1` stores synthetic facts, permissions, proposals, simulated payment metadata and report metadata in session storage. Custom report details stay in memory and serialize as a visible placeholder; custom chat wording continues to use Stage 4 redaction. No real sensitive-memory input, billing data or durable storage is introduced. All preview accounts still use one synthetic actor; client checks are not authorization.

Real integrations must preserve these UI contracts while enforcing ownership, actor/conversation/amount binding, conflict/idempotency rules, bounded pagination, valid lifecycle transitions, report delivery, durable deletion and server-verified payment events. Frontend review outcomes are not payment-provider evidence. Retention policy, provider selection, age-assurance method, operating limits and cast publication approval remain open before the applicable gates.

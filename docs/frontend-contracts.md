# Frontend integration contract index

8 October 2026 · Stage 7 review baseline. Typed frontend records and replaceable local adapters; no backend endpoints or schemas.

## Authority and common rules

The implemented shared DTO source is [lib/contracts.ts](../lib/contracts.ts). Administration extensions are `AdminCharacter`, `AdminAsset` and `ReviewReport` in [lib/mock/admin.ts](../lib/mock/admin.ts). Feature lifecycle details live in [chat contracts](./stage-4-contracts.md), [personal-space contracts](./stage-5-contracts.md) and [administration contracts](./stage-6-contracts.md). The Stage 0 specification remains historical planning; names there are not all implemented adapter signatures.

All typed fields are required unless marked optional; explicit null denotes absence. IDs are opaque strings, unrelated to names. Ownership comes from user/actor/conversation/character/intent IDs, and future services must derive the actor from authenticated state. Public character DTOs contain no private direction; authorisation must precede private fields and contextual report access.

Timestamps use ISO UTC; Nigeria-facing detail formats use Africa/Lagos where appropriate. Messages sort by sequence, independently of timestamps. NGN amounts are positive safe integer kobo; `parseNaira` converts decimal user input without floating-point rounding. `Result<T>` contains data or a typed `ServiceError`, plus request ID. Errors include code, safe message, optional field errors and retryable flag; UI should not surface raw provider errors.

Transport idle/pending/succeeded/failed is distinct from age approval, message delivery, reply completion, publication or payment verification. Keep input and last known state on failure. Do not automatically resubmit financial or destructive actions. Concurrent edits use expected versions; duplicate-sensitive operations use a stable logical operation key.

## Implemented adapters and required replacement behaviour

| Area | Current frontend operations | Replacement requirements |
| --- | --- | --- |
| Account/onboarding | `lib/mock/account.ts`: required 18+ checkbox declaration before registration, demo sign-in, recovery, preferences, session expiry and sign-out | Authenticated session and server enforcement of the user-selected declaration; generic recovery response; safe internal continuation; no credential/browser role trust |
| Discovery/profiles | `listCharacters`, `getCharacter`, `startConversation`, saved conversation reads | Return only active published profiles; owned eligible assets; one start/resume conversation per actor/character |
| Chat | Thread/list load, message send, reply retry, archive/restore, delete/reset | Stable message sequence/clientMessageId; saved input independent of reply job; bounded history; server ownership and capability checks |
| Memory | Scope/consent reads, enable/disable, sample save, delete | Ordinary and explicit-sensitive consent semantics; delete/disable invalidates context and summaries; real extraction is absent from mocks |
| Requests | Permission save, load familiar sample, decline; ignore is local dismissal | Enforce early-chat/frequency/cooldown/refusal policy after approval; no silence-as-consent; mute independent of voluntary giving |
| Giving | `confirmGift`, `createGift`, checkout simulation, owned history/detail | Bind actor/conversation/amount/currency/recipient to confirmation; stable creation key; approved server-created checkout URL; signed and independently verified events |
| Reports/deletion | Selected target reporting, reset/delete with clearMemories, typed account deletion | Relevant context only; durable deletion and approved retained-record exceptions; retry-safe destructive operations |
| Administration | Versioned draft/publication/image review/report/configuration operations; intent/events; reconciliation queue | Real roles, audit and ownership; separate asset approval/publication; reconciliation never a client paid override |

The frontend wrappers use prototype operation names rather than HTTP contracts. Provider response mapping should happen inside replacement adapters, preserving screen states. A provider-specific UI change must return to this gate review.

## State vocabulary

- Adult access: shared types retain not_started, declared_adult, assurance_pending, approved, failed, blocked for historical fixtures. The selected checkbox flow uses approved for an accepted declaration in the mock, not independent age verification; no pending/failed verification step is presented. Legacy unapproved fixtures return to the declaration.
- Conversation: active or archived; deletion removes the conversation. Relationship state: introductory or familiar. Reset/delete retain memories by default unless explicitly cleared, and retain payment history.
- Delivery: queued, sending, saved, failed. Reply job: waiting, generating, completed, failed, interrupted. Retrying a reply never resends the user's message.
- Asset review: pending, approved, rejected. Asset publication: draft or published. Character preview/draft/published/deactivated is an administration presentation extension.
- Payment: awaiting_checkout, pending, paid, failed, cancelled, expired, refunded, disputed. Event verification: pending, verified, rejected. Prototype checkout goes to pending and never proves paid.
- Report: open, in_review, resolved. Audit outcomes: succeeded or failed. Reconciliation sample: queued.

`MonetaryProposal` in the shared planning types models the future structured action. Current local request samples use only offered/declined/accepted and do not implement an AI structured-action parser. Likewise, the foundation `FrontendAdapter` is not yet a single adapter for every feature. These are documented integration gaps, not hidden completed backend features.

## Collection and retry mapping

Shared planned collections use `{ items, nextCursor }`. Implemented feature mocks use bounded synthetic arrays: payment history reveals five at a time; report/ledger lists reveal ten; audit reveals twenty; cast is the provisional eight-person set; chat loads its disposable thread. These are UI pagination controls, not server cursor implementations. Future adapters must return bounded ordered pages with opaque cursors, stable IDs and merge/deduplicate behaviour. Backends must not return unlimited private history because the mocks do.

Chat retries reuse clientMessageId and the reply job. Gift creation reuses the confirmation's operation key; changing amount or starting a fresh failed/expired attempt creates a new key after confirmation. Reconciliation returns the existing queued intent review. Character/asset/report/configuration changes compare record versions; stale values produce conflict feedback and retain edits. Durable server idempotency for reporting, deletion and remaining mutations is still required.

## Outstanding contract decisions

Age eligibility/method are confirmed: 18+ checkbox declaration before onboarding. Remaining decisions include account method, final cast/direction/assets, request bounds/frequency/cooldowns and chat allowance, retention/deletion exceptions, operator/support/refund information and gateway-dependent presentation. No provider choice, retention duration, launch budget or amount limit is inferred from prototype guards. [Gate A decisions](./stage-7-decisions.md) tracks these independently from automated QA.

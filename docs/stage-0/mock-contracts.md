# Frontend mock contracts

Status: Stage 0 specification, 8 October 2026. These are local adapter contracts, not endpoints or database schemas. Implement typed adapters in Stage 1; replace their implementation after the Stage 7 gate. No prototype operation moves money, proves identity, or provides production access control.

## 1. Shared rules

- IDs are stable strings. Use separate fixture actors `demo-user-a`, `demo-user-b`, and `demo-admin`; never infer ownership from display names.
- Timestamps use ISO 8601 UTC; display appropriately for Nigeria. Sort messages by a stable sequence, not timestamp alone.
- Money uses integers in kobo with currency `NGN`; example 500000 minor units displays as ₦5,000. Reject fractional minor units, nonfinite values, and invalid decimal input.
- Results contain either `{ data, requestId }` or `{ error: { code, message, fieldErrors?, retryable }, requestId }`. Collection data is `{ items, nextCursor: string | null }`. Errors never include secrets, prompts, or raw provider errors.
- Mutation inputs carry an operation/idempotency key where retries could duplicate work, and an expected version where concurrent edits matter. Caller IDs are mock scenario context; a future server must derive identity from a verified session.
- Suggested error codes: `UNAUTHENTICATED`, `ONBOARDING_REQUIRED`, `ADULT_ACCESS_BLOCKED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, `OFFLINE`, `RATE_LIMITED`, `USAGE_LIMIT`, `CAPABILITY_PAUSED`, `UNAVAILABLE`, `EXPIRED`.
- Development scenario controls can change latency/outcome. They cannot appear in production navigation. Persist only disposable demo fixtures with a versioned namespaced key, provide reset, and never persist passwords, identity documents, real payment information, or real intimate chats.

## 2. Entity shapes

Fields below are required unless followed by `?`. Nullable fields are explicitly called out. Admin/public DTOs are separate; public objects exclude instructions and operational secrets.

| Entity | Fields and meaning |
| --- | --- |
| User | `id`, `displayName`, `preferences { characterGenders[], language }`, `adultAccessState`, `onboardingStep`, `allowMonetaryRequests`, `createdAt`, `updatedAt`; email restricted to account views if used |
| Session | `actorId`, `role: user/admin`, `expiresAt`; mock-only, no real token |
| PublicCharacter | `id`, `name`, `age`, `gender`, `fictionalLocation`, `bioSnippet`, `bio`, `occupation`, `interests[]`, `personalityTags[]`, `conversationClue`, `aiLabel`, `portraitAssetId`, `galleryAssetIds[]`, `availability { chat, photos }` |
| AdminCharacter | Public fields plus `publicationState`, `instructionVersion`, `instructions`, `appearanceContinuity`, `languageStyle`, `boundaries`, `capabilities`, `version`, `updatedAt` |
| CharacterAsset | `id`, `characterId`, `kind: portrait/gallery/chat`, `reviewStatus: pending/approved/rejected`, `publicationState`, `source: ai_generated`, `altText`, `focalPoint { x, y }`, `width?`, `height?`, `displayUrl: string/null`. Stage 0 slots have null URLs and no approval. Future storage references stay server-controlled. |
| Conversation | `id`, `userId`, `characterId`, `status: active/archived`, `relationshipState`, `lastMessagePreview: string/null`, `lastMessageAt: string/null`, `unreadCount`, `version`, `createdAt`, `updatedAt`. Summary is context-service data, not required in user DTO. |
| Message | `id`, `conversationId`, `sequence`, `role: user/character/system`, `kind: text/photo/payment/status`, `text: string/null`, `assetId: string/null`, `paymentIntentId: string/null`, `deliveryState`, `clientMessageId: string/null`, `createdAt`. Content must match kind and ownership. |
| ReplyJob | `id`, `conversationId`, `userMessageId`, `state`, `errorCode: string/null`, `createdAt`, `updatedAt`; distinct from the saved input message |
| Memory | `id`, `userId`, `characterId`, `content`, `category: user_fact`, `source { messageId: string/null, consent: explicit/ordinary_shared }`, `savedAt`, `deletedAt: string/null`. Sensitive facts require explicit consent. |
| MemoryPreferences | `userId`, `characterId`, `enabled`, `updatedAt`. Disabling prevents injection and new saving, even if old facts remain visible until deleted. |
| MonetaryProposal | `id`, `conversationId`, `origin: character/user`, `amountMinor: integer/null`, `currency: NGN`, `state`, `policyEligible`, `createdAt`; no checkout URL |
| PaymentIntent | `id`, `userId`, `conversationId`, `characterId`, `amountMinor`, `currency`, `reference`, `status`, `recipientDisclosure`, `checkoutUrl: string/null`, `createdAt`, `expiresAt: string/null`, `verifiedAt: string/null`. Frontend mock always has null checkout URL. |
| PaymentEvent (admin) | `id`, `intentId`, `gatewayEventId`, `eventType`, `verificationResult`, `receivedAt`, `processedAt: string/null`; mock metadata only, no gateway credentials |
| Report | `id`, `reporterId`, `target { kind: message/photo/character, id }`, `reason`, `details: string/null`, `state: open/in_review/resolved`, `createdAt`, `resolution: string/null`. Context snapshot is admin-only. |
| Operations | `chatEnabled`, `photosEnabled`, `paymentsEnabled`, per-character overrides, `requestPolicy { limits/cooldowns configured or null }`, `usageBudget configured or null`, `version`, `updatedAt`. Null means undecided, not unlimited. |
| AdminAudit | `id`, `actorId`, `action`, `target { kind, id }`, `createdAt`, `outcome`; omit raw sensitive content from list |

The character JSON adds fixture-only fields (`mockPublicationState`, sample replies, and review flags). Those are not a commitment to a production public DTO. Only the dedicated development adapter may turn fixture presentation into a simulated published state.

## 3. Mock operation inventory

Names denote adapter methods, not HTTP paths. Every mutation has pending/failure/success feedback; every collection supports empty/failure/loading states. IDs are checked against the current mock actor and target character.

| Group | Inputs → outputs |
| --- | --- |
| Accounts | `register(email, password, declaration)` → User/onboarding step; `signIn(email, password)` → Session/User; `getSession()` → Session/User or null; `signOut()` → cleared session |
| Recovery | `requestRecovery(email)` → same generic acknowledgement for all addresses; `completeRecovery(reference, newPassword)` → completion or expired/invalid error. Never persist password input. |
| Adult access | `declareAge(isAdult)` → declaration state; `beginAssurance()` → pending scenario; `getAssuranceStatus()` → approved/failed/pending/blocked. Actual method undecided. |
| Preferences | `getPreferences()` → preferences; `updatePreferences(fields, expectedVersion)` → saved preferences; `completeOnboarding()` → User or missing-step error |
| Discovery | `listCharacters(filters, cursor)` → public character collection; `getCharacter(id)` → public profile or unavailable/not-found |
| Conversations | `listConversations(status, cursor)` → list; `startOrResumeConversation(characterId, operationKey)` → one conversation; `getConversation(id)` → owned conversation; `archive/unarchive(id, expectedVersion)` → updated state |
| Messages | `listMessages(conversationId, cursor)` → ordered collection; `sendMessage(conversationId, clientMessageId, text)` → existing/new saved Message and ReplyJob; `retryReply(replyJobId, operationKey)` → same logical reply attempt |
| Photos | `getCharacterAsset(conversationId, assetId)` → eligible asset or mismatch/unavailable error. No user arbitrary-image uploads. |
| Memory | `listMemories(characterId)` → scoped collection/preferences; `saveConsentedMemory(characterId, content, source, operationKey)` → memory; `deleteMemory(id)` → deletion acknowledgement; `setMemoryEnabled(characterId, enabled)` → preferences |
| Lifecycle | `deleteConversation(id, clearMemories, operationKey)` → consequences/result; `resetConversation(id, clearMemories, operationKey)` → cleared history/relationship result; `deleteAccount(confirmation, operationKey)` → deletion result and retained-record explanation |
| Requests | `setMonetaryRequestsEnabled(enabled)` → saved User setting; `respondToProposal(proposalId, accept/decline)` → state. Ignore means no mutation; never treat silence as consent. |
| Payments | `confirmAmount(proposalId, amountMinor, currency)` → confirmation record; `createPaymentIntent(confirmationId, operationKey)` → simulated intent; `getPaymentIntent(id)` → owned current state; `listPaymentHistory(cursor)` → collection |
| Payment retry | `retryCheckout(expiredOrFailedIntentId, confirmationId, operationKey)` → new intent linked to prior attempt. Requires explicit user action and valid confirmation; does not autocharge. |
| Reports | `createReport(target, reason, details, operationKey)` → acknowledgement; errors preserve entered details |
| Admin cast/assets | `list/get/create/updateCharacter`, `previewCharacter`, `publish/deactivateCharacter`, `list/register/reviewAsset`; mutations accept version/key and return updated entity or eligibility error |
| Admin reports | `listReports(filters, cursor)`, `getReport(id)`, `updateReportReview(id, resolution, version)` → queue/detail/state |
| Admin payments | `listPaymentLedger(filters, cursor)`, `getPaymentEvents(intentId)`, `requestReconciliation(intentId, operationKey)` → mock ledger/events/job status. No client method can set paid. |
| Operations/audit | `get/updateOperations(expectedVersion)`, `getUsageMetrics(range)`, `listAudit(filters, cursor)` → config, aggregate metrics, audit collection |

Admin action shapes can be refined in Stage 6, but all visible operations above need mock counterparts. No publish operation can approve an image implicitly. Update/publish failures must preserve draft input.

## 4. Transport and business states

Transport: `idle → pending → succeeded/failed`; offline is a failure cause. A request succeeding means the operation returned, not that the underlying business process finished.

| Business process | States and constraints |
| --- | --- |
| Adult access | `not_started → declared_adult → assurance_pending → approved`; underage declaration → `blocked`; failed assurance remains in onboarding with appropriate retry/support. A pending transport result does not grant access. |
| Outgoing delivery | `queued → sending → saved`, or `failed`; same clientMessageId on retry returns same message. Sequence is assigned once. |
| Character reply | `waiting → generating → completed`, or `failed/interrupted`; saving the user's message does not guarantee a reply. Retry must not resend it. |
| Conversation | active/archived; deletion is removal, not another discoverable state. Reset preserves identity but clears selected content/state per confirmed semantics. |
| Proposal | `amount_needed → awaiting_confirmation → confirmed → intent_created`; decline stops the proposal. Accepting without an amount cannot reach intent_created. Disabled requests suppress character prompts. |
| Payment intent | `awaiting_checkout → pending → paid/failed/cancelled/expired`, with gateway-specific late result reconciliation. `paid → refunded/disputed` as verified events require. No redirect, screenshot, model text, or browser action sets paid. |
| Asset | pending review → approved/rejected; publication is separate, and needs approved status plus correct character association. Stage 0 slots never pass actual approval. |
| Report | open → in_review → resolved, with explicit administrative outcome |

Payment transitions are a UI specification; final gateway reconciliation rules may refine them. State changes are supplied by mock scenario fixtures during frontend review and by verified backend events later. A network error does not mark an intent failed or cancelled; show the last known state and offer a safe status retry.

## 5. Ownership and reset semantics

- User A's messages, memories, reports, and payment history are never returned to User B by mock adapters. This previews the interaction contract, not proof of real isolation.
- Photos must belong to the conversation's character. Never fall back to another person's portrait.
- Start/resume returns the current character conversation rather than duplicating it on repeated taps. Whether a deleted conversation is recreated is explicit, not accidental.
- Archive hides a conversation from the active list; it does not delete facts, payments, or messages.
- Provisional delete/reset behaviours follow D13. Clearing memory must also remove facts from future context/summary use in Stage 10; disable suppresses use but does not silently erase the inspection list.
- Account deletion clears prototype actor data and session; real deletion/retention is Stage 12 work. Retained payment records cannot become a backdoor to deleted private conversations.
- Development reset restores synthetic fixtures and removes their namespaced storage. It never manipulates real accounts or services.

## 6. Mock acceptance versus backend acceptance

Mock inspection can prove that a screen renders the intended state and calls a defined operation. It cannot prove signed webhook verification, server ownership, age assurance, real AI voice consistency, real storage restrictions, or deletion from backups. Those remain Stage 8–13 checks in the roadmap.

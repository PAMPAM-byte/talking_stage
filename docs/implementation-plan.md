# TalkingStage implementation plan

Version 1.26 · 10 October 2026 · Status: Stage 10 in progress; independent Stage 12 reporting, deletion, backups and monitoring delivered locally

Product owner: PAMPAM

Source: TalkingStage PRD v1.0, dated 6 October 2026, supplied at `C:\Users\OLUWAPAMILERIN\Downloads\TalkingStage-PRD.md`.

Visual specification: [TalkingStage design system](./design-system.md).

## 1. Execution rule and scope

**Complete all launch frontend work before starting backend implementation.** This includes customer-facing screens, admin screens, interactions, validation feedback, loading/error/empty states, and responsive/accessibility review. Backend work starts only after the frontend completion gate in Stage 7 passes.

During frontend stages, use typed fixtures and a client-side mock service layer. Do not implement database schemas or migrations, authentication services, application API handlers, server actions for business operations, AI calls, storage integrations, payment integrations, webhooks, or background jobs. Ordinary Next.js rendering and routing are frontend infrastructure; they must not introduce these backend services early.

Contract planning is permitted before the gate: document required fields, operations, errors, and UI state transitions without creating working backend endpoints. Service/provider selection can be researched and decided without integrating it. Keep provider secrets out of frontend fixtures.

Frontend complete means a reviewable, interactive mock application, not a production service. Real authentication, age assurance, isolation, AI behaviour, payment verification, and durable deletion are backend acceptance items. After the gate, replace mock adapters and adjust existing UI for verified service behaviour; do not defer whole launch screens until integration.

The launch scope remains operator-created fictional adult women and men, private non-explicit chat, controlled memory, curated AI-generated photos, optional voluntary payments to the operator, reporting, and administration. No gift shop, human matching, user-created partners, simulated dates, explicit content, voice/video, subscriptions, or paid-message scheme is added by this plan.

## 2. Stage tracker

Update a stage to In progress when work begins. Mark it Complete only when its exit criteria have evidence. Record blockers and unfinished tasks rather than treating a partial stage as done. No delivery dates are assumed.

| Stage | Work | Depends on | Status |
| --- | --- | --- | --- |
| 0 | Product decisions and frontend planning | PRD and design system | Complete — [record](./reviews/stage-0.md) |
| 1 | Frontend foundation and reusable components | 0 | Complete — [record](./reviews/stage-1.md) |
| 2 | Landing, account, and adult onboarding frontend | 1 | Complete — user-selected checkbox flow; [record](./reviews/stage-2.md) |
| 3 | Discovery and character profiles frontend | 2 core onboarding contracts | Complete — [record](./reviews/stage-3.md) |
| 4 | Messages, chat, and curated-photo frontend | 3 | Complete — [record](./reviews/stage-4.md) |
| 5 | Settings, memory, payments, and reporting frontend | 4 | Complete — [record](./reviews/stage-5.md) |
| 6 | Full administration frontend | 5 | Complete — [record](./reviews/stage-6.md) |
| 7 | Frontend quality review and completion gate | 1–6 | Complete for backend handoff — [review](./reviews/stage-7.md); manual checks deferred before pilot |
| 8 | Backend foundation, identity, and ownership | 7 | Complete for local handoff — real Auth/RLS/roles/throttling/restore verified; [evidence](./reviews/stage-8.md); hosted deployment checks remain Stage 13 |
| 9 | Cast, assets, and administration backend | 8 | Complete for local backend handoff — [review](./reviews/stage-9.md) and [contracts](./stage-9-contracts.md) |
| 10 | Conversations, AI, and memory backend | 9 | In progress — integration and request controls verified without keys; live evaluation pending; [review](./reviews/stage-10.md) |
| 11 | Payments and reconciliation backend | 10 | Planned |
| 12 | Privacy, reporting, monitoring, and full integration | 11 for full integration; 9–10 for independent reporting | In progress — independent reporting slice delivered locally; [review](./reviews/stage-12.md) |
| 13 | Private pilot and public-launch readiness | 12 | Planned |
| 14 | Separately scoped post-launch improvements | 13 | Deferred |

## 3. Decisions and dependencies

Use clearly labelled provisional fixtures where a decision does not prevent frontend work. Do not silently convert a proposed default into a confirmed product rule. Unresolved decisions that materially change a launch screen must be settled before Stage 7 can pass; service configuration must be settled before the relevant backend integration.

| Decision | Required before | Planning approach |
| --- | --- | --- |
| Visual direction, fonts, portrait treatment | Stage 1 completion | Use design-system proposal; record any revision |
| Cast size, profiles, instructions, adult ages, approved assets | Stage 7 for final presentation; Stage 9 for publication | Eight characters/four per gender are provisional; mark draft fixtures |
| Age eligibility and check method | Confirmed during Stage 7 | User selected 18+ checkbox declaration before onboarding; implemented. Self-declaration is not independent verification; enforce accepted declaration server-side in Stage 8. |
| Account/authentication approach | Confirmed and integrated in Stage 8 | Supabase email/password Auth, confirmation, recovery and server-enforced adult/onboarding access; explicit development mock preview retained |
| Language and preference options | Stage 2 completion | Nigerian English and optional Pidgin; exact labels recorded |
| Conversation deletion, reset, archive, and memory semantics | Confirmed during Stage 5 | User chose memories kept by default with an explicit option to clear; reset/delete dialogs implement D13 |
| Memory consent, sensitive information, retention, deletion exceptions | Stage 7 | UI and explanatory copy must match actual intended policy |
| Chat pilot limits and operating budget | Stage 7 for limits UI; Stage 10 for enforcement | No assumed subscription or paid-message flow |
| Monetary-request minimum/maximum, early-chat rule, cooldowns, refusal behaviour | Stage 7 for UI; Stage 11 for enforcement | Mock configurable rules; do not invent final numeric limits |
| Payment gateway and accepted merchant purpose | Stage 11; Stage 7 if it requires extra screens | Gateway-neutral hosted-checkout design; no real payment links in mocks |
| Text model, language quality, cost, structured-action support, terms | Stage 10 | Evaluate candidates before integration; no provider assumed |
| Database, authentication, storage, hosting, background-job services | Relevant Stage 8–12 integration | Architecture proposals are recommendations, not commitments |
| Refund/chargeback lifecycle and support procedure | Stage 7 for status/copy; Stage 11 for ledger | Map visible states to final intent/event semantics |
| Legal/policy copy and support contact | Stage 7 for complete layouts; Stage 13 for reviewed public copy | Clearly label draft copy; no invented compliance claim |
| Domain ownership and naming/brand clearance | Stage 13 | Working domain remains unverified |

## 4. Frontend stages

### Stage 0 — Product decisions and frontend planning

**Outcome:** A bounded, traceable frontend build plan using the PRD and design system.

- [x] Record confirmed decisions and provisional choices in the decision table.
- [x] Define the public, onboarding, signed-in user, and admin navigation maps.
- [x] Inventory every launch screen and significant state, including account recovery, legal/support pages, reports, and deletion confirmations.
- [x] Prepare cast/profile fixtures with explicit adult ages, AI disclosure, distinct personalities, and character-owned asset references.
- [x] Define mock operations and response shapes for users, characters, conversations, messages, memories, payments, reports, and admin actions.
- [x] Define separate transport states and business states; payment link creation must not mean payment received.
- [x] Record acceptance scenarios and the screenshots/walkthroughs needed to review them.

Artifacts: [Stage 0 planning](./stage-0/README.md), [contracts](./stage-0/mock-contracts.md), [draft cast](./stage-0/characters.json), [review scenarios](./stage-0/review-scenarios.md), [completion record](./reviews/stage-0.md). Image references are planned owned slots, not generated/reviewed assets. Unresolved founder decisions remain tracked.

**Exit criteria:** Every P0 requirement has a frontend destination and later backend owner. No screen-changing decision is hidden. Navigation and fixture contracts are documented.

### Stage 1 — Frontend foundation and reusable components

**Outcome:** A consistent mobile-first UI foundation.

- [x] Read the repository's applicable `AGENTS.md` and installed Next.js documentation before coding.
- [x] Implement semantic colour, typography, spacing, shape, elevation, and motion tokens from the design system.
- [x] Set up fonts with dependable fallbacks, one icon family, and accessible focus styles.
- [x] Build buttons, inputs, selection controls, chips, badges, notices, skeletons, dialogs, sheets, and confirmation patterns with their states.
- [x] Build public/user/admin shells, mobile bottom navigation, desktop navigation, page containers, and chat-specific layout.
- [x] Add a development-only component/state preview and controllable mock scenarios; exclude these from a production build.
- [x] Establish typed fixture adapters whose implementations can later be replaced without rewriting screens.

Evidence: [Stage 1 review and screenshots](./reviews/stage-1.md). Lint, production build/TypeScript, five Playwright tests, and production-exclusion checks pass. Foundation mock reads/preferences are implemented; feature-specific mutations follow their screen stages. Real mobile keyboard and assistive-technology review remains in Stage 7.

**Exit criteria:** Foundation components are visually consistent, keyboard-operable, responsive, and handle reduced motion. No backend business logic or service integration exists.

### Stage 2 — Landing, account, and adult onboarding frontend

**PRD coverage:** AUTH-01, AGE-01, PREF-01; AI disclosure and public information.

- [x] Landing page explains fictional AI dating, adult access, and the entry action using the current design direction.
- [x] Registration, sign-in, access recovery, recovery completion, sign-out, and session-expired views.
- [x] Required unchecked 18+ checkbox declaration, under-18 blocked state and required disclosures before account creation.
- [x] Replace the assurance simulation with the user-selected checkbox flow; registration leads directly to preferences and the legacy assurance URL redirects to declaration.
- [x] Preferred name, character gender preferences, language selection, and onboarding completion.
- [x] Draft terms, privacy, payment-recipient information, and support layouts; clearly identify unfinished policy text in review builds.
- [x] Client validation, loading, invalid credentials, recovery feedback, retry, and mock unauthenticated redirects.
- [x] Back navigation preserves appropriate input; consent controls are not preselected.

Evidence and limits: [Stage 2 record](./reviews/stage-2.md). Stage 3 has replaced the `/discover` onboarding handoff with guarded discovery. Account email drafts stay in memory; session storage contains disposable onboarding state, never passwords/email. The selected checkbox flow passed five updated onboarding tests; lint/build/TypeScript passed. No independent verification is claimed.

**Exit criteria:** A reviewer can complete or fail the entire mock onboarding journey. Under-18 declarations cannot reach mock private content. Mock route checks are explicitly recognised as UI behaviour, not security enforcement.

### Stage 3 — Discovery and character profiles frontend

**PRD coverage:** DISC-01, DISC-02, PROF-01, IMG-02 presentation.

- [x] Discovery cards include portrait, name, adult age, bio snippet, AI label, fictional location, conversation clue, and interests.
- [x] Gender, personality, and interest filters; apply/reset controls and no-results state.
- [x] Character profile with gallery, background/bio, interests, conversation clues, and “Shoot your shot”.
- [x] Accessible gallery viewing, per-image focal points, responsive assets, thumbnails, and lazy loading.
- [x] Loading, failed asset, unavailable/deactivated character, and missing profile states.
- [x] Start-chat interaction transitions to the selected character's introduction view through mock adapters.
- [x] Active discovery fixtures exclude draft/deactivated characters; final image review remains a separate publication requirement.

Evidence: [Stage 3 review](./reviews/stage-3.md), [image provenance and prompts](./reviews/stage-3-images.md). Eight mock-active profiles and sixteen character-owned photos are available. Start/resume persists synthetic conversation references within the browser session; full chat follows in Stage 4. Cast and publication approval remain pending. The public fixture contains profile fields only, with no character instructions.

**Exit criteria:** Discovery → profile → start conversation works at all review widths. AI identity is visible, filters behave coherently, and portrait/gallery assets never mix characters.

### Stage 4 — Messages, chat, and curated-photo frontend

**PRD coverage:** CHAT-01–04 presentation, IMG-01–02 presentation.

- [x] Conversation list with previews, timestamps, actual mock unread states, archive/delete menus, and empty/loading/error states.
- [x] Dedicated chat header, composer, ordered bubbles, date separators, delivery state, and response status.
- [x] Distinct scripted sample conversations for each fixture character; label these as samples rather than real AI behaviour.
- [x] Sending, saved-message/reply-failed, offline, rate/usage-limit, interrupted response, and paused-chat states.
- [x] Retry interaction keeps one user message; distinguish retrying delivery from retrying an AI reply.
- [x] Curated photo messages, persistent AI-generated captions, viewer, failed loading, and paused-photo state.
- [x] Mobile keyboard handling, safe areas, long messages, scrolling, and desktop list/chat split; physical-device keyboard review remains Stage 7.
- [x] Mock persistence across refresh for non-sensitive fixture data where needed; offer a reset and keep development mock storage separate from future real sessions.

Evidence: [Stage 4 review and screenshots](./reviews/stage-4.md), [mock operations and persistence rules](./stage-4-contracts.md). All 20 regression tests, lint, TypeScript, production build and production-exclusion checks pass. Custom text stays in memory and is replaced by a visible placeholder on refresh; only offered synthetic sample messages persist verbatim. Real AI, durability, identity and ownership enforcement remain backend work. Operating limits and photo publication approval remain provisional.

**Exit criteria:** Chats can be started and resumed in the prototype. Review scenarios demonstrate failures and retries without duplicated mock user messages. No real conversations or intimate information are stored as prototype data.

### Stage 5 — Settings, memory, payments, and reporting frontend

**PRD coverage:** PREF-01, MEM-01–02 presentation, PAY-01–06 presentation, PRIV-01, REPORT-01.

- [x] Preferences editor and notification/access messaging appropriate to launch scope.
- [x] Per-character memory list, delete action, disable control, consent messaging, and confirmation states.
- [x] Separate archive, conversation deletion, reset, and account deletion flows with accurate consequences and retained-record explanations.
- [x] Allow/disable monetary requests; accepting, declining, and ignoring requests remain equally available.
- [x] Amount entry and explicit NGN confirmation including recipient and voluntary purpose before a simulated checkout card appears.
- [x] Payment cards and result screens for awaiting checkout, pending, paid, failed, cancelled, expired, refunded, and disputed states.
- [x] Payment history/detail views with amount, date, reference, and status.
- [x] Message/photo/character reporting forms, context preview, success/error feedback, and retry.
- [x] Match muted-request and refusal samples to the PRD: no pressure, affection downgrade, or romantic paywall.

Evidence: [Stage 5 review and screenshots](./reviews/stage-5.md), [personal-space contracts and lifecycle rules](./stage-5-contracts.md). All nine new journeys passed; all 29 regression checks passed across the complete run and the documented targeted rerun. Lint, TypeScript, production build and production-exclusion checks pass. D13 is user-confirmed: reset/delete keep memories by default with an explicit optional clear; payment history remains. Every payment/report example stays simulated. Numeric request/payment limits and real necessary-record retention remain policy decisions.

**Exit criteria:** Every settings and payment/report interaction works against fixtures. All payment examples are explicitly simulated, cannot accept money, and never open a real checkout. Real verification and durable deletion remain pending backend work.

### Stage 6 — Full administration frontend

**PRD coverage:** ADMIN-01–02 and operational UI in PRD Sections 8, 15–18.

- [x] Admin shell, mock admin-access/forbidden states, dashboard, and navigation.
- [x] Cast list, create/edit forms, profile preview, instruction-version display, publish/deactivate/pause actions, and validation states.
- [x] Asset management: select/upload-preview mock flow, character association, review status, publication eligibility, and rejection reasons.
- [x] Character instruction editing is restricted to this admin presentation; never expose instructions to user pages.
- [x] Report queue, context detail, review status, and resolution flow.
- [x] Payment ledger, intent/event detail, verification/reconciliation status, refund/dispute display, and action confirmations.
- [x] Independent chat/photo/payment pause controls, character-level controls, and corresponding user-facing paused states.
- [x] Usage/cost/latency/failure views, configuration forms for approved limits, and audit-log presentation using fixtures.
- [x] Empty/error/loading states and usable narrow-screen table/card alternatives.

Evidence: [Stage 6 review and screenshots](./reviews/stage-6.md), [administration contracts](./stage-6-contracts.md). All 37 frontend checks passed in the final complete run, including eight administration journeys. Lint, TypeScript, build and production-exclusion checks pass. Production administration preview and private direction are excluded. Limit fields remain labelled provisional/undecided until approved; real roles, moderation, uploads and financial verification remain backend work.

**Exit criteria:** Every operator workflow can be walked through with mocks, including publishing, reviewing a report, inspecting payment events, and independently pausing capabilities. The UI does not imply admin access is secured before backend role enforcement exists.

### Stage 7 — Frontend quality review and completion gate

**Outcome:** All launch frontend work is complete and documented before backend implementation begins.

- [x] Review the full landing → onboarding → discovery → profile → chat → optional payment → history journey.
- [x] Review memory management, request muting, reporting, chat/reset/delete, recovery, and account deletion journeys.
- [x] Review all administration workflows and their effects on mock customer-facing states.
- [x] Exercise loading, empty, error, offline, forbidden, expired-session, unavailable-character, limit, and paused states.
- [x] Review automated coverage at 320, 360, 390, 430, 768, 1024 and 1440 px, landscape and shortened composer viewport; physical-device keyboard checks are explicitly deferred before private-pilot access.
- [x] Review automated keyboard, label, dialog-focus, effective enlarged-layout, contrast and reduced-motion checks; actual text-only zoom and screen-reader checks are explicitly deferred before private-pilot access.
- [x] Verify typography, image crops, navigation, disclosure copy, spacing, and component consistency against the design system.
- [x] Run repository lint/type/build checks and meaningful frontend journey checks. Record any environment limitations rather than claiming unperformed checks passed.
- [x] Capture representative screens and a state/journey review record, including admin and payment failures.
- [x] Finalise frontend contracts: required fields, ownership identifiers, pagination, timestamps, state enums, error shapes, and idempotency inputs. They are documented contracts, not implemented endpoints.
- [x] Record product-owner acceptance of the current frontend presentation (8 October 2026).
- [x] Accept current prototype presentation and carry exact operating/policy decisions to the relevant integration and launch gates. Any resulting screen changes require review; draft content is not approved final public copy.

Evidence so far: [Stage 7 review](./reviews/stage-7.md), [contract index](./frontend-contracts.md), [decision/acceptance worksheet](./stage-7-decisions.md). The prior complete 37-check regression baseline passed; 17 current affected/new checks passed, including three cross-feature/layout/contrast checks. Lint, TypeScript, production build and exclusion checks pass after the name-limit correction. All required widths have automated coverage; real phone keyboard, actual text-only zoom and screen-reader review remain unperformed. User confirmed ages 18 and over are eligible, with age checking before onboarding. The user selected a checkbox; that flow is implemented and replaces the prior provider-selection prerequisite. The user accepted the frontend and explicitly authorised the recommended manual-check deferral on 8 October 2026. Gate A is passed for backend handoff under the revised scope; deferred checks remain unperformed.

**Gate A — Frontend complete for backend handoff (passed 8 October 2026):** Every launch frontend screen and required mock interaction is implemented, automated review evidence exists and product-owner acceptance is recorded. The user explicitly authorised deferring physical-device, actual text-only zoom and screen-reader checks until before private-pilot access. Those checks are pending, not passed; follow the [manual review checklist](./pre-pilot-manual-review.md). Backend Stages 8–12 may now proceed. Integration must resolve policy/service decisions and review any resulting UI changes. This gate does not approve pilot access, public publication or final cast/policy content.

## 5. Backend and integration stages

### Stage 8 — Backend foundation, identity, and ownership

**PRD coverage:** AUTH-01, AGE-01, PREF-01; data model, privacy and ownership foundations.

- [x] Select/configure approved database and authentication services; define environment handling and server-only secrets. Local Docker Supabase connected; hosted deployment remains separate.
- [x] Implement the minimum PRD entities: User, Character, CharacterAsset, Conversation, Message, Memory, PaymentIntent, PaymentEvent, Report, AdminAudit. Foundation migration exists; feature migrations follow in Stages 9–12.
- [x] Add ownership constraints, uniqueness/idempotency keys, indices, lifecycle timestamps, and migration procedures. Migration applied locally; real two-account checks and isolated restore passed.
- [x] Implement registration, sign-in, recovery, session handling, sign-out, and server-enforced private-page/API access.
- [x] Implement the selected age-assurance flow and adult-access enforcement server-side, not merely client-side.
- [x] Implement preferences and admin roles; prevent user-supplied IDs/roles from granting access.
- [x] Establish request validation, safe errors, rate limits, audit foundations, and initial backup/restore procedures. Real local native Auth limits, retry UI, spoofed-header rejection and preserved restart verified; hosted deployment controls tracked in Stage 13.
- [x] Replace identity/preference mock adapters and verify existing screens against real responses. Explicit development preview mode remains available.

**Exit criteria:** Two-account access tests establish isolation on implemented resources. Real sign-in/recovery/age restrictions work, admin access is enforced, and secrets never reach client bundles.

### Stage 9 — Cast, assets, and administration backend

**PRD coverage:** DISC-01–02, PROF-01, IMG-02, ADMIN-01, ADMIN-02 in part.

- [x] Implement cast creation/editing, instruction versions, preview, publication, deactivation, and pause state. Private drafts, public-only preview, instruction history, publication, deactivation and independent capability pauses are verified locally.
- [x] Implement approved object storage, asset upload validation, review status, access controls, and responsive delivery. Local Supabase private Storage, server decoding and generated variants; real browser/role checks passed.
- [x] Enforce character-to-asset ownership and published-asset eligibility. Trusted inspected registration, explicit review/publication and current-eligibility delivery verified.
- [x] Publish only approved, clearly adult, visually consistent cast assets; complete operator review. Owner explicitly approved all eight profiles and sixteen photos on 8 October 2026; inspected, reviewed and published locally, with authenticated discovery/delivery and role denial verified.
- [x] Implement discovery/filter/profile retrieval and unavailable-character behaviour. Real published records, filters, twelve-record pagination, complete filter options and rejection/deactivation denial verified; 70-record database coverage.
- [x] Implement audited admin actions and independent capability configuration/kill switches. Mandatory cast/asset commands persist expected failures; upload failures use trusted safe audit codes. Global/per-character switches and audit UI are verified. Chat/payment stages must enforce shared permissions.
- [x] Replace cast, discovery, profile, asset, and administration mock adapters for Stage 9. Cast/assets/preview/operations/audit use real adapters; report/payment/analytics integrations remain their later stages.

**Exit criteria:** Only published active characters and eligible assets appear to users. Publishing/deactivation and pause controls work without redeployment; user access cannot edit characters or retrieve admin instructions.

### Stage 10 — Conversations, AI, and memory backend

**PRD coverage:** CHAT-01–04, MEM-01–02, IMG-01, PAY-01 behavioural foundations.

- [x] Implement user-owned conversations, ordered message persistence, previews, archive/delete/reset semantics, and bounded history retrieval. Initial real persistence/lifecycle batch passed migration-chain and local two-user browser checks, including refresh, retries and mobile layout.
- [ ] Implement idempotent message submission and retry-safe response generation; distinguish saved input from failed output. Saved input, private leases, duplicate-output protection, bounded explicit retry and cancellation are implemented and offline-tested. Live provider failure/billing verification remains open; keys and spending configuration are absent.
- [ ] Select/evaluate the model for Nigerian English/Pidgin, character consistency, structured output, latency, terms, and total cost.
- [ ] Implement the replaceable AI adapter and context assembly: product rules, versioned character identity, preferences/permitted memories, recent history, bounded summary, and structured capabilities. Optional Responses transport, bounded private context, approved-photo selection and extractive summaries are implemented and offline-tested. Live context quality remains open; payment actions stay disabled.
- [ ] Store factual memory separately from fictional relationship state; enforce consent/sensitive-data rules, per-user/per-character scope, disable/delete, and summary invalidation when necessary. Explicit saving, inspection, permissions, deletion and in-flight context invalidation are connected. Every factual save requires explicit consent; no automated fact extraction/classification exists. Separate bounded summary excerpts require enabled memory, erase on context changes and exclude pre-change history from rebuilding. Live sensitive-content evaluation remains open.
- [x] Implement structured approved-photo selection with server-side asset validation. Candidate IDs/versions are scoped to the current character and snapshotted per lease; completion rechecks ownership, approval/version and photo permissions. Text/photo output is atomic and idempotent. Offline pipeline and real Storage/card/viewer/failure checks pass. Actual live model selection/behavior remains part of the model evaluation gate.
- [x] Implement refusal/mute handling and request-policy eligibility. Owned global preferences, independent conversation mute/stop/explicit-resume controls, context invalidation and fail-closed configurable early-chat/cooldown/amount-policy foundations are implemented. Reset preserves these controls and refusal changes no relationship state. Monetary actions remain unavailable; real proposal binding and atomic final payment enforcement belong to Stage 11. Live model warmth/refusal behavior still requires evaluation.
- [ ] Add usage budgets, response timeouts, cancellation/interruption handling, summary processing, and pause enforcement. Atomic project/user daily reservations, bounded timeouts/leases, explicit skip and final pause checks are implemented. Summary processing uses an independent reservation against the same daily totals and defaults disabled. Approved limits, current rates and actual billing/live processing verification remain open.
- [ ] Integrate existing message/photo/memory screens and evaluate repeated sessions for every approved character.

**Exit criteria:** Conversations persist and remain isolated; deleted/disabled memories stop entering context, including summaries where relevant. Distinct voices survive multiple sessions. Prompt injection cannot access other users, select another character's asset, change balances, or mark a payment paid. Refusal does not reduce warmth or trigger repeated pressure.

### Stage 11 — Payments and reconciliation backend

**PRD coverage:** PAY-01–06, ADMIN-02 payment operations.

- [ ] Confirm gateway account, Nigeria onboarding, stated product acceptance, and approved merchant purpose before integration.
- [ ] Implement server-enforced early-chat restrictions, minimum/maximum amounts, frequency/cooldowns, refusal stop, and request muting.
- [ ] Treat conversational agreement as a request to confirm; require explicit amount/currency confirmation before intent creation.
- [ ] Store NGN amounts in integer minor units and create unique, owned payment intents with approved hosted-checkout URLs.
- [ ] Implement checkout-creation idempotency and validate action/reference ownership.
- [ ] Authenticate webhook events and perform required server verification of reference, merchant, amount, currency, and gateway result.
- [ ] Reject forged or mismatched events; duplicate/out-of-order events must not duplicate credit or incorrectly regress ledger state.
- [ ] Represent pending, paid, failed, cancelled, expired, refund, and chargeback/dispute transitions according to gateway semantics.
- [ ] Implement reconciliation jobs, payment history, operator ledger, verified chat acknowledgement, and independent payment pause.
- [ ] Integrate all existing confirmation/card/result/history/admin payment screens using sandbox transactions first.

**Exit criteria:** Test evidence covers successful, pending, failed, cancelled, expired, duplicate, forged, mismatched, late, refund, and chargeback events. Redirects/screenshots cannot establish success. No model or client can supply an arbitrary checkout URL or set paid status. Retries require user action and do not create duplicate payment intents accidentally.

### Stage 12 — Privacy, reporting, monitoring, and full integration

**PRD coverage:** PRIV-01, REPORT-01, ADMIN-02; PRD Sections 15–18.

- [x] Implement reports with relevant, access-controlled context, review queue, resolutions, and audit trail. Connected profile/photo/message reporting, selected private evidence, idempotent retries, admin-only queue/detail, versioned review/resolution and safe audit are verified against local Supabase; [contracts](./stage-12-reporting-contracts.md) and [review](./reviews/stage-12.md). Hosted operations and retention remain open.
- [ ] Complete account/chat deletion and memory reset/removal workflows across database, summaries, assets where applicable, caches, and background processing. Ordinary-account active-data deletion is implemented and tested locally, including all memories/reports, pending jobs, summaries, Auth sessions and cache-clearing navigation; [contracts](./stage-12-deletion-contracts.md), [review](./reviews/account-deletion.md). Hosted retention and restoration suppression remain open.
- [ ] Enforce documented retention/payment-record exceptions and backup expiry behaviour; explain them accurately in the existing UI.
- [ ] Ensure sensitive admin access is authorised, narrowly scoped, and logged.
- [ ] Add availability, latency, model cost, usage, and payment-failure monitoring, budgets, and operational alerts. Local allowlisted core-service outcomes/timing, uncaught-request monitoring, application liveness and private dependency checks are implemented; [contracts](./stage-12-monitoring-contracts.md). Hosted collection/alerts, actual model cost/usage and payment-failure monitoring remain open.
- [ ] Implement funnel/return/payment and trust analytics without raw intimate conversation or sensitive memory text.
- [ ] Finish integration of all remaining existing screens; remove production access to mock adapters and scenario tooling.
- [ ] Run end-to-end, cross-account, admin-role, prompt-injection, interrupted-network, deletion, and payment regression scenarios. Local review verified eighteen browser journeys across baseline and corrective reruns, nine database/offline suites, responsive keyboard/network checks and production exclusion; [review](./reviews/local-integration.md). Live AI injection/voice/usage, real payments, hosted deployment and manual device/screen-reader gates remain open.
- [ ] Verify independent chat/photo/payment switches and prepare incident, support, reconciliation, backup/restore, and deletion runbooks. Local [incident/support runbook](./incident-runbook.md) and backup/deletion runbooks exist; hosted containment, gateway reconciliation and release evidence remain open.

**Gate B — Integrated MVP:** Every P0 requirement has real-service acceptance evidence, critical findings are resolved, mock mode is excluded from production, and operations can manage the product safely. Functional acceptance is not satisfied by frontend fixture tests.

## 6. Pilot, launch, and later work

### Stage 13 — Private pilot and public-launch readiness

- [ ] Record founder approval of final cast, branding, disclosures, and monetary-request rules.
- [ ] Review adult onboarding, published assets, privacy/payment information, support contact, provider terms, and domain/naming status.
- [ ] **Before admitting any private-pilot participant**, complete the deferred physical-device, actual text-only zoom and screen-reader review using the [manual checklist](./pre-pilot-manual-review.md); resolve material findings and record evidence. No automated-test result substitutes for this gate.
- [ ] Conduct a small adult-only pilot; monitor meaningful exchanges, seven-day returns, character distribution, payments, AI cost, failures, reports, refusals, and refunds.
- [ ] Benchmark real first-response feedback and total reply latency. The PRD's approximately three-second feedback target is provisional, not a promise until measured.
- [ ] Evaluate character voices across sessions, repetition, memory usefulness, image consistency, and treatment after refusal.
- [ ] Establish realistic success thresholds from pilot evidence rather than invented market benchmarks.
- [ ] Fix material findings and repeat affected checks.
- [ ] Prepare release/rollback, capacity, backups, independent kill switches, and support ownership; obtain explicit release authorisation before public publishing.
- [ ] Verify hosted Auth quotas, SMTP and canonical redirects; test trusted client-IP/proxy handling and anonymous limits across deployed application instances. Local Stage 8 enforcement evidence does not establish deployment behavior.

**Gate C — Public release:** All PRD launch gates pass with recorded evidence, operating costs are acceptable, launch decisions are resolved, and publication is authorised. Completing the roadmap does not itself grant publication permission.

### Stage 14 — Separately scoped post-launch improvements

Deferred, not required for launch:

- IMG-03: personalised non-explicit generation, only after identity-consistency/content/cost review.
- CHAT-05: opt-in reminders with quiet hours, simple disable, and no payment pressure.
- DISC-03: favourites without requiring a chat.

Global expansion, voice/video, expanded content, and new monetisation require separate decisions. Do not add their frontend during the launch stages merely to make a screen feel fuller.

## 7. P0 requirement traceability

Frontend stages establish presentation and prototype behaviour. Backend stages establish durable functionality and enforcement. Stage 7 checks every frontend item; Stages 12–13 verify launch readiness across all items.

| PRD ID | Requirement | Frontend stage | Backend acceptance stage |
| --- | --- | --- | --- |
| AUTH-01 | Accounts and access recovery | 2 | 8 |
| AGE-01 | Adult-only access | 2 | 8; asset review 9 |
| PREF-01 | Editable preferences | 2, 5 | 8 |
| DISC-01 | Active-character discovery | 3 | 9 |
| DISC-02 | Filtering and reset | 3 | 9 |
| PROF-01 | Full profile/start chat | 3 | 9, 10 |
| CHAT-01 | Persistent private conversation | 4 | 10 |
| CHAT-02 | Distinct character behaviour | 4 samples | 10 evaluations |
| CHAT-03 | Delivery and safe retry | 4 | 10 |
| CHAT-04 | Resume/archive/delete conversations | 4, 5 | 10, 12 |
| MEM-01 | Isolated, permitted memory | 5 | 10 |
| MEM-02 | Inspect/delete/disable/reset memory | 5 | 10, 12 |
| IMG-01 | Approved character-specific photo delivery | 4 | 9, 10 |
| IMG-02 | Adult appearance and continuity | 3, 4, 6 | 9 review; 10 selection |
| PAY-01 | Optional requests and respectful refusal | 5 | 10, 11 |
| PAY-02 | Explicit amount/currency confirmation | 5 | 11 |
| PAY-03 | Backend-created checkout links | 5 simulated | 11 |
| PAY-04 | Verified payment result | 5 simulated | 11 |
| PAY-05 | Lifecycle and event idempotency | 5, 6 states | 11 |
| PAY-06 | User history/operator ledger | 5, 6 | 11 |
| PRIV-01 | Privacy and deletion controls | 5 | 12 |
| REPORT-01 | Reporting with review context | 5, 6 | 12 |
| ADMIN-01 | Cast lifecycle management | 6 | 9 |
| ADMIN-02 | Reports/payments/pauses | 6 | 9, 11, 12 |

## 8. Completion records

Use this template after each stage. Keep evidence in the repository under `docs/reviews/` when work starts; this document does not claim those records already exist.

| Field | Record |
| --- | --- |
| Stage and completion date | Stage number, Lagos-local date |
| Delivered | Screens/features completed |
| Requirement coverage | PRD IDs and relevant nonfunctional criteria |
| Decisions made | Decision, reason, owner, and whether provisional |
| Validation | Checks run, results, screenshots/walkthroughs, untested limitations |
| Known issues | Severity, next action, and whether they block the gate |
| Acceptance | Review outcome and evidence |
| Next stage | Next eligible stage under the dependency rules |

If integration exposes a contract mismatch, update the affected screen/adapter and repeat relevant checks. If it exposes an omitted launch screen, record the Stage 7 gap and correct it; do not relabel an incomplete frontend as previously complete.

## 9. Current project position

- Next.js scaffold exists.
- Design-system tokens, reusable components, responsive shells, local mock foundation, and development-only preview are implemented.
- Stages 0–6 frontend implementation is complete, including the user-selected 18+ checkbox declaration. The current frontend is accepted and Gate A permits backend handoff. Physical-device/accessibility checks remain mandatory before private-pilot access.
- **Stage 10 in progress — Conversations, AI and memory backend.** Durable conversations, a replaceable optional AI transport, reply leases/budget reservations and explicit per-character memory are implemented. The owner instructed integration to continue without keys; live generation remains disabled pending credentials, model evaluation and approved spending configuration. Follow [Stage 10 contracts](./stage-10-contracts.md), [AI setup](./stage-10-ai-setup.md) and [review](./reviews/stage-10.md). Stage 9's eight approved profiles and sixteen photos are published locally. Hosted launch checks remain Stage 13, and the accepted manual accessibility/device gate remains before the pilot. Preserve the accepted frontend and use frontend-design for every UI implementation.

- **Independent Stage 12 reporting and ordinary-account deletion slices delivered locally on 10 October 2026.** The owner authorised independent work while AI keys remain unavailable. This does not close Stage 10, bypass payment acceptance, or satisfy Gate B. Local restore suppression and owner-approved seven-day managed-backup expiry are now delivered; see [backup contracts](./stage-12-backup-contracts.md) and [review](./reviews/backup-restore.md). Daily local expiry is installed and verified. Local monitoring and recovery are also delivered; see [monitoring contracts](./stage-12-monitoring-contracts.md) and [incident runbook](./incident-runbook.md). Daily local backup creation is installed for 02:45 with retries; its first snapshot passed isolated restore and same-day deduplication checks. Hosted retention/recovery, alerts and remaining Stage 12 integrations remain open.

Local integration review completed on 10 October 2026: preserved-filter and expanded-cast test assumptions corrected, Auth-outage request recovery bounded, mobile/keyboard/interrupted-preference checks verified. See [review](./reviews/local-integration.md). This does not close Gate B or authorize pilot/public access.

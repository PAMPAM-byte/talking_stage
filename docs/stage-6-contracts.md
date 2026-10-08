# Stage 6 administration contracts

8 October 2026 · Frontend simulation; no endpoints or connected services.

## Access and delivery

Open `/admin/access` in development and explicitly choose a preview role. Signed-out, ordinary-user and expired roles receive separate access screens. Admin reads and mutations check the mock role. This browser state is disposable and forgeable: it establishes presentation, not authentication or authorisation.

The production `@talkingstage/admin-ui` alias resolves to an unavailable screen. Private fixtures also have a production empty alias. Production customer bundles must contain neither administrator controls nor private cast direction. Administrative routes deliberately wait for browser preview access; their server layouts use Suspense and opt out of instant-navigation validation. Real authorised server routing belongs to Stage 8.

## Records and operations

| Record | Fields and operations |
| --- | --- |
| Character | Public profile plus publication state (`preview`, `draft`, `published`, `deactivated`), private instructions/appearance/voice/boundaries, instruction version, record version, scope review and update time. Save draft, preview public profile, publish or deactivate. |
| Asset | Character-owned ID/slot, kind, image URL, description/focal point, review status, publication state, rejection reason, explicit review attestation and version. Register preview, approve/reject, publish separately. |
| Report | Reporter and selected target IDs, reason/details, narrowly selected context, open/in-review/resolved state, resolution and version. Start review or resolve with notes. |
| Payment | Existing intent contract: user/conversation/character IDs, integer-kobo NGN amount, reference, eight lifecycle states, creation/expiry/verification timestamps. Inspect associated event metadata and request reconciliation. |
| Reconciliation | Intent ID, stable operation key, queued state and request timestamp. Repeated requests return the existing record; no payment status changes. |
| Operations | Independent global chat/photo/payment flags, character overrides, optional minimum/maximum kobo, cooldown minutes, optional budget, version and update time. Review/confirm changes. |
| Audit | ID, synthetic actor, action, target kind/ID, outcome and timestamp. Includes successful/failed mutations and selected record context views. No raw report notes, messages or instructions. |

Operations return the shared `Result<T>` with a request ID or typed error. Ready/offline/error/conflict scenarios exercise progress and failures; empty load scenarios exercise blank screens. Record mutations compare expected versions where applicable. Failed saves leave input intact; version reload updates the comparison version while retaining edits. Review confirmations and a local action lock prevent accidental duplicate clicks. Reports/ledger paginate ten records; audit paginates twenty.

## Cast and publication

Eight baseline cast members remain explicitly labelled presentation previews; they are not claimed to have operator publication approval. Their sixteen generated assets start pending/draft in the administration workspace. This preserves earlier review screens without claiming production eligibility.

Saving a character makes a draft and increments its record version; changed instructions also increment instruction version. A previously published public profile stays unchanged until republished. Publication requires adult/non-explicit scope attestation, restored private direction after refresh, and owned, approved, attested, published portrait/gallery assets. Deactivation removes discovery/profile access and pauses capabilities while preserving existing conversation history. Public profile previews expose only the public DTO.

Required profile/direction fields, age 18–120, name length 40, biography length 1,200 and instruction length 12,000 are prototype guards, not approved editorial policy or age verification. Final cast, instruction and image approval remains outstanding.

## Image handling

Register an existing owned slot using its curated local fixture or a local JPEG/PNG/WebP preview. The provisional file guard is 5 MB. Arbitrary remote URLs and cross-character curated assets are rejected. Registration resets approval/publication. Approval requires an unchecked explicit adult appearance, identity continuity and non-explicit review attestation. Rejection requires a reason. Publication is a separate confirmation and never follows automatically from approval.

Local file bytes never leave the browser. Blob URLs live only in memory; refresh restores the slot without an image, pending and draft, requiring selection/review again. Real file inspection, upload, storage, permissions and image moderation belong to Stage 9.

## Reports, payments and operations

The queue combines three synthetic reports with customer preview reports. Context contains the selected character, photo association or selected owned message, rather than an unrestricted conversation browser. Selected context access and resolution changes are audited. Resolution requires notes and updates the corresponding customer mock report. Real role/ownership enforcement and moderation delivery belong to Stage 12.

The ledger combines eight synthetic status examples with customer preview intents. Event references and verification results are explicitly simulated. Reconciliation queues a review once per intent; it cannot mark paid, issue a refund or process a dispute. Real authenticated events, verification, refunds/disputes and jobs belong to Stage 11.

Effective capabilities require both global and character switches, alongside character availability. Pauses affect discovery/start-chat, existing composers, photo delivery and gift/request confirmation/checkout simulations. History remains readable. Configured positive amount bounds are checked at confirmation; blank configuration means undecided. Numeric guards and budget/cooldown configuration do not establish a final eligibility policy. Real budgets, cooldowns, request eligibility and enforcement remain integration work.

Analytics show labelled aggregate samples for acquisition, return, character distribution, usage, cost, latency and failures. They contain no raw intimate conversation or memory text and are not measured telemetry.

## Persistence and replacement

Disposable tab storage uses `talkingstage:mock-admin-access:v1`, `talkingstage:mock-admin-data:v1` and `talkingstage:mock-operator-public:v1`. Public bridging transfers an explicit public-profile DTO, asset eligibility and capability/configuration state; it transfers no private character direction. Customer adapters subscribe to changes and hydrate on refresh.

Custom private direction and resolution notes stay in memory and serialize as visible placeholders; synthetic seed direction may persist verbatim. Local image URLs serialize without their blob data. Public profile fields and other synthetic metadata may persist, so the preview is unsuitable for real personal data. Resetting operator fixtures restores the operator baseline without deleting customer history.

After Gate A, replace browser storage and synthetic role checks with authenticated server adapters. Enforce ownership, versions, publication eligibility, independent switches and idempotency server-side; preserve error and confirmation behaviour. Add authorised contextual access/audit, persistent image review, verified ledger events and actual aggregate metrics. Client checks and browser-suite results do not prove those backend guarantees.

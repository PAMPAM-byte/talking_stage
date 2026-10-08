# Stage 9 review

8 October 2026 · **Stage 9 complete for local backend handoff.** Owner-approved cast and photos are published locally; hosted launch and pre-pilot checks remain their later gates.

Implemented the versioned private cast-draft migration, administrator-only create/edit/list RPCs, instruction versions, optimistic record versions, snapshot-preserving edits, deactivation and successful-action audit records. Connected the existing cast routes to real administrator data and added create/edit forms in the approved design system. Production and ordinary accounts cannot use synthetic role selection to unlock these operations.

`npm run test:cast-database` passed: anonymous/member/incomplete-admin denial, invalid age/unknown fields, stale versions, private-direction protection, unchanged public snapshot, deactivation, audit counts and the 30-mutation limit with rollback-safe counters. The migration was then applied to the local Supabase database without reset.

Real local Auth browser integration passed (one complete account/cast journey, 1.8 minutes): administrator create/edit, persisted direction after refresh, member RPC/read denial, mobile overflow check and deactivation. Synthetic audit records are cleaned only for the test actors; application audit retention remains unchanged. The connected 390px editor was visually reviewed, and field spacing/desktop width refined. [Mobile evidence](./stage-9/cast-draft-390.png) contains synthetic test copy only; it predates that minor spacing refinement.

TypeScript, ESLint, production build and production secret/fixture/private-route checks passed. The production scanner now distinguishes the legitimate private-direction field label from actual sensitive direction/test content. It still checks server secrets and private fixture markers.

## Storage, assets and publication

Local Supabase Storage is enabled with a private WebP-only bucket. The server-only Storage credential stays in ignored environment configuration; account authentication still uses the public key. Image upload fully decodes/normalizes supported still files, strips metadata and creates responsive variants. Ordinary administrator JWTs cannot bypass byte inspection through the registration RPC.

Migration `202610080003_cast_assets.sql` was tested and applied. Asset approval, rejection with reasons, separate photo publication, explicit character publication, snapshot/instruction history and immediate rejection revocation are implemented. Discovery, filters and profiles now use real eligible published records; customer chat remains unavailable until Stage 10. Authenticated image delivery rechecks access with no-store responses; raw bucket downloads remain inaccessible to ordinary accounts.

`test:assets-database` passed for roles, attestations, versions, publication prerequisites, draft isolation, instruction history and rejection revocation. `test:images` passed decoding, normalization, metadata stripping, variant sizes and unsupported/oversized/truncated/tiny-input rejection.

The final real-account/browser journey passed (2.7 minutes), including actual uploads, approval and separate publication, member bucket denial, pending-image denial, customer discovery/profile navigation, 320px image delivery, anonymous denial, rejection revocation, deactivation, recovery/session checks and database restore. No browser page errors. After successful submissions the upload form resets; the test explicitly waits for submission completion before entering the next file. Build, lint and production checks passed, including scanning the actual server-only Storage key out of browser assets. [Mobile asset evidence](./stage-9/asset-review-390.png) uses solid-colour synthetic fixtures, not approved launch portraits; the final reset fields and hidden redundant approval controls were visually reviewed.

## Operations and audit

Migration `202610080004_operations.sql` is tested and applied locally without resetting existing records. Versioned global/per-character chat, photo and payment permissions, reason/confirmation forms and an administrator-only audit screen are connected. Global pauses override character permissions. Photo pauses remove member asset metadata through RLS and prevent customer image delivery; administrator review remains available. Published profiles retain access with a photo-pause placeholder in discovery. Chat/payment stages must consume the same permissions when their integrations become available.

The database suite passes independent switches, global override, role/private-table denial, optimistic conflicts, persistent failed-control audit entries, outcome filtering and twenty-entry cursor pagination. TypeScript, lint, production build and production security checks pass. The final real browser journey passed (3.4 minutes): administrator photo pause/resume, immediate member image denial, preserved administrator review, member RPC denial, discovery pause state, independent chat/payment permission, stale-edit failure audit, rejection revocation and account/recovery/database-restore regression. No browser page errors. The test returns explicitly to the profile after its discovery pause check.

[Operations at 390px](./stage-9/operations-390.png) and [filtered failure audit at 390px](./stage-9/audit-390.png) were visually reviewed. Existing colours, typography, switches and confirmation patterns are preserved; narrow-screen overflow was checked. The separate physical-device, text-zoom and screen-reader review remains deferred to the pre-pilot gate.

## Final technical batch

Migration `202610080005_cast_completion.sql` is tested and applied without reset. Mandatory `admin_cast_command` calls persist expected cast/asset failures after inner rollback; authenticated execution of older mutation RPCs is revoked. Invalid-image failures and trusted upload/registration failures use safe, fixed audit codes. Raw input/direction/file content is excluded. Audit persistence cannot be guaranteed while the database itself is unavailable; those failures emit a content-free server-log notice.

Administrator public preview returns only saved public fields and approved owned photos, records preview access and keeps private direction out of its payload. The editor retrieves a single draft, while operator cast cards and customer discovery paginate twelve records. Customer filters run before pagination; their options cover the full eligible catalog. `test:stage9` passed against the entire migration chain with seventy synthetic published characters, including later-page filters, non-overlapping pages, public-only preview, mandatory command permissions, failed audits and unchanged rejected mutations.

`test:storage-restore` passed: four inspected synthetic objects exported to disk, synthetic source loss, isolated private-bucket restore, equal SHA-256 hashes and anonymous denial. Only the drill's buckets were removed. See [recovery procedure and limits](../storage-recovery.md). The real database restore also checks Stage 9 ownership, direction history and character controls; hosted/full-environment recovery remains separate.

The final browser journey passed (3.8 minutes), including invalid-image failure audit, saved-draft public preview, direction exclusion, stale cast failure, photo review/publication, discovery, pause/resume, rejection, roles, recovery/session checks and database restore. [Public preview at 390px](./stage-9/public-preview-390.png) was visually reviewed. Lint, TypeScript/production build, production secret/private-route checks and whitespace checks pass.

## Approved cast publication

The owner explicitly answered “approve” to the eight-profile/sixteen-photo local publication question on 8 October 2026. [Approval record](./stage-9/cast-approval.md) lists every approved pair. `scripts/publish-approved-cast.mjs` inspected all sixteen sources before writes, took a database backup, created private drafts with the approved profile/direction snapshot, uploaded immutable originals/variants, registered inspection hashes, explicitly approved and separately published photos, previewed the public DTO and published each character through authenticated audited commands. It respected mutation limits between batches. OneDrive briefly blocked a progress-file rename; the saved pending UUID record was recovered without duplicate characters.

The synthetic local maintenance account's temporary role was revoked and account disabled after each attempt. Audit identities remain for record integrity; no password is retained in the ignored import manifest. No existing human account was granted administrator rights.

`scripts/verify-approved-cast.mjs` passed with a disposable ordinary account: eight published profiles (four women/four men), sixteen owned approved/attested/published photos, 64 original/variant objects, original hashes, WebP/metadata checks, ordinary raw-bucket denial, authenticated image delivery, anonymous denial, member administration denial, revoked maintenance roles and disabled maintenance accounts. The temporary verification account and production server were removed/stopped. No browser page errors. [Approved discovery at 390px](./stage-9/approved-discovery-390.png) and [Amara's profile at 390px](./stage-9/approved-profile-390.png) were visually reviewed; lint and whitespace checks pass.

**Stage 9 is complete for local backend handoff. Stage 10 is next.** This is local publication, not hosted deployment, public launch or pilot admission. Chat remains unavailable until Stage 10. The accepted physical-device/accessibility review stays before the private pilot. See [contracts](../stage-9-contracts.md).

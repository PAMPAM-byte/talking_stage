# Stage 9 backend integration

8 October 2026 · Stage 9 complete for local backend handoff. Stage 8 local acceptance is complete.

## Cast drafts implemented

Migration `202610080002_cast_drafts.sql` is applied to local Supabase. `private.cast_drafts` stores editable profile JSON and private direction separately from `public.characters`, the last published customer snapshot. The initial implementation did not import or automatically approve fixtures. After explicit owner approval, the eight approved candidates were imported through the authenticated local workflow.

Authenticated RPCs independently require a trusted database administrator role and completed adult onboarding. Ordinary users, anonymous callers and incomplete administrators cannot list or mutate drafts. No elevated application key is used. Cast saves are limited to 30 successful mutations per administrator per minute; validation/conflict errors roll back their counter increment.

- `admin_list_cast`: administrator-only drafts, direction, instruction version and record version.
- `admin_save_cast`: create with version zero or update the exact expected version. Required public fields and direction are validated in PostgreSQL. Unknown profile keys are rejected. Editing increments the draft version; changed direction increments its instruction version. It does not alter published copy.
- `admin_deactivate_cast`: exact-version deactivation removes public discovery/profile eligibility through existing RLS, retaining conversation history and draft contents.

Successful mutations append actor/action/target/outcome to private audit storage without recording direction or biography text. Migration 005 adds mandatory audited commands for cast/asset mutations, including persistent expected failures. The form retains edits on failed saves and provides a version reload action. Create/edit/list screens preserve the approved plum/rose palette, serif display typography and conversation clue.

## Image and publication integration

Migration `202610080003_cast_assets.sql` is applied locally. Supabase Storage runs with a private `cast-private` bucket, a 5 MB object limit and WebP content type. Anonymous/member/ordinary-administrator Storage calls have no bucket policies granting raw file access. Uploads use a server-only service-role credential after validated administrator identity, adult onboarding and a bounded upload reservation. Do not place that credential in public variables.

The server fully decodes still JPEG/PNG/WebP files (5 MB source limit, 256–8192 pixels per side, 24 million pixel ceiling), rejects malformed/truncated/animated/unsupported inputs, strips metadata and creates normalized WebP plus 320/640/1280 width variants. UUID character/asset paths are immutable; failed registration attempts remove only their own uploaded paths. A service-role-only RPC registers inspected assets, preventing ordinary administrator JWTs from bypassing decoding through direct RPC calls. Upload reservations count before expensive decoding, including invalid-image attempts.

Approval requires an explicit adult/identity-continuity/non-explicit attestation. Rejection requires a reason and revokes publication. Photo publication is separate from approval. Character publication requires an exact draft version, explicit profile/direction attestation and owned inspected, approved, attested, published portrait and gallery assets. It atomically copies the public snapshot, updates private published direction and retains instruction history. Rejection of a required photo makes the character and its assets unavailable through customer RLS.

`/api/cast-assets/[assetId]` validates the current adult account and current metadata eligibility on each request, serves only a generated variant, and returns `private, no-store`. Administrators can review pending files; members cannot request them. No public bucket or long-lived signed URL is used. Storage keys and service credentials stay on the server. Responsive customer discovery/profile adapters now read real published records. Chat remains an availability state until Stage 10.

## Operations and audit integration

Migration `202610080004_operations.sql` is applied locally. Private, versioned global and per-character controls independently permit chat, photos and payments. Effective permission requires a completed adult account, a published eligible character, an enabled global switch and an enabled character switch. Drafts, archived characters and missing assets fail closed. These permissions do not imply chat or payment integrations are ready; Stages 10 and 11 must check them at each new operation while keeping existing history readable.

Administrator-only control changes require a bounded reason, explicit confirmation and the expected version. Successful changes and expected validation/conflict failures persist in the audit; failures return a typed result so transaction rollback cannot erase their audit entry. Successful changes share the existing cast mutation limit. Photo pauses suppress customer asset metadata through RLS and prevent image delivery without redeployment. Public profiles remain discoverable with a visible photo-pause state; administrators retain review access.

The connected audit screen reads an administrator-only RPC, filters by outcome and paginates twenty entries using a timestamp/ID cursor. It exposes actor, action, target, outcome, time and the operational reason, excluding character direction and conversation content.

## Preview, pagination and recovery

Migration `202610080005_cast_completion.sql` is applied locally. Authenticated administrators use `admin_cast_command` for draft saves, deactivation, publication, photo approval/rejection/publication and upload reservations. Legacy mutation RPC execution is revoked from authenticated callers, preventing bypass of persistent failure auditing. Typed errors are returned as data after inner rollback; approved mutations retain their existing success audits. Invalid-image, upload and registration failures use a server-only, actor-validated upload audit path with fixed safe reason codes. If the database/audit service itself is unavailable, the application fails safely and emits a content-free failure notice in server logs; it cannot promise persistence during a database outage.

`admin_cast_preview` returns only the public profile and approved owned portrait/gallery metadata, with a successful preview audit. It never returns private direction. `admin_get_cast` retrieves one authorized editable draft. `admin_cast_page` paginates operator cards twelve at a time without direction. `discover_cast` uses customer RLS, applies filters before slicing twelve records, and derives filter options from the full eligible collection. Stable name/ID ordering prevents overlaps in an unchanged catalog; catalog edits between requests can change page membership. Invalid filters fail safely and out-of-range valid page numbers resolve to the last page.

The [Storage recovery procedure](./storage-recovery.md) covers paired database/object exports and isolated restores. The local synthetic four-object drill passed checksum/private-access checks. The account database restore test also verifies Stage 9 asset ownership, instruction history and controls. Hosted recovery objectives and full-environment restore remain Stage 13 verification.

## Handoff

- [Operator approval](./reviews/stage-9/cast-approval.md) is recorded for all eight profiles and sixteen photos. They are inspected, reviewed, previewed and published locally through audited commands; ordinary-account discovery, image access and role denial are verified. Original/variant objects remain private in Storage.
- Later chat/payment stages must consume effective capability permissions server-side. The separate physical-device, text-zoom and screen-reader gate remains before the private pilot, under the accepted deferral.

Stage 9's local exit criteria pass. AI/chat persistence, checkout, report resolution and customer deletion remain Stages 10–12; hosted launch checks remain Stage 13. Local publication does not authorize hosted deployment or pilot admission.

10 October cast expansion: following owner authorization, fourteen additional profiles and twenty-eight reviewed photos were published locally through the same audited workflow. The local cast now totals twenty-two profiles and forty-four approved/published photos. Fictional ages were chosen to fit the portraits, neighbourhoods were added, and selected profiles include favourite artists. [Authorization and verification](./reviews/cast-expansion-publication.md) records ordinary-account profile/image checks and pagination; generation and AI-provider configuration remain unchanged.

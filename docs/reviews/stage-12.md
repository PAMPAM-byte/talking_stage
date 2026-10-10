# Stage 12 review — reporting slice

10 October 2026 · In progress. Reporting delivered for local integration; the full stage and Gate B remain open.

The owner authorised independent reporting/admin review while live AI testing and payment acceptance are pending. Existing accepted report dialogs and admin layouts now use real local Supabase operations. [Reporting contracts](../stage-12-reporting-contracts.md) describe the scope and remaining privacy dependencies.

Delivered:

- Character/profile, photo and selected-message reporting, validation, retry protection, acknowledgement and private additional details.
- Server-derived, minimal selected evidence and ordinary-user RLS isolation.
- Administrator report queue, ten-row pagination/state filters, selected evidence/photo viewing, explicit review and confirmed resolution with required private notes.
- Expected-version conflicts and safe audit records for context access and successful/failed reviews. No surrounding conversation browser, automatic removal, external moderation message or AI call.

Verification passed:

- Reporting database suite covers ownership, roles/RLS, idempotency, conflicting payloads, private notes/evidence, lifecycle validation, safe audit, queue pagination/filtering, reset/withdrawal and rate limits.
- Authenticated local browser journey submits profile/photo/message reports, checks validation and acknowledgement, verifies reporter isolation/admin denial, reviews and resolves selected evidence, checks safe audit and loads the reported photo through authenticated delivery.
- Existing foundation and request-control database regression suites.
- TypeScript, scoped ESLint checks and an optimised production build.
- Production verification: development tooling/server secrets excluded, private routes require real authentication, responsive account UI. Temporary reporting administrator roles remaining: zero.

Mobile evidence: [report dialog](./stage-12/report-dialog-390.png), [resolved review](./stage-12/report-resolution-390.png). Synthetic browser accounts, conversations and reports are removed after verification; temporary administrator roles are removed, and technical audit events remain without the deleted synthetic actor identity.

The local database was backed up before the tested migration was applied. Hosted Supabase is not configured. Ordinary-account active-data deletion was subsequently delivered in the [account-deletion slice](./account-deletion.md), including submitted report/evidence erasure. The [backup slice](./backup-restore.md) adds local deletion replay and expiry controls, with owner-approved seven-day expiry enabled locally and daily maintenance verified. Hosted moderation-evidence policy, hosted backup expiry/restoration protection, privacy/policy review, hosted monitoring/alerts, payment integration, live AI evaluations and pilot accessibility gates remain outstanding. No public-launch approval is implied.

Local core-service monitoring and recovery were subsequently added; see [monitoring review](./monitoring.md). The private dependency probe passed for the app, Auth and database. The Stage 12 monitoring checklist remains open for hosted alerts, live usage/cost and payment verification.

The subsequent [local integration review](./local-integration.md) verified eighteen distinct browser journeys across baseline and corrective reruns, nine database/offline suites and production exclusion. Physical-device/screen-reader, live AI, payment and hosted acceptance remain open.

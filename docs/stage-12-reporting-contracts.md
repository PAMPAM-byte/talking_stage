# Connected reporting and review

10 October 2026 · Independent Stage 12 reporting slice, authorised while live AI and payments remain pending.

## User flow

Connected character profiles provide **Report character** and **Report photo**. Saved conversation messages provide **Report**, including photo-message references. The existing modal/sheet, plum actions, reason labels and error presentation follow the design system. Reporting remains available for readable owned history even when chat is paused or archived.

`submit_report` derives the reporter from authenticated identity and requires completed adult onboarding. Supported targets are a published character (or one in an owned, undeleted conversation), an owned message in undeleted history, and a currently eligible photo or a photo already referenced by owned history. Other users' message IDs are rejected. Reason is required from the existing five choices; additional details are optional and bounded to 1,000 characters. The client supplies no context snapshot or reporter identity.

Each dialog keeps one random operation key through retries. The database serializes matching keys, returns the existing report on an identical retry, and rejects changed payloads. A successful acknowledgement means the report is saved to the administrator queue; it does not promise a response time, external notification or automatic content removal. Failed sends retain the form input. A technical limit of 30 new reports per actor per minute bounds local abuse; retries do not consume another slot. This is an implementation limit, not a founder-approved commercial policy.

## Selected evidence and privacy

Private `report_context` stores only the selected public profile, photo descriptor/reference, or one message with at most 2,000 text characters. It never copies surrounding conversation history, memories, user email, Storage paths or private character direction. Report details and evidence are rendered as text, not HTML or instructions. Photo viewing reuses authenticated asset delivery and its unavailable state; reports do not create public image URLs or freeze image bytes.

Reporter-visible `reports` rows are isolated by RLS. They contain their own submitted details and public review state; internal evidence and resolution notes remain in private tables without client grants. Ordinary accounts cannot read another reporter's rows, inspect private evidence, update state, or invoke moderator operations. No AI provider is involved in reporting or resolution.

Selected moderation evidence survives a conversation reset/delete so an existing report can still be reviewed. New reports cannot target removed messages. This is a technical snapshot behavior, not an approved retention duration or public-launch exception. The independent [local account-deletion slice](./stage-12-deletion-contracts.md) erases the ordinary account's submitted reports, selected evidence and resolutions and removes their audit references. Hosted retention policy, backup expiry and legal exceptions remain outstanding Stage 12 work.

## Administrator flow

`admin_list_reports` requires an eligible database administrator, filters by state, and paginates ten rows with deterministic ordering. List rows omit reporter IDs, details, evidence and notes. Queue links disable prefetch to avoid fetching selected private context before an operator opens a record.

`admin_report_detail` checks the role again and records each selected-context access in the existing administrator audit. It exposes the report and only its selected evidence. `admin_report_command` accepts an expected version and permits `open → in_review → resolved`. Starting review is explicit. Resolution requires 1–1,000 characters of private notes and a confirmation dialog. Reports do not implicitly pause characters, delete messages or perform payment actions. Resolved reports cannot be reopened through these commands.

Stale changes, invalid transitions, missing notes, and expected failures return safe codes and retain an audit entry. UI errors retain notes, and **Reload latest version** updates the expected version. Audit stores only actor, action, report reference, outcome and safe failure code; it excludes report details, selected text and resolution notes. All moderator reads/writes use the verified user's ordinary backend client; no user-supplied administrator identity or browser service key is accepted.

## Verification

- `npm run test:reports-database`: schema/RLS, anonymous and incomplete access, cross-account target denial, duplicate retries, changed-payload conflict, private evidence/notes, version conflicts, state transitions, audit outcomes, reset/withdrawal behavior, queue filters/pagination and technical limits.
- `tests-auth/reporting.spec.ts`: real local Auth, profile/photo/message report submission, validation, acknowledgement, reporter isolation, administrator denial for a user, queue/detail review and confirmed resolution, selected-context boundaries, private audit checks and photo delivery. Uses disposable synthetic accounts and removes temporary administrator access afterward.
- Existing foundation and request-control database regression checks, TypeScript and scoped ESLint checks.

Local Supabase was backed up before migration `202610100012_reporting.sql` was applied. No hosted Supabase project or external moderation notification is configured.

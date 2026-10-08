# Stage 8 architecture preparation

8 October 2026 · In progress. Gate A now permits backend handoff; no database or authentication service has been connected.

## Proposed service choice

Recommend Supabase Postgres and Supabase Auth for the existing email/password, recovery and administrator-role requirements. One relational ownership model suits conversations, memories, assets, reports and ledger references; storage can follow in Stage 9. This is a researched proposal, not an approved provider or a provisioned project.

Use the official Next.js server-side auth integration with request cookies and validated claims; review the installed Next.js 16 documentation before adding Proxy or server mutations. Do not trust a browser session object or a submitted actor/role. [Supabase Next.js guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs), [server-side auth guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

Protect user records with Postgres row-level security and narrow privileges. Roles must be managed through trusted administrator provisioning, never user-editable profile metadata. Keep private character direction separate from public profile reads. [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [user-data guidance](https://supabase.com/docs/guides/auth/managing-user-data).

Recovery and registration email delivery require approved redirect URLs and a configured email sender; production SMTP is a separate configuration dependency. No live recovery email will be claimed without testing it. [SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

## Implementation order after service selection

1. Define development/test environments and configuration validation. Keep private keys and database credentials server-only; use ignored local environment files and placeholder examples. Do not paste secrets into review documents or test fixtures.
2. Create versioned migrations for User/profile, Character/private direction, CharacterAsset, Conversation, Message, Memory/preferences, PaymentIntent, PaymentEvent, Report and AdminAudit. Add ownership foreign keys, stable message sequence, record versions, lifecycle timestamps and uniqueness/idempotency constraints. Monetary values remain integer kobo; no numeric policy is invented.
3. Add least-privilege grants and ownership policies. Test two separate real test users, signed-out access and an ordinary user attempting administrator access. Changing a target ID must not bypass ownership.
4. Implement registration, email confirmation where configured, sign-in, recovery, session expiry/sign-out and the selected 18+ declaration. Persist an accepted declaration with version/time server-side; it is not proof of independently verified age. Require completed onboarding before private content.
5. Implement preference reads/updates and trusted administrator roles. Use field validation, expected versions, safe errors and request-level limits. Never let ordinary preferences update access or roles.
6. Replace account/preference adapters while retaining explicit development mock mode for unfinished later stages. Production must not use a mock identity to unlock private pages. Preserve accepted UI and review any provider-driven changes.
7. Record integration evidence, migrations/rollback approach and backup/restore procedure. Stage 8 is complete only when its real authentication, ownership and role checks pass.

## Current dependencies and boundaries

Database/auth provider selection is pending. Once selected, a local development setup or a designated development project must be configured; no production project is assumed. Project URL/public client key and server-side test access will be supplied through environment configuration, not chat. Public pilot deployment, paid infrastructure and external account creation are outside this preparation.

AI replies/memory extraction, image storage/publication, payments/webhooks and complete reporting/deletion integration remain Stages 9–12. The deferred [manual device/accessibility review](./pre-pilot-manual-review.md) must pass before admitting private-pilot participants.

Frontend contract source: [integration index](./frontend-contracts.md). Preserve the user-confirmed reset/delete memory defaults and the distinction between checkout, queued reconciliation and verified payment.

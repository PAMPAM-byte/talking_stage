# Stage 8 architecture and implementation

8 October 2026 · Complete for local backend handoff. Supabase account, ownership, role, native throttling, outage and restore integration is verified.

## Approved service choice

The user approved Supabase Postgres and Supabase Auth for Stage 8. One relational ownership model suits conversations, memories, assets, reports and ledger references; storage follows in Stage 9. The pinned CLI now runs local database, Auth, REST, gateway and captured email services. No hosted project has been provisioned. See [setup and integration checklist](./stage-8-setup.md) and [implementation evidence](./reviews/stage-8.md).

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

Provider selection and local acceptance are resolved. Real registration, captured confirmation/recovery email, two-account RLS, trusted administrator access, session refresh, native anonymous throttling, provider outage and isolated restore passed. The CLI's missing rate-limit header is corrected by the local startup wrapper; genuine requests verify 429 and forwarding-header bypass prevention. See the [setup](./stage-8-setup.md) for version guards, rollback and deployment limitations. Hosted SMTP, quotas, trusted client-IP handling across application instances and production recovery objectives require Stage 13 evidence. Public pilot deployment, paid infrastructure and external account creation are outside this work.

AI replies/memory extraction, image storage/publication, payments/webhooks and complete reporting/deletion integration remain Stages 9–12. The deferred [manual device/accessibility review](./pre-pilot-manual-review.md) must pass before admitting private-pilot participants.

Frontend contract source: [integration index](./frontend-contracts.md). Preserve the user-confirmed reset/delete memory defaults and the distinction between checkout, queued reconciliation and verified payment.

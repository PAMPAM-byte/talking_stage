# Stage 8 development setup

8 October 2026. Stage 8 complete for local backend handoff. Docker Supabase is connected; the migration is applied and ignored `.env.local` configured. Real account, ownership, role, throttling, outage and restore checks passed. No hosted or production project is connected.

## Environment

Copy `.env.example` to ignored `.env.local`, then supply the development project URL and **publishable** key, canonical site origin and a locally generated `AUTH_FLOW_SECRET` of at least 32 characters. The example contains the secret-generation command. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable. Account Auth uses the publishable key. Stage 9 adds a server-only `SUPABASE_SERVICE_ROLE_KEY` for trusted image inspection/upload and authenticated image delivery; it is not used to bypass account or administrator validation.

Set `NEXT_PUBLIC_TALKINGSTAGE_MODE=supabase` to use real services in development. Omit that flag to review the accepted frontend fixtures. Production always uses real services, even if the flag requests mock mode. Restart development after changing environment variables; build production with its actual public configuration. These are environment variables embedded by Next.js, not settings editable through the UI.

For a hosted **development** project, apply `supabase/migrations/202610080001_foundation.sql` through a trusted migration connection/CLI. The initial migration assumes a fresh application schema; existing users need an explicitly reviewed backfill rather than fabricated declaration timestamps. Keep `private` outside the Data API's exposed schemas; public profile/cast reads use RLS. Trusted database provisioning is the only path to `private.user_roles`. User metadata cannot grant administrator rights.

For local development, start Docker Desktop, run `npm run backend:start`, then `npm run backend:configure` and `npm run backend:storage`. Supabase CLI 2.120.0 is pinned; `supabase init` has already generated the checked-in configuration. The startup command runs database/Auth/REST/Storage/gateway/local inbox containers and applies the checked-in migrations. The configure script fills missing local environment values without displaying credentials or overwriting a different Supabase project. The Storage configurator creates or updates the private `cast-private` bucket with a 5 MB limit and WebP-only uploads; it requires the server-only local credential and rejects remote projects. `npm run backend:stop` stops this project's containers while preserving its local database.

The application runs on localhost:3000, Supabase API on 127.0.0.1:15421, database on 127.0.0.1:15422 and captured email inbox on 127.0.0.1:15424. The local ports were moved on 9 October 2026 because Windows reserved the original 54320–54324 range. Local emails are captured by Mailpit and do not reach external inboxes. Hosted production SMTP remains a separate pre-launch configuration dependency.

## Authentication configuration

Use email/password authentication, a minimum 12-character password, and email confirmation. Configure the site URL and approved redirects for the exact development origin. Configure confirmation and recovery templates to link to this application's token-hash route:

```text
Confirmation: {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup
Recovery:     {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
```

The route accepts only those two purposes and fixed internal destinations. Recovery creates a signed, HttpOnly, user-bound, 30-minute recovery cookie; a regular signed-in session alone cannot change a password through the recovery action. Consumed/expired tokens get a useful link-failure screen. No arbitrary `next` redirect is accepted. Configure SMTP for hosted delivery before claiming registration/recovery work. Official references: [password authentication](https://supabase.com/docs/guides/auth/passwords), [SSR client/session integration](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

The 18+ checkbox comes before registration. Its server action creates a signed short-lived declaration cookie. Registration requires that cookie and AI/terms consent; a profile trigger records declaration version/time at account creation. This is accepted self-declaration, not independent verification. Private access additionally requires validated identity, saved preferences and explicit completion consent.

Preferences accept only name, allowed genders/language, request choice and expected version. Actor ID, age/access flags and administrator role are never submitted as editable preferences. Atomic database limits allow 30 successful account mutations per user per minute; errors roll back the transaction and are not counted. Database tests passed.

## Anonymous Auth limits

Use `npm run backend:start`, which starts the pinned CLI and then runs `scripts/configure-local-auth-limits.mjs`. CLI 2.120.0 omits `GOTRUE_RATE_LIMIT_HEADER`; [Auth v2.197.0 skips its native IP limits when that setting is empty](https://github.com/supabase/auth/blob/v2.197.0/internal/api/middleware.go). The wrapper enables `X-Real-IP`, supplied by the local Kong gateway. Kong's default trust configuration [overwrites untrusted client forwarding headers](https://developer.konghq.com/gateway/traffic-control/proxying/). Auth has no direct host port. The configurator rejects unexpected project/workdir/image/network/port or gateway trust settings, retains the stopped original until replacement health succeeds, and rolls back on failure. It does not alter the database or print container credentials.

`npm run backend:limits` applies the same correction to an already-running local stack and is idempotent. A clean CLI restart recreates Auth, so the startup wrapper reapplies this correction each time. Bare `supabase start` does not provide this guarantee. Do not reuse the helper against hosted or differently configured environments; its version guard deliberately requires review after CLI/Auth upgrades.

Real probes now return 429 on password-token, signup, recovery and verification endpoints, including requests that change both `X-Real-IP` and `X-Forwarded-For`. The browser shows the safe retry message. Native limits use a burst bucket: the local token setting refills at 150 requests per five minutes; signup/recovery/verification at 30. This is not a fixed failed-password count per account. No paid password-verification hook or extra service was introduced.

Before pilot deployment, verify hosted Auth quotas, exact redirects, SMTP delivery, gateway/proxy trust and behavior across application instances. Server-side requests currently share the application server's upstream IP bucket; do not forward untrusted browser headers as end-user IPs or assume this local check proves deployed per-user isolation. Configure the chosen host's trusted client-IP/anonymous abuse controls and test them as part of Stage 13. [Supabase rate-limit documentation](https://supabase.com/docs/guides/auth/rate-limits).

## Live acceptance checklist

- [x] Apply migration locally; verify grants/RLS and private-schema exposure.
- [x] Register two synthetic adults through the unchecked age checkbox; confirm captured emails; inspect persisted declaration version/time.
- [x] Verify invalid credentials, duplicate signup, unconfirmed email, expiry/refresh, persisted preferences and sign-out.
- [x] Verify under-18 refusal, direct registration, incomplete onboarding and forged/expired cookies cannot unlock private routes.
- [x] Verify recovery email, expired/reused token, different-account cookie, password update and fresh sign-in; ordinary sessions cannot perform recovery updates.
- [x] Verify two independently authenticated users, changed target IDs, anonymous access and stale versions.
- [x] Verify trusted administrator provisioning, ordinary-user denial and private-table restrictions.
- [x] Verify provider outage, safe user-facing errors and production private-route denial.
- [x] Verify native anonymous Auth limits in the selected local environment, spoofed forwarding-header rejection and user-facing retry behavior. Deployment-specific verification is explicitly tracked in Stage 13.
- [x] Review connected mobile preferences and responsive account screens; pending features do not display private mock data. The separate pre-pilot manual keyboard/device/accessibility review remains required.
- [x] Build and run production checks with configured environment; scan client assets for server secrets.
- [x] Perform a local backup/restore drill.

## Migration, rollback and restore procedure

Run `npm run test:database` before applying a migration. Apply versioned migrations first to a fresh development environment, then verify real Auth/RLS integration. Record the migration version/environment and test results without credentials or private records. Future schema changes use new migration files; do not edit an already deployed migration.

Before modifying a populated environment, take a provider database backup that preserves the managed Auth identities as well as the public/private application schema. Also retain versioned migrations and a separately protected export of any required application data. Database backups do not cover Storage image objects: follow the [Stage 9 object recovery procedure](./storage-recovery.md) and keep the image manifest/export with its matching database snapshot.

Restore into an isolated development project, verify Auth IDs and ownership foreign keys, apply only later migrations, and rerun the two-user access checklist. The executed local drill passed: `test:auth` dumps Auth/public/private into ignored `.local-backups`, then `scripts/test-local-restore.mjs` restores to a fresh unique database using trusted local `supabase_admin`, preserves grants, verifies two identities/conversations, checks one-owner/zero-other RLS results and trusted administrator membership, and removes only that disposable copy. Auth exports contain sensitive records and must stay ignored and protected. This does not establish hosted production recovery objectives or Storage-object backup. For application rollback, deploy the previous compatible application and a reviewed corrective forward migration; do not drop ownership tables or Auth users automatically.

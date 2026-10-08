# Stage 8 development setup

8 October 2026. Supabase approved and running locally through Docker; the foundation migration is applied and ignored `.env.local` is configured. Real integration verification is in progress. No hosted or production project is connected.

## Environment

Copy `.env.example` to ignored `.env.local`, then supply the development project URL and **publishable** key, canonical site origin and a locally generated `AUTH_FLOW_SECRET` of at least 32 characters. The example contains the secret-generation command. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable. No elevated database key is needed by the application.

Set `NEXT_PUBLIC_TALKINGSTAGE_MODE=supabase` to use real services in development. Omit that flag to review the accepted frontend fixtures. Production always uses real services, even if the flag requests mock mode. Restart development after changing environment variables; build production with its actual public configuration. These are environment variables embedded by Next.js, not settings editable through the UI.

For a hosted **development** project, apply `supabase/migrations/202610080001_foundation.sql` through a trusted migration connection/CLI. The initial migration assumes a fresh application schema; existing users need an explicitly reviewed backfill rather than fabricated declaration timestamps. Keep `private` outside the Data API's exposed schemas; public profile/cast reads use RLS. Trusted database provisioning is the only path to `private.user_roles`. User metadata cannot grant administrator rights.

For local development, start Docker Desktop, run `npm run backend:start`, then `npm run backend:configure`. Supabase CLI 2.120.0 is pinned; `supabase init` has already generated the checked-in configuration. The startup command runs database/Auth/REST/gateway/local inbox containers and applies the checked-in migration. The configure script fills missing local environment values without displaying credentials or overwriting a different Supabase project. `npm run backend:stop` stops this project's containers while preserving its local database.

The application runs on localhost:3000, Supabase API on 127.0.0.1:54321 and the captured email inbox on 127.0.0.1:54324. Local emails are captured by Mailpit and do not reach external inboxes. Hosted production SMTP remains a separate pre-launch configuration dependency.

## Authentication configuration

Use email/password authentication, a minimum 12-character password, and email confirmation. Configure the site URL and approved redirects for the exact development origin. Configure confirmation and recovery templates to link to this application's token-hash route:

```text
Confirmation: {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup
Recovery:     {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
```

The route accepts only those two purposes and fixed internal destinations. Recovery creates a signed, HttpOnly, user-bound, 30-minute recovery cookie; a regular signed-in session alone cannot change a password through the recovery action. Consumed/expired tokens get a useful link-failure screen. No arbitrary `next` redirect is accepted. Configure SMTP for hosted delivery before claiming registration/recovery work. Official references: [password authentication](https://supabase.com/docs/guides/auth/passwords), [SSR client/session integration](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

The 18+ checkbox comes before registration. Its server action creates a signed short-lived declaration cookie. Registration requires that cookie and AI/terms consent; a profile trigger records declaration version/time at account creation. This is accepted self-declaration, not independent verification. Private access additionally requires validated identity, saved preferences and explicit completion consent.

Preferences accept only name, allowed genders/language, request choice and expected version. Actor ID, age/access flags and administrator role are never submitted as editable preferences. Atomic database limits allow 30 successful account mutations per user per minute; errors roll back the transaction and are not counted. Supabase Auth's limits must be configured/tested for registration, sign-in and email requests. Deployment-level anonymous abuse controls still require environment-specific configuration and verification before Stage 8 completion.

## Live acceptance checklist

- [ ] Apply the migration in the selected development environment; verify grants/RLS and private-schema exposure.
- [ ] Register two synthetic adults through the unchecked age checkbox; confirm emails; inspect persisted declaration version/time.
- [ ] Verify invalid credentials, duplicate signup response, unconfirmed email, expiry/refresh, refresh after preferences, and sign-out.
- [ ] Verify under-18 refusal, direct registration without the declaration cookie, incomplete onboarding and forged/expired cookies cannot unlock private routes.
- [ ] Verify recovery email, expired/reused token, different-account recovery cookie, password update and subsequent fresh sign-in. A normal session must fail the recovery update.
- [ ] Verify profile reads/updates and RLS with two independently authenticated users, changed target IDs, signed-out requests and stale versions.
- [ ] Provision a synthetic admin through the trusted database connection. Confirm ordinary users cannot grant themselves that role or read private tables. Verify admin route enforcement.
- [ ] Test Auth and deployment rate limits, missing/invalid configuration, provider outage and safe user-facing errors.
- [ ] Review the connected account screens on mobile and keyboard navigation; pending feature pages must not display private mock data.
- [ ] Rebuild and run production checks with the configured environment; inspect client assets for server secrets.
- [ ] Perform a development backup/restore drill and record evidence.

## Migration, rollback and restore procedure

Run `npm run test:database` before applying a migration. Apply versioned migrations first to a fresh development environment, then verify real Auth/RLS integration. Record the migration version/environment and test results without credentials or private records. Future schema changes use new migration files; do not edit an already deployed migration.

Before modifying a populated environment, take a provider database backup that preserves the managed Auth identities as well as the public/private application schema. Also retain versioned migrations and a separately protected export of any required application data. Database backups do not cover future Storage image objects: Stage 9 must add a storage backup plan.

Restore into an isolated development project, verify Auth IDs and ownership foreign keys, apply only later migrations, and rerun the two-user access checklist. Record duration, failure/recovery steps and sample counts without private content. This is a procedure, not an executed restore drill. For application rollback, deploy the previous compatible application and a reviewed corrective forward migration; do not drop ownership tables or Auth users as an automatic rollback. Destructive resets are restricted to explicitly disposable local/test databases.

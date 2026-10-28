# TalkingStage

A mobile-first Nigerian AI companionship experience for adults, built with Next.js and TypeScript. The accepted frontend connects to Supabase Auth, Postgres and private Storage. Hosted publication of 22 characters and 44 current photos is recorded; Claude Haiku activation and a successful live reply are recorded on 15 October 2026. Stage 10 evaluation and the integration/release gates remain open.

Start with [current project status](docs/project-status.md). It distinguishes current configuration, historical acceptance evidence and unfinished launch work.

## Development

Run `npm run dev`, then open [TalkingStage](http://localhost:3000).

The [design-system preview](http://localhost:3000/dev/design-system) is available only in development. It demonstrates components, responsive shells, and synthetic mock scenarios. It is excluded from production browser assets and returns 404 in production.

The [administration preview](http://localhost:3000/admin/access) is also development-only in mock mode. Select the synthetic admin role to review cast, assets, reports, ledger, capability switches, analytics and audit. In Supabase mode, administrator access requires a server-provisioned role and completed adult onboarding.

For a new local environment, follow [Stage 8 setup](docs/stage-8-setup.md) and configure an ignored `.env.local` from `.env.example`. The existing application was switched to hosted services; see [hosted setup](docs/hosted-setup.md) before using operational commands. Development without the Supabase mode flag retains the frontend preview. Production always requires real Supabase authentication and fails closed when configuration is missing. Cast editing, image publication, discovery, conversations, explicit memories and reporting have connected implementations. Runtime AI is restricted to Anthropic Claude (Haiku 5.5 in production; Sonnet 5.5 supported) and requires both server configuration and approved database budgets; see [current activation](docs/claude-haiku.md). Payments and remaining privacy/operational acceptance are pending.

## Checks

- `npm run check:engineering` — Fail-fast lint, TypeScript and 14 offline core suites. Requires no service credentials, Docker or paid AI calls. Browser/build acceptance remains separate.
- `npm run test:reply-recovery` / `test:reply-boundaries` — Recovery policy and actual server entry points with injected framework/Auth/provider failures.
- `npm run lint` — ESLint.
  On Windows PowerShell with script execution disabled, use `npm.cmd` for these commands.
- `npm run backend:start` / `backend:configure` / `backend:stop` — Start, configure and stop this project's local Supabase stack; stopping preserves its database.
- `npm run backend:limits` — Idempotently enable the pinned local Auth version's native IP limits. `backend:start` runs this automatically; use the wrapper instead of bare `supabase start`.
- `npm run test:auth` — Real local Auth, captured-email, ownership, role, session, recovery, outage and isolated restore checks on localhost:3102. Requires Docker and removes only its own synthetic records.
- `npm run typecheck` — TypeScript.
- `npm run test:database` — Execute the migration and two-actor ownership checks in local PostgreSQL through PGlite. Does not test a Supabase deployment or email delivery.
- `npm run test:cast-database` — PostgreSQL cast role/adult access, draft validation/versions, snapshot preservation, deactivation and audit checks.
- `npm run test:assets-database` / `test:images` — Asset review/publication eligibility and byte-level image inspection/normalization checks.
- `npm run test:stage9` — Current migration-chain checks for audited failures, public-only preview and a 70-character paginated catalog.
- `npm run test:conversations-database` — Owned, ordered, idempotent saved messages and conversation lifecycle/pause/memory-retention checks.
- `npm run test:reply-integration` — Complete migration-chain checks for private context, memory consent, reply leases, budgets, retries, cancellation and stale-output rejection.
- `npm run test:ai-provider` — Offline injected-transport checks for the optional AI adapter; makes no network calls.
- `npm run test:photo-replies` — Approved photo selection, version/pause/ownership checks and atomic idempotent text/photo replies with an offline transport.
- `npm run test:summaries` — Extractive summary scope, source validation, independent budgets and privacy invalidation through the offline database/provider pipeline.
- `npm run test:requests` — Request preferences, independent mute/refusal, reset retention, policy eligibility and copied-context invalidation without AI or payment calls.
- `npm run test:storage-restore` — Isolated local synthetic image backup/restore, checksum and private-access drill; see [recovery procedure](docs/storage-recovery.md).
- `npm test` — Playwright UI and mock-contract checks. Uses installed Microsoft Edge; configure the browser channel if testing on another system. Runs an isolated mock-mode server on localhost:3103.
- `npm run build` — Production build.
- `npm run check:production` — After building, checks development-tool exclusion and production responses using temporary port 3101. Stops its own server afterward.

## Working documents

- [Implementation roadmap](docs/implementation-plan.md)
- [Current status and remaining gates](docs/project-status.md)
- [Engineering hardening and verification](docs/reviews/engineering-hardening.md)
- [Stylesheet ownership and cascade](docs/styles.md)
- [Design system](docs/design-system.md)
- [Stage 0 planning/contracts](docs/stage-0/README.md)
- [Stage 1 review](docs/reviews/stage-1.md)
- [Stage 2 review](docs/reviews/stage-2.md)
- [Stage 3 discovery/profile review](docs/reviews/stage-3.md)
- [Stage 4 messages/chat review](docs/reviews/stage-4.md)
- [Chat mock contracts and persistence rules](docs/stage-4-contracts.md)
- [Stage 5 settings, memory, payments and reporting review](docs/reviews/stage-5.md)
- [Personal-space mock contracts and deletion semantics](docs/stage-5-contracts.md)
- [Stage 6 administration review](docs/reviews/stage-6.md)
- [Administration contracts and publication rules](docs/stage-6-contracts.md)
- [Stage 7 frontend quality review](docs/reviews/stage-7.md)
- [Frontend integration contract index](docs/frontend-contracts.md)
- [Frontend gate decisions and acceptance worksheet](docs/stage-7-decisions.md)
- [Mandatory manual review before private-pilot access](docs/pre-pilot-manual-review.md)
- [Stage 8 architecture preparation](docs/stage-8-architecture.md)
- [Stage 8 setup and live acceptance checklist](docs/stage-8-setup.md)
- [Stage 8 implementation evidence](docs/reviews/stage-8.md)
- [Stage 9 cast contracts and remaining integration](docs/stage-9-contracts.md)
- [Stage 9 review](docs/reviews/stage-9.md)
- [Stage 10 conversation contracts and remaining integration](docs/stage-10-contracts.md)
- [Stage 10 review](docs/reviews/stage-10.md)
- [Stage 10 AI setup and activation](docs/stage-10-ai-setup.md)
- [Stage 10 live evaluation worksheet](docs/stage-10-evaluation.md)

Use the frontend-design skill for every frontend design implementation. See `AGENTS.md` for continuing project instructions.

## Boundaries

Local integration evidence covers accounts, ownership, roles, throttling, outages and restore. Later hosted records cover cast/photo publication, selected two-account/browser checks, encrypted backups to this machine and basic live Haiku integration. These records do not establish deployed-site acceptance or complete Stage 10. Hosted recovery delivery, off-site protection, alerts, enabled general-user deletion, payments, live-model evaluation and manual accessibility/device gates remain open. Development mock data is synthetic and disposable; mock chat uses character-specific scripted samples. Free-form mock text stays in memory and becomes a visible placeholder on refresh; only offered sample messages persist verbatim. The two self-hosted fonts and their licences are in `app/fonts/`.

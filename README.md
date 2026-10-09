# TalkingStage

A mobile-first Nigerian AI dating experience for adults, built with Next.js and TypeScript. The frontend is accepted and Stages 8–9 are complete for local backend handoff. The approved eight-character cast is published locally; Stage 10 conversation persistence is in progress, with live AI replies still unavailable.

## Development

Run `npm run dev`, then open [TalkingStage](http://localhost:3000).

The [design-system preview](http://localhost:3000/dev/design-system) is available only in development. It demonstrates components, responsive shells, and synthetic mock scenarios. It is excluded from production browser assets and returns 404 in production.

The [administration preview](http://localhost:3000/admin/access) is also development-only in mock mode. Select the synthetic admin role to review cast, assets, reports, ledger, capability switches, analytics and audit. In Supabase mode, administrator access requires a server-provisioned role and completed adult onboarding.

To connect authentication, follow [Stage 8 setup](docs/stage-8-setup.md) and configure an ignored `.env.local` from `.env.example`. Development without the Supabase mode flag retains the frontend preview. Production always requires real Supabase authentication and fails closed when configuration is missing. Cast editing, image review/publication, discovery, conversation persistence and explicit saved memories now use real local services. The [optional AI integration](docs/stage-10-ai-setup.md) is wired but disabled without keys, a selected model and approved private spending configuration. Payments and full privacy integration remain pending.

## Checks

- `npm run lint` — ESLint.
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

Supabase authentication, the database and private image Storage are connected locally; real account, ownership, role, throttling, outage, database restore, synthetic Storage restore and approved-cast publication checks passed. Eight owner-approved profiles and sixteen inspected photos are published locally. Hosted SMTP, deployed quotas/client-IP handling and production recovery objectives require separate pre-pilot verification. AI, payments and full privacy integration remain later stages. Development mock data is synthetic and disposable; mock chat uses character-specific scripted samples. Free-form mock text stays in memory and becomes a visible placeholder on refresh; only offered sample messages persist verbatim. The two self-hosted fonts and their licences are in `app/fonts/`.

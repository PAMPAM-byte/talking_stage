# TalkingStage

A mobile-first Nigerian AI dating experience for adults, built with Next.js and TypeScript. The frontend is accepted for backend handoff; Stage 8 Supabase implementation is underway.

## Development

Run `npm run dev`, then open [TalkingStage](http://localhost:3000).

The [design-system preview](http://localhost:3000/dev/design-system) is available only in development. It demonstrates components, responsive shells, and synthetic mock scenarios. It is excluded from production browser assets and returns 404 in production.

The [administration preview](http://localhost:3000/admin/access) is also development-only in mock mode. Select the synthetic admin role to review cast, assets, reports, ledger, capability switches, analytics and audit. In Supabase mode, administrator access requires a server-provisioned role and completed adult onboarding.

To connect authentication, follow [Stage 8 setup](docs/stage-8-setup.md) and configure an ignored `.env.local` from `.env.example`. Development without the Supabase mode flag retains the frontend preview. Production always requires real Supabase authentication and fails closed when configuration is missing. Feature adapters for cast/chat/payments/privacy remain development mocks until their respective backend stages; Supabase mode shows availability states instead of mock private data.

## Checks

- `npm run lint` — ESLint.
- `npm run typecheck` — TypeScript.
- `npm run test:database` — Execute the migration and two-actor ownership checks in local PostgreSQL through PGlite. Does not test a Supabase deployment or email delivery.
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

Use the frontend-design skill for every frontend design implementation. See `AGENTS.md` for continuing project instructions.

## Boundaries

Supabase authentication and the database are connected to a local Docker development stack; real integration verification is in progress. AI, storage, payments and full privacy integration remain later stages. Mock data is synthetic and disposable. Eight draft profiles and sixteen generated portrait/gallery assets are available for frontend review; cast and publication approval remain pending. Chat uses character-specific scripted samples. Free-form written text stays in memory and becomes a visible placeholder on refresh; only offered sample messages persist verbatim. The two self-hosted fonts and their licences are in `app/fonts/`.

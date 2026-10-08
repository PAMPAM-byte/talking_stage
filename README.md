# TalkingStage

A mobile-first Nigerian AI dating experience for adults, built with Next.js and TypeScript. The launch frontend is being completed before backend implementation.

## Development

Run `npm run dev`, then open [TalkingStage](http://localhost:3000).

The [design-system preview](http://localhost:3000/dev/design-system) is available only in development. It demonstrates components, responsive shells, and synthetic mock scenarios. It is excluded from production browser assets and returns 404 in production.

The [administration preview](http://localhost:3000/admin/access) is also development-only. Select the synthetic admin role to review cast, assets, reports, ledger, capability switches, analytics and audit. It does not establish secure access; production administration routes show an unavailable screen.

## Checks

- `npm run lint` — ESLint.
- `npm run typecheck` — TypeScript.
- `npm test` — Playwright UI and mock-contract checks. Uses installed Microsoft Edge; configure the browser channel if testing on another system. Reuses a development server on localhost:3000, or starts one if needed.
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

Use the frontend-design skill for every frontend design implementation. See `AGENTS.md` for continuing project instructions.

## Boundaries

There are no connected authentication, AI, database, storage, or payment services yet. Mock data is synthetic and disposable. Eight draft profiles and sixteen generated portrait/gallery assets are available for frontend review; cast and publication approval remain pending. Chat uses character-specific scripted samples. Free-form written text stays in memory and becomes a visible placeholder on refresh; only offered sample messages persist verbatim. The two self-hosted fonts and their licences are in `app/fonts/`.

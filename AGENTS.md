<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## TalkingStage project rules

- Use the `frontend-design` skill for every frontend design implementation, as explicitly requested by the user. Read `C:/Users/OLUWAPAMILERIN/.agents/skills/frontend-design/SKILL.md` when applying it and follow `docs/design-system.md`.
- Follow `docs/implementation-plan.md` and the planning contracts in `docs/stage-0/`. Complete all launch frontend work, including admin and required states, before implementing backend services (Stage 7 gate).
- During frontend stages use local, clearly labelled mock data. Do not integrate authentication, database, AI, storage, payments, webhooks, or backend business operations.
- Preserve the non-explicit launch scope and distinguish provisional fixture decisions from founder-approved product decisions.

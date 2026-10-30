# TalkingStage

**A little banter. A little chemistry.**

TalkingStage is a mobile-first Nigerian AI dating and chat app for adults (18+). Users browse a cast of fictional AI characters, tap **Meet**, and text them. The characters write like real Naija people, in English or English with Pidgin.

**Live:** [www.talkingstage.buzz](https://www.talkingstage.buzz)

> Every character is fictional and AI-powered, and every photo is AI-generated. Chats label each character "AI character". Conversations are flirty but non-explicit.

## Highlights

- **50 characters, women and men.** Each has a job, a home city in Nigeria or the diaspora, a backstory and a distinct voice.
- **Swipe Discover.** One card at a time, with Pass, Meet and Undo, gender filters and a first-visit swipe guide.
- **Replies that feel like texting.** Replies are short, sometimes split into two or three bubbles, with read ticks and a typing indicator. Users can quote-reply to a message or react to a single bubble.
- **Expressive chat.** Emoji, illustrated stickers and GIFs. Characters can also send approved AI-generated photos.
- **Memory you control.** Characters remember only what a user chooses to keep, and users can edit or delete those memories in Settings.
- **Safety built in:**
  - an 18+ gate
  - reporting for any message, photo or character
  - archiving, resetting or deleting a chat
  - account deletion with a 30-day restore window
- **Installable web app.** Add it to the Home Screen on Android or iPhone; no app store needed.
- **Admin console.** Covers cast and photo publishing, report review, AI spend, payments reconciliation and an audit log.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | [Next.js](https://nextjs.org) 16 (App Router, Turbopack), React 19, TypeScript |
| Data and auth | [Supabase](https://supabase.com) (Postgres with row-level security, Auth and private Storage) |
| AI | Anthropic Claude Sonnet 5.5, called only from the server, with per-user and site-wide daily budgets |
| Email | Resend, through Supabase Auth SMTP |
| Bot protection | Cloudflare Turnstile on sign-up, sign-in and recovery |
| Payments | Bachs hosted checkout for optional gifts in NGN, off by default |
| Hosting | Vercel |
| Testing | Playwright for the browser; PGlite for offline database tests |

## How it works

```
Browser ──► Next.js server (Vercel)
              ├─ Supabase Auth: sessions, email confirmation, roles
              ├─ Postgres: RLS-owned messages, reply leases, budgets, audit
              ├─ Private Storage: character photos served through signed access
              └─ Claude: reply generation, reserved up front and settled to actual cost
```

- The browser never calls Supabase or the AI provider directly. Every operation goes through server actions or route handlers.
- Each reply reserves its worst-case cost before the model is called and settles to the actual token cost afterwards.
- Retries are idempotent, and stale or interrupted replies are rejected rather than duplicated.

## Getting started

**Requirements:** Node.js 20.9 or later (developed on 24). Docker is needed only for the local Supabase stack.

```bash
npm install
cp .env.example .env.local   # fill in the values you need
npm run dev                  # http://localhost:3000
```

- **Without Supabase configured:** the app runs as a frontend preview with clearly labelled, synthetic mock data. In development this includes:
  - a [design-system preview](http://localhost:3000/dev/design-system)
  - an [admin preview](http://localhost:3000/admin/access)

  Neither is included in production builds.
- **Production:** always requires real Supabase authentication, and fails closed when configuration is missing.
- **Local backend:** run `npm run backend:start` and follow the [setup guide](docs/stage-8-setup.md).
- **Hosted environment:** see [hosted setup](docs/hosted-setup.md).

On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`.

## Quality checks

| Command | What it covers |
| --- | --- |
| `npm run check:engineering` | Lint, TypeScript and all 47 offline core suites. Needs no credentials, Docker or paid AI calls. Run it before every PR. |
| `npm test` | Playwright browser and mock-contract checks on an isolated server (port 3103). |
| `npm run build` then `npm run check:production` | Production build, plus checks that development tools are excluded and production responses are correct. |
| `npm run test:auth` | Real local Auth, ownership, roles, sessions and recovery. Needs Docker. |
| `npm run test:database` | Migration chain and two-account ownership checks in PGlite. |

Individual suites, such as `test:reply-integration`, `test:ai-provider` and `test:summaries`, are listed in `package.json`.

## Project structure

```
app/              Routes, layouts and stylesheets (App Router)
components/       UI components, including chat, Discover, settings and admin
lib/              Domain logic: ai, backend, chat, payments, monitoring, seo
supabase/         Configuration and 31 versioned SQL migrations
scripts/          Offline test suites, activation scripts and operations tools
tests/            Playwright browser tests
tests-auth/       Real-auth browser tests (local Supabase)
docs/             Design system, contracts, reviews and runbooks
```

## Documentation

- [Current project status](docs/project-status.md): dated record of what is live, verified and still open
- [Design system](docs/design-system.md): identity, components, motion and dated design decisions
- [Implementation plan](docs/implementation-plan.md): the staged roadmap and release gates
- [AI configuration and activation](docs/claude-haiku.md) and [AI setup](docs/stage-10-ai-setup.md)
- [Payments (Bachs)](docs/bachs-payments.md)
- [Hosted setup](docs/hosted-setup.md), [backups](docs/hosted-backups.md) and [incident runbook](docs/incident-runbook.md)
- [Stylesheet ownership](docs/styles.md) and [frontend contracts](docs/frontend-contracts.md)
- Stage reviews and contracts are in [`docs/reviews/`](docs/reviews) and [`docs/stage-0/`](docs/stage-0/README.md)

## Status

TalkingStage is live at [www.talkingstage.buzz](https://www.talkingstage.buzz). Accounts, Discover, chat, AI replies, memories, reporting and account deletion are in production.

Still open:
- Optional gifts are implemented but switched off until merchant setup and sandbox acceptance are complete.
- Alerting, off-site backups and manual device and accessibility checks.

[Project status](docs/project-status.md) is the source of truth.

## Contributing

- Work on a branch and open a pull request; `main` is never pushed to directly.
- Run `npm run check:engineering` before opening a PR.
- Follow the [design system](docs/design-system.md) for any UI change.
- Read [`AGENTS.md`](AGENTS.md) for the standing project rules.

Self-hosted fonts (Manrope and DM Serif Display) and their licences are in `app/fonts/`.

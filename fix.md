# TalkingStage fix plan

24 October 2026 · Implementation guide for [docs/dating-app-readiness-review.md](docs/dating-app-readiness-review.md) · Repository state: commit `aab4d79`

This is the step-by-step plan for the review's Phase 0 and Phase 1 items, with exact files, code, SQL and commands. Each fix lists the review item it closes (for example `A1`), the change, how to verify it, and how to roll it back. Fixes are ordered so that each one only depends on fixes above it.

---

## 0. Ground rules

Follow these for every fix. They come from `AGENTS.md`, `docs/styles.md` and the existing engineering practice.

1. **One fix per branch and pull request.** Branch from `main` as `fix/<id>-<short-name>`, e.g. `fix/f01-test-credentials`.
2. **Read before coding.** Before changing Next.js code, read the matching guide in `node_modules/next/dist/docs/`; this Next.js version differs from older documentation. UI changes must use the frontend-design skill and [docs/design-system.md](docs/design-system.md).
3. **Database changes are new migrations only.** Never edit an applied migration. The next file is `supabase/migrations/202610240028_<name>.sql`; increment the last four digits after that. Every `SECURITY DEFINER` function sets `search_path = ''`, matching the existing 102 functions.
4. **Run checks before opening a pull request:**
   ```powershell
   npm.cmd run check:engineering   # lint + typecheck + offline core suites
   npm.cmd test                    # mock-mode browser checks
   npm.cmd run build
   npm.cmd run check:production
   ```
   Add `npm.cmd run test:auth` when the change touches auth, the database or connected screens (needs Docker).
5. **Never print or commit secrets.** New variables go into `.env.example` with empty values and a comment.
6. **Record evidence.** Add a dated entry to [docs/project-status.md](docs/project-status.md) stating what passed and what is still open, as existing entries do.
7. **Founder decisions stay with the founder.** Fixes marked **Decision needed** must not be merged until the decision is written down.

### Accounts and keys needed before starting

| Need | Used by | Notes |
| --- | --- | --- |
| Transactional email provider (Resend, Postmark or Amazon SES) and a sending domain | F03 | Needs DNS access for SPF/DKIM/DMARC |
| Cloudflare account (Turnstile) | F04 | Free; gives a site key and a secret |
| Hosting account (Vercel recommended) and a production domain | F07, F12 | A Pro or team plan is needed for commercial use; confirm on vercel.com/pricing |
| GitHub repository with Actions enabled | F07 | Stores CI secrets |
| Separate staging and production Supabase projects | F07 | Production on a paid plan with point-in-time recovery; confirm on supabase.com/pricing |
| Error-tracking account (Sentry) | F08 | Use the EU region if available, to match privacy commitments |
| VAPID key pair | F11 | Generated locally; no account needed |

---

## Phase 0: before any real user

### F01 · Remove the committed test credentials (H4)

**Problem.** `lib/backend/local-test-account.json` holds a real email/password pair and is tracked by git. It is imported by `components/account-flow.tsx:7`, `scripts/configure-local-test-account.mjs:9` and two Playwright specs in `tests-auth/`. The component is a server component and only passes the credentials to the browser when the local-test gate is on, so the exposure is git history plus any hosted account using that password.

**Steps**

1. Rotate first. If an account `tester@talkingstage.example` exists on any hosted project, delete it or change its password in Supabase → Authentication → Users.
2. Stop tracking the file and keep a template:
   ```powershell
   git mv lib/backend/local-test-account.json lib/backend/local-test-account.example.json
   ```
   Replace the password in the `.example` file with `"change-me-locally"`. Copy it back to `local-test-account.json` locally, then add the copy to `.gitignore`:
   ```gitignore
   # Local-only synthetic credentials
   /lib/backend/local-test-account.json
   ```
3. Make the importers tolerate the file being absent. In `components/account-flow.tsx`, replace the static JSON import with a server-only read that runs only when the existing gate passes:
   ```ts
   import { readFile } from 'node:fs/promises';
   async function localTestCredentials() {
     try { return JSON.parse(await readFile(new URL('../lib/backend/local-test-account.json', import.meta.url), 'utf8')); }
     catch { return undefined; }
   }
   ```
   Call it only inside the existing `TALKINGSTAGE_LOCAL_TEST_ACCOUNT=1` + loopback branch (line 20). In the two `tests-auth` specs, read the same file with `fs` and fail with a clear message if it is missing.
4. Rewriting history is optional. The address is on a reserved `.example` domain, so rotating the password (step 1) is enough. Don't rewrite published history unless the password was reused somewhere real.

**Verify.** `git ls-files lib/backend` no longer lists the JSON. `npm.cmd run test:auth` still passes locally with the copied file. `npm.cmd run build` succeeds without the file.

**Rollback.** Restore the import; nothing else depends on it.

---

### F02 · Security headers (H2)

**Problem.** `next.config.ts` defines no `headers()`, so pages are sent without CSP, HSTS, framing or referrer protection.

**Constraint found in this codebase.** `next.config.ts` sets `cacheComponents: true` and `partialPrefetching: true`. The installed guide (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`) says nonce-based CSP needs every page to be dynamically rendered and is incompatible with prerendered static shells. Use a header-based CSP instead; Next's inline bootstrap scripts then need `'unsafe-inline'`. It still blocks scripts from other origins, framing and plugin content. Hardening it later with experimental SRI is noted in Phase 2.

**Steps**

1. In `next.config.ts`, add the headers. Start in **report-only** mode for one week of staging traffic:
   ```ts
   const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : '';
   const supabaseSocket = supabaseOrigin.replace(/^https:/, 'wss:');
   const isDev = process.env.NODE_ENV === 'development';
   const csp = [
     "default-src 'self'",
     `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
     "style-src 'self' 'unsafe-inline'",
     "img-src 'self' data: blob:",
     "font-src 'self'",
     `connect-src 'self' ${supabaseOrigin} ${supabaseSocket}`.trim(),
     'frame-src https://challenges.cloudflare.com',
     "worker-src 'self'",
     "manifest-src 'self'",
     "object-src 'none'",
     "base-uri 'self'",
     "form-action 'self'",
     "frame-ancestors 'none'",
     'upgrade-insecure-requests',
   ].join('; ');
   const securityHeaders = [
     { key: process.env.TALKINGSTAGE_CSP_ENFORCE === '1' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only', value: csp },
     { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
     { key: 'X-Content-Type-Options', value: 'nosniff' },
     { key: 'X-Frame-Options', value: 'DENY' },
     { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
     { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
   ];
   // inside nextConfig:
   async headers() {
     return [{ source: '/(.*)', headers: securityHeaders }];
   },
   ```
   - Add the Sentry ingest origin to `connect-src` when F08 lands.
   - Leave `preload` off the HSTS header until the production domain has served HTTPS for some weeks.
2. The proxy's 503 page (`proxy.ts:50`) uses inline `style` attributes, which `'unsafe-inline'` covers. Don't add inline `<script>` there.
3. Add `TALKINGSTAGE_CSP_ENFORCE=` (empty) to `.env.example`, with a comment.
4. Test the full journey in Chrome and Safari with DevTools open: sign-in, Discover, chat with photos and stickers, the gift review and the redirect to the Bachs checkout. Fix any reported violations.
5. Set `TALKINGSTAGE_CSP_ENFORCE=1` in staging, repeat step 4, then turn it on in production.

**Verify.** `curl -sI https://<staging-domain>/ | findstr /i "content-security strict-transport x-frame referrer permissions"` lists every header. Run the domain through securityheaders.com and the Mozilla HTTP Observatory, and fix every red item except `'unsafe-inline'`, which is expected under this constraint.

**Rollback.** Unset `TALKINGSTAGE_CSP_ENFORCE` to fall back to report-only.

---

### F03 · Production email delivery (B1)

**Problem.** Password recovery depends on email, but `supabase/config.toml:240` has `[auth.email.smtp]` commented out and `email_sent = 2` per hour, and [docs/hosted-setup.md](docs/hosted-setup.md) records delivery as unverified. Supabase's built-in mailer is for testing only.

**Steps**

1. In the email provider, verify a sending domain such as `mail.<your-domain>`. Add the SPF, DKIM and DMARC records it gives you (start DMARC at `p=none`, tighten later).
2. In each hosted Supabase project, go to Authentication → Emails → SMTP Settings and enable custom SMTP: host, port 465 or 587, username, password, sender `no-reply@mail.<your-domain>`, sender name `TalkingStage`. Then raise the email rate limit under Authentication → Rate Limits, for example to 100 per hour, and review it after the pilot.
3. Mirror the settings locally so `config.toml` documents the intent. Don't commit the password:
   ```toml
   [auth.email.smtp]
   enabled = true
   host = "smtp.resend.com"   # use your provider's host
   port = 465
   user = "resend"            # provider-specific
   pass = "env(SMTP_PASSWORD)"
   admin_email = "no-reply@mail.example.com"
   sender_name = "TalkingStage"
   ```
4. Brand the existing templates (`supabase/templates/confirmation.html` and `recovery.html`). Keep the `{{ .TokenHash }}` link to `/auth/confirm` that `app/auth/confirm/route.ts` already verifies.
5. Add `SMTP_PASSWORD=` to `.env.example`.

**Verify.** Request a recovery link from staging to a Gmail, a Yahoo and an Outlook address. Each arrives within a minute, lands in the inbox rather than spam, and completes the reset at `/recover/complete`. Record the evidence in `docs/hosted-setup.md`.

**Docs.** supabase.com/docs/guides/auth/auth-smtp and your provider's Supabase SMTP page.

---

### F04 · Email confirmation, CAPTCHA and safe password changes (B2, B4)

**Problem.** `enable_confirmations = false`, `secure_password_change = false` and there is no CAPTCHA (`supabase/config.toml:229-231`). Throwaway accounts each receive their own daily AI budget.

**Code dependency found.** `submitAccount("register")` in `lib/backend/account-actions.ts:49-50` treats a missing session as an error. With confirmation on, `signUp` returns a user but no session until the email link is clicked. Turning on the setting without the code change below breaks registration.

**Steps**

1. **Code: registration.** In `lib/backend/account-actions.ts`, replace lines 49–50:
   ```ts
   if (data.session) return { destination: "/onboarding/preferences" };
   return { message: "Check your email to confirm your address. The link opens TalkingStage and continues your setup." };
   ```
   `app/auth/confirm/route.ts` already verifies `type=signup` and redirects to `/onboarding/preferences`; no change is needed there. Make sure the confirmation template links to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.
2. **Code: CAPTCHA.**
   - Add the Cloudflare Turnstile widget to the register, sign-in and recover forms in `components/real-account-form.tsx`. Load `https://challenges.cloudflare.com/turnstile/v0/api.js`, already allowed by F02's CSP, and post the token as `captchaToken`.
   - In `submitAccount`, read it with `text(form, "captchaToken")` and pass it as `options: { captchaToken }` to `signUp` and `signInWithPassword`, and as `{ redirectTo, captchaToken }` to `resetPasswordForEmail`.
   - Use Cloudflare's published test keys in development and tests, so Playwright runs do not depend on the live widget. Site key `1x00000000000000000000AA` with secret `1x0000000000000000000000000000000AA` always passes; `2x…` variants always fail.
   - A maintained React wrapper is `@marsidev/react-turnstile` (React 19 supported); render it in a client component.
   - Supabase verifies the token server-side itself, so the app does not call Cloudflare's `siteverify`.
   - Tokens are single-use and expire after 300 seconds, so reset the widget after a failed submit.
3. **Configuration.** In each hosted project:
   - Authentication → Sign In / Providers → Email: enable *Confirm email* and *Secure password change*.
   - Authentication → Attack Protection: enable CAPTCHA with provider Turnstile and paste the secret.
   - Locally, uncomment `[auth.captcha]` with `provider = "turnstile"` and `secret = "env(TURNSTILE_SECRET)"`, and set the two email flags to `true`.
4. **Password change.** Anywhere the app calls `auth.updateUser({ password })` outside the recovery flow, require the current password first. Re-use the `signInWithPassword` re-check pattern in `lib/backend/deletion-actions.ts:14`.
5. **Environment.** Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY=` and `TURNSTILE_SECRET=` to `.env.example`.
6. **UI copy.** Use the frontend-design skill. The "check your email" state reuses the existing notice component, includes a resend action (Supabase `auth.resend({ type: 'signup', email })`), and never reveals whether the address already had an account.

**Verify.**
- A new sign-up receives a confirmation email. Before clicking it, `/discover` redirects to sign-in. After clicking, the user lands on preferences.
- A form submitted without a CAPTCHA token is rejected by Supabase.
- Update `tests-auth/accounts.spec.ts` to read the confirmation link from local Inbucket/Mailpit, as the existing recovery tests do.

**Rollback.** Disable confirmation and CAPTCHA in the dashboard. The code path still accepts an immediate session.

---

### F05 · Safety: crisis resources, model-based signals, durable age flag (A1, A2)

**Problem.** `lib/ai/character-intelligence/safety.mjs:5-6` uses one English regex for minors (anchored to the start of the message) and one for distress.
- "lol im 16", "my age is 15", "i dey 16", "I'm in SS2", "i wan die" and "I'm feeling suicidal" are all missed.
- A detected minor gets a refusal for that one turn only.
- Distress handling forbids invented numbers but supplies none.

**Design.** Keep the regexes as a fast first check, and add three things:
- a model-reported signal on every reply;
- a durable server-side flag;
- a fixed, verified resource card that the model never writes.

**Steps**

1. **Verified resources (Decision needed).** The founder or a delegate must confirm current Nigerian crisis services directly with each operator: name, number, hours, languages, and the date checked. Store them in `lib/safety/crisis-resources.ts` with a `verifiedOn` date, and show nothing that hasn't been verified. Review them quarterly. International fallback directories: findahelpline.com and the IASP crisis-centre directory. Don't ship this card with unverified numbers.

   Candidates from desk research on 24 October 2026. Each still needs a phone check by the team:

   | Service | Number | Hours stated | Desk-research status |
   | --- | --- | --- | --- |
   | National emergency (NCC) | 112 | 24/7, toll-free | Confirmed on ncc.gov.ng; state coverage of call centres may be partial |
   | Lagos State emergency | 767 or 112 | Toll-free | Confirmed on Lagos State government sites |
   | She Writes Woman | 0800 800 2000 | 24/7, toll-free | Confirmed on shewriteswoman.org |
   | SURPIN (Lifeline International member) | 0800 078 7746 | 24 hours | Confirmed on lifeline-international.com; SURPIN's own site not reachable |
   | Mentally Aware Nigeria Initiative (MANI) | 0809 111 6264 · 0811 168 0686 | Not published; do not label 24/7 | Confirmed on mentallyaware.org/contact |

   Do **not** use the "Nigeria Suicide Prevention Initiative" numbers or the "0700 000 MIND" / "0800 123 4567" Lagos numbers that circulate on blogs. None could be traced to an operator, and one looks like a placeholder.
2. **Migration `202610240028_safety_signals.sql`:**
   ```sql
   create table private.safety_flags (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references public.profiles(id) on delete cascade,
     conversation_id uuid references public.conversations(id) on delete set null,
     kind text not null check (kind in ('minor_signal','distress_signal')),
     source text not null check (source in ('pattern','model')),
     created_at timestamptz not null default now(),
     reviewed_at timestamptz, reviewed_by uuid, outcome text check (outcome in ('cleared','confirmed_minor','support_offered'))
   );
   alter table private.safety_flags enable row level security;
   alter table public.profiles add column age_review_required boolean not null default false;
   alter table public.profiles add column checkins_paused_until timestamptz;

   -- A pending age review removes adult access everywhere RLS already checks it.
   create or replace function public.has_adult_access() returns boolean language sql stable security definer set search_path = '' as $$
     select exists(select 1 from public.profiles where id = (select auth.uid())
       and onboarding_complete and adult_declared_at is not null and not age_review_required);
   $$;

   create function private.record_safety_signal(p_actor uuid, p_conversation uuid, p_kind text, p_source text)
   returns void language plpgsql security definer set search_path = '' as $$
   begin
     insert into private.safety_flags(user_id, conversation_id, kind, source) values (p_actor, p_conversation, p_kind, p_source);
     if p_kind = 'minor_signal' then
       update public.profiles set age_review_required = true where id = p_actor;
     else
       update public.profiles set checkins_paused_until = now() + interval '72 hours' where id = p_actor;
     end if;
   end $$;
   revoke all on function private.record_safety_signal(uuid,uuid,text,text) from public;
   grant execute on function private.record_safety_signal(uuid,uuid,text,text) to service_role;
   ```
   Expose it to the worker through a `public` wrapper granted only to `service_role`, the same pattern as `claim_reply`. Add `checkins_paused_until > now()` as an exclusion in `claim_character_initiative` and `checkin_candidates` (both in `202610210027` / `202610200024`) through a new wrapper migration.
3. **Model signal.**
   - In `replySchema(context)` (`lib/ai/provider.mjs`), add a required `safety` object with two booleans, `minorSignal` and `distressSignal`, described as "true only if the user's latest message indicates they are under 18" and "… indicates thoughts of self-harm or suicide".
   - Update the key-count check at `provider.mjs:249` (`2+Number(...)`) to include it.
   - In `generateReply`, return `safety` alongside the text. If `minorSignal` is true, replace the text with `adultBoundary`.
4. **Pipeline.** In `lib/ai/reply-pipeline.mjs`, after a successful generation and before commit:
   - Call the signal RPC when either the regex (`assessTurn`) or the model flagged the turn.
   - On a distress signal, commit a `role='system', kind='status'` message whose fixed text comes from `crisis-resources.ts`. The `messages` table already allows this kind. Render it with the existing centred system-event style.
5. **Patterns.** Widen the regexes in `safety.mjs` without making them unanchored and noisy:
   - minor: "my age is", "i dey", "(js|jss|ss)\s?[1-3]", "secondary school"
   - distress: "wan die", "suicid", "end it all"
   
   Add positive **and negative** cases (e.g. "I'm 16 minutes away", "my sister is 15") to `scripts/test-character-intelligence.mjs` or a new `scripts/test-safety-signals.mjs` registered in `scripts/test-core.mjs`.
6. **Admin.** Add a "Safety reviews" list to the connected reports area (`components/admin/connected-reports.tsx` pattern) so an operator can clear or confirm an age flag. Every action is audited through `private.admin_audit`.
7. **Flagged user experience.** A user with `age_review_required` sees a calm page explaining that the account is paused for an age check, with support contact and sign-out. Use the frontend-design skill. Route there from `ProtectedArea` when the profile flag is set.

**Verify.**
- New offline suite passes.
- In a local browser run:
  - "lol im 16" freezes the account and shows the review page.
  - "i wan die" shows the resource card and pauses check-ins.
  - Clearing the flag in admin restores access.
- Review messages from `checkin_candidates` for paused users: none.

**Rollback.** Drop the wrapper exclusions and restore the previous `has_adult_access` body in a new migration. Keep the flags table for audit.

---

### F06 · Persistent AI disclosure (A3)

**Problem.** The AI marker was removed from chat headers on 20 October (`docs/design-system.md:23`). The Anthropic Usage Policy requires consumer chatbots to disclose AI at least at session start or in the interface. New York's and California's companion laws add session-start and three-hourly reminders.

**Steps (frontend-design skill + design system)**

1. Add a small, quiet `AI character` label beneath the character name in the connected chat header (`components/connected-conversations.tsx`, the `ChatShell` header) and in the photo viewer caption. Reuse the existing badge primitive (`components/ui/primitives.tsx`); don't add colours.
2. Add a session-start notice at the top of the message log: one line, "You're chatting with [Name], a fictional AI character." Show it once per browser session (sessionStorage key per conversation), and again after three hours of continuous visible use. Don't render it inside the `role="log"` live region announcements.
3. Record the reversal of the 20 October decision as a dated entry at the top of `docs/design-system.md`.

**Verify.** Playwright checks at 320 px and 1440 px that the label is visible on connected chat and photo viewer. A fake-timer test confirms the three-hour reminder.

---

### F07 · Hosting, environments and CI (H1, H8)

**Problem.** There is no deployment target, CI or migration pipeline. Migrations are applied by hand from one machine.

**Decision needed.** Choose the host.
- **Vercel** fits this codebase: Next 16 support, Fluid compute for 20-second `after()` model calls, built-in cron.
- **Region.** Choose one close to the Supabase project region. Supabase has no African region, so pair, for example, London or Frankfurt for both. Confirm current regions on each provider's site.

**Steps**

1. Create two Supabase projects, `talkingstage-staging` and `talkingstage-prod`, both in the same region as the host.
2. Configure host environment variables per environment from `.env.example`. Production keeps `NEXT_PUBLIC_TALKINGSTAGE_MODE` unset, because production always uses Supabase (`lib/backend/config.ts`). Set `TALKINGSTAGE_SITE_URL` to the real origin and add it to Supabase Auth → URL Configuration.
3. Add `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on:
     pull_request:
     push:
       branches: [main]
   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22, cache: npm }
         - run: npm ci
         - run: npm run check:engineering
         - run: npx playwright install --with-deps msedge
         - run: npm test
         - run: npm run build
         - run: npm run check:production
   ```
   The Playwright configs use the Edge channel, hence `msedge`. If that is unavailable on the runner, add a Chromium project to `playwright.config.ts` for CI.
4. Add `.github/workflows/migrations.yml`. It runs after CI on `main` and applies migrations to staging; production is a manual approval through a GitHub Environment:
   ```yaml
   name: Database migrations
   on:
     workflow_dispatch:
       inputs:
         target: { type: choice, options: [staging, production], required: true }
   jobs:
     push:
       runs-on: ubuntu-latest
       environment: ${{ inputs.target }}
       env:
         SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
         SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
       steps:
         - uses: actions/checkout@v4
         - uses: supabase/setup-cli@v1
           with: { version: 2.120.0 }
         - run: supabase link --project-ref ${{ vars.SUPABASE_PROJECT_REF }}
         - run: supabase db push --dry-run
         - run: supabase db push
   ```
   Feature switches currently flipped by `scripts/activate-*.mjs` should become documented SQL in the migration or a reviewed one-off run of the script against each environment. Record each run in the matching `docs/*-activation.json` file as today.
5. Turn on branch protection on `main`: require the `check` job and one review.

**Verify.**
- A pull request shows the green `check` job.
- A dispatch to staging applies pending migrations.
- `supabase migration list --linked` shows the same state locally and in staging.

**Docs.** supabase.com/docs/guides/deployment/managing-environments and vercel.com/docs/functions/configuring-functions/duration.

---

### F08 · Error tracking and alerts (H3, H11)

**Problem.** `instrumentation.ts` logs only a fixed label. A production failure cannot be investigated and nobody is alerted.

**Steps**

1. Install the Next.js SDK with the official wizard, then review every file it writes:
   ```powershell
   npx.cmd @sentry/wizard@latest -i nextjs
   ```
2. Merge, rather than replace, `instrumentation.ts`:
   ```ts
   import * as Sentry from '@sentry/nextjs';
   import type { Instrumentation } from 'next';
   import { emit } from '@/lib/monitoring/events.mjs';
   export async function register() {
     if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config');
   }
   export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
     emit('server.request', 'unexpected', 0, context.routeType);
     Sentry.captureRequestError(error, request, context);
   };
   ```
3. **Privacy settings** (required; this app handles intimate text).
   - `@sentry/nextjs` 11.x (peer range includes Next 16; needs Node 20.19+) has **deprecated `sendDefaultPii`** in favour of `dataCollection`.
   - Its defaults collect user info, cookies, headers, query strings, HTTP bodies and **AI prompts and responses (`genAI`)**. Turn all of them off in `sentry.server.config.ts`, `sentry.edge.config.ts` and `instrumentation-client.ts`:
   ```ts
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     dataCollection: {
       userInfo: false, cookies: false, httpHeaders: false, urlQueryParams: false,
       httpBodies: [],                               // documented way to disable bodies
       genAI: { inputs: false, outputs: false },     // confirm against the installed 11.x types
       stackFrameVariables: false, databaseQueryData: false,
     },
     beforeSend(event) { delete event.request?.data; delete event.request?.cookies; delete event.request?.headers; delete event.user; return event; },
   });
   ```
   - Do not add the Session Replay integration.
   - Never attach message text, memories or prompts to an error.
   - Before going live, trigger a test error from a chat route and inspect the event to confirm no body or AI text arrived.
4. Use the SDK's `tunnelRoute` option in `withSentryConfig` (imported from `@sentry/nextjs/config` in current docs) so browser events stay same-origin and F02's `connect-src` needs no Sentry host. The tunnel path is not in `proxy.ts`'s explicit matcher list, so no matcher change is needed.
5. **Alerts.** Create alerts for:
   - a new issue in production;
   - error rate above baseline;
   - a structured log alert or a scheduled query for `reply_failed` rate, `budget_exhausted`, webhook 5xx and `auth.*` unavailable events, which `lib/monitoring/events.mjs` already emits as JSON lines in host logs.
6. **Uptime.** Point an uptime monitor at `/api/health` on production, with notification to the on-call phone.

**Verify.** Throw a test error from a temporary staging route and confirm it arrives without request body or cookies, then remove the route. Trigger the uptime monitor by pausing the staging deployment.

---

## Phase 1: pilot-ready

### F09 · Working unread counts (C2)

**Problem.** `public.conversations.unread_count` (`202610080001_foundation.sql:67`) is never incremented. Only resets write to it.

**Steps**

1. **Migration `…_unread_counts.sql`:**
   ```sql
   create function private.count_unread() returns trigger language plpgsql security definer set search_path = '' as $$
   begin
     if new.role = 'character' then
       update public.conversations set unread_count = unread_count + 1 where id = new.conversation_id;
     end if;
     return new;
   end $$;
   create trigger messages_count_unread after insert on public.messages
     for each row execute function private.count_unread();

   create function public.mark_conversation_read(p_id uuid) returns void language sql security definer set search_path = '' as $$
     update public.conversations set unread_count = 0
     where id = p_id and user_id = (select auth.uid()) and public.has_adult_access() and unread_count > 0;
   $$;
   revoke all on function public.mark_conversation_read(uuid) from public;
   grant execute on function public.mark_conversation_read(uuid) to authenticated;
   ```
   One character insert path, the payment acknowledgement in `202610200019`, writes `role='character'`. Confirm in testing whether payment-system messages (`role='system'`) should also count; the trigger above counts only character messages.
2. **`list_conversations`** (`202610080006_conversations.sql:48`). In a new migration, recreate it to also return `c.unread_count`. Order by `coalesce(c.last_message_at, c.updated_at) desc`.
3. **Mark as read.** In the connected thread, a small client component calls a server action wrapping `mark_conversation_read` on mount, and again when the page is visible and the revision changes (reuse the `ConversationSync` revision prop). Don't mutate during server rendering.
4. **UI (frontend-design skill).**
   - The connected inbox (`components/connected-conversations.tsx:40-42`) shows an unread dot and count, a relative timestamp, and bold preview text when unread.
   - The Messages navigation item shows the total, read with one cheap `select sum(unread_count)` through an RPC in `ProtectedArea`.
   - Reuse the mock inbox's existing presentation (`components/messages.tsx:30`) so the two stay aligned.

**Verify.** Extend `scripts/test-conversations-database.mjs`:
- a character reply increments the count;
- the owner's `mark_conversation_read` resets it;
- another user cannot reset it.

Add a browser check: the reply arrives while you're on Discover, the badge shows 1, and opening the chat clears it.

---

### F10 · Installable app and link previews (I1, I2)

**Steps (read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md` and `.../opengraph-image.md` first)**

1. **`app/manifest.ts`:**
   ```ts
   import type { MetadataRoute } from 'next';
   export default function manifest(): MetadataRoute.Manifest {
     return {
       name: 'TalkingStage', short_name: 'TalkingStage',
       description: 'A Nigerian AI dating experience with fictional adult characters.',
       start_url: '/discover', scope: '/', display: 'standalone',
       background_color: '#ffffff', theme_color: '#cf2445',
       icons: [
         { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
         { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
         { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
       ],
     };
   }
   ```
   Take colours from `app/styles/tokens.css` (`--brand` is `#cf2445`). Export the icons from `app/icon.svg`, and add `app/apple-icon.png` at 180×180.
2. **Viewport.** In `app/layout.tsx`, export `viewport` with `themeColor: '#cf2445'`. Extend `metadata` with `metadataBase` (the production origin), `openGraph` (site name, locale `en_NG`, a 1200×630 image) and `twitter: { card: 'summary_large_image' }`.
3. **Share image.** Add `app/opengraph-image.tsx` using the brand fonts and a fictional-character portrait already approved for public marketing. The public pages already use cast imagery, so keep AI-disclosure wording on the image.
4. **Crawling.** Add `app/robots.ts` (allow public pages; disallow `/discover`, `/characters`, `/messages`, `/settings`, `/payments`, `/gifts`, `/admin`, `/api`) and `app/sitemap.ts` listing the public information pages.
5. **Clean-up.** Delete the Next.js boilerplate files in `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) after confirming with `git grep` that nothing references them.

**Verify.**
- Chrome DevTools → Application → Manifest shows no errors, and installability passes on Android.
- On iPhone, Share → Add to Home Screen opens standalone.
- Pasting the production URL into WhatsApp shows the preview card.

---

### F11 · Web push notifications (C1)

Depends on F10 for the manifest and on F09 for unread counts. Follow the installed guide `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` (sections 2–5 and 8).

**Constraints**
- On iPhone, web push only works after the user adds the app to the Home Screen (iOS 16.4+), and permission must be requested from a user tap.
- Ask after a meaningful moment, such as the first character reply, never on page load.

**Steps**

1. Run `npm.cmd install web-push`, then `npx.cmd web-push generate-vapid-keys`. Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY=`, `VAPID_PRIVATE_KEY=` and `VAPID_SUBJECT=mailto:<support address>` to `.env.example`, and store real values in the host.
   - The subject must be a real `mailto:` or `https:` address; Apple's push service may reject placeholders such as `mailto:user@localhost`.
   - Send with a short `TTL` (e.g. 3600) so stale "replied" alerts are not delivered hours later.
   - If the host restricts outbound traffic, allow `*.push.apple.com`.
2. **Migration `…_push_subscriptions.sql`:**
   - `private.push_subscriptions(id, user_id, endpoint text unique, p256dh text, auth text, created_at, last_success_at, failure_count)`;
   - `private.notification_preferences(user_id pk, replies boolean default true, checkins boolean default true, quiet_start time default '22:00', quiet_end time default '08:00')`;
   - owner RPCs `save_push_subscription`, `delete_push_subscription` and `set_notification_preferences`, all `SECURITY DEFINER` with adult-access checks and the existing `limit_*_mutation` rate limit.
3. **`public/sw.js`.** Handle `push` (show title/body only: "Amara replied" and never message text, because lock screens are visible to others) and `notificationclick` (focus or open `/messages/<id>`). Serve it with the headers from guide section 8 (`no-cache`, its own strict CSP), and allow it in F02 (`worker-src 'self'`).
4. **Client.** Add a "Get notified when they reply" prompt, shown once after the first completed reply, with an explicit button. On iOS outside standalone mode, show the Add to Home Screen instructions instead. Add toggles to Settings → Check-ins (`components/connected-checkins.tsx`).
5. **Sending.** Add a server-only `lib/backend/notify.ts` that loads subscriptions with the service-role client, checks preferences and quiet hours in Africa/Lagos time, sends with `web-push`, and deletes subscriptions on HTTP 404/410. Call it:
   - from `processReply` after a `completed` commit, only if the conversation has not been opened since the user's message (use `unread_count > 0` from F09);
   - from `processCheckin` after a committed check-in.

**Verify.** On Android Chrome and an installed iPhone app: close the app, trigger a reply, and the notification arrives and opens the right chat. With the setting off, nothing arrives. Expired subscriptions are removed.

---

### F12 · Hosted scheduler for check-ins (C3)

**Problem.** Check-ins depend on `scripts/run-character-checkins.mjs` on one Windows PC. It handles 3 candidates per run, one at a time, and the installer `scripts/install-character-checkins.ps1` is currently deleted in the working tree.

**Steps**

1. Move the candidate loop from `scripts/run-character-checkins.mjs` into `lib/backend/checkin-scheduler.ts`. It calls `checkin_candidates` and runs `runCheckin` with a concurrency limit of 3–5, stopping well before the function's `maxDuration`.
2. Add `app/api/cron/check-ins/route.ts`. It rejects any request whose `Authorization` header is not `Bearer ${process.env.CRON_SECRET}` (constant-time compare), then runs the scheduler. Exclude `/api/cron` from the proxy matcher (it already is, because the matcher lists explicit prefixes).
3. **Schedule it.** On Vercel, use `vercel.json` with `{"crons":[{"path":"/api/cron/check-ins","schedule":"*/15 * * * *"}]}` (cron frequency depends on the plan; confirm on vercel.com/docs/cron-jobs). Alternatively, use Supabase Cron with `pg_net` posting to the same URL, with the secret stored in Supabase Vault.
4. **Raise the batch size.** In a new migration wrapper, raise `checkin_candidates` from 3 to a configurable batch (e.g. 25). Add the `checkins_paused_until` exclusion from F05.
5. Keep the PowerShell script for local development only, and update its docs. Decide whether to restore or permanently remove `install-character-checkins.ps1`. If removing, commit the deletion with a note in `docs/project-status.md`.

**Verify.** Staging logs show a cron invocation every 15 minutes. A synthetic account with a 12-hour-old conversation receives a check-in plus a push notification (F11) with no local machine running.

---

### F13 · Prompt caching (F2)

**Problem.** `requestStructured` (`lib/ai/provider.mjs:174`) sends the whole system prompt as one uncached string on every turn. Most of it is the same for every turn with the same character: product rules, published direction and conversation style.

**Facts (from the Claude API reference)**
- Caching is a prefix match: any change before the breakpoint invalidates the cache.
- Mark the end of the stable portion with `cache_control: { type: 'ephemeral' }` (5-minute lifetime).
- Cache writes cost about 1.25× the normal input price and cache reads about 0.1×.
- The minimum cacheable prefix is 4,096 tokens on Claude Haiku 4.5 and 512 tokens on Claude Haiku 5.5; shorter prefixes silently do not cache.
- Usage reports `cache_creation_input_tokens`, `cache_read_input_tokens` and `input_tokens` (the uncached remainder).

**Steps**

1. **Split the instructions in `buildInput` into two developer items:**
   - `stable`: the product rules (`provider.mjs:39-54`), the published character direction, `conversationStyle(language)`, `womenConversationDirection(name)` and `lifestyleDirection(name)`. Order these deterministically.
   - `dynamic`: everything else. That is the media instructions (they change when compacted), dating guidance, timeline/return guidance, reaction and quote guidance, payment direction, the clock line, `intelligenceStyle`, Naija examples, knowledge, media-turn guidance, cadence, quality, turn safety and identity guidance.
   ```js
   const assemble = () => [
     { role: 'developer', cache: true, content: stableInstructions },
     { role: 'developer', content: dynamicInstructions() },
     { role: 'user', content: /* unchanged context envelope */ }, ...modelHistory()];
   ```
   Change the compaction check at `provider.mjs:259`, which reads `input[0].content`, to search all developer items.
2. **In `requestStructured`, send `system` as blocks:**
   ```js
   const system = input.filter(item => ['developer','system'].includes(item.role))
     .map(item => ({ type: 'text', text: item.content, ...(item.cache ? { cache_control: { type: 'ephemeral' } } : {}) }));
   ```
3. **Return usage to the caller.** After parsing, call a new optional transport hook `onUsage?.(result.usage)` that passes only the numeric fields. F14 uses it.
4. Re-run `scripts/test-reply-prompt-budget.mjs` and the offline AI suites, and update any assertion on the single-developer-message shape.
5. Because instruction order changes, run the existing live evaluation (`npm run cast:eval:pilot`, metered) on a small sample before rollout, and compare it with the recorded baseline in `docs/cast-50/evaluations/review.md`. **This spends budget; get approval first.**

**Verify.** On staging, send two messages to the same character within five minutes. The second response's `usage.cache_read_input_tokens` is greater than 0. Log only the numbers, through `lib/monitoring/events.mjs`.

**Docs.** platform.claude.com/docs/en/build-with-claude/prompt-caching

---

### F14 · Settle the AI budget to actual usage (F1)

**Problem.** Every claim reserves the worst case (`max_input_tokens` 48,000 × input price + `max_output_tokens` × output price) into `private.ai_daily_usage` and never settles it. `private.ai_reservations` (`202610080007_reply_integration.sql:40`) already records each lease and amount.

**Steps**

1. **Migration `…_ai_settlement.sql`:**
   ```sql
   alter table private.ai_reservations add column settled_micro_usd bigint check (settled_micro_usd >= 0);

   create function private.settle_ai_reservation(p_lease uuid, p_input bigint, p_cache_write bigint, p_cache_read bigint, p_output bigint)
   returns void language plpgsql security definer set search_path = '' as $$
   declare r private.ai_reservations; cfg private.ai_configuration; actual bigint; refund bigint;
   begin
     select * into r from private.ai_reservations where lease = p_lease for update;
     if not found or r.settled_micro_usd is not null then return; end if;   -- idempotent
     select * into cfg from private.ai_configuration where singleton;
     actual := ceil((p_input * cfg.input_micro_usd_per_million
                   + p_cache_write * cfg.input_micro_usd_per_million * 1.25
                   + p_cache_read  * cfg.input_micro_usd_per_million * 0.10
                   + p_output * cfg.output_micro_usd_per_million) / 1000000.0);
     refund := greatest(r.amount_micro_usd - actual, 0);
     -- Use exactly the day and scope keys that private.claim_text_reply writes.
     update private.ai_daily_usage set amount_micro_usd = greatest(amount_micro_usd - refund, 0)
       where day = <claim day expression for r.reserved_at> and scope in ('project', r.actor_id::text);
     update private.ai_reservations set settled_micro_usd = actual where id = r.id;
   end $$;
   ```
   - Before writing it, copy the day and scope expressions from `private.claim_text_reply` (`202610150015_reply_activation_recovery.sql`); the placeholder above must match them exactly.
   - Do the same for summary and check-in reservations if they use separate tables (`summary_reservations`).
   - Grant execute only to `service_role` through a `public` wrapper, matching existing worker RPCs.
2. In `lib/ai/reply-pipeline.mjs`, `summary-pipeline.mjs` and `checkin-pipeline.mjs`, pass an `onUsage` hook (F13 step 3) and call the settle RPC with the claim's lease. For failed provider calls with no usage, settle with zeros only for errors that are definitely unbilled, such as a connection failure before a response. Otherwise leave the reservation unsettled.
3. Check the cache multipliers against the current pricing page before relying on them.
4. **Admin.** Show reserved vs settled spend per day in the operations screen. Keep `project_daily_micro_usd` and `user_daily_micro_usd` unchanged until a week of settled data exists, then review them with the founder.
5. **User-facing limit (E6).** When a claim returns `budget_exhausted`, show a calm state with the reset time instead of a generic failure. Use the frontend-design skill.

**Verify.**
- Extend `scripts/test-reply-integration.mjs`: reserve, settle with known usage, and assert the daily total equals actual cost.
- A second settle call is a no-op.
- Settling never takes a total below zero.

---

### F15 · Provider retries and unblocking failed replies (F3)

**Problem.**
- A 429 or 529 from the provider becomes `provider_error` immediately (`provider.mjs:184-185`) and uses one of three attempts.
- A failed job blocks later replies in that conversation (`earlier_reply_pending`) until the user retries or skips.

**Steps**

1. Move the Anthropic transport to the official SDK, which retries 408/409/429/5xx with exponential backoff and respects `retry-after`.
   - Run `npm.cmd install @anthropic-ai/sdk`.
   - Create one client per settings object: `new Anthropic({ apiKey: settings.key, maxRetries: 1, timeout: 20_000, fetch: fetcher })`. Keeping the injected `fetcher` keeps the offline tests working.
   - Call `client.messages.create({ model, system, messages, max_tokens, thinking, output_config }, { signal })`.
   - One retry inside the 45-second lease and 60-second `maxDuration` is the safe maximum.
   - Map SDK errors to `ReplyError` with a most-specific-first chain: rate limit / overloaded / 5xx / connection → `provider_error`; timeout → `timeout`; 400 → `invalid_output`.
   - Delete the unreachable OpenAI branch (`provider.mjs:198-224`) and `OPENAI_API_KEY` from `.env.example` and the production checks (F9 in the review).
2. In a new migration wrapper around the claim, let a newer user message supersede a `failed` job whose attempts are exhausted, by marking it `cancelled`. This matches how never-attempted superseded jobs are already handled in `private.claim_text_reply`. Keep explicit retry available for the user.
3. Update `scripts/test-reply-recovery.mjs` and `test-reply-boundaries.mjs`:
   - an injected 529 followed by success completes without user action;
   - a failed job no longer blocks the next message.

---

### F16 · Cacheable cast photos (H7)

**Problem.** `app/api/cast-assets/[assetId]/route.ts:30` returns `Cache-Control: private, no-store`, so every card view re-downloads through the server. For admins, line 14 lists every asset to resolve one.

**Steps**

1. Add an ETag (the asset ID plus width) and change the success header to:
   ```ts
   'Cache-Control': 'private, max-age=600, stale-while-revalidate=60'
   ```
   Keep `private` (photos require an adult account) and `Vary: Cookie`. Return `304` when `If-None-Match` matches. Ten minutes bounds how long a revoked photo can stay cached in a browser; agree this with the founder.
2. Replace the admin `admin_list_assets(null)` lookup with a new admin-only RPC `admin_asset_path(p_id uuid)` returning one row.
3. Add the matching `srcSet` to the chat photo (`components/connected-chat-photo.tsx`) so it requests 320 or 640 instead of the default 640 on small screens.

**Verify.** On a second Discover visit, DevTools shows photos served from cache or as 304. The `tests-auth/character-photography.spec.ts` checks still pass.

---

### F17 · Cheaper live updates (H6)

**Problem.**
- `components/conversation-sync.tsx:74` polls every 5 seconds per open chat.
- Each poll loads the full `conversation_thread` and `reply_status` (`app/api/conversations/[conversationId]/sync/route.ts:20-21`) only to compute a revision hash.

**Step 1 (small, do first).** Add a lightweight `conversation_revision(p_id uuid)` RPC. It returns the conversation's `version` and `next_sequence` plus a compact string of open job states, for example `string_agg(id::text||':'||state||':'||attempts, ',' order by created_at)` over `private.reply_jobs` that are not `completed` or `cancelled`, with the same ownership and adult checks as `reply_status`. Use it in the sync route instead of the full thread. Add an index `create index reply_jobs_conversation_state on private.reply_jobs(conversation_id, state);` (review H9).

**Step 2 (later).** Replace polling with Supabase Realtime private channels authorised by RLS, broadcasting a "changed" event when messages or reply jobs change. Follow the current Supabase Realtime authorization docs (supabase.com/docs/guides/realtime/authorization). Keep the poller as a slow fallback (30 s).

**Verify.** Load-test the sync route before and after step 1 with a local script; record database time per request in `docs/reviews/`.

---

### F18 · Data export and self-service deletion (A4, A5)

**Steps**

1. Add `app/api/account/export/route.ts` (GET):
   - `isFirstPartyOrigin`, `currentAccount({ failOnUnavailable: true })`, adult check;
   - a rate limit through the existing `private.limit_*_mutation` pattern (e.g. 3 per day);
   - read the user's own rows with the user's client so RLS applies: profile, preferences, conversations, messages, memories, reports, payment intents;
   - respond with `Content-Disposition: attachment; filename="talkingstage-export.json"` and `Cache-Control: private, no-store`.
   
   Never include `private` schema data such as character direction.
2. Add "Download my data" to Settings → Account (`components/connected-settings.tsx`) with a short explanation. Use the frontend-design skill.
3. **Enable deletion on hosted projects.** Update `private.privacy_configuration` (the same switch `npm run backend:deletion` sets locally) through a reviewed migration or the activation process in F07. Re-run `npm run test:account-deletion` locally first.
4. **Users with payment records (Decision needed).** Document how support handles them: verify identity, delete everything except legally required payment records, and record the action in `private.admin_audit`. Update [docs/stage-12-deletion-contracts.md](docs/stage-12-deletion-contracts.md).
5. Update the Privacy page to describe export, deletion and the retained payment records accurately.

**Verify.**
- The export of a test account contains every owned table and nothing from another user (extend `tests-auth/settings.spec.ts`).
- Deletion works end to end on staging with a disposable account.

---

### F19 · Product analytics (K1, K2)

**Design.** First-party and server-side only. Store an HMAC-hashed user ID, an event name, small numeric/enum properties and a timestamp. Never store message text, memories, names or emails.

**Steps**

1. **Migration.** Add `private.analytics_events(id bigint generated always as identity primary key, user_hash text not null, event text not null check (event in (...)), props jsonb not null default '{}', at timestamptz not null default now())`, with an index on `(event, at)`. Writes go through a `service_role`-only function.
2. **Helper.** `lib/backend/analytics.ts` exports `track(userId, event, props)`, which hashes with `ANALYTICS_SALT` (new env var) and never throws.
3. **Events.** Call `track` from the existing server actions and workers for: `signup_completed`, `onboarding_completed`, `deck_pass`, `deck_meet`, `message_sent`, `reply_delivered`, `reply_failed`, `checkin_delivered`, `notification_opened`, `budget_exhausted`, `gift_started`, `gift_paid`, `report_filed`, `account_deleted`.
   - `deck_pass` needs a server call. Combine it with review item D1 (a `discovery_actions` table) so Pass is saved at the same time.
4. **Views.** Create SQL views for the funnel, day-1/7/30 retention cohorts, messages per active user, Meets/Passes per character and AI cost per active user (from F14).
5. **Admin.** Replace the fixture at `/admin/analytics` with a connected page reading those views.
6. **Privacy notice.** Mention aggregated product analytics in the privacy notice, and delete a user's events on account deletion. Add them to the deletion function and the restore erasure list.

**Verify.**
- Offline database test: events are written with hashed IDs only.
- The admin page shows staging data.
- Account deletion removes the user's events.

---

## Phase 2 and later

These are scoped in the [review](docs/dating-app-readiness-review.md) and need no new research before starting. Track them as issues once Phase 1 is complete:

- **Payment policy and model:** A7 gendered money requests and payment wording (Decision needed), G1 Bachs sandbox acceptance, G2 unit economics, G3 payment alerts.
- **Accounts and safety:** B3 date of birth and stronger age assurance (Decision needed), A8 structured output checks for contact sharing and explicit content.
  - Age-assurance options with Nigerian coverage, from desk research: Smile ID, Dojah and Prembly check a NIN/BVN against the issuing authority, which yields an authoritative date of birth. Dojah also offers liveness with an age range. Yoti and Veriff offer selfie-only facial age estimation, which is lower friction but probabilistic, so use a buffer age such as 25.
  - Any option processes biometric or identity data, so it needs F05-style DPIA coverage and a privacy-notice update.
- **Engagement and chat:** C4 tests against guilt/FOMO wording, D1 persisted Pass (with F19), E1 per-message delete, E2 new-message pill, E3 inline history loading.
- **AI internals:** F4 narrower context invalidation, F5 consolidate the `claim_reply` chain.
- **Platform and frontend:** H9 remaining indexes and the hot budget row, I3/I4 CSS consolidation and legacy theme removal, I8 admin dead ends.
- **CSP hardening:** evaluate Next's experimental SRI (`experimental.sri`) to remove `'unsafe-inline'` from `script-src` without giving up static shells.
- **Pilot gate:** I10, the existing manual device and screen-reader review.

## Completion checklist for Phase 0 and Phase 1

- [ ] F01 credentials removed and rotated
- [ ] F02 headers enforced in production; scan results recorded
- [ ] F03 recovery email verified on three providers
- [ ] F04 confirmation, CAPTCHA and secure password change on in staging and production
- [ ] F05 verified crisis resources approved; safety signals live; admin review working
- [ ] F06 AI label and reminders live
- [ ] F07 CI required on `main`; migrations deployed by workflow
- [ ] F08 errors and alerts reaching the on-call contact
- [ ] F09–F12 unread counts, PWA, push and hosted check-ins verified on Android and iPhone
- [ ] F13–F15 cache hits, settled budget and automatic retry visible in staging
- [ ] F16–F17 photo caching and lighter sync measured
- [ ] F18 export and deletion verified end to end
- [ ] F19 analytics dashboard showing staging data
- [ ] `docs/project-status.md` updated with evidence for each item

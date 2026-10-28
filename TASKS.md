# Tasks

Source: [fix.md](fix.md) (Phase 0 → Phase 1 → Phase 2). Ordered by priority; each task depends only on tasks above it. One fix per branch `fix/<id>-<name>`; run `check:engineering`, `test`, `build`, `check:production` before each PR and record evidence in `docs/project-status.md`.

## Active

### Now — tester feedback (David, 28 Oct): characters sound like an AI assistant; switch to Sonnet

- [ ] **F13 leftover** - metered `cast:eval:pilot` comparison (needs budget approval)
- [ ] **V2 · Sonnet 5.5 live test** - switched 28 Oct (DB + Vercel, limits unchanged $20 site / $2 per person); left: chat test with David's questions, check Admin → Operations spend
- [ ] **Review AI daily limits with founder** - after a week of settled Sonnet data (~4 Nov)

### Phase 0 — before any real user

- [ ] **F02 · Security headers (H2)** - live in production since 27 Oct (PR #1, report-only CSP); finish after F07 staging exists
  - Left: Safari + Bachs-redirect check, 1 week report-only staging, build with `TALKINGSTAGE_CSP_ENFORCE=1`, securityheaders.com + Observatory scans
- [ ] **F07 · Hosting, environments and CI (H1, H8)** - blocked on host decision (see Waiting On)
  - Separate staging + production Supabase projects; CI required on `main`; migrations deployed by workflow
  - F03/F04 staging verification, F08, F12 and F18 hosted enablement rely on this
- [ ] **F04 follow-up** - switch local `enable_confirmations` and `[auth.captcha]` on once `tests-auth` registration reads the link from the mail catcher (needs Docker)
  - Turnstile on register/sign-in/recover in `components/real-account-form.tsx`; enable in staging and production
- [ ] **F08 · Error tracking and alerts (H3, H11)** - after F07; Sentry with `tunnelRoute` so F02 CSP needs no change
- [ ] **F05 · Safety: crisis resources, model-based signals, durable age flag (A1, A2)** - crisis card blocked on verified resources (backlogged, see Someday); signals/age flag can proceed
  - Adds `checkins_paused_until`, used later by F12
- [ ] **F06 · Persistent AI disclosure (A3)** - live in production since 27 Oct (PR #1); left: connected-chat check via `test:auth` (Docker)

### Phase 1 — pilot-ready

- [ ] **F09 · Working unread counts (C2)** - next migration is `202610240028_*`
- [ ] **F10 · Installable app and link previews (I1, I2)** - manifest, icons, OG metadata
- [ ] **F11 · Web push notifications (C1)** - after F09 + F10; needs VAPID keys; `public/sw.js`, title/body only, never message text
- [ ] **F12 · Hosted scheduler for check-ins (C3)** - after F07 (host cron), F05 (pause flag), F11 (push)
- [ ] **F15 · Provider retries and unblocking failed replies (F3)**
- [ ] **F16 · Cacheable cast photos (H7)**
- [ ] **F17 · Cheaper live updates (H6)**
- [ ] **F18 · Data export and self-service deletion (A4, A5)** - hosted enablement via F07; payment-record handling blocked on decision
- [ ] **F19 · Product analytics (K1, K2)** - AI-cost-per-user view needs F14
- [ ] **Phase 0/1 completion check** - tick the checklist at the end of `fix.md`; devices verified on Android + iPhone

## Waiting On

- [x] ~~**Founder: choose host + production domain**~~ (2026-10-26) - Vercel, www.talkingstage.buzz
- [ ] **Founder: support process for deleting users with payment records** - blocks F18 step 4 - since 2026-10-24
- [ ] **Accounts/keys** - GitHub Actions secrets + staging/prod Supabase (F07), Sentry EU (F08), VAPID keys (F11)

## Someday

Phase 2 — track as issues once Phase 1 is done (see `fix.md` §Phase 2).

- [ ] **Verify Nigerian crisis services by phone** - backlogged 2026-10-26; blocks only the F05 crisis card
  - Call 112, Lagos 767, She Writes Woman 0800 800 2000, SURPIN 0800 078 7746, MANI 0809 111 6264 / 0811 168 0686
  - Record name, number, hours, languages, date checked; re-check quarterly. Never use the untraceable blog numbers (fix.md F05)

- [ ] **Payments: Bachs merchant setup, sandbox end-to-end acceptance (G1), legal review of money requests, A7 wording (Decision needed), G2 unit economics, G3 alerts** - request policy is local-only; hosted dev/prod stay disabled
- [ ] **Adult text chat** - founder-requested scope; blocked on a compatible provider + explicit-mode controls (`docs/cast-50/adult-chat-scope.md`)
- [ ] **B3 date of birth / age assurance (Decision needed)** and A8 structured output checks
- [ ] **Engagement/chat:** C4, D1 persisted Pass, E1 per-message delete, E2 new-message pill, E3 inline history
- [ ] **AI internals:** F4 context invalidation, F5 consolidate `claim_reply`
- [ ] **Platform/frontend:** H9 indexes, I3/I4 CSS consolidation, I8 admin dead ends, CSP SRI
- [ ] **Pilot gate (I10):** manual device + screen-reader review; revised voice-quality and native-speaker evaluation

## Done
- [x] ~~**F13 + F14 · Usage reporting and budget settlement**~~ (2026-10-28) - PRs #8, #9; migration 028 applied and verified; first settled reply refunded ~70% of its reservation; founder account granted admin
- [x] ~~**V1 · Natural character voice**~~ (2026-10-28) - PR #7; no volunteered AI/helpdesk talk, light in-voice acknowledgement when asked, never a denial; Sonnet 5.5 support and cached rules block
- [x] ~~**F04 · Email confirmation, CAPTCHA, safe password change (B2, B4)**~~ (2026-10-28) - PR #5; Turnstile enforced, Confirm email + Secure password change on, minimum password 12; live sign-up test passed
  - Password change only exists in the email recovery flow, so no current-password re-check is needed
- [x] ~~**F03 · Production email delivery (B1)**~~ (2026-10-27) - Resend SMTP, templates, site URL and DMARC (`p=none`); Gmail recovery in inbox with SPF, DKIM and DMARC pass, reset completed
  - Yahoo/Outlook not tested (owner has no accounts there); re-test when pilot users on them sign up. Consider tightening DMARC to `p=quarantine` after a few weeks of clean sending
- [x] ~~**F01 · Remove committed test credentials (H4)**~~ (2026-10-26) - code in c1b2375; hosted tester password rotated + sessions revoked
  - Left: `npm run test:auth` with Docker; re-audit production project after F07

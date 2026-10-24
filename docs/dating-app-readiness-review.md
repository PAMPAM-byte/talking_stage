# TalkingStage professional readiness review

24 October 2026 · Prepared for the product owner and engineering · Status: recommendations, not approved scope

This review compares the current TalkingStage codebase with established dating apps (Tinder, Bumble, Hinge) and AI-companion apps (Replika, Character.AI, Nomi, Kindroid, Candy.ai, Talkie, Chai). It lists the work needed to run TalkingStage as a professional consumer product. It covers product logic, UI components, AI behaviour, safety and compliance, operations and code health.

Read it alongside [project status](./project-status.md) and the [implementation plan](./implementation-plan.md). Nothing here changes an approved decision. Items that would expand the PRD scope are marked **Founder decision**. The regulatory notes are product research, not legal advice; confirm them with counsel before launch.

## How to read the priorities

| Priority | Meaning |
| --- | --- |
| **P0** | Blocks a private pilot with real users. Safety, legal exposure, data loss or a broken core journey. |
| **P1** | Required before public launch. Expected by users, app stores or regulators. |
| **P2** | Growth and retention. Clearly improves the product once the basics are sound. |
| **P3** | Engineering quality. Reduces cost and risk of future change. |

Evidence links point to the code as of commit `aab4d79`.

---

## 1. Executive summary

TalkingStage has foundations that most early-stage products lack:
- authorization enforced in the database, with row-level security everywhere and writes only through checked functions;
- idempotent message sending and reply jobs that recover after interruption;
- explicit, consented memories and a careful payment-verification path;
- extensive offline tests;
- a coherent visual identity and genuinely localised Nigerian characters.

No direct Nigerian competitor was found in the AI-companion category.

It is not yet operable as a consumer product. The gaps are the parts users and regulators take for granted, not the clever parts:

1. **Users cannot be reached.** There are no push or email notifications, unread counts are never updated, and character check-ins only appear while the user is already in the app. Every successful dating and companion app is built around "you have a new message".
2. **Account basics are incomplete.** Recovery email has no production delivery, email confirmation is off, there is no CAPTCHA, and the 18+ gate is a single checkbox.
3. **Safety obligations are below the field.** Minor and distress detection are single English regexes, there is no crisis resource, and the persistent in-chat AI disclosure was removed.
4. **There is no production platform.** No hosting target, CI, security headers, error tracking or alerting, and backups and the scheduler run on one Windows PC.
5. **There is no way to see whether the product works.** There are no product analytics; `/admin/analytics` is a fixture.
6. **AI cost accounting is pessimistic and uncached.** Every turn reserves the cost of a 48,000-token prompt that is never settled against actual use, and the large static prompt is never cached. Users will hit invisible daily limits early.

### Top ten actions

| # | Action | Priority | Section |
| --- | --- | --- | --- |
| 1 | Configure production email (SMTP), turn on confirmation, add CAPTCHA | P0 | [B](#b-accounts-identity-and-age-assurance) |
| 2 | Choose a hosting target; add CI, security headers, error tracking and alerts | P0 | [H](#h-platform-security-and-operations) |
| 3 | Add a crisis resource, model-based minor/distress signals and a durable age flag | P0 | [A](#a-trust-safety-and-compliance) |
| 4 | Restore a persistent AI disclosure in chat | P0 | [A](#a-trust-safety-and-compliance) |
| 5 | Make unread counts work and add web push notifications | P1 | [C](#c-engagement-and-re-engagement) |
| 6 | Move check-ins and backups to hosted schedulers | P1 | [C](#c-engagement-and-re-engagement), [H](#h-platform-security-and-operations) |
| 7 | Add data export; enable self-service deletion | P1 | [A](#a-trust-safety-and-compliance) |
| 8 | Prompt caching and budget settlement against actual usage | P1 | [F](#f-ai-quality-cost-and-reliability) |
| 9 | Replace whole-thread polling and make cast images cacheable | P1 | [H](#h-platform-security-and-operations) |
| 10 | Product analytics: funnel, retention and a server-saved Pass action | P1 | [K](#k-product-analytics) |

---

## 2. What to keep

These are strengths. Protect them while making the changes below.

- **Database-enforced ownership.** Clients only read; every write goes through a `SECURITY DEFINER` function with a fixed `search_path`, which checks adult access, ownership, versions, capability switches and rate limits.
- **Reliable delivery.** Client message IDs act as idempotency keys. Reply jobs use leases and commit only if nothing has changed, and there are explicit retry and skip controls. Interruptions do not duplicate messages.
- **Consent-first memory.** Facts are saved only with explicit consent, scoped per character, and can be inspected, disabled or deleted.
- **Payment verification.** Webhooks are HMAC-verified and the server re-fetches each payment. Amounts are stored in integer minor units, duplicate or stale events are rejected, and a paid status is never downgraded.
- **Restore suppression.** Deleted accounts stay deleted after a backup restore.
- **Distinct local cast.** 50 Nigerian characters with written life stories, English/Pidgin voice direction and 100 reviewed photos. Research found no Nigerian AI-companion competitor; local Pidgin AI products are general assistants.
- **Accessible foundations.** Native modal dialogs, a skip link, keyboard swipe controls, reduced-motion support and 44 px touch targets.
- **Recovery-focused chat.** Typing and "Seen" states, Stop reply, an optimistic outbox, and handling of the mobile on-screen keyboard.

---

## 3. Market comparison

### 3.1 Feature benchmark

Legend: ✅ present · 🟡 partial · ❌ absent · — not applicable

| Capability | Mainstream dating apps | AI-companion apps | TalkingStage today |
| --- | --- | --- | --- |
| New-message notifications | ✅ all | ✅ all; Nomi sends proactive messages | ❌ none; check-ins only show in-app |
| Unread badges and inbox order | ✅ | ✅ | ❌ `unread_count` is never incremented |
| Undo/rewind | Paid (Tinder Rewind, Bumble Backtrack) | — | ✅ free, multi-step |
| "Match" moment after liking | ✅ | 🟡 | ❌ Meet jumps straight into chat |
| Discovery saved and personalised | ✅ ranked, passes saved | — | ❌ fixed order, Pass kept only in the browser session |
| First-message aids | ✅ Bumble Opening Moves, Hinge starters | ✅ | 🟡 conversation clue on profile; characters can open |
| Long-term memory users can see | — | ✅ Nomi, Kindroid, Replika | ✅ consented facts; summaries not visible |
| Persistent AI disclosure | — | Required in NY/CA; Anthropic policy | 🟡 Discover badge and landing only; removed from chat |
| Crisis / self-harm protocol | ✅ safety centres | Required in NY/CA; Character.AI | ❌ no resource; English-only regex |
| Age assurance beyond self-declaration | ✅ Tinder Face Check | ✅ Character.AI age model + Persona | ❌ one checkbox |
| Pre-send / post-receive safety nudges | ✅ Tinder "Are You Sure?" / "Does This Bother You?" | — | — (characters only; output regex) |
| Report, block, hide | ✅ | ✅ | 🟡 report only; no "don't show again" |
| Voice / calls | Voice prompts (Hinge) | ✅ Replika, Kindroid, Character.AI | ❌ out of PRD scope |
| Character selfies / photos | — | ✅ often paid | ✅ curated approved photos |
| Data export | ✅ | 🟡 | ❌ |
| Self-service account deletion | ✅ | ✅ | 🟡 built, switched off |
| Installable app / PWA | Native apps | Native apps | ❌ no manifest, service worker or icons |
| Link previews (Open Graph) | ✅ | ✅ | ❌ |
| Monetisation | Subscription tiers + boosts | Subscription, credits, gifts | 🟡 voluntary NGN gifts only; disabled |

### 3.2 Lessons from the market

- **Re-engagement is the core loop.** Push opt-in rates are roughly 50–67% (Airship/Batch 2025). On iPhone, web push works only after the site is added to the Home Screen and permission follows a user tap. Without notifications, character check-ins cannot work as a retention feature.
- **Memory and consistency are what companion users pay for.** Nomi, Kindroid and Replika all sell richer memory. TalkingStage's consented memory is a good base, but users cannot see summaries and get no suggestions to save a fact.
- **Removing a core behaviour without notice backfires.** Replika's 2023 removal of erotic roleplay caused severe user distress and backlash. TalkingStage should never present explicit capability before it exists (already a project rule), and should announce any behaviour change in advance.
- **Manipulative retention is now documented and scrutinised.** A Harvard Business School working paper found companion bots used guilt and fear-of-missing-out tactics in over 37% of goodbyes. Check-ins and money requests must avoid these patterns.
- **Regulators act on age and data failures.** Italy's Garante fined Replika's developer €5M (2025), partly for having no age verification. Character.AI ended open-ended chat for under-18s in November 2025 and settled several lawsuits in January 2026.
- **Revenue is concentrated in subscriptions and credits.** Companion-app spending was about $82M in H1 2025, with the top 10% of apps earning 89%. Gifts alone are an untested revenue model.

Sources are listed in the [appendix](#appendix-a-research-sources).

---

## 4. Work items by area

### A. Trust, safety and compliance

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| A1 | **P0** | Distress detection is one English regex ([safety.mjs:6](../lib/ai/character-intelligence/safety.mjs)). It misses "i wan die" and "I'm feeling suicidal". The prompt forbids inventing crisis numbers but none are provided, so a user in distress gets no resource. | Add a verified Nigerian crisis resource. Show a fixed safety card in the UI (not model-generated) when distress is flagged. Add a `distress_signal` field to the structured model output. Pause check-ins for that user and alert an admin. | Tests cover English and Pidgin phrasings; the card renders; check-ins pause; an admin signal is recorded. |
| A2 | **P0** | Minor detection is a regex anchored to the start of the message. It catches "I'm 16" but not "lol im 16", "my age is 15", "i dey 16" or "I'm in SS2". A hit refuses one turn and the next message continues normally. | Add a `minor_signal` model output. On a hit, set a durable account flag that freezes all conversations and queues an admin review. Add JSS/SS and Pidgin cases to tests. | A flagged account cannot continue any chat until reviewed; regression set passes. |
| A3 | **P0** | Persistent AI disclosure was removed from profiles, chat headers and photo viewers (design system, 20 October). Anthropic's policy requires disclosure at least at session start or in the product interface. New York and California companion laws require it at session start and every 3 hours. | Restore a small, persistent "AI character" marker in the chat header. Add a session-start notice and a reminder in long sessions. | Marker visible in every connected chat at 320–1440 px; reminder shown after 3 hours of continuous use. |
| A4 | **P1** | No data export. The Nigeria Data Protection Act 2023 gives access and portability rights. | Add "Download my data" in Settings → Account: profile, conversations, messages, memories, reports and payments as JSON via a short-lived signed URL, rate-limited. | Export contains all user-owned records and excludes private character direction. |
| A5 | **P1** | Self-service account deletion is built and tested but switched off on the hosted project. Users with any payment record are sent to support, which has no tooling for it. | Enable deletion. Build an admin procedure for deletion requests from users with payment records that keeps only the legally required financial records. | A real user can delete their account; the payment-record route is documented and tested. |
| A6 | **P1** | Romantic chat, memories and preferences will often reveal sex-life information, which the NDPA treats as sensitive. They are sent to a US model provider, which is a cross-border transfer. The NDPC's GAID 2025 requires an impact assessment before deploying AI. | Complete a DPIA. Add specific consent for sensitive processing and the provider transfer. Name the processor in the privacy page. Check whether NDPC registration as a controller "of major importance" applies. | DPIA filed; privacy page names the provider and the transfer basis; consent recorded in the database. |
| A7 | **P1** | Only female characters may ask for money ([migration 017](../supabase/migrations/202610190017_bachs_payments.sql), lines 150 and 171). The payment prompt tells characters not to deflect money offers, while the UI calls it a voluntary gift. Anthropic's policy prohibits manipulative techniques, and research documents emotional-pressure tactics in companion apps. | **Founder decision:** review gendered money requests and the prompt wording with counsel. Keep payments separate from character warmth, and confirm the gateway allows gifts to AI characters. | Written decision recorded; prompt and limits match it; gateway acceptance confirmed in writing. |
| A8 | **P1** | Output safety is regex only ([safety.mjs:14-19](../lib/ai/character-intelligence/safety.mjs)). It misses spelled-out numbers, handles and paraphrased explicit content. | Add structured output fields for contact sharing, explicit content and human claims, and check them alongside the regex. Keep explicit content out of scope ([adult-chat scope](./cast-50/adult-chat-scope.md)). | Adversarial test set (English and Pidgin) passes. |
| A9 | P2 | No way to hide a character. | Add "Don't show this character again", saved on the server with the Pass action (D1). | Hidden characters never return to Discover. |
| A10 | P2 | No published safety page that app stores and regulators look for. | Add a Safety page: AI disclosure, crisis resources, reporting, memory controls and contact. Link it from the footer and Settings. | Page live and linked. |

### B. Accounts, identity and age assurance

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| B1 | **P0** | No production email. [config.toml](../supabase/config.toml) has SMTP commented out and `email_sent = 2` per hour, and [hosted setup](./hosted-setup.md) records recovery delivery as unverified. Password recovery would tell users a link is coming and send nothing. | Configure a transactional email provider with SPF/DKIM/DMARC and raise the limits. Brand the existing [templates](../supabase/templates/). | Recovery email received at Gmail/Yahoo/Outlook addresses from the hosted project. |
| B2 | **P0** | `enable_confirmations = false` and there is no CAPTCHA. Anyone can register any address, and each throwaway account gets its own daily AI budget. | Turn on email confirmation (or OTP). Add a CAPTCHA (e.g. Turnstile) to sign-up and recovery. Alert on unusual sign-up rates. | Unconfirmed accounts cannot reach chat; bot sign-up is blocked in testing. |
| B3 | **P1** | The 18+ gate is one checkbox. Answering "under 18" only signs the user out and they can retry at once. | Collect a date of birth. Lock out by device and email after an under-18 answer. **Founder decision:** whether to add age estimation or ID checks (required before any explicit mode). | Under-18 dates are refused and the lockout persists; decision recorded. |
| B4 | P1 | `secure_password_change = false`: a hijacked session can change the password without re-entering the old one. | Require recent authentication for password and email changes, as account deletion already does. | Password change requires the current password. |
| B5 | P2 | Admins can only be granted by hand-written SQL, with no audit. | Add an audited admin-grant command for operators, or at least a documented and logged procedure. | Every role grant has an audit record. |

### C. Engagement and re-engagement

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| C1 | **P1** | No notifications of any kind: no service worker, push subscription, email digest or in-app alert. | Add web push via a service worker and a `push_subscriptions` table. Ask permission after a meaningful action (e.g. first reply), not on load. Respect quiet hours in Africa/Lagos time and add notification settings. Fall back to an email digest. | A reply or check-in reaches a closed browser on Android and an installed iPhone PWA; users can opt out per type. |
| C2 | **P1** | `conversations.unread_count` exists but no migration ever increments it; the connected inbox shows no unread state, timestamps or search. The mock shows unread counts the real app cannot produce. | Track a last-read sequence per conversation, count character messages after it, and clear it when the thread opens. Show unread dots, relative timestamps and a total badge on the Messages tab. | Badge and per-chat counts are correct across devices. |
| C3 | **P1** | Check-ins run on the user's return or from a Windows script that handles 3 accounts per run, one at a time ([run-character-checkins.mjs](../scripts/run-character-checkins.mjs)). The installer `scripts/install-character-checkins.ps1` is currently deleted in the working tree. | Move scheduling to a hosted cron (Supabase `pg_cron` + Edge Function, or the host's cron) with batched candidates and a concurrency limit. Deliver through C1. | Check-ins are sent without any local machine running. |
| C4 | P1 | Check-in and money-request copy can drift into guilt or pressure. | Add tests that reject guilt and FOMO wording ("don't leave me", "you forgot me") in check-ins and goodbyes. | Evaluation set passes; documented in the cast review. |
| C5 | P2 | No relationship-progress signal (companion apps use levels or streaks). | **Founder decision:** consider light, non-paid progress cues (e.g. "You've talked for 7 days"). Never tie warmth to payment. | Decision recorded. |

### D. Discover and matching

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| D1 | P1 | Pass is not saved on the server; deck position lives in session storage ([discovery-deck.tsx:15](../components/discovery-deck.tsx)). Passed characters return every session and on every device. | Add a `discovery_actions` table (user, character, action, time). Demote passed characters for a set period. | Passed characters do not reappear within the period on any device. |
| D2 | P2 | The order is fixed, with "Zuri" hard-coded first ([character-order.ts](../lib/character-order.ts)). | Move featured characters into admin configuration. Rank by onboarding preferences, novelty and engagement. | Featured order is editable without a deploy; ranking documented. |
| D3 | P2 | No moment after liking: Meet jumps straight into chat. | Add a short "Say hi now / Keep browsing" interstitial, keeping the existing heart animation. | Users can like without leaving the deck. |
| D4 | P2 | The next card's photo is not preloaded, so every Pass flashes; the swipe threshold uses distance only, so quick flicks snap back. | Render the next card underneath (also giving a stacked look) and add a flick-velocity check. | No blank frame between cards; quick flicks register. |
| D5 | P2 | Cards show only name, age and location; interests are hidden in a disclosure. | Show 2–3 interest chips on the card. Link the empty state to filters. | Visual review at 320–1440 px. |
| D6 | P2 | Onboarding collects only gender preference and language. | Optionally collect interests and conversation intent to feed D2. | Preferences used in ranking. |

### E. Chat experience

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| E1 | P1 | No per-message delete. A user who over-shares (phone number, BVN) must delete the whole conversation. | Allow users to soft-delete their own messages, also removing them from summaries and future context. | Deleted text never reappears in context, summaries or export. |
| E2 | P1 | When scrolled up, a new reply arrives silently. | Add a "New message ↓" pill. | Pill appears and scrolls correctly. |
| E3 | P1 | Older history loads as a full-page link (`?before=`) and disables the composer. | Load older messages in place with scroll anchoring. | Composer stays usable while browsing history. |
| E4 | P2 | Every message shows a visible red "Report message" link, and per-message controls are read aloud by screen readers in the live region. | Move per-message actions into a long-press/overflow menu, and announce only the new reply text. | Screen-reader check confirms quieter announcements. |
| E5 | P2 | Slow replies get no reassurance; polling slows to 10 s after 60 s. | Show calm copy (e.g. "Still writing…") after a delay; with C1, offer "We'll notify you". | Copy appears after a set delay. |
| E6 | P2 | The daily AI budget runs out invisibly. | Show a friendly, non-pressuring state when a user reaches the daily limit, with the reset time. | State covered in browser tests. |
| E7 | — | Voice notes, calls and user photo uploads are absent. | **Founder decision:** outside current PRD scope (Stage 14 / separate decision). Do not add their UI early. | — |

### F. AI quality, cost and reliability

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| F1 | **P1** | Each turn reserves the worst-case cost (a 48,000-token input plus maximum output) and never settles it against actual use; failed attempts are not refunded. Daily caps are reached long before real spend. | Settle each reservation to the actual `usage` returned by the provider and release unused amounts. Report reserved and actual spend separately in admin. | Budget ledger matches provider billing within an agreed tolerance. |
| F2 | **P1** | The large static system prompt (style rules, character direction, archetypes) is sent uncached on every turn ([provider.mjs](../lib/ai/provider.mjs)). | Order the prompt as a stable prefix (rules + character direction) and a dynamic suffix, and mark the prefix with `cache_control`. Check the minimum cacheable length for the configured Haiku model. | Cache hits shown in usage data; cost per turn measured before and after. |
| F3 | P1 | Provider 429/529/5xx errors use up one of 3 attempts with no backoff. One failed reply blocks all later replies in that conversation until the user retries or skips. | Add bounded retry with jitter for retryable provider errors that does not use up an attempt. Let a new user message supersede a failed job automatically. | Simulated 529 recovers without user action; blocked threads no longer occur. |
| F4 | P1 | Profile, memory or policy edits during generation discard the reply after it has been paid for (`context_revision`). Request-policy edits affect every conversation in the database. | Narrow invalidation to changes that affect the conversation. Bump the revision only for that conversation's user and character. | Editing an unrelated setting no longer discards replies. |
| F5 | P1 | `claim_reply` is wrapped 10 times across migrations, with `history` overwritten by three layers. | Consolidate into one readable function in a single migration before launch, with equivalence tests. | One definition; reply and offline suites pass. |
| F6 | P2 | Character voice layers are matched by character name. A rename silently drops them. | Match by character ID, and validate at build time that every published character has its layers. | Build fails on a missing or orphaned layer. |
| F7 | P2 | The repetition score is computed, but nothing regenerates despite the comment saying so ([repetition.mjs:88](../lib/ai/character-intelligence/repetition.mjs)). | Fix the comment, or regenerate once when the score exceeds the threshold (with budget accounting). | Behaviour matches the documentation. |
| F8 | P2 | Native-speaker and owner voice evaluation is still pending ([evaluation review](./cast-50/evaluations/review.md)). | Complete the blind review packet with native Pidgin and English speakers; record pass criteria per character. | Scores recorded for all 50 characters. |
| F9 | P3 | The OpenAI branch in the provider can never run; `OPENAI_API_KEY` remains in `.env.example`. | Remove it, or document it as an intentional inactive fallback. | No unreachable provider code. |

### G. Payments and monetisation

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| G1 | P1 | Bachs payments are code-complete but disabled. Merchant identity, sandbox acceptance, refund and dispute matching, and scheduled reconciliation are open ([bachs-payments](./bachs-payments.md)). | Complete the Stage 11 checklist in the [implementation plan](./implementation-plan.md), starting with sandbox end-to-end tests of every event type. | Stage 11 exit criteria evidenced. |
| G2 | P1 | Gifts are the only revenue path, and per-user AI cost is uncovered. | Model unit economics: cost per active user per day (after F1/F2) against expected gift conversion. **Founder decision:** whether to consider other models. The current plan excludes subscriptions and paid messages. | Decision recorded with numbers. |
| G3 | P1 | Payments are not monitored. | Add payment events to monitoring and alert on webhook failures and reconciliation mismatches. | Alert fires in a sandbox failure drill. |
| G4 | P2 | Apple requires in-app purchase for gifts tied to digital content or services. | If a native iOS wrapper is ever planned, design gifting around in-app purchase rules first. | Recorded as a constraint in the plan. |

### H. Platform, security and operations

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| H1 | **P0** | No deployment target or CI: no `.github` workflows, hosting config or Dockerfile. | Choose a host that supports Next 16 and `after()` for 20-second model calls (e.g. Vercel with Fluid compute, or a long-running Node server). Create separate staging and production Supabase projects. Run lint, typecheck, `test:core` and Playwright on every pull request. | Pull requests are gated by CI; staging deploys automatically. |
| H2 | **P0** | No security headers: [next.config.ts](../next.config.ts) has no `headers()`. | Add a Content Security Policy (self, Supabase, fonts; nonces for inline scripts), HSTS, `frame-ancestors 'none'`, a Referrer-Policy, a Permissions-Policy and `X-Content-Type-Options`. | Security-header scan grade A; app works under CSP. |
| H3 | **P0** | Production errors cannot be investigated: [instrumentation.ts](../instrumentation.ts) logs a fixed label only, monitoring writes to the console, and there are no alerts. | Add error tracking with personal-data scrubbing and release tags. Alert on reply-failure rate, budget exhaustion, webhook 5xx and auth errors. | A test error appears with a stack trace; alerts reach the on-call contact. |
| H4 | **P0** | A test-account email and password are committed in [local-test-account.json](../lib/backend/local-test-account.json). | Rotate the password, move it to ignored local configuration, and confirm no such account exists on any hosted project. | File removed from tracking; account audited. |
| H5 | P1 | Backups and the scheduler depend on one Windows PC; the hosted project is on the Free plan with no point-in-time recovery; encryption keys exist only locally; off-site copies are open. | Move to a plan with point-in-time recovery; run scheduled jobs on hosted infrastructure; store keys in a managed secret store with a recovery procedure. | Restore drill from hosted backups passes without the PC. |
| H6 | P1 | Each open chat polls `/sync` every 5 s, which loads the whole thread to compute a hash; reply polling runs alongside it. 1,000 open chats is about 200 requests per second at idle. | Use Supabase Realtime on messages and reply jobs (RLS-filtered), or a cheap revision check that reads one version column. | Idle load measured and reduced; behaviour unchanged. |
| H7 | P1 | Every cast photo is streamed through the server with `Cache-Control: private, no-store` ([cast-assets route](../app/api/cast-assets/%5BassetId%5D/route.ts)). The admin path lists all assets for each image. | Serve short-lived signed URLs, or at least `private, max-age` with an ETag; look up a single asset for admins. | Repeat Discover visits load photos from cache. |
| H8 | P1 | Migrations are applied by hand from one machine, with features switched on by `activate-*` scripts. | Apply migrations from CI to staging, then production; detect drift. | Migration state recorded in CI for each environment. |
| H9 | P1 | `reply_jobs` lacks a `(conversation_id, state)` index; check-in candidate queries scan all conversations; one hot `ai_daily_usage` row serialises every reservation. | Add indexes; batch or shard the project counter. | Query plans reviewed under synthetic load. |
| H10 | P2 | The 6 MB server-action body limit applies to every action, only for admin uploads. | Move uploads to a dedicated route with an early admin check, and restore the default limit. | Ordinary actions reject large bodies. |
| H11 | P2 | `/api/health` checks liveness only and is not monitored. | Add a private readiness check (database, storage, provider) and an external uptime monitor. | Outage drill triggers an alert. |

### I. Frontend architecture and design system

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| I1 | P1 | No PWA support: no manifest, service worker, `themeColor`, Apple or maskable icons. `public/` still holds Next.js boilerplate SVGs. | Add `app/manifest.ts`, viewport `themeColor`, icons, and remove the boilerplate. This is required for iPhone web push (C1). | Installable on Android and iOS; Lighthouse PWA checks pass. |
| I2 | P1 | No Open Graph or Twitter metadata, `robots.ts`, `sitemap.ts` or share image. Links shared on WhatsApp and X show no preview. | Add metadata and a branded share image for public pages; keep private pages `noindex`. | WhatsApp preview renders for `/`, `/how-it-works` and `/personalities`. |
| I3 | P1 | 20 global stylesheets (~144 KB) load on every route. Shared selectors are redefined across many files (`.button` in 13), so results depend on import order ([styles.md](./styles.md)). | Following [styles.md](./styles.md), move one component family at a time into a `.module.css` (chat first, then deck, then buttons), delete overridden rules, and retire empty stage files. | Each migrated family has one owner file; visual regression passes. |
| I4 | P1 | The superseded purple/lime theme still ships: `--lime`/`--lavender` are used 12 times plus hard-coded purples in [dating-refresh.css](../app/dating-refresh.css). Active navigation renders lime text on red. 130 hex colours sit outside [tokens.css](../app/styles/tokens.css). | Replace legacy aliases with brand tokens; add surface/border tokens; add a lint rule against raw hex outside tokens. | No legacy aliases remain; lint enforces tokens. |
| I5 | P2 | The mock chat and connected chat are separate implementations that have drifted apart: the mock lacks reactions, quotes, media and payment cards. | Extract shared `MessageTurn`, `Composer` and `formatMessageTime`; let the mock feed the shared components, as Discover already does. | One rendering path; mock preview matches production. |
| I6 | P2 | Very dense code: 232 lines over 400 characters (e.g. [chat.tsx](../components/chat.tsx), [connected-conversations.tsx](../components/connected-conversations.tsx)); 20 `useState` calls on 3 lines; list lookups inside render loops on a page refreshed every 5 s. | Apply a formatter; split large components; build lookup maps before rendering. | Formatter enforced in CI. |
| I7 | P2 | The profile's primary action sits at the bottom of a long page; the floating navigation overlaps content on some screens; "Sign out" is the only header action everywhere. | Sticky mobile call-to-action; fix the overlap; move Sign out into Settings → Account. | Visual review at all widths. |
| I8 | P2 | `/admin`, `/admin/access` and `/admin/analytics` show a mock or "preview unavailable" screen in production. The admin sidebar background stops part-way down on desktop. | Redirect `/admin` to the cast list until a real dashboard exists (K2); fix the sidebar. | No dead-end admin routes in production. |
| I9 | P3 | Unused components (`landing-portrait.tsx`, `onboarding-preview.tsx`) and their CSS. | Delete them. | Lint and build pass. |
| I10 | — | Physical-device, text-zoom and screen-reader checks remain deferred. | Complete the existing [pre-pilot manual review](./pre-pilot-manual-review.md) (already a pilot gate). | Evidence recorded. |

All UI work follows the frontend-design skill and [design system](./design-system.md), as required by `AGENTS.md`.

### J. Code health and documentation

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| J1 | P2 | The AI core, payments and monitoring (~200 KB of `.mjs`) are not type-checked: `allowJs` without `checkJs`. | Enable `checkJs` with JSDoc types, or convert to TypeScript, starting with payments and the provider. | Typecheck covers these modules. |
| J2 | P2 | Twelve migrations rename and wrap earlier functions, producing deep chains. | Consolidate into a clean baseline before production (see F5) and adopt plain `create or replace` going forward. | New migrations follow the convention. |
| J3 | P2 | Gaps in tests: safety classifiers have only positive cases; no load tests for polling, the image route or check-in scaling; no browser tests of security headers. | Add negative and Pidgin safety cases, a basic load test and header checks. | Suites included in CI. |
| J4 | P3 | Documentation sprawl: [design-system.md](./design-system.md) (55 KB, 36 dated amendments at the top), [implementation-plan.md](./implementation-plan.md) (54 KB), 128 review files. | Move dated history into a changelog; keep each specification as current state only. | Each spec readable as current truth. |
| J5 | P3 | Mock fixtures duplicate production logic across many components. | After launch, keep mocks as preview fixtures only and stop adding mock-only behaviour. | Policy recorded in the plan. |

### K. Product analytics

| ID | Priority | Finding | Action | Done when |
| --- | --- | --- | --- | --- |
| K1 | **P1** | No product analytics. Monitoring deliberately excludes user identifiers, which suits operations but cannot answer product questions. | Record a small, privacy-preserving event set on the server (hashed user ID, no message text): `signup_completed`, `onboarding_completed`, `deck_pass`, `deck_meet`, `message_sent`, `reply_delivered`/`reply_failed`, `checkin_delivered`/`checkin_opened`, `budget_exhausted`, `gift_started`/`gift_paid`, `report_filed`, `account_deleted`. | Events recorded in staging; no intimate text stored. |
| K2 | P1 | `/admin/analytics` is a fixture. | Build funnel, day-1/day-7/day-30 retention, messages per user, Meets and Passes per character, reply failure rate, AI cost per active user and gift conversion, mostly from existing tables via views. | Dashboard shows real staging data. |
| K3 | P2 | Pilot success thresholds are undefined (plan Stage 13). | Set thresholds from pilot data. Market benchmarks are weak and vendor-sourced: dating-app day-30 retention is reported around 2–5%. | Thresholds recorded after the pilot. |

---

## 5. Decisions required from the founder

| Decision | Why it matters | Related items |
| --- | --- | --- |
| Gendered money requests and payment wording | Legal, reputational and provider-policy exposure | A7, G2 |
| Revenue model beyond voluntary gifts | Per-user AI cost is currently uncovered | G2 |
| Age-assurance level (self-declaration, date of birth, estimation or ID) | Regulator trend; a prerequisite for any explicit mode | B3 |
| Hosting provider and paid Supabase plan | Production deployment, backups and scheduled jobs | H1, H5 |
| Crisis resources to publish | Must be verified, current Nigerian services | A1 |
| Relationship-progress cues | Retention without pressure or paywalls | C5 |
| Voice, user photos and other out-of-scope features | Not in the current PRD | E7 |
| Explicit adult chat | Not possible on the current provider; requires a compatible provider, age assurance and opt-in controls ([scope record](./cast-50/adult-chat-scope.md)) | A8, B3 |

---

## 6. Suggested sequence

### Phase 0 — make it safe to admit real users (P0)
B1, B2, H1, H2, H3, H4, A1, A2, A3.

### Phase 1 — pilot-ready
- **Engagement:** C1, C2, C3, I1, I2.
- **Privacy:** A4, A5, A6.
- **AI cost and reliability:** F1, F2, F3, F4.
- **Platform:** H5, H6, H7, H8.
- **Analytics:** K1, K2.
- **Completing existing gates:** G1 and I10.

### Phase 2 — pilot and public-launch hardening
A7, A8, B3, B4, C4, D1, E1–E3, F5, G2, G3, H9, I3, I4, I8.

### Phase 3 — growth and quality
D2–D6, E4–E6, F6–F8, A9, A10, I5–I7, J1–J3, K3.

### Ongoing cleanup
F9, I9, J4, J5, H10, H11.

This sequence fits the existing stage gates. Phase 0 and Phase 1 complete open Stage 10–12 items and Gate B. The manual device and accessibility review (I10) remains mandatory before any pilot participant is admitted.

---

## Appendix A. Research sources

Pricing and feature details from third-party sites vary; company figures are self-reported. Retrieved 24 October 2026.

**Dating apps**
- Hinge profile requirements: https://help.hinge.co/hc/en-us/articles/360011053094-How-do-I-edit-my-profile
- Hinge Prompt Feedback: https://techcrunch.com/2025/01/15/hinge-new-ai-feature-determines-if-your-prompt-response-is-too-basic/
- Hinge Your Turn Limits: https://hinge.co/newsroom/your-turn-limits
- Bumble Opening Moves: https://techcrunch.com/2024/04/30/bumbles-opening-move-feature-takes-the-pressure-off-women-to-come-up-with-a-new-message-every-time
- Bumble Premium: https://bumble.com/en-us/the-buzz/bumble-premium
- Tinder Face Check: https://www.prnewswire.com/news-releases/tinder-to-expand-facial-verification-feature-across-the-us-setting-a-new-standard-for-dating-safety-302590842.html
- Tinder "Are You Sure?": https://www.tinderpressroom.com/2021-05-20-Tinder-Introduces-Are-You-Sure-,-an-Industry-First-Feature-That-is-Stopping-Harassment-Before-It-Starts
- Tinder safety features: https://policies.tinder.com/community-resources/safety-features
- Match Group AI features (SEC filing): https://www.sec.gov/Archives/edgar/data/0000891103/000089110325000179/mtch8-k20251104ex992.htm

**AI-companion apps**
- Companion market spending: https://techcrunch.com/2025/08/12/ai-companion-apps-on-track-to-pull-in-120m-in-2025
- Nomi vs Kindroid (third-party): https://companionwise.com/compare/nomi-vs-kindroid/
- Replika pricing (third-party): https://www.eesel.ai/blog/replika-ai-pricing
- Replika 2023 roleplay removal: https://companionwise.com/guides/replika-erp-controversy-what-happened/
- Garante fine on Replika: https://commlawgroup.com/2025/us-based-ai-developer-fined-e5-million-for-gdpr-violations-key-takeaways/
- Character.AI under-18 changes: https://techcrunch.com/2025/10/29/character-ai-is-killing-the-chatbot-experience-for-minors/
- Character.AI settlements: https://edition.cnn.com/2026/01/07/business/character-ai-google-settle-teen-suicide-lawsuit
- FTC companion inquiry: https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions
- Manipulative goodbyes (HBS working paper): https://www.library.hbs.edu/working-knowledge/why-its-so-hard-to-say-goodbye-to-ai-chatbots

**Regulation and platform policy**
- Nigeria Data Protection Act 2023: https://cert.gov.ng/ngcert/resources/Nigeria_Data_Protection_Act_2023.pdf
- NDPA explainer: https://fpf.org/blog/nigerias-new-data-protection-act-explained/
- GAID 2025: https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf
- GAID compliance notes: https://privacymatters.dlapiper.com/2025/06/nigeria-ndpc-issues-gaid-key-compliance-insights/
- FCCPC v Meta: https://www.thecable.ng/breaking-tribunal-upholds-fccpcs-220m-fine-against-meta/
- NITDA Code of Practice: https://nitda.gov.ng/wp-content/uploads/2022/06/Code-of-Practice.pdf
- California SB 243: https://www.skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law
- New York AI companion law: https://www.governor.ny.gov/news/governor-hochul-pens-letter-ai-companion-companies-notifying-them-safeguard-requirements-are
- EU AI Act Article 50: https://www.bakerbotts.com/thought-leadership/publications/2026/september/eu-ai-act-article-50-transparency-obligations-go-live
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play policy: https://play.google/developer-content-policy/
- Ofcom age-assurance guidance: https://www.ofcom.org.uk/siteassets/resources/documents/consultations/category-1-10-weeks/statement-age-assurance-and-childrens-access/part-3-guidance-on-highly-effective-age-assurance.pdf
- Anthropic Usage Policy: https://www.anthropic.com/legal/aup
- Paystack terms (restricted businesses): https://paystack.com/terms

**Benchmarks**
- RevenueCat State of Subscription Apps: https://www.revenuecat.com/state-of-subscription-apps
- Response-time limits (Nielsen Norman Group): https://www.nngroup.com/articles/response-times-3-important-limits/
- Push opt-in benchmarks: https://www.mobiloud.com/blog/push-notification-opt-in-rate/
- iOS web push requirements: https://webkit.org/blog/13966/webkit-features-in-safari-16-4/

## Appendix B. Method and limits

- **Codebase review:** all migrations, the backend and AI layers, the API routes, the main UI components and stylesheets, the configuration files, and existing review screenshots, at commit `aab4d79`.
- **Checked directly against the source:**
  - the email-confirmation and password-change settings;
  - the absence of security headers, CI configuration, manifest and Open Graph files;
  - `no-store` caching on cast photos;
  - `unread_count` never being incremented;
  - the anchored minor-detection regex;
  - the hard-coded featured character;
  - female-only money requests;
  - the committed test-account file.
- **Not performed:** live hosted-project inspection, load tests, physical-device or screen-reader testing, or legal review. Hosted settings are taken from project documentation and may differ from the live dashboard.

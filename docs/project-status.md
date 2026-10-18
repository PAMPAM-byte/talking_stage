# Current project status

18 October conversation synchronization: latest open chats now use adaptive reply polling and independent revision checks to receive background messages without a manual refresh. Temporary failures reconnect, focus catches up, drafts persist through server-history updates, and chat API paths refresh session cookies through Proxy. Sixteen browser checks, the offline recovery/boundary suites, TypeScript and scoped lint passed. This does not introduce token streaming, inbox synchronization or an unattended generation worker. [Behavior, evidence and limits](./reviews/conversation-sync.md).

18 October personal-life correction: all 50 published characters now receive their profile occupation, location and 250 authored personal-canon entries covering work, adult friends, family, past relationships and former adult crushes. The ambiguous prohibition on employment was corrected to permit fictional first-person biography without real services/access claims or unsolicited AI disclaimers. All 50 profession answers and Amara's personal-history continuity were checked live; targeted English/Pidgin regressions brought this revision to 65 completed replies and $0.345280 reserved budget. Existing public profiles, UUIDs, conversations and 100 photos were preserved. [Evidence and remaining limits](./cast-50/life-review.md).

17 October live conversation regression: 228 metered replies completed, comprising a six-voice 66-reply pilot and fresh multi-turn checks across all 50 voices. The shared runtime style was tightened after the pilot. Quiet-turn follow-up questions were observed in 4/6 original pilot replies and 0/50 fresh replies; prompts differ, so this is descriptive evidence rather than a controlled A/B result. The persistent usage ledger reconciled to $1.211136 reserved budget, with unchanged daily limits and the synthetic evaluation login disabled. All 16 offline core suites, repository-wide lint and TypeScript passed. [Full evidence and the blind review packet](./cast-50/evaluations/review.md) retain outputs and flag repeated wording. Native/owner scores, full scenario coverage and distinctiveness acceptance remain pending. Earlier blanket statements below that live testing is pending describe the prior stage.

17 October cast frontend delivery: all 50 profiles and 100 photos are now published to hosted Discover and included in the local frontend catalogue, including 56 newly generated, visually reviewed photos. Search, gender filters and progressive loading are implemented. Hosted completion and ordinary-adult pagination are verified in the cast publication receipt. See [delivery review](./reviews/cast-50-publication.md). Earlier pending-photo and unpublished-direction statements below describe the prior draft stage. Native/live voice evaluation remains pending.

17 October relationship amendment: the founder requested explicitly adult text chat. [The scope decision](./cast-50/adult-chat-scope.md) records the new intent and the verified Anthropic provider incompatibility. Explicit generation remains disabled. All 50 draft voices now include distinct romantic pacing and substantive-conversation guidance; shared runtime style improves continuity, reciprocal non-explicit flirting and de-escalation. This does not apply the individual draft directions or change photo scope.

17 October cast work: [50 Nigerian personality drafts](./cast-50/README.md) are prepared for review, covering all 22 existing voices plus 28 proposed additions. Shared runtime conversational style is updated, but the individual draft directions are not applied. Native-speaker/live evaluation and 56 new photos remain pending. This does not change the recorded hosted count of 22 or grant publication/release approval.

16 October 2026. This is the current status index. Stage contracts and dated reviews preserve implementation history; later evidence supersedes earlier descriptions of configuration or availability. This document records repository evidence, not a fresh inspection of hosted services.

| Area | Delivered and recorded | Still required |
| --- | --- | --- |
| Frontend | Stages 0–7 accepted for backend handoff. Shared red/white/blush identity, swipe discovery, direct Meet-to-chat, public information pages, settings and admin screens. | Physical Android/iPhone, keyboard, text enlargement, TalkBack and VoiceOver evidence before pilot admission. |
| Accounts | Supabase Auth, 18+ self-declaration, onboarding, ownership/RLS, roles and local recovery tests. Hosted signup/sign-in and selected ownership checks recorded. | Hosted recovery email/SMTP, deployed redirects, quotas and trusted client-IP acceptance. |
| Cast and photos | 50 published hosted profiles and 100 current photos; private image delivery. Fifteen versioned database migrations are checked in. | Final release approval and deployed regression. Historical eight-character local evidence remains historical. |
| Conversations and AI | Durable messages, idempotency, reply leases, explicit retry/skip, approved-photo selection, consented memories and extractive-summary pipeline. Haiku activation and recovery migration recorded on 15 October. | Broader live safety/voice/Pidgin/refusal/photo/summary/cost evaluation; deployed reply execution and interruption acceptance. Stage 10 remains in progress. |
| Payments | Accepted frontend scenarios and request-control foundations. | Stage 11 gateway, confirmation binding, verified events, reconciliation, history and ledger integration. No real checkout is implemented. |
| Privacy and operations | Reporting, ordinary-account deletion implementation, restore suppression, encrypted hosted exports to this machine, retention scripts, health probes and runbooks. | General-user hosted deletion remains gated; independent off-site backup/erasure-ledger/key recovery, alert delivery, retention/support decisions and remaining Stage 12 integration. |
| Release | Gate A passed for backend work. | Gate B, pilot admission and public-release gates remain open. |

## Environment distinctions

- Development without Supabase mode uses labelled synthetic fixtures. Production requires real Supabase configuration and identity.
- The working application was switched to hosted Supabase. The prior Docker configuration is preserved separately. Local-only scripts intentionally reject hosted targets.
- According to the [15 October activation record](./claude-haiku.md), the application environment enables Anthropic Haiku with approved **$20 project-wide and $2 per-user daily limits** enforced by private database configuration. The operational hosted-test environment remains separately AI-disabled. Configuration files and credentials are ignored and must remain private.
- A successful synthetic live reply establishes basic integration, not comprehensive live-model acceptance. No status document grants new spending, deployment or publication permission.

## Evidence and next work

Use the [implementation plan](./implementation-plan.md) for stage dependencies, [Haiku record](./claude-haiku.md) for activation, [hosted handoff](./hosted-setup.md) for cast/environment history, and [manual checklist](./pre-pilot-manual-review.md) for pilot admission.

Engineering hardening precedes new product work: reliable checks, readable reply boundaries, bounded recoverable delivery, a single source of shared theme tokens and a documented stylesheet order. Record fresh results and remaining hosting dependencies in the [engineering review](./reviews/engineering-hardening.md).

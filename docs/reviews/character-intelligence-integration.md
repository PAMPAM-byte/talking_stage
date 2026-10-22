# Character intelligence archive integration

Source: `talkingstage-character-intelligence (1).zip`, reviewed 22 October 2026. File digests are recorded in `character-intelligence-archive-manifest.json` beside this document.

The founder requested implementation of the archive's character intelligence ideas. Its README, AGENTS and CLAUDE documents were reviewed as proposal material, not adopted as workspace instructions. Existing product decisions, approved character canon, explicit memory consent and runtime provider constraints take precedence.

## Implemented mapping

| Archive proposal | Project implementation |
| --- | --- |
| Types, archetypes and assignment | Twelve private voice dimensions in `lib/ai/character-intelligence/archetypes.mjs`; deterministic adapters for all 50 existing profiles in `profiles.json`. Existing tags determine assignment, not age, ethnicity, occupation stereotypes or target quotas. Names, ages, locations, public filters and biographies remain sourced from the existing roster. |
| Context and relationship stage | `context.mjs` derives conservative familiarity from actual user turns and local conversation dates. A bounded history can underestimate familiarity. Stage ceilings never establish attraction or consent. Existing timeline context remains authoritative. |
| Relevant memory | Only already-consented facts enter selection. Up to 20 facts, with optional trusted event dates prioritized when available. The current worker supplies strings without event dates; no inferred dates, automatic extraction or new memory storage was added. |
| Nigerian register | Voice guidance complements the existing Naija examples and individual canon. English stays the default; Pidgin requires a real user cue. It is not inferred from birthplace or tags. |
| Repetition | Adapted archive overlap, repeated opening and reference-copy checks in `repetition.mjs`. Recent repetition adds a generic pre-generation reminder; output receives a numeric diagnostic. Old messages and detected phrases are excluded from telemetry. |
| Humanizer | Narrow removal of stock assistant openings and literal stage directions. Preserves names, ordinary punctuation, meaningful emphasis and paragraph structure. Does not turn arbitrary prose into an accepted model response. |
| Prompt builder / generation | Integrated into the existing strict-schema provider and both reply/check-in workers. Preserves complete individual directions, validated media/reaction/quote/gift actions, bounded input, budget reservation and atomic commit. Optional adapter text can be removed under the existing hard prompt budget. |
| Contextual safeguards | Explicit first-person underage disclosures stop generation; direct distress and sensitive credential disclosures add care guidance. Narrow output checks cover false human claims, off-platform contact, financial promises and explicit roleplay. These are limited checks, not comprehensive classifiers. Contextual identity handling still distinguishes “are you for real?” from a direct AI identity question. |
| Quality telemetry | Fixed, numeric/stage/flag-only server logging through `emitReplyQuality`, isolated from delivery failures. No raw chat, private direction, signature reference, user ID or account details are logged by this event. This is not a new persistent safety audit database or admin dashboard. |
| Tests and evaluation | Native Node regression tests, deterministic adapter verification and a 500-case offline prompt matrix. Existing live evaluation tooling remains available; no new paid judge, extra provider model or live quality score was introduced. |

`scripts/build-character-intelligence.mjs` verifies the private catalog; `--write` regenerates it from the current authored roster for review. It never writes to hosted services. `scripts/evaluate-character-intelligence.mjs` checks all 50 profiles across ten situations without contacting a provider. Both are included in the offline core suite.

## Deliberate adaptations and exclusions

- No fake online, sleeping or busy presence, artificial read delay, or 3–12-minute double texting. Actual delivery/read/typing state and existing opt-in check-in controls remain in use, with the founder's once-per-day limit and off switch.
- No replacement sample cast or archive quota that would reduce the 16 approved luxury/baddie female profiles. Older archetypes are drawn only from the existing older adult profiles.
- No automatic paid rewrite loops. Repetition is guidance plus diagnostics; it does not silently reserve another provider call or guarantee a fresh answer. Generated output is saved through the existing idempotent pipeline.
- No blanket ban on approved photos or the existing user-controlled gift link. Real payment acknowledgement still comes from verified application state, never a model assertion.
- No separate delayed multi-bubble persistence. The existing atomic reply and established photo/quote/reaction paths remain intact. The archive's sample route had placeholder persistence and could not replace those guarantees safely.
- No public character columns, new sensitive-event table, speculative SQL assignment, Anthropic SDK dependency or provider/model switch. These additions are unnecessary for the private runtime adapter and would duplicate existing project boundaries.
- Explicit adult text remains planned scope; it is not enabled by this integration. The configured provider's current non-explicit runtime remains enforced.

## Verification and limits

Regression coverage includes all-profile prompt preservation, source consistency, familiarity thresholds, permitted-memory selection, copied references, cleanup, contextual safeguards, strict output, no unmetered retry, telemetry redaction and existing database/worker delivery guarantees. Offline tests cannot establish that every generated conversation will sound natural. Fresh live voice review remains a separate acceptance step; no hosted cast mutation, migration, deployment or external payment was performed for this integration.

Validation on 22 October: TypeScript checking and scoped ESLint passed; all 43 existing/new offline core suites passed before adding the two deterministic verification scripts. Those two scripts then passed independently: all 50 adapters matched their source, and all 500 prompt assemblies passed. The core runner now includes both scripts (45 suites). The existing 450-case full-direction prompt-budget regression also passed, with the largest case at 47,993/48,000 bytes including reserve.

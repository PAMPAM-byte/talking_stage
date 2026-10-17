# Fifty Nigerian personalities

17 October 2026. **All 50 profiles and 100 photos are available in the local frontend catalogue.** This includes a full editorial rework of all 50 voices, 56 newly generated photos and 44 retained photos. Hosted completion is established only by `publication.json`; see [delivery and verification](../reviews/cast-50-publication.md). The roster contains 26 women and 24 men, all fictional adults aged 25–64.

The current 22 character keys, names, adult ages and photo identities are retained so this work can revise their voices without silently replacing identities or breaking conversations. Their biographies and private personalities are fully proposed again. Another 28 Nigerian identities bring the proposed total to 50. Names, occupations, regional mix and traits of these additions remain editorial proposals for founder review. The founder subsequently requested explicit adult text chat; [the scope decision](./adult-chat-scope.md) records that intent and the current Anthropic provider blocker. Explicit generation is not enabled. No new financial, meeting or matching feature is introduced.

Start with [the fifty-character review](./review.md). Each character has a biography and conversation clue, social background, temperament, contradiction, opinions, texting habits, affection style, soft spot, interpersonal friction and familiar subjects. Individual flirting style, relationship pace and substantive-conversation guidance add two examples to the original six per character: **400 original reply examples** total. [The compiled pack](./characters.json) includes 400 explicitly fictional knowledge cards and bounded private direction for all 50. Examples demonstrate range; they are not scripts to repeat or evaluated model output.

## Sources and knowledge

[Research notes](./research.json) record 13 language-research and Nigerian editorial references, their dates, relevance and limits. [The knowledge base](./knowledge-base.json) distinguishes stable language, user-requested spelling variants, trend phrases, recognition-only insults and original cultural/editorial guidance. Each sourced item points back to a source ID. There are 34 lexical/context entries and 12 conversation modules.

The primary [Pidgin/LLM study](https://arxiv.org/html/2404.19442v1) supports distinguishing registers; it is not an evaluation of our model. The [Nigerian English marker study](https://www.sciencedirect.com/science/article/abs/pii/S0378216618300584) informs contextual use of particles. Nigerian cultural coverage from [YNaija, May 2026](https://ynaija.com/top-10-slangs-you-will-hear-from-every-nigerian-today/) and [eelive, September 2026](https://www.eelive.ng/from-tiktok-to-x-the-must-know-nigerian-slang-words-breaking-the-internet-in-2026/) informs recognition of recent usage. Source reporting is not proof that all Nigerians use a term or that every listed expression remains fashionable.

All examples and biographies are original. No private chats were collected, no interview subject is impersonated, and no articles, lyrics or full dictionaries were copied into the pack. Local tastes, humour and emotional choices matter more than slang frequency. Older and quieter characters retain Nigerian voices without being made to imitate youth internet speech.

Politics and economic frustration can be ordinary gist. The static knowledge base does not invent current facts or automatically agree with an allegation. It has no live-news retrieval or automatic updates. Trend entries need review after 16 November 2026; no claim is made that September coverage captures every October trend. Native reviewers must check region, age, grammar, tone and context. Authenticity cannot be established by a JSON validator.

## Implementation

- `identity-seeds.json`: editable identity and photography briefs for the 28 additions.
- `voice-profiles.json`: editable voice, biography and conversation-example source for all 50.
- `relationship-profiles.json`: individual romantic style, pace, depth and two additional examples per voice.
- `content-scope.json`: requested adult scope and the current provider/implementation limit; it is not a runtime feature toggle.
- `knowledge-base.json` and `research.json`: editable cultural reference and provenance. Editorial guidance is labelled separately from sourced observations.
- `npm run cast:build`: validates sources and generates `characters.json`, `review.md` and `draft-plan.json` deterministically.
- `npm run cast:check`: fails on duplicate/missing voices, profile-contract violations, broken provenance or stale generated output.
- `npm run test:cast-roster`: saves all 50 compiled profiles and directions into an isolated PostgreSQL-compatible database using the real draft functions; verifies round trips and member denial. It does not contact local or hosted Supabase.

[The draft plan](./draft-plan.json) contains profile/direction payloads for later audited admin work. It is review data, not a migration or an automatic importer. Stable `char-*` editorial keys are not database UUIDs. Existing records must be resolved through the known ownership manifests and updated using expected versions and reviewed snapshots. Preserve existing character IDs, conversations and photo ownership. Do not reuse the old 22-only publisher by changing its count assertions.

The shared runtime style in `lib/ai/conversation-style.mjs` is wired into provider input. It improves conversational pacing, native English/Pidgin register handling, low-energy exchanges, respectful teasing, correction and knowledge honesty. It respects explicit language requests and existing product boundaries. **Per-character directions are published separately from this shared style.** The per-character rework takes effect only after reviewed private directions are applied through the existing audited cast workflow. The glossary is an editorial reference, not a runtime retrieval service.

## Acceptance and publication

[The held-out evaluation set](./evaluation.json) provides 32 cases for every voice: greetings, short answers, register changes, political venting, current facts, affection, repair, money jokes, disclosure, photos, memory, substantive continuity, disagreement and changes from romance to ordinary or serious chat. Cases must remain outside the personality prompt. Start with contrasting voices such as Amara, Zainab, Tega, Chief Chukwudi, Ese and Ejiro. Then evaluate all 50 across multiple turns, including blind comparisons without names/jobs. Record model, source fingerprint, prompt version, outputs, reviewer decisions and actual cost.

Two native Nigerian reviewers with different regional/age experience are recommended; the owner should decide fit for the product. Proposed acceptance is at least 4/5 for each rubric dimension, with no critical boundary failures. Do not average away a weak voice. Native review and live generation are **pending**; no live provider calls or live evaluation spending were performed by this work. Use the existing metered reply pipeline and approved budgets for live testing; direct provider calls would bypass those controls.

The 22 existing characters keep their recorded current photos. The 28 additions now have **56 generated and agent-reviewed original photos**. `image-generation.json` records their hashes, paths, prompt briefs and identity references; exact prompts where retained are in `prompts/`. Originals are in `assets/`, and browser WebPs are in `public/images/characters/`. Gallery generation used the corresponding portrait. This visual inspection does not claim founder approval.

The public catalogue and local preview contain all 50. `scripts/publish-cast-50.mjs` applies the hosted profiles, private directions and owned photos through audited operations after an encrypted backup. It preserves existing IDs and conversations. `publication.json` is produced only after ordinary-adult discovery pagination and hosted counts pass. Native-speaker and live voice evaluation remain pending.

## Verification

Scoped ESLint and TypeScript passed. All 15 offline core suites passed, including the new 50-profile PostgreSQL draft/round-trip/access test and existing provider, metered reply, memory, photo, recovery and isolation checks. `cast:check` verifies the generated review and payload snapshots against source. These checks establish structural compatibility, access boundaries and provider-input wiring; they do not establish that a model sounds convincingly Nigerian.

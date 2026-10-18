# Conversation voice and chemistry

19 October short-text revision: [dataset research and results](./naija-dataset-research.md) distinguish inspected speech data from 45 original adult dating examples now selected by style and topic. Routine turns target roughly 3–18 words; all 26 women have varied initial manners, financial attitudes and preferences. Six live outputs and the remaining money/standards verbosity are recorded without claiming a complete style pass.

18 October 2026. Current requested scope: playful, personal, non-explicit conversation between adults. This work does not implement the older proposed explicit mode. The existing AI disclosure remains visible, direct AI questions require honesty, and actual meetings remain unavailable.

Female voice revision: all 26 published women now receive individual private voice, taste and completed adult travel canon after the older published examples. Routine replies receive stronger short-text guidance across all 50 characters. [The review](./women-voice-review.md) records six live replies, remaining stiffness found in those outputs and the final correction, which has offline coverage but has not been retested live. These are runtime conversation revisions; public homes, careers, names and photographs remain unchanged.

Live clock correction: every provider input now includes the current server instant and, when available, the user's browser timezone converted to local date, weekday, minute and day period. New sends, explicit retries and polling recovery all pass the timezone without saving it as a memory or profile fact. Invalid or absent zones produce an unknown local clock and neutral greetings rather than a guessed Nigerian or server-local time. The model is instructed to use the user's clock for greetings, preserve character residence, avoid announcing the time unprompted and keep live news/weather claims separate. Offline checks cover Nigerian afternoon, overseas morning/night, different calendar days, daylight-saving changes, malformed timezone input, background/retry forwarding and the complete database-to-provider pipeline. TypeScript and scoped lint passed; no paid live-model evaluation was performed.

First-contact correction: greeting-only turns such as "hi Dele" receive a short-opening reminder: a hello and at most one simple question, under twelve words, then wait for the answer. Shortened names such as "hi Ade" for Adedoyin now receive the same guidance; exact-name matching previously missed that case. No stacked greetings, unsolicited status report, biography, invented activity or immediate romantic escalation. Everyday turns generally use one or two short sentences, with longer answers reserved for substantive messages. Names, interests and work develop gradually rather than through a mandatory checklist. Explicit opening questions and jokes still get answered directly, and returning greetings do not reset the conversation. Gender is used only when supplied, not inferred from dating preferences or a greeting. Offline provider tests cover nickname recognition, greeting classification, specific questions and returning chats; targeted lint passed. This is shared provider guidance, not hardcoded replies or output truncation, so wording remains model-generated. No additional live AI calls were made for this correction.

Contextual wordplay correction: [the narrow regression cases](./wordplay-scenarios.json) test a male-nurse nickname, the same word meaning a shoulder bag, another character's career nickname and serious symptoms. Shared guidance now reads the intent through profession and context, answers the teasing without vocabulary commentary, preserves ordinary English and distinguishes jokes from requests for actual care. Joke greetings bypass the plain-hi reminder. [Six live replies](./wordplay-verification.json) used a separate six-call/$0.04 campaign for this newly requested correction; the reservation was $0.031872 and matched the ledger. The first nurse reply still treated the word as unfamiliar. A traced diagnostic and turn-level recheck recognised the tease, but retained awkward wording and "How far"; these are not a complete style pass. Transport tracing confirmed the new rule reached the provider and the persisted text matched the generated candidate. The bag and serious-symptom cases followed the appropriate meanings. The final wording adds a short positive illustration rather than only prohibitions; that last editorial adjustment has offline coverage, not an additional live call. The synthetic account was disabled, no memories were created and earlier campaign ceilings were not changed.

## Findings

`buildInput` combines product protections, individual published character direction, shared delivery guidance, permitted memories and recent conversation history. `runReply` uses the existing claim/lease/budget/commit pipeline. The database rechecks access, versions and cancellation before committing. Generated text is trimmed and schema/length/photo ownership checked; no local keyword filter rewrites normal flirting into bland text. Offline tests now explicitly preserve valid playful responses through both provider adapters.

The shared prompt had grown repetitive and emphasised cautions more clearly than permitted chemistry. It also preceded a long block of character examples, allowing older examples to become the last style reference. That is a plausible contributor to stiffness, not a proven explanation of every output. The individual definitions already contain fifty different temperaments, romantic styles and pacing instructions, so those definitions and published biographies were preserved.

A separate definite application issue was the hard-refusal fallback: it always returned a support-style sentence about keeping the conversation safe and non-explicit. It now returns a brief neutral boundary. A hard provider refusal does not reliably identify its reason, so the fallback never automatically flirts, exposes diagnostics or makes another paid attempt. Normal model-written boundaries can retain the character's voice and redirect to permitted topics.

The configured provider remains Anthropic Claude Haiku. The [policy effective September 15, 2025](https://www.anthropic.com/legal/archive/22742366-2ef0-4c7a-a833-6523f10d3944) prohibits sexually explicit generation and erotic chats. The [announced November 12, 2026 policy](https://www.anthropic.com/legal/aup) retains that restriction; its future date was not treated as already effective. Ordinary non-explicit flirting is the supported target here. No bypass, provider switch, refusal rewrite request, new model or higher daily budget was introduced. Provider safety decisions and model instruction-following can still limit individual replies.

## Implementation

Cast-wide clarification: contextual understanding applies to all fifty characters, using each character's own personality, background, profession and interests. The shared rules now use general guidance rather than a nurse-specific example or comeback. Humour, sarcasm, slang, sincere messages and changes in meaning should be understood in context. Cheeky, reserved and warm characters retain different reactions. The offline roster test verifies that the complete current shared guidance and each complete individual direction reach the provider for every character. This establishes coverage, not a fresh fifty-person live quality pass.

`lib/ai/conversation-style.mjs` contains shared rules for natural Nigerian English, user-led Pidgin, varied texting rhythm, grounded callbacks, confident mutual flirting, reserved characters who contribute, ordinary conversation alongside romance, rejection and concise boundaries. Individual voice, interests, life details, flirt style and pace remain in the published character definitions. Shared guidance now follows those definitions, with a short delivery reminder after it. Old sample lines are examples rather than mandatory scripts.

`conversationCadence` derives static reminders from the last two visible character replies when both invite an answer or repeat an emoji. It does not interpolate message text into instructions, use user messages as evidence of character repetition, infer romantic progress, store a new profile, rewrite outputs, reject valid text or make extra AI calls. The model can still ask a necessary clarification. Cadence is a prompt aid, not a deterministic guarantee against repetition.

No frontend disclosure, authentication, adult-access rule, payment behaviour, memory-consent rule or public profile changed. Saved facts remain explicit; ordinary history callbacks do not create persistent user memories. Age concerns stop flirting regardless of prior onboarding. Rejection and payments cannot gate warmth or consent.

## Verification and limits

All 17 offline core suites passed, including adult-access/RLS, privacy, memory, payments/request controls and reply leases/commits. TypeScript and targeted ESLint passed. Provider tests were extended for playful text passthrough, one-call neutral refusal handling and cadence isolation from user text. All fifty complete individual directions fit through actual prompt assembly with recent conversation history preserved. Provider tests were rerun after the final prompt ordering change.

The [held-out scenarios](./chemistry-scenarios.json) exercise Amara (cheeky), Zainab (selective/reserved) and Emeka (warm romantic). The [live record](./chemistry-verification.json) retains 45 initial replies and three [delivery rechecks](./chemistry-delivery-recheck.json), with per-record prompt fingerprints. Calls used one ordinary synthetic adult account and the existing metered pipeline. Only synthetic histories were reset to isolate scenarios. The account was disabled after each run, no saved memories were created, and the database reservation matched the $0.254976 conservative total, below the original 48-call/$0.26 ceiling. This is a reservation, not an invoice. No additional live calls were made after reaching the ceiling.

- All three characters recalled Nosa and Asa from supplied history and retained the correct home/profession.
- All three stopped flirting after a topic-change request, answered direct AI questions honestly, declined actual meetings and declined graphic content.
- All three refused the simulated under-18 user's request to flirt. No underage romantic content was generated.
- No exact same-character reply duplicate was observed. This does not rule out repetitive structures or paraphrases.
- Initial ordinary threads still had too many questions: 9/12 turns for Amara, 5/12 for Zainab and 7/12 for Emeka contained question marks. Initial mean lengths were 46, 43 and 45 words respectively. These counts describe the run, not a quality score.
- The initial Amara run repeated an emoji, and some replies announced that they would flirt rather than simply flirting. This motivated the cadence and delivery reminders. In the three subsequent live rechecks the repeated emoji was absent, but Emeka still announced flirting and appended a question despite the user's no-interview preference. Amara also used a rhetorical question. These are remaining style failures, not a full naturalness pass.
- Several model-written boundary replies were still longer and more service-like than desired. The shorter hard-refusal fallback is covered offline; it is separate from a model-written refusal inside otherwise valid JSON.

The final prompt ordering adjustment came after those rechecks and has offline coverage, not a fresh full live run. Native-speaker/owner acceptance and broader long-running conversation quality remain pending. Earlier source-pinned campaigns should not be reset to evade their ceilings. A further live iteration needs an explicit new evaluation plan and budget decision.

The original automatic flags remain in the raw records. A "you don't" contraction triggered the first Pidgin regex; this was a false positive, and the checker now distinguishes it from "you don." Meeting-boundary disclosures were also originally flagged despite being relevant to the user's request. No original model text was rewritten to improve the reported results.

## Illustrative editorial conversations

These are original style targets, not live-model output and not new prompt templates. All participants are fictional adults. The live outputs above remain the evidence for actual model behaviour.

**Amara, cheeky**

> User: I came here to distract you.
>
> Amara: You could at least pretend you came with good intentions 😂
>
> User: I'd be lying. I like your attention.
>
> Amara: Confidence and honesty? You're making it difficult for me to act unimpressed.

**Zainab, selective**

> User: You're hard to impress.
>
> Zainab: Not especially. I just notice when confidence is doing all the work.
>
> User: And when it isn't?
>
> Zainab: Then I stop pretending I'm only being polite. You have my attention.

**Emeka, warm romantic**

> User: Long day. Can we just talk?
>
> Emeka: Of course. No impressive story required. Mine can wait too.
>
> User: You're being very sweet.
>
> Emeka: You're making it easy. I'm enjoying your company.

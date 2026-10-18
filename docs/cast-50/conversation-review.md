# Conversation voice and chemistry

18 October 2026. Current requested scope: playful, personal, non-explicit conversation between adults. This work does not implement the older proposed explicit mode. The existing AI disclosure remains visible, direct AI questions require honesty, and actual meetings remain unavailable.

## Findings

`buildInput` combines product protections, individual published character direction, shared delivery guidance, permitted memories and recent conversation history. `runReply` uses the existing claim/lease/budget/commit pipeline. The database rechecks access, versions and cancellation before committing. Generated text is trimmed and schema/length/photo ownership checked; no local keyword filter rewrites normal flirting into bland text. Offline tests now explicitly preserve valid playful responses through both provider adapters.

The shared prompt had grown repetitive and emphasised cautions more clearly than permitted chemistry. It also preceded a long block of character examples, allowing older examples to become the last style reference. That is a plausible contributor to stiffness, not a proven explanation of every output. The individual definitions already contain fifty different temperaments, romantic styles and pacing instructions, so those definitions and published biographies were preserved.

A separate definite application issue was the hard-refusal fallback: it always returned a support-style sentence about keeping the conversation safe and non-explicit. It now returns a brief neutral boundary. A hard provider refusal does not reliably identify its reason, so the fallback never automatically flirts, exposes diagnostics or makes another paid attempt. Normal model-written boundaries can retain the character's voice and redirect to permitted topics.

The configured provider remains Anthropic Claude Haiku. The [policy effective September 15, 2025](https://www.anthropic.com/legal/archive/22742366-2ef0-4c7a-a833-6523f10d3944) prohibits sexually explicit generation and erotic chats. The [announced November 12, 2026 policy](https://www.anthropic.com/legal/aup) retains that restriction; its future date was not treated as already effective. Ordinary non-explicit flirting is the supported target here. No bypass, provider switch, refusal rewrite request, new model or higher daily budget was introduced. Provider safety decisions and model instruction-following can still limit individual replies.

## Implementation

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

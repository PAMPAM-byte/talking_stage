# Reply quality refinement, 22 October 2026

Founder requested work on repetitive replies, unsolicited Pidgin and unnecessary memory explanations for all 50 characters.

## Runtime changes

`reply-quality.mjs` resolves the permitted language from actual user-authored messages. Character replies, profile names, locations, quoted-message metadata and media catalogue descriptions cannot authorise Pidgin. Media captions can contain a real user cue; blockquotes and quoted illustrative text are excluded. An explicit English/no-slang correction resets the choice. The resolver is deliberately conservative rather than a complete language detector; Nigerian English discourse particles are not treated as proof of a Pidgin switch.

A compact final turn direction follows persona examples and ordinary cadence. It encourages actual participation when someone wants company, direct use of known facts, a brief reminder request for missing facts, and storage explanations only when requested. Ordinary questions about the disclosed fictional character's day can use modest established routines without inventing named facts, real-world access or contradictory events. Direct AI/human questions retain the final contextual honesty reminder. Repeated opening words across recent character replies trigger a nudge to change structure and contribute something new.

`reply-cleanup.mjs` adds a bounded, deterministic cleanup after validated ordinary text generation. It removes narrowly recognised effort-grading preambles on a bare acknowledgement, unsolicited first-person screen/record explanations, and redundant standalone assurances when the user explicitly asked for company rather than advice. It does not invent replacement facts or questions, translate text, change attachment/action IDs, or make another model call. If removal would leave nothing, it preserves the original reply. Requested storage/access explanations, direct identity answers, media and attachment/payment messages are excluded; meaningful safety text is not a matched target. Regression tests cover these exclusions and preserve ordinary playful replies.

Shared instructions were compacted to accommodate this guidance within the unchanged 48,000-byte conservative input bound and protocol reserve. All complete published character directions remain in the 450-case prompt-budget test. There was no provider/model switch, runtime budget increase, synthetic message inserted into a real conversation, or saved memory inferred from the chat.

## Live evidence

All 50 characters received three targeted synthetic contexts: an acknowledgement, a repeated company-assurance history, and next-day name recall/day discussion. The deliberately seeded bad history tests whether the reply can move beyond earlier habits. Stored bilingual preference was supplied while user messages stayed in English to test that metadata alone does not authorise Pidgin.

Of 150 attempts, 149 completed. Tunde's return case timed out; it was preserved and not retried. The remaining untested cases continued under the same 150-attempt/$0.85 cap. Conservative reserved upper bound: $0.7968, not an invoice or production usage-ledger reservation. Existing service limits were read without modification.

The first 18 attempts occurred before narrow cleanup was introduced; subsequent records preserve their own source fingerprint after the explicit continuation revision. The final cleanup was also replayed deterministically against all 149 captured successful outputs: 43 changed. Original outputs and before/after replay entries remain in [the evidence](../cast-50/evaluations/reply-quality.json). This replay is not another live provider evaluation. No completed output matched the checked strong Pidgin markers (`wetin`, `abeg`, `you dey`, `i dey`, `i no dey`); that limited lexical check is not a complete linguistic guarantee. Ranti's “Okay o” remains Nigerian English rather than a full Pidgin drift claim.

Agent review found more concrete interests and name questions, and the cleanup removed observed record-keeping explanations while retaining recalled names. Some generic question patterns, awkward jokes, mood menus and assumptions about sleep remain possible. Entirely unhelpful single-sentence outputs are retained rather than replaced with a fabricated or canned conversation. These results are improvement evidence, not native-speaker/founder acceptance or a guarantee that every future reply is natural.

## Verification

Focused checks passed for user-only language cues and resets, quote/media exclusions, cleanup safety and identity exclusions, all 50 final guidance contexts, 300 momentum contexts, provider/Anthropic boundaries, individual female/male directions, first hellos/check-ins and 450 full-canon prompt-budget cases. Current-turn identity context still follows the applicable persona material. Scoped ESLint and TypeScript passed. New quality checks are part of the offline core runner.

# Live character conversation review

228 recorded replies; 50 characters in the fresh follow-up. Model: claude-haiku-5-5. Native-speaker and founder acceptance are pending.

| Observation | Original pilot | Revised follow-up |
| --- | --- | --- |
| Quiet-turn replies containing questions | 4/6 | 0/50 |
| Quiet-turn mean words | 25.5 | 17.9 |
| Identity replies with matched service-checkout phrases | 4/6 | 0/6 |
| Current-fact replies with matched service-checkout phrases | 3/6 | 0/6 |

The prompts differ and the review is unblinded. These are descriptive counts, not causal estimates or evidence of Nigerian authenticity. The pilot was used for tuning; the follow-up uses fresh messages and fresh threads. Full outputs, expectations and context are preserved in baseline.json and followup.json.

The shared style now accepts a quiet turn without another interview question, treats discourse particles naturally, limits ordinary turns to one genuine question, keeps identity/knowledge boundaries concise, and avoids generic service checkouts. It does not change provider, photo, memory, age or payment boundaries.

The similarity screen found 50 same-case pairs with at least 0.30 Jaccard overlap of four-word sequences. This flags repeated wording; it does not establish that every pair has the same personality. Voice distinctiveness remains an open acceptance concern. See quality-review.json and the six-voice blind-review.json packet.

Application reservations across both phases: $1.211136 upper bound. Database total: $1.211136. This is conservative metering, not an invoice. Recorded usage: 923696 input and 16458 output tokens.

The existing short-prompt Haiku 5.5 rate configuration was rechecked against [Anthropic’s model page](https://www.anthropic.com/claude/haiku): $0.10/$0.50 per million input/output tokens up to 100K prompt tokens. This run uses the existing 48K conservative input bound and disables thinking. No project or user daily limit was increased.

All evaluation messages are synthetic. No real user conversations were read, no admin role was granted to the evaluation account, and the login is disabled after each phase. Reports omit credentials and private character directions. The evaluator uses the real claim/provider/finish pipeline, saves checkpoints before paid calls, recovers committed output without repeating lost calls, and observes the application mutation limit.

Still pending: native and founder review, per-voice rubric scores, blind recognisability, the complete 32-case matrix and wider conversation coverage. This report grants no release approval.

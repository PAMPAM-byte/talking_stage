# Claude Haiku configuration

17 October conversation regression: 228 replies completed through the real claim/provider/finish pipeline: 66 pilot replies and 162 fresh follow-up replies covering all 50 characters. Shared style was refined between phases; raw outputs and fingerprints are in [the review](./cast-50/evaluations/review.md). Existing model and project/user daily limits were unchanged. Persistent usage reconciled to $1.211136 in reserved budget, within a separate $1.25 campaign ceiling. This is conservative application accounting, not an invoice. The synthetic ordinary login was disabled after each phase. Initial live regression is complete; native review, full scenario coverage and distinctiveness acceptance remain pending.

Current recorded status, 16 October 2026: **hosted Haiku activation completed on 15 October**, with approved $20 project-wide/$2 per-user daily limits and a successful synthetic live reply. See the activation and recovery sections below. Earlier disabled/blocked statements are retained as history; broader live acceptance remains open. No hosted state was re-probed during documentation reconciliation.

Earlier 15 October activation status: the key and Haiku 5.5 model access were verified through the read-only Models API. `.env.local` enables AI, but the hosted database remains disabled with zero budgets. The founder requested no daily caps. An explicit NULL-budget migration and offline tests were prepared; automatic approval review rejected deploying uncapped paid generation because external charges would be unbounded. No hosted SQL executed. Activation is pending the founder's approval of finite daily limits.

The founder selected Claude and requested Haiku only. Runtime provider selection now requires `anthropic` and an allowed Haiku model; Sonnet, Opus, and OpenAI settings disable generation rather than silently switching provider. Both replies and summary generation use the same adapter. The legacy OpenAI transport remains solely for existing offline adapter contracts; runtime settings cannot select it.

Private environment files are configured with:

```dotenv
TALKINGSTAGE_AI_PROVIDER=anthropic
TALKINGSTAGE_AI_MODEL=claude-haiku-5-5
ANTHROPIC_API_KEY=
```

Add the key privately to `.env.local` and the hosted environment source used by deployment; do not paste it into chat or commit it. Enabling `TALKINGSTAGE_AI_ENABLED=true` alone does not bypass the existing database model allowlist, token limits, and daily budgets. Those must be configured for the selected model before live replies become available. No database budget or external provider call was enabled in this change.

Implementation follows [Claude model documentation](https://platform.claude.com/docs/en/models/haiku-5-5/overview) and [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs): server-only key, Messages API, system/history mapping, schema-bound JSON, bounded responses, refusal/truncation handling, timeout/cancellation, and existing application validation. Source model data and pricing should be rechecked before setting budget rates.

Validation: `node scripts/test-anthropic-provider.mjs`, existing offline provider checks, and TypeScript. Live model access and responses are unverified until a key and private budget configuration are available.

## Activation completed — 15 October 2026

The founder subsequently approved $20 project-wide and $2 per-user daily limits. Hosted `private.ai_configuration` is enabled for `claude-haiku-5-5` with those finite limits, the existing 48,000 input/1,024 output token limits, and pricing rates of 100,000/500,000 micro-USD per million input/output tokens. The unused uncapped migration was removed without deployment.

The authenticated availability RPC returned true. Live verification identified and fixed Anthropic rejection of a nullable enum: photo selection now uses a null-only schema when there are no eligible photos and an anyOf null/string enum otherwise. Application validation still rejects unadvertised photo IDs. A brief synthetic live Haiku reply then passed structured validation. No existing conversations or passwords were changed.

Offline Claude/OpenAI adapter checks and TypeScript passed. Live testing confirmed model access and a valid text response, not every chat scenario or image selection. The app uses `.env.local`; `.env.hosted.local` remains the separately disabled operational fixture configuration.

## Recovery for conversations created before activation

Migration `202610150015_reply_activation_recovery.sql` updates the private claim implementation. Older `blocked_provider` jobs with zero attempts no longer block a newer reply. Once the new claim passes ownership, capability, configuration and budget checks, those older jobs are cancelled under the conversation lock; their messages remain in context. Generating and failed replies still enforce ordering. An exhausted budget leaves older jobs unchanged.

Applied to the hosted project on 2026-10-15. Retried the reported latest saved message through the guarded Haiku pipeline: state `completed`, with one persisted character reply. Reply integration, photo reply and summary database checks passed offline.

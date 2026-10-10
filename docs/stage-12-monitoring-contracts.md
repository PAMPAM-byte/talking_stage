# Monitoring and failure recovery

10 October 2026 · Local monitoring foundation. Hosted alerts and Stage 12 acceptance remain open.

Server operation events now cover Auth identity/sign-up/sign-in/recovery/password changes, preference/onboarding/profile operations, conversation mutations, reply cancellation, submitted reports/admin review, account deletion/cleanup, and reply/summary worker outcomes. The Next.js request-error hook records uncaught server failures. The events use a fixed JSON schema: timestamp, schema version, operation label, outcome, elapsed milliseconds and, for uncaught requests, an allowlisted route kind.

The emitter accepts no message, metadata or context object. It never serializes error messages/stacks, provider responses, cookies, headers, URLs, query strings, emails, account/character/conversation IDs, report details, memory facts or passwords. Unknown labels become generic labels. Events go to server stdout; this slice adds no external analytics account, durable log database, third-party transmission or browser error-upload endpoint. Framework/platform logs remain a separate configuration boundary and require review before hosted collection.

Outcomes distinguish successful service responses, expected rejection, rate limits, dependency unavailability, unexpected exceptions and deliberately disabled AI. Database `P0001` exceptions are grouped as rejection; no raw database explanation is collected. This conservative grouping does not distinguish every business rejection. Timings cover the wrapped call, not the whole user journey. A handled failure can also produce a higher-level event, so counts are diagnostic events, not unique users or exact transaction counts. No model pricing, payment acceptance or live-AI quality claim follows from them.

Monitoring cannot change a service result: return values and thrown exceptions are preserved, and an unavailable logging sink cannot make a committed deletion appear to have failed. Existing forms retain actionable validation/retry behavior. The deletion dialog now describes an interrupted response as uncertain and asks the user to check account access; it does not assert that a deletion failed when confirmation never arrived. Unexpected page rendering failures have a token-based recovery screen with Try again and Return home; no raw error/digest is displayed. The root-layout and client event-handler failures are outside that route boundary.

## Health checks

`GET /api/health` is uncached application liveness and returns only `{"status":"ok"}`. It does not reveal configuration or assert database health. `npm run health:local` independently checks application liveness, local Auth service health and a minimal read-only database query, with five-second request timeouts. It prints only timestamp, dependency booleans and durations, returning a nonzero exit code if any check fails. The command requires loopback configuration and keeps its service credential server-side. It does not fetch chat text or personal account records.

The live local probe passed for application, Auth and database. No automated uptime scheduler, alert destination, log-retention period, latency target or escalation owner has been selected. Hosted availability, model cost/usage and payment-failure alerts remain open; the seven-day backup policy is not a log-retention policy.

## Validation

`npm run test:monitoring` injects sensitive canaries into return/error objects, verifies exact emitted fields and fixed labels, rejection/outage classification, unchanged return/throw identity and logging-sink failure isolation. Scoped lint, TypeScript and isolated production build validate integration. Focused authenticated browser checks cover minimal liveness, failed sign-in recovery, report submission/review and interrupted deletion followed by successful erasure. See [review](./reviews/monitoring.md) for executed outcomes.

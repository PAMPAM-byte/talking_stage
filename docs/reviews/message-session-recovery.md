# Message session recovery, 22 October 2026

## Cause

`conversationAction` used the legacy nullable `currentAccount()` reader. Both a failed Auth/profile lookup and a genuinely absent/ineligible account reached the same “Sign in with an eligible account” result. The screenshot matches that result, but there is no retained trace proving which network dependency failed for that specific request. Editing code is not itself evidence that the user lost their session.

The client also sent through a build-specific Server Action reference. An older open tab can have an obsolete reference after deployment. This is a separate version-skew risk, not a proven cause of the screenshot's specific eligibility result.

## Change

Conversation mutations now request explicit unavailable-service handling. Temporary lookup failures return a retryable unavailable result; confirmed sign-out and verified incomplete setup remain separate denials. Memory and monetary-request settings use the same distinction. There is no fallback to trusting browser identity, cached eligibility or an unverified account.

Chat sends now POST to a stable `/api/conversations/[conversationId]/messages` contract instead of invoking a build-specific action reference from the browser. The route validates first-party Origin, bounds the body stream to 16 KiB, validates IDs/generation/text/quote, and delegates to the existing independently authenticated mutation. Ownership, adult eligibility, conversation generation, quote validation, idempotency and reply scheduling remain in the existing database/action boundaries. Responses are private and uncached. No payment operation uses this retry path.

The browser makes at most one quiet retry after a network interruption or 502/503/504, with a bounded request lifetime and identical client ID, generation, text and quote. An uncertain first response does not create a new message identity. Confirmed 401/403/400 responses are not automatically retried. Raw transport/framework exceptions are replaced with safe delivery copy. A prolonged outage still exposes Retry sending rather than falsely reporting success. Mounted outgoing text, quote and the next composer draft are preserved; this change does not add persistence across closing/reloading the browser.

## Validation

Twenty-one browser cases passed: the existing 19 delivery/handoff tests plus mobile and desktop interrupted-account-send tests using the actual new browser transport. Tests verify one bubble, identical retry payload, retained next draft, no misleading eligibility prompt and no navigation. Offline transport tests verify denial exclusion, bounded retry, quote preservation and private-error suppression. Server entry-point tests execute the route/action with injected boundaries and cover transient lookup failure, confirmed sign-out, adult/Origin denial, malformed/oversized input, no-store responses and successful scheduling. Memory-outage and request-foundation checks cover the related settings changes. TypeScript, scoped ESLint and whitespace checks passed.

## Production release requirements

The screenshot is from localhost. Run the public application from an immutable production build, not `next dev`, and do not edit or rebuild the active serving directory. Build a new release separately, validate its health, then switch traffic while draining the old instance. Preserve Auth configuration/session secrets across ordinary releases. Keep this send contract backward compatible for older open clients; schema changes should support the overlap period.

Use the host's deployment-aware routing/asset retention and a unique `NEXT_DEPLOYMENT_ID` per release where supported. The installed Next.js guide explains that an ID detects skew but does not route requests to old releases by itself; it can trigger a full navigation, so it must not be presented as draft persistence or zero-downtime hosting. Coordinate any Server Action encryption key across instances as required by the host. Other mutation forms still use Server Actions and need the same release discipline.

No hosting deployment, release router, session-secret rotation or production interruption was performed for this fix. Infrastructure failure and genuine expiry cannot be eliminated by hiding errors; this change prevents them being misclassified as account ineligibility and reduces send failures caused by action-version skew.

# Local integration review

10 October 2026 · Review in progress. Gate B and launch acceptance remain open.

The owner authorized a full local integration review while AI keys and hosted Supabase remain unavailable. Checks use disposable synthetic accounts, real local Auth/database/Storage and isolated test servers. Live provider calls, payment checkout and hosted deployment are outside this review.

## Coverage

| Journey | Evidence |
| --- | --- |
| 18+ checkbox, rejected/expired declarations, registration, preferences, recovery and sign-out | Auth browser suite |
| Men/women/everyone discovery, filters, profile return and pagination | Discovery/navigation browser suites |
| Published character photos, profile galleries, keyboard/touch zoom | Cast/photography/photo-viewer browser suites |
| Chat persistence, Enter send, retry identity, archive/reset/delete and account isolation | Conversation browser and database suites |
| Explicit memories, disabling/deletion and per-character scope | Conversation browser and database suites |
| Settings preferences and request controls | Settings/request/browser/database suites |
| Selected-evidence reporting, administrator access and review audit | Reporting browser and database suites |
| Wrong-password, interrupted deletion, actual erasure and old-session denial | Account-deletion browser/database suites |
| Application liveness, dependency failure and privacy of diagnostics | Monitoring/outage/dependency-fetch checks |
| 320/390/768/1440 layouts, keyboard actions, photo focus restoration and interrupted preference save | Added connected integration smoke test |
| Production tooling/secret exclusion and private-route access | Production build and verification script |

## Findings

- The legacy account/admin test expected a profile URL without a query string. The current behavior correctly preserves the user's `gender=woman` discovery filter. The test now requires the profile path and preserved filter.
- During the Auth-provider outage, the sign-in action remained busy beyond the recovery assertion. Server/proxy backend requests now have an eight-second per-request deadline, preserving existing cancellation signals, credentials, headers and bodies. This bounds individual requests, not the total duration of an SDK refresh sequence or an entire user journey. It does not authorize automatic mutation retries or prove that a timed-out mutation did not commit.
- Production verification now reads the actual configured isolated build directory rather than always scanning `.next` while a different build is served.

## Results and limits

Database/offline suites passed for foundation ownership, conversations, account deletion, reporting, reply leases/context/budgets, provider validation, photo selection/commit, summaries and request controls. No AI key or paid provider call was used.

The initial complete authenticated browser run finished with fifteen passes and the two findings above. Those two journeys and the new connected integration smoke test are being rerun after correction. Final isolated production build/TypeScript, scoped lint, deadline/cancellation checks and production verification passed, including private-route denial and development/secret exclusion. No skipped tests were reported in the initial run.

Physical-device testing, screen-reader verification, live AI voices/injection/usage/billing, payment gateway flows, hosted recovery/alerts and production policy review remain open. Automated keyboard checks are not a claim that those manual gates passed.

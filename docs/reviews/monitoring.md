# Monitoring review

10 October 2026 · Local monitoring foundation delivered; full Stage 12 and Gate B remain open.

Delivered: allowlisted server diagnostics around core services, Next.js uncaught-request hook, minimal uncached liveness, private local dependency probe, page recovery boundary and accurate uncertain-deletion copy. See [contracts](../stage-12-monitoring-contracts.md) and [incident runbook](../incident-runbook.md).

Passed: sensitive-canary and sink-failure tests, scoped script/application lint, TypeScript, final isolated production build, and live application/Auth/database health checks. Production browser assets exclude the server monitoring module and configured server credentials.

Authenticated browser checks passed for minimal liveness, failed sign-in with retained inputs/recovery link, selected-evidence reporting/admin review, and interrupted deletion followed by confirmed erasure. The conversation persistence/retry/ownership/memory/lifecycle regression passed on a clean rerun. Its first run missed a saved-memory assertion while the temporary recovery fixture was being exercised concurrently; that failure was not reproduced with isolated runs. It is recorded rather than treated as a proven product defect.

The actual Next.js recovery boundary passed at 320, 390 and 1440 pixels, with no horizontal overflow, no raw error displayed in the page, a home link and keyboard-triggered retry to a recovered page. The synthetic route was removed and the temporary server stopped. [Mobile evidence](./monitoring/recovery-390.png). That drill exposed `new Date()` being disallowed inside Cache Components prerender error hooks; telemetry now derives its timestamp from timing APIs, and the corrected hook emitted safe events without the restriction error.

Remaining: hosted collector/retention, scheduled probes/alert delivery and ownership, live AI cost/quality checks, payment-failure/reconciliation checks, hosted containment drills and remaining launch acceptance. Automatic local backup creation was subsequently delivered and verified; see [backup review](./backup-restore.md).

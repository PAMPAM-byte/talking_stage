# Engineering hardening

16 October 2026. The founder requested status reconciliation and engineering improvements before further product work. This work changes repository code and checks; it does not claim new hosted configuration or deployed-site acceptance.

## Status and verification

`docs/project-status.md` is the current index. README, roadmap, AI setup/contracts, hosted setup and Stage 10 review now identify historical disabled-provider/eight-character descriptions and link to later hosted cast/Haiku evidence. The approved finite budgets remain as recorded in the 15 October activation document. Stage 10 and launch gates remain open.

Lint now targets source/test/tool directories and root configuration files explicitly, fails on warnings, and excludes abandoned build/test output. TypeScript excludes abandoned builds and private operational/test output while retaining current generated route types. This avoids treating disposable generated files as application sources.

`npm run check:engineering` stops on the first lint, type or core-suite failure. `test:core` runs fourteen suites sequentially with bounded child execution, isolated database fixtures and injected provider transports. It does not load a private environment or use live services. Browser and production-build acceptance remain separate checks.

## Reply integrity and recovery

- A committed message remains acknowledged even if Next.js after-response registration or cache refresh throws. Summary errors are attributed to summaries and cannot change a completed reply's response. Tests execute the actual server action and route with injected failures, rather than testing copies of those functions.
- Trusted reply RPCs and private Storage downloads share the existing uncached, eight-second dependency fetch boundary. Server-only service-role clients remain behind ownership checks and guarded database functions. No database grants, migrations or budget policy changed.
- Owner-authorized GET metadata includes attempt count, never private context. GET does not execute generation. POST retains first-party Origin, adult/onboarding and message ownership checks before guarded processing.
- On reopening the latest thread view, only the newest visible never-attempted blocked job is eligible for one automatic recovery attempt. Older history pages do not start unattempted jobs. Failed/attempted jobs and expired leases require explicit retry. Database claims still arbitrate races and reserve budgets.
- Each observed job has its own sixty-second deadline. Sending another message cannot extend an older job's window. Explicit retry starts a new observation window and owns its POST, preventing polling from starting a competing automatic recovery. Access loss ends observation; navigation aborts polling; failed delivery retains its stable client UUID and text in memory.
- An interrupted stop response is treated as uncertain cancellation: saved delivery, the next draft and observation remain intact, and visible guidance asks the user to check the outcome. The UI cannot infer cancellation from a failed network response.
- The delivery preview uses a production-disabled module alias, matching the existing design-system approach. Production asset scanning now also checks the Anthropic endpoint and delivery-fixture markers.

## Maintainability and styling

Conversation actions, reply route/worker and AI pipeline/provider code have readable control flow and named boundaries. The service-role client configuration is shared instead of duplicated. This is focused cleanup of the critical delivery path; other existing compact modules can be improved when their behavior changes.

The nineteen ordered global stylesheet imports now have one entry point. Shared theme variables have one `:root` source containing the former cascade's final effective values. The accepted visual identity and selector order are preserved. `docs/styles.md` defines ownership and CSS Modules for new components; old overlapping structural selectors remain deliberately ordered pending component-by-component migration. Consolidating tokens does not claim that all global styling debt has disappeared.

The theme browser test's old white-chat expectation was corrected to the rose canvas specified in the accepted 14–15 October refinement. The initial run passed fourteen checks and failed that stale assertion; subsequent results are recorded below.

## Validation

- Passed: lint with zero warnings, TypeScript and all fourteen offline core suites through `npm run check:engineering`.
- Passed: isolated production build in `.next-auth` and production browser/asset checks, including private-route denial, responsive account screens, private AI markers and development-tool exclusion.
- Passed: fifteen focused browser checks after correcting the historical theme assertion, covering delivery, responsive chat, swipe discovery, public/account pages, profiles, settings and admin identity.
- Passed: the final eight-case delivery suite, including two additional cases for uncertain cancellation and timeout followed by explicit retry. The timeout test first exposed missing hydration synchronization in the test itself; it now waits for a real metadata request before advancing the browser clock. Across the focused suites, seventeen distinct browser cases passed. This is mock/injected-transport coverage, not hosted AI acceptance.
- Passed after the final runtime changes: scoped lint with zero warnings, a fresh isolated production build/type check, and production browser/asset checks. `git diff --check` passed. Test-generated changes to historical screenshots were restored to keep the code review focused.
- Windows initially denied cleanup of the isolated test-server process. That owned process was stopped with process-management permission; subsequent browser runs used the same permission and completed normal teardown. No user development server was targeted.

## Remaining acceptance

Next.js `after` is a hosting lifecycle hook, not a continuously running queue. Process termination leaves durable jobs recoverable when a user returns; unattended completion during an outage is not guaranteed. Before deployment acceptance, verify the actual adapter's after-response support and duration, disconnect/restart/reload recovery, one persisted reply under concurrent requests, and no automatic retry of provider failures. A continuously running worker needs an explicit hosting/scheduling design, protected triggering and separate operational acceptance; none is silently enabled here.

Broader live Haiku safety/voice/Pidgin/photo/summary/billing evaluation, hosted recovery email, off-site encrypted backups with independent ledger/key recovery, alert delivery, general-user deletion enablement, payment integration, final policies and manual device/accessibility review remain separate open requirements in `docs/project-status.md`. No automated local result closes those gates.

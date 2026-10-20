# Development sign-in recovery

## Explicit development shortcut — 20 October 2026

The owner reported recurring test-login errors on ordinary sign-in visits. The local flag was enabled and the saved account matched the selected backend, but the page attempted test authentication automatically on every non-manual visit. Its broad error fallback made failures in that optional operation look like the normal sign-in page had failed. The screenshot's exact historical service error is not established by configuration checks alone.

Ordinary sign-in now always shows the email/password form and never submits test credentials automatically. The localhost-only shortcut is collapsed under Development options and runs only after its button is clicked. An explicit test failure stays inside that disclosure. The 25-second bound, stale-result guard and retry remain; focusing the regular form cancels the pending client continuation. The server action awaits delegated sign-in and emits only an allowlisted unavailable outcome on caught errors. Credentials remain private, origin/backend checks remain, and existing sign-out query URLs are tolerated without triggering automatic login.

This supersedes the automatic behavior described in the historical notes below. The feature flag remains enabled locally to preserve optional access; production still excludes the shortcut.

Validation: all four updated development-login browser checks passed: no automatic submission on ordinary/query-only visits, bounded explicit-login failure, cancellation when using the normal form, and actual test-account login/sign-out with server-only credentials and HttpOnly/SameSite cookies. TypeScript and scoped ESLint passed. A separate localhost check confirmed the new disclosure, visible normal form and zero `/sign-in` POSTs on entry; the 390px layout fits horizontally.

20 October 2026. Automatic development login previously hid the form while an unbounded React transition waited for authentication and navigation. A stalled action or destination left only “Signing you in…” visible.

The shortcut now tracks its own pending state, with a 25-second deadline spanning the action and navigation. Timeout and action failures display an accessible warning, enable retry and reveal the regular email/password form. The manual-account link cancels the pending client attempt immediately and updates the query using Next's integrated native history API, without waiting for a queued action. Attempt identifiers prevent late action results from triggering a new redirect or replacing the recovery state. Cancellation stops the client continuation; it cannot abort an already-running server action or undo cookies it may set.

Automatic access remains restricted to the existing development, loopback, matching-origin and selected-backend checks. Credentials remain server-side. Production authentication and regular account forms are unchanged. Existing white/blush notices, warning treatment, typography and button states carry the recovery flow; compact layouts scroll to the revealed form.

Browser coverage uses intercepted authentication POSTs to exercise a stalled request, deadline recovery, enabled retry, visible manual fields, mobile horizontal fit and switching accounts before completion. The existing separate test covers actual development-account login, query-only navigation, server-side credentials, cookie attributes and explicit sign-out.

Validation: all three development-login browser tests passed, including actual hosted test-account login and sign-out. Scoped ESLint and TypeScript checks also passed. The interrupted-request checks never submit authentication POSTs to the backend.

# Development sign-in recovery

20 October 2026. Automatic development login previously hid the form while an unbounded React transition waited for authentication and navigation. A stalled action or destination left only “Signing you in…” visible.

The shortcut now tracks its own pending state, with a 25-second deadline spanning the action and navigation. Timeout and action failures display an accessible warning, enable retry and reveal the regular email/password form. The manual-account link cancels the pending client attempt immediately and updates the query using Next's integrated native history API, without waiting for a queued action. Attempt identifiers prevent late action results from triggering a new redirect or replacing the recovery state. Cancellation stops the client continuation; it cannot abort an already-running server action or undo cookies it may set.

Automatic access remains restricted to the existing development, loopback, matching-origin and selected-backend checks. Credentials remain server-side. Production authentication and regular account forms are unchanged. Existing white/blush notices, warning treatment, typography and button states carry the recovery flow; compact layouts scroll to the revealed form.

Browser coverage uses intercepted authentication POSTs to exercise a stalled request, deadline recovery, enabled retry, visible manual fields, mobile horizontal fit and switching accounts before completion. The existing separate test covers actual development-account login, query-only navigation, server-side credentials, cookie attributes and explicit sign-out.

Validation: all three development-login browser tests passed, including actual hosted test-account login and sign-out. Scoped ESLint and TypeScript checks also passed. The interrupted-request checks never submit authentication POSTs to the backend.

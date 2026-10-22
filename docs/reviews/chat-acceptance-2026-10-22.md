# Chat acceptance check, 22 October 2026

The browser acceptance pass covered 29 cases: 19 delivery and typing handoff cases, eight quoted-reply cases, and two check-in preference layouts. All passed, including touch cancellation, vertical scrolling, draft preservation, reply retry identity, late completion, independent read receipts and widths from 320 to 1440 pixels. The connected application on port 3000 also loaded its existing chat and successfully selected/cancelled a quote with all non-read requests blocked.

Code inspection found that the client initiative request had no network deadline. A stalled request could retain its module-level in-flight lock and suppress later checks for that conversation in the tab. The request now uses a 15-second abort signal; the existing quiet failure path releases the lock without consuming the scheduled-check throttle. A regression check verifies the signal is supplied and a subsequent check can proceed after an interrupted request. Server ownership, frequency, budget and opt-in checks remain authoritative.

Focused offline checks passed for male personality assignments and all 50 gender-default contexts, initiative sync, first hellos and established check-ins, 450 prompt-budget scenarios, save-only reply commit recovery, reply observation recovery, calendar-day context, quoted-reply database boundaries and provider failure/output handling. TypeScript passed. No live model calls, payment operations or user-setting changes were performed.

Scoped ESLint and whitespace checks passed. All 29 browser cases reported success; the Playwright process remained waiting during preview-server shutdown after its last case, so no clean suite exit is claimed here.

These results verify UI, state transitions, published instructions and failure handling. They are not a fresh live evaluation of naturalness, humour or personality in generated replies. Existing accounts retain their chosen check-in preference, including Off.

# Conversation dates and optional character check-ins

20 October 2026. Founder choice: at most one unprompted message a day, with an off switch.

Reply claims now include stored timestamps in the retained history. Provider input combines these with the browser timezone and current clock, distinguishing calendar-day changes from elapsed time. A short midnight crossing is not treated as a long absence. On a meaningful return, characters can briefly acknowledge the gap and pick up a relevant thread in their own voice. They cannot infer when a user was online or why they were away. This changes future replies; existing messages are not rewritten.

Settings → Character check-ins provides Off (default), at most daily, at most twice weekly, and on-return choices. The daily cap applies across all of a user's characters, not separately per character. Only established active conversations qualify: at least four user and four character text messages, no unresolved user reply, and at least twelve quiet hours. Delivery is limited to 09:00–20:59 in the saved user timezone. A delivered check-in is not followed by another until the user responds. Turning the feature off cancels in-flight work; new messages, archive, reset and global chat pause invalidate stale delivery.

Check-ins use the existing model configuration, reservations, daily budgets and lease protections. They do not fabricate a user message. Their short text can draw on permitted history and explicitly saved memory, but does not create inferred persistent facts or a hidden affection score. No payment requests, attachments or reactions are allowed in check-ins. Messages stay inside TalkingStage; email and push delivery are not implemented.

The connected settings use the frontend-design skill and established white/blush/red tokens, accessible radio cards, a single save action, pending/error/success states and a scoped CSS module. Mobile and desktop browser tests cover selection, save, failure, opt-out and overflow. The mobile screenshot was reviewed.

Migrations 202610200023 and 202610200024 were applied to the linked project with an encrypted DDL snapshot and verified service-only generation permissions. Existing users remain opted out. A read-only browser check verified that the connected settings load and show Off. The network preflight found zero opted-in accounts and generated no messages.

The local Windows task `TalkingStage-CharacterCheckins-037C2CB1` is installed and Ready. It runs a hidden helper every fifteen minutes while this Windows account is running. A production deployment still needs its own protected scheduler using the same worker; the local task does not provide always-on hosted delivery. Opening Messages also checks opted-in accounts, including the on-return option.

Validation includes disposable-database check-in tests (ownership, frequency, quiet hours, opt-out, shared budgets, idempotence and stale-work invalidation), timestamp tests, browser tests at 390px and 1440px, and 300 full-direction prompt budget cases across all 50 characters. No paid model evaluations or unsolicited live chat messages were sent during validation.

Final checks passed: all 36 offline core suites, TypeScript, scoped ESLint, PowerShell runner syntax and diff whitespace checks. Character wording remains generated, so these checks verify timing/context and delivery controls rather than guaranteeing a particular sentence on every turn.

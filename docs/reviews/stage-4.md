# Stage 4 review

8 October 2026 · Frontend prototype complete.

PRD coverage: CHAT-01–04 and IMG-01–02 presentation. Applied the frontend-design skill and the existing TalkingStage design system.

## Delivered

- `/messages`: active/archived conversation lists, owned portraits, latest previews, Lagos timestamps, real mock unread counts, loading/empty/error states, recovery, visible management menus and confirmed deletion.
- `/messages/[conversationId]`: dedicated mobile chat and desktop list/thread split, character identity and adult age, persistent AI disclosure, ordered bubbles, date separators, timestamps, delivery labels and preparing-reply status.
- Eight distinct character-specific scripted introductions/reply samples. Sample wording is clearly labelled; no AI service or real character behaviour is claimed.
- Multiline composer, explicit send action, sample-message shortcuts, a provisional 2,000-character input limit, long-text wrapping, safe-area spacing and visual-viewport resize handling. Enter inserts a line; Ctrl/Command + Enter sends outside IME composition.
- Separate failed-delivery and failed/interrupted-reply recovery. Retry keeps one user message and one logical reply. Rate/usage-limit states keep the unsent draft; paused chat keeps history readable. Archive retains messages and requires restore to continue.
- Character-owned curated photo messages, original-ratio presentation, persistent AI-generated captions, native modal viewer, focus restoration, failed-photo reload and independent new-photo pause. Existing Stage 3 gallery assets are reused; source/prompt/mode provenance is in [the Stage 3 image record](./stage-3-images.md). No new image generation was required.
- Disposable session persistence for synthetic fixtures; custom text is redacted in stored messages and never copied into persisted previews. Refresh converts in-flight work to recoverable failure/interruption. Development-only reset clears local chat fixtures while retaining onboarding.

The exact operations, idempotency behaviour, persistence policy and provisional decisions are documented in [Stage 4 contracts](../stage-4-contracts.md).

## Validation

- Six Stage 4 browser journeys pass: multiline send/reply/photo/viewer/refresh/privacy; delivery/reply retry without duplicates; limit/pause/interruption; archive/restore/delete/list recovery; background unread/read and photo reload; responsive layout and screenshots.
- Layout checks pass at 320, 360, 390, 430, 768, 1024 and 1440 px. The send action stays visible with a long draft and a 390 × 460 viewport. This is browser viewport simulation, not a physical-device keyboard test.
- ESLint and standalone TypeScript checks pass; production build and its TypeScript validation pass.
- Full Playwright regression suite: all 20 tests passed, including the six Stage 4 journeys and existing discovery, foundation, ownership, money-format and onboarding checks.
- Production-exclusion check passed: landing 200, development preview 404, and developer chat/list/reset controls and private instruction fixture markers absent from production browser bundles.
- Inspected [mobile chat](./stage-4/chat-390.png), [desktop chat](./stage-4/chat-1440.png), and [mobile messages](./stage-4/messages-390.png). Native photo modal and management confirmations are exercised in browser tests.

Review corrected an unread/read race during navigation away from the thread and a photo-reload button style collision. Browser tests distinguish thread content from sidebar previews and wait for route transitions before capturing evidence.

## Limits and next work

This is a local frontend prototype. All demo accounts still use one synthetic actor; backend identity/ownership enforcement and real message durability remain Stage 8/10. Custom written text is replaced by a visible placeholder after refresh; retries of those restored entries use the placeholder in this prototype. Only offered sample messages persist verbatim.

No AI, payment, storage, authentication or database integration has been added. Photo/cast publication approval remains pending. The 2,000-character UI guard and selected review limit states are provisional; final operating limits remain undecided. Actual mobile keyboards, physical-device scrolling and screen-reader review remain Stage 7 work.

Memory controls, reporting, monetary-request controls, reset and account deletion remain Stage 5. The selected age-assurance method’s frontend screens from Stage 2 still block Stage 7. Product-owner acceptance belongs to the final frontend gate.

Stage 4 implementation and automated review are complete. Next eligible stage: Stage 5 — Settings, memory, payments and reporting frontend.

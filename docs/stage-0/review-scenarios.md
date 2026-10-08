# Frontend acceptance and review scenarios

Planned 8 October 2026. These scenarios are not executed tests or existing screenshots. Capture evidence as screens are implemented, then use all scenarios for the Stage 7 gate. Backend equivalents are separately required by the roadmap.

## Review environment

Use synthetic actors `demo-user-a`, `demo-user-b`, and `demo-admin`. User A has an active conversation and one explicitly shared ordinary memory with Amara; User B has a conversation with Chidi and no access to A's records. Admin has separate operational fixtures. Additional scenario personas are signed out, underage blocked, onboarding incomplete, and session expired. All fixtures are disposable; do not enter real passwords, identity information, or intimate conversations into mock storage.

Development controls select latency, offline, errors, empty data, capability pauses, and business states. Keep this tooling outside production builds. A paid payment fixture is labelled simulated and has no real checkout URL. Photos remain owned placeholder slots until imagery is generated/reviewed; do not label placeholders as reviewed assets.

## Scenario matrix

| ID | Journey or state | Expected frontend behaviour | Evidence/stage |
| --- | --- | --- | --- |
| R01 | Signed-out visitor enters from landing | AI/adult explanation visible; primary entry starts age onboarding; sign-in accessible | Landing/mobile screenshot; 2 |
| R02 | Visitor declares under 18 | Blocked view; no mock access to discovery/chat, including direct navigation | Blocked walkthrough; 2 |
| R03 | Adult registers with invalid then valid values | Inline errors, entered values preserved, submit state, next required onboarding step | Form states; 2 |
| R04 | Assurance pending/failed/approved | Pending is not eligible; failed gives appropriate action; approved continues; unresolved method flagged until selected | Assurance state set; 2, finalise by 7 |
| R05 | Sign-in, incomplete onboarding, expiry, recovery | Safe return path; incomplete account resumes steps; generic recovery response; expired recovery reference handled | Account walkthrough; 2 |
| R06 | Change name/language/gender preferences | Values survive mock navigation/refresh where specified; loading/error/saved feedback; no automatic consent | Onboarding/settings walkthrough; 2, 5 |
| R07 | Browse cast and apply filters | Only simulated active profiles; name/adult age/AI label/bio visible; filters update results; reset clears no-results state | Discovery default/filter/empty; 3 |
| R08 | Open gallery with broken image/unavailable profile | Own character identity retained; retry or unavailable action; no other character substituted; viewer focus restored | Profile/gallery/failure; 3 |
| R09 | Shoot your shot twice, then resume | One current mock conversation; introduction shown; list preview and selected character correct | Profile-to-chat walkthrough; 3–4 |
| R10 | Send with latency and then delivery failure | Immediate sending feedback, bounded composer, one user message; retry reuses clientMessageId | Chat sending/failure; 4 |
| R11 | Input saved but reply fails/interruption occurs | Saved input remains; retry reply does not resend input; status makes failure location clear | Reply-failure walkthrough; 4 |
| R12 | Long conversation, keyboard, narrow viewport | No horizontal page scrolling; composer/header do not hide messages; long names/text/references wrap | Mobile keyboard/long-content; 4 |
| R13 | Resume/archive/unarchive/delete conversation | Correct list state; consequences explicit; archive retains content; delete follows selected memory semantics | List/action walkthrough; 4–5 |
| R14 | Scripted character voices | All eight samples have distinct questions/pace; no catchphrase template, claimed real availability, or money-driven warmth | Sample dialogue review; 4; real AI evaluation later |
| R15 | Receive photo/reload/mismatched asset | AI-generated caption; loading dimensions reserved; mismatch rejected; placeholders not claimed as approved | Photo/failed-viewer states; 4 |
| R16 | Inspect/delete/disable memories | Character scope visible; remove disappears from mock inspection/context fixture; disabling stops use/new saves; old visible facts explained | Memory list/disabled/delete; 5 |
| R17 | Reset chat with and without clearing memories | Confirmation says what resets and what remains; selection honoured; summary/relationship fixtures reset | Reset walkthrough; 5 |
| R18 | Decline, ignore, or mute a money request | No checkout on silence/vague agreement; no pressure or changed affection; muted prompts absent | Chat/settings refusal sequence; 5 |
| R19 | Missing/invalid amount then explicit confirmation | Amount, NGN, operator recipient, voluntary purpose shown; no link before confirmation; numeric limits labelled provisional until agreed | Amount validation/confirmation; 5 |
| R20 | Create checkout with simulated latency/failure | Pending is distinct from paid; no real checkout can open; retry is explicit and repeat confirm does not duplicate mock intent | Creation/failure states; 5 |
| R21 | All payment lifecycle fixtures and network error | Awaiting/pending/paid/failed/cancelled/expired/refunded/disputed labelled correctly; lost network does not falsely change status | Card/result/history set; 5 |
| R22 | Report message/photo/character | Correct target/context preview; reason/details preserved on failure; success acknowledgement; accessible dismissal | Three targets plus failure; 5 |
| R23 | Delete account and inspect draft policies | Clear scope/retained records; no invented retention period or compliance assertion; prototype actor/session removed | Account delete/policy layouts; 2, 5 |
| R24 | User B navigates to User A record in mocks | Adapter returns forbidden/not found; no A message/memory/payment appears | Scenario walkthrough; 4–5; actual security later |
| R25 | Non-admin opens admin destination | Forbidden UI; no admin instruction/content returned by public adapter | Forbidden state; 6; actual roles later |
| R26 | Admin creates/edits/previews/publishes/deactivates | Required adult age/data enforced in mock validation; unsaved fields retained on error; version conflict explained; discovery changes reflect fixture publication | Cast workflow; 6 |
| R27 | Admin reviews image slots/upload preview | Character association required; pending/rejected cannot publish; planned null slots are not approved; wrong association rejected | Asset workflow/state set; 6 |
| R28 | Admin reviews report and payment events | Relevant scoped context; queue state saved; ledger distinguishes intent/events; no client paid override; reconciliation state visible | Reports/ledger walkthrough; 6 |
| R29 | Pause global/per-character chat/photos/payments separately | Only affected capability changes; user screens show accurate notice; reenable returns to normal scenario | Operations/customer state set; 6 |
| R30 | Review metrics, settings conflict, and audit | Aggregate metrics exclude sensitive text; stale update error preserves input; audit identifies actor/action/target/time | Operations/audit states; 6 |
| R31 | Keyboard and assistive technology across shells/dialogs | Logical focus, labels, headings, controlled announcements, visible focus, restored focus after close | Accessibility notes; 1–7 |
| R32 | Empty/offline/session expired/maintenance/limit variants | Clear safe next action; no spinner forever or false data; no hidden controls under navigation | Shared state gallery; 1–7 |

## Screenshot and walkthrough checklist

Review at 320, 360, 390, 430, 768, 1024, and 1440 px. Capture representative mobile screens at 390 px, narrow-layout failures at 320 px, and desktop screens at 1440 px. Other widths need a recorded layout check, not redundant screenshots of every page. Include landscape/keyboard behaviour, large text/zoom, and reduced motion.

Save evidence under `docs/reviews/stage-N/` with descriptive names such as `discover-390-default`, `chat-320-long-message`, `payment-pending-390`, and `admin-assets-rejected-1440`. Do not create empty evidence files or imply captures exist before review.

- Landing, age blocked/assurance, account recovery, preferences.
- Discovery/card clue, filters/no results, profile/gallery failure.
- Conversation list, sending/failed delivery, saved-input reply failure, photo message.
- Memory controls, mute requests, reset/delete/account deletion confirmations.
- Amount confirmation, each payment lifecycle state, history/detail.
- Report form and submitted/error states.
- Admin cast editor/preview, assets/review, report detail, ledger/events, independent switches, audit.
- Short walkthroughs for the complete customer journey, refusal/muting, recovery/deletion, and operator workflow.

## Review findings

Record each issue with screen/scenario ID, viewport, steps, expected/actual result, severity, evidence, and resolution. Missing launch screens, obscured controls, contradictory payment states, inaccessible primary journeys, and misleading AI identity are gate-blocking. Cosmetic improvements may be scheduled only if they do not undermine the agreed design baseline.

Stage 0 validates the inventory and fixture references only. Lint/type/build, rendered layout, interactions, and screenshots are Stage 1–7 activities. Server ownership, signed events, real AI behaviour, provider terms, and actual deletion are Stage 8–13 activities.

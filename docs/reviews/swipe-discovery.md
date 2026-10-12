# Swipe discovery research and implementation

Founder follow-up: Meet now starts or resumes the conversation directly; the earlier profile-first decision below is superseded. Right swipe and right arrow share this behavior. View profile remains separate. The shared deck calls a mock adapter in preview and the existing `conversationAction` through a connected client wrapper for configured accounts. Opening state prevents repeated activation while the request is running; failures preserve the current card and display a retryable message. No new backend operation or matching model is introduced.

Follow-up validation: TypeScript and changed-file ESLint passed. All ten updated discovery/deck cases passed across the main run and a targeted rerun, including direct Meet/right-swipe conversation entry, resuming the same conversation without duplication, preserving the selection on return, and paused-chat error/retry recovery. The recovery test was scoped to the deck's alert to exclude Next.js's route announcer. Connected behavior uses the existing authenticated start action; live hosted writes were not exercised. The existing Windows dev-server teardown/cache issue persisted after the main test cases completed.

12 October 2026, Africa/Lagos. The founder explicitly requested dating-style swiping instead of the discovery catalogue. This changes the earlier feed/grid presentation decision and preserves the fictional adult AI companionship scope.

## Primary-source research

- [Bumble: Using the People tab](https://support.bumble.com/hc/en-us/articles/28423154479645-Using-the-People-tab), updated 31 March 2026: right indicates interest, left passes; filters shape the selection, profile details remain available, and Backtrack recovers an accidental left swipe. TalkingStage borrows these browsing conventions, with right opening the profile. Bumble's mutual matching and premium actions are product-specific and are not part of this implementation.
- [Tinder: Rewind](https://www.help.tinder.com/hc/en-gb/articles/115004493323-Rewind), updated 1 July 2026: a visible undo affordance retrieves a previously dismissed profile. TalkingStage supplies local undo without introducing a subscription or entitlement.
- [W3C: Dragging Movements, WCAG 2.2 SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements): dragging needs a non-drag pointer alternative; keyboard accessibility is a separate requirement. Pass/Meet buttons duplicate swipe actions, and the focused card supports left/right arrows.
- [W3C: Pointer Cancellation, SC 2.5.2](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html): actions should complete on release with cancellation or recovery. The deck commits on pointer-up, cancels interrupted gestures, snaps short drags back, and offers undo after passing.
- [W3C: Target Size, SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): targets need sufficient area or spacing. This design exceeds the 24 CSS px minimum with 54–74 px action targets; profile navigation has a 44 px hit height.

## Design interpretation

One dominant portrait is easier to assess individually and directly meets the founder's requested interaction. This is a design inference from the documented conventions, not a claim that swiping improves dating outcomes. A two-column card-and-conversation-clue layout on desktop preserves the same single-profile focus. On mobile the clue follows the actions, allowing the portrait and controls to lead.

Palette: violet `#432582`, lavender `#BA98FA`, lime `#E2FF8C`, mist `#F7F5FC`, white `#FFFFFF`, ink `#211638`. Manrope carries identity, controls, and metadata; DM Serif Display adds personality to the conversation clue. The signature is a portrait with a lime AI disclosure, dark text scrim, and live Pass/Meet stamps during a deliberate drag. The scrim is a functional contrast surface and supersedes the original below-photo-only identity layout for this deck. Portrait text contrast still warrants photo-by-photo visual review.

Layout: mobile header → filters → single portrait → undo/pass/meet → conversation clue; desktop adds the clue beside the card. No tiled catalogue remains in Discover. Loading presents one card placeholder. Filters retain the existing empty/error/retry states. Hosted pagination appears as Keep discovering only after the current selection is exhausted, with existing filters and page preserved.

Critique: a generic Like/Match pair would falsely promise reciprocal human interest here. Pass and Meet retain familiar directional browsing while describing the actual result. There is no likes counter, favourites list, fake match modal, artificial online status, distance, or compatibility score.

## Interaction choices

- A horizontal drag must travel roughly 24% of the card width, bounded to 70–110 px, and exceed vertical travel by a factor of 1.4. These are provisional interaction tuning choices, not measurements prescribed by the research.
- `touch-action: pan-y` preserves native vertical page scrolling. Short, interrupted, or vertical movements do not select a character.
- Pass advances locally; Undo returns to the previous character. Meet opens the existing character profile and does not create a conversation or save a like.
- Session storage holds only the current cast ID per account/filter selection, including an end marker. Refreshing or returning from a profile preserves position where browser storage is available. Storage failure does not prevent browsing.
- Reduced motion removes the exit transition. Screen-reader announcements explain passes and undo. Buttons remain outside the draggable surface so focus survives a pass.
- Both mock and connected discovery use the same frontend deck. No backend service, endpoint, database schema, or matching operation is added.

## Validation

TypeScript and ESLint checks passed for changed source and test files. All four new deck browser cases passed: pass/undo/refresh/profile-return/end recovery; short/interrupted/horizontal mouse gestures and keyboard; single-card responsive layout and action clearance at 320, 360, 390, 430, 768, 1024 and 1440 px; and real Chromium touch events confirming that horizontal swipes advance while vertical scrolling preserves the profile.

All five existing discovery cases passed after adapting catalogue assertions to the new presentation, including filters, gallery navigation, starting/resuming chat, missing/paused assets, and responsive screenshots. The final combined deck/admin/personal-space run passed all 21 browser cases. Mobile and desktop captures were visually inspected: [mobile](./swipe-discovery-390.png), [desktop](./swipe-discovery-1440.png). The Windows Next dev test-server teardown stalled after reporting the individual results and was interrupted; the test cases themselves completed.

Connected authentication/hosted test selectors and collection assertions were updated to navigate one profile at a time; those suites were typechecked but not executed against live accounts. No hosted write, publication, backend migration, or service integration was performed. Gesture thresholds remain provisional tuning choices and physical iOS/Android device review remains useful beyond the Chromium touch check.

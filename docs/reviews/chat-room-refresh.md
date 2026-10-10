# Connected chat-room refresh

10 October 2026

## Return to the character profile

The chat header Back control now links directly to its conversation's character profile in connected and preview modes. Its accessible name identifies the character and destination. The destination comes from the conversation's character ID, so it also works when the chat is opened directly or from the message list. Existing conversations and messages are preserved.

The connected browser regression passed profile return and resuming the same saved conversation, alongside persistence, ownership and lifecycle checks (1.5 minutes overall). The preview browser regression passed profile return, background unread handling and broken-photo recovery (51.9 seconds overall). TypeScript and targeted ESLint passed.

The owner requested a character picture beside the conversation name and a more inviting room. The connected header now displays the current character's portrait through the authenticated, no-store image proxy. Asset lookup uses the member's existing RLS permissions. Missing, paused or failed portraits show an initial instead of a broken image; no new public Storage URL is introduced.

The refreshed room follows the frontend-design skill and the existing design system: a portrait-led header, plum/rose details, rounded profile/memory shortcuts, a quieter expandable options card and a compact composer. An empty conversation introduces the character with the approved public conversation clue, a quotation motif and a serif welcome heading. It does not fabricate a character message, activity status or available AI reply. Archive/reset/delete controls, private memories and the explicit unavailable-reply notice remain available.

The 390px [welcome capture](./stage-10/chat-welcome-390.png) was visually reviewed. The local conversation regression passed (1.2 minutes; successful process exit), checking that the real approved portrait loads, the welcome card appears and the room has no horizontal overflow before running existing persistence, ownership, photo, memory and lifecycle checks. Disposable accounts were cleaned up. No real AI call was made. TypeScript, targeted ESLint and whitespace checks pass.

## Enter to send

The owner requested sending with Enter. Connected and preview composers now submit on Enter and preserve Shift+Enter for multiline input, with updated keyboard hints. Composition/IME key events and held-key repeats do not send; existing empty/pending guards and button submission remain. The connected browser regression passed Shift+Enter without saving, composition/repeat without saving, then Enter → durable message → refresh, along with existing chat checks (1.3 minutes). The preview multiline/Enter/button/photo regression also passed (33.3 seconds). Both commands exited successfully; TypeScript, targeted ESLint and whitespace checks pass. No live AI call was made.

## Composer copy cleanup

The owner accepted replacing Save message with Send and removing the visible keyboard instructions. The connected action now consistently displays Send with an arrow and the accessible label Send message, regardless of reply availability. Keyboard hints were removed from connected and preview composers; Enter/Shift+Enter handling is preserved. The existing unavailable-reply notice remains explicit, so the label does not imply that a character reply will be generated. This follows the frontend-design skill and established design system. Targeted ESLint, TypeScript and whitespace checks passed.

The refreshed mobile capture was visually reviewed. The connected chat regression passed again (57.9 seconds; successful process exit), covering Enter/Shift+Enter, message persistence and existing photo/memory/lifecycle operations. Disposable accounts were cleaned up; no live AI call was made.

## Compact send action

The owner requested a smaller send control at the right of the message box. Connected and preview composers now use a 48px arrow-only button with the accessible name Send message. The connected field and action share a row; status, error and stop-reply controls remain separate. The button retains a comfortable touch target, visible focus, disabled state and loading spinner without squeezing the message field. Enter and Shift+Enter behavior is unchanged. The existing design tokens and frontend-design guidance were followed. TypeScript, targeted ESLint and whitespace checks passed.

The updated 390px capture was visually reviewed. The existing connected chat regression passed (54.7 seconds; successful process exit), including keyboard sending, persistence, photo/memory controls and conversation lifecycle. Its disposable accounts were cleaned up.

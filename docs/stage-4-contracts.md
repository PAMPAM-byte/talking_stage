# Stage 4 frontend mock contracts

8 October 2026. Local browser adapters only. These operations do not implement a backend, real AI, security enforcement or durable storage.

| Operation | Input and result | Behaviour |
| --- | --- | --- |
| `loadConversationList` | ready/offline/error scenario → `Result<Conversation[]>` | Adult/onboarding checks; UI selects active/archived and sorts latest activity. |
| `loadThread` | conversation ID → `Result<Thread>` | Checks ownership, loads ordered messages and reply jobs, creates a character-specific scripted introduction once, marks actual mock unread state read. |
| `sendMessage` | conversation ID, stable client message ID, text, scenario → `Result<Message>` | One sequence/message per client ID; sending → saved/failed. Saved input creates a separate reply job. Repeating delivery returns the same saved message. |
| `prepareReply` | conversation ID, saved user-message ID, scenario → `Result<Message>` | Same logical job/reply ID across attempts. Generating/completed/failed/interrupted states. Retry does not resend the user message. Concurrent preparation is rejected. |
| `archiveConversation` | conversation ID, archived boolean → `Result<boolean>` | Moves between lists; retains messages. Archived thread is readable but requires restore before sending. |
| `deleteConversation` | conversation ID → `Result<boolean>` | Removes conversation reference and thread; outstanding reply cannot recreate a removed thread. Later starting the same character creates a fresh introduction. Memory/payment data is outside this operation. |
| `ownedPhoto` | conversation ID, asset ID → public character or unavailable | Accepts only the conversation character’s curated gallery asset. Never substitutes another character. |
| `resetChatPreview` | no arguments | Development-only UI clears disposable chat/conversation fixtures, preserving onboarding. |

`Thread` holds contract `Message[]` and `ReplyJob[]`. Message order uses assigned sequence; timestamps display in Africa/Lagos. Mutable changes notify React through a versioned external-store subscription. These adapters extend the Stage 3 prototype, which intentionally uses one synthetic actor; separate real identities remain Stage 8. The final backend contracts still need server-derived actor IDs, collection pagination, mutation versions, operation keys and verified enforcement at Stage 7/8–10.

## Persistence and privacy

- Conversation references: `talkingstage:mock-conversations:v1`.
- Thread fixtures: `talkingstage:mock-chat:v1`, with envelope version 1.
- Only three explicitly offered sample user messages persist verbatim. Every other user message becomes `Preview message (text not stored).` in stored data. It stays readable in memory until refresh. Conversation summaries written to storage are generic, never copied from free-form input.
- Scripted replies and character photos are synthetic fixture data and may persist. No password, identity document, real payment data or real intimate chat is stored.
- Refresh converts an in-flight delivery to failed and an in-flight reply to interrupted. Retry retains the original logical message/job IDs. After refresh, a custom-message retry uses its visible placeholder in this prototype; real message persistence is a backend acceptance item.
- Corrupt fixture data is ignored. Photo references are character-owned. Deletion clears both the conversation and its thread. Reset does not change real accounts or services.

## Review scenarios and provisional choices

Developer-only controls cover ready, offline, delivery failure, reply failure, interrupted reply, rate limit, usage limit, chat pause and photo pause. Limits and pause states remain selected until the reviewer returns to ready; no unapproved numeric operating limit or cooldown is invented. The composer has a provisional 2,000-character UI validation limit, not a confirmed backend/model allowance.

Enter inserts a newline; Ctrl/Command + Enter sends outside IME composition. The send action is separate, with pending and retry states. Text pause leaves history readable. Photo pause stops new photo delivery while text remains usable. Existing message photos retain their captions. One controlled Stage 3 gallery asset per character is reused as the mock curated chat photo; cast and publication approval remain pending.

Archive retains history; confirmed delete removes the local history and reference, preserving separate memory/payment records. Full memory/reset/account-deletion consequences and related controls follow in Stage 5. No payment or affection gate is added to chat or photos.

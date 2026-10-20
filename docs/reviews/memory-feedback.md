# Memory save feedback

20 October 2026. Memory actions now confirm what actually changed: saved,
deleted, enabled or disabled. A successful save clears the fact field and
consent checkbox. A failed save keeps both, and an interrupted response asks
the user to check saved facts before retrying.

The conversation's Manage memories link carries its conversation ID. The
memory page verifies that ID against the signed-in user, selected character
and non-deleted conversation before providing a return destination. A save
from that context returns to the conversation, where the existing success
notice displays Memory saved for five seconds above the composer. The
one-time URL flag is removed without another server refresh. The flag has
no effect on memory data or authorization. Direct Settings visits also resolve the existing character conversation and return there after a confirmed save. The active conversation is preferred; deleted or unowned conversations are excluded. Successful return uses replace so browser Back does not reopen the completed memory form. The page always offers the character-specific chat link, or Back to messages if no conversation remains.

Cache revalidation failure cannot change a committed database save into a
reported failure. Existing explicit consent and database authorization remain
authoritative; no memory is inferred or saved by navigation.

Four synthetic browser cases cover confirmation/reset, failed-save retention,
the return URL and one-time confirmation dismissal. The real server action
is tested with injected account/database/cache boundaries for operation-specific
results, signed-out denial and acknowledgement after cache failure. No real
user memory was created by these checks.

Return-navigation correction: the actual server component is now checked with synthetic query boundaries for missing return parameters, explicit archived chats, unowned/wrong-character hints, empty history and temporary lookup failures. A browser check confirms the save replaces its history entry, so Back skips the completed form. These checks, TypeScript and scoped lint passed.

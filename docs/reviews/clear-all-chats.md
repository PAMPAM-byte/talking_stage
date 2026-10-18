# Clear all chats

The Messages header now has a quiet red **Clear all chats** control in both connected and preview modes. A confirmation explains that all active and archived chats, including other pages, are removed and cannot be restored through the app. Saved memories remain by default, with an explicit option to clear memories for the affected characters. Payment history remains available. Cancel, pending and error states use the existing dialog, button and notice components; the action is guarded against duplicate submissions and cannot be dismissed while saving.

`public.clear_all_conversations(boolean)` is one authenticated, adult-gated database transaction. It accepts no user ID or client-supplied chat list. It locks the caller's undeleted conversations, detaches saved-memory sources, optionally clears the affected owned memories, deletes messages and soft-deletes the conversations. Existing triggers erase summaries and invalidate context; message cascades remove queued jobs, and copied in-flight replies cannot commit. Financial records remain linked to the retained conversation rows. The action consumes one mutation allowance rather than one per chat and safely returns zero when repeated.

The server action validates confirmation and account eligibility, calls the RPC using the signed-in session, revalidates Messages and optionally memories, and does not misreport an already committed action when cache invalidation fails. Success returns to the unfiltered Messages page. Preview mode implements the same confirmation and owned-chat behaviour with local fixtures.

Migration `202610180016_clear_all_conversations.sql` was installed on the existing connected development project. The CLI initially listed an older pending reply migration too; the isolated deployment included only the new clear-all migration. The older pending migration was neither applied nor marked repaired. Vault, roles and seed data were excluded. No existing user's chats were cleared during implementation.

Validation:

- All 19 offline core suites passed. The new database test clears 35 conversations across tabs/pages, verifies full rollback on a forced mid-operation failure, owner/adult isolation, default and optional memory handling, summary/job removal, rejected stale replies, preserved payments and safe repetition.
- Server-action boundary tests cover missing confirmation, signed-out/ineligible access, RPC failure and cache-failure handling.
- The preview browser test passed at mobile and desktop widths, including cancellation, both tabs, confirmation, empty states and refresh.
- The real-backend browser test used a separate synthetic adult account with AI disabled. It cleared active and archived history through the actual server action, verified inaccessible old threads, and started a fresh empty conversation. The synthetic login was disabled afterward; the founder's test-account chats were left untouched.
- TypeScript, targeted ESLint and diff checks passed.

The existing data-retention rules for payment records, moderation evidence and backups still apply. This control clears chat history rather than deleting an account or promising immediate erasure of every retained operational record.

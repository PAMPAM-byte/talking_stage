# Stage 12 review — account deletion

10 October 2026 · Local account-deletion slice delivered. Full Stage 12 and hosted retention remain open.

The Settings account page now provides a real deletion flow, using the frontend-design skill and existing design system. Users review consequences, type `DELETE`, enter their current password and confirm. Cancel keeps the account; password/backend failures retain confirmation input. A successful operation signs out and opens the connected account-deleted page. Settings includes a separate account/data entry beneath personal controls.

The database erases an ordinary account's active data in one transaction, locks owned threads against late commits and deletes Auth identity/sessions. It clears all chat and memory data, pending jobs/reservations, summaries and submitted report evidence/notes, while leaving other users and shared cast assets intact. Financial/operator records block deletion without changing data. Hosted configuration defaults to disabled. See [deletion contracts](../stage-12-deletion-contracts.md).

Passed checks:

- Database coverage of access, deployment gate, exact confirmation, recent authentication, financial/operator guards, failure rollback, all affected tables, other-account preservation and late reply/summary rejection.
- Reporting database regression suite.
- Real local browser journey using a disposable account: cancel, wrong-password recovery, successful deletion, erased data, rejected old credentials/session and protected settings redirect.
- TypeScript and scoped ESLint.
- Optimized production build and production checks for fixture/secret exclusions, unauthenticated private-route denial and responsive account UI.

Evidence: [confirmation on mobile](./account-deletion/confirmation-390.png), [deleted account](./account-deletion/deleted-390.png). The local database was backed up before migration. No existing real/tester account was deleted by the browser check; it creates its own synthetic identity.

Remaining: founder-approved hosted retention exceptions/durations, backup expiry, a durable erasure/restore suppression record and restore verification, provider-retention checks, hosted deployment and private-pilot gates. Current copy explicitly distinguishes active-service erasure from backup erasure. This slice does not close Stage 10 or certify full Stage 12 completion.

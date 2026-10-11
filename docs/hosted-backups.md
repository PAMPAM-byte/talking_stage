# Hosted backups and recovery

11 October 2026. Project `hoxeembcwureucdsssct`; owner confirmed the Free plan. **Encrypted hosted export, isolated database/photo recovery and the daily Windows job passed.**

Supabase recommends exporting Free-plan databases and keeping copies elsewhere. Database backups do not contain Storage object bytes. Sources: [database backups](https://supabase.com/docs/guides/platform/backups), [verified database connections](https://supabase.com/docs/guides/platform/ssl-enforcement).

## Certificate and prerequisites

In the project dashboard, open **Database → Settings → SSL Configuration** and download the server root certificate. Save it in this workspace as `.local-services/hosted-backup-stage/supabase-ca.crt`. This is a public certificate, not an API key or database password. Keep the filename exactly as shown.

The owner downloaded the certificate and it was copied from Downloads to that path. The first export with the supplied certificate passed using `verify-full` through the linked IPv4 session pooler. Docker must be running, the Supabase CLI must be logged in and linked, and ignored `.env.hosted.local` must contain the server credential. No secret belongs in this document or terminal output.

## Commands

Run from the project root:

```text
npm run backup:hosted:create
npm run backup:hosted:verify -- <backup-UUID>
npm run backup:hosted:restore-check -- <backup-UUID>
npm run backup:hosted:sync
npm run backup:hosted:expire -- --dry-run
npm run backup:hosted:daily
npm run backup:hosted:schedule
```

Creation captures Auth identities, application tables and private functions/configuration, preserving database owners and grants. It separately downloads every registered cast original and its 320/640/1280 WebP variants, checks original source hashes, and rejects a changed cast/migration inventory during export. The current cast contains 176 objects. Database and Storage capture are separate operations; this is not an atomic whole-project snapshot. Stop administrator cast writes during a backup. Ordinary application data follows the database dump's transaction snapshot.

The bundle is compressed and encrypted using AES-256-GCM with a fresh nonce and project binding. The managed catalogue also checks signed metadata and ciphertext hashes. The prepared recovery limit is 256 MiB of uncompressed bundle data; larger backups need a reviewed streaming implementation. Database exports and photo bytes are processed in memory. CLI diagnostic output, which can include temporary credentials, is captured privately.

Snapshots live in ignored `.local-backups/hosted-managed`. The encryption key, signing key and monotonic deletion ledger live in ignored `.local-services/hosted-privacy`. Losing the encryption key prevents recovery; losing or corrupting the signing key/ledger stops verification. Protect these files with Windows permissions and arrange independently protected copies. Windows file-mode hints do not establish ACLs. A copy on this machine is not sufficient disaster protection.

The owner-approved **seven-day** policy is enabled after successful creation and integrity verification. Expiry affects verified managed UUID pairs in this hosted directory, never the hosted database, live photos or local Docker catalogue. Unrelated files remain untouched. External replication is not configured.

The installed current-user task `TalkingStage-HostedBackupCreate-037C2CB1` runs daily at **03:15 Lagos time** on this machine, with missed-run handling and three fifteen-minute retries. It executes the resolved Node executable directly and records one successful backup per Windows-local calendar day in ignored `.local-services/hosted-privacy/scheduled-backup.json`. Repeated runs synchronize the current deletion ledger and verify the same day's bundle instead of exporting a duplicate. A failed attempt records a fixed outcome and preserves any previous successful identifier. Transient object/manifest reads have up to five bounded attempts with increasing backoff; access denials are not retried. The machine's current Windows time zone matches Lagos; review the schedule when changing time zones or moving machines.

The Windows user must be signed in, Docker/local Supabase must be running, the computer must have internet access and CLI credentials must remain valid. The job does not start Docker or reset any service. A sleeping/offline computer cannot guarantee a nightly backup. Check Task Scheduler's latest result and the private status after a failure. A crash can leave the job's exact lock behind; confirm its process/task has stopped before removing that lock. Never remove the signing key, encryption key, ledger or backup directory to fix a failed run. No external failure alert is configured. Expiry runs after successful creation or same-day verification, so prolonged failures can leave old copies longer than seven days until the next successful maintenance.

## Recovery check

The command synchronizes the current hosted erasure journal into a separate signed ledger, restores into a randomly named disposable Docker database, verifies Auth/profile/asset counts and row security, applies known later migrations, disables AI/payment/chat/deletion operations in the copy and replays known deletions. Unknown migrations, unavailable current journal or failed cleanup stop the check. The privacy journal is deliberately excluded from the database dump; old snapshots cannot replace the latest ledger.

The photo check uses preserved `.env.docker.local` credentials, refuses remote targets, creates a fresh private local bucket, uploads and re-downloads every object, checks hashes and anonymous denial, then removes that bucket. The application is never connected to the disposable database. Neither command restores into the hosted project. Production recovery needs a separate promotion runbook, final erasure synchronization with writes stopped, target compatibility review and application acceptance.

## Validation and remaining work

Passed: encryption round-trip, nonce uniqueness, plaintext concealment, wrong key/project, corruption and truncation rejection; existing catalogue signature, path-bound, retention and monotonic-ledger tests. Local scheduled backup helpers now load `.env.docker.local` by default when no explicit process URL is present, keeping their source local after the app switched to hosted Supabase. An explicit remote process URL still fails their loopback guard.

Hosted snapshot `72bd3ca7-0776-4158-ae5d-849ea5aa3b63` was encrypted and verified with all 176 private photo objects. Its actual isolated recovery passed Auth/profile/asset counts, public row security and denied authenticated private-schema access. All 176 photos were uploaded into a disposable private local bucket, re-downloaded with identical hashes and denied to anonymous clients. The disposable database and bucket were removed. There were zero current hosted erasure records, so this run did not exercise a previously deleted hosted account. Existing synthetic/local deletion tests do not substitute for that hosted-origin acceptance.

The first daily-job attempt failed during photo capture and recorded failure without claiming success. Bounded transient-read retries were added before retrying. No incomplete encrypted snapshot was catalogued by that failed attempt. The retry created verified snapshot `7de26fa4-f507-4dfd-892c-48aa20dbd52d` with all 176 photo objects and recorded success. The installed Windows task then completed with exit code zero and status `already_created`, verifying that same snapshot while keeping the catalogue at two copies (one manual and one daily). Scheduled-job failure privacy, prior-success preservation, retry recovery, lock ownership and deduplication tests passed, as did scoped lint and PowerShell parsing. The actual database/photo restore was performed against the first snapshot, rather than automatically repeating a restore after every daily export.

Subsequent hosted-origin deletion acceptance passed with disposable accounts: a pre-deletion snapshot demonstrably contained the erased account's historical identity/chat/memory/report data, and current journal replay removed it while preserving another account. All 176 photos passed recovery again. The exact test snapshot and disposable targets were removed after success; the operational backup pairs remain. See [hosted deletion review](./reviews/hosted-account-deletion.md). General-user deletion remains gated; the test enabled the RPC only within a transaction for its synthetic actor.

Still pending: independently protected off-site snapshots/keys/ledger, failure alerts, provider-retention review and enabled hosted browser deletion acceptance. This work does not close Stage 12, Gate B or authorize pilot/public access. AI and SMTP/recovery delivery remain separate open work.

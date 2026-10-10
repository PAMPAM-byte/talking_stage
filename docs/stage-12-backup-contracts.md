# Local backup expiry and restore protection

10 October 2026 · Local implementation delivered; owner-approved seven-day managed-backup retention enabled. Hosted recovery remains open.

Ordinary-account deletion now inserts an account UUID and deletion timestamp into `privacy_guard.account_erasures` in the same transaction as erasure. A failed deletion creates no record. The private journal has no email, password, messages or memory facts. Ordinary users cannot read it or invoke the owner-only restore cleanup helper. Existing financial/operator retention guards also apply during restore: a conflict stops verification rather than silently dropping retained records.

Managed database snapshots include Auth, public and private schemas, with their original owners and grants. The suppression journal is excluded. Before every managed backup or restore, the current journal is merged into a separate signed local ledger. Existing entries are preserved when a later export contains fewer records. Ledger signatures and snapshot checksums are verified before use. A missing signing key, corrupt ledger, unavailable live journal, unknown schema version or cleanup failure stops the operation.

`backup:restore-check` creates a fresh isolated database, restores the verified snapshot, applies later migrations, disables account deletion in the copy, replays all known deletions and checks that erased Auth identities/profiles are absent. The disposable database is removed after success or failure. This command does not promote a restored database or reconnect the application. Promotion needs a separately reviewed procedure with a final journal synchronization while writes are stopped. The Stage 8 fixture restore helper now also replays the journal and refuses snapshots missing the cleanup helper.

This is a local restore rehearsal, not disaster recovery. It requires the current database journal; it refuses offline recovery from only the exported ledger. Protect the ledger and signing key separately from snapshots, with Windows account permissions. File-mode hints do not replace Windows ACLs. No external replication, encryption at rest, production retention period, hosted backup automation or Storage-object expiry has been configured. Deletions made before the journal migration cannot be reconstructed from it automatically. Tombstones are deliberately not expired with snapshots; their eventual retention needs separate review.

## Retention decision

The owner selected **seven days** on 10 October 2026. Automatic expiry is enabled for managed local snapshots, with a daily 03:00 Windows task installed for the current signed-in user. The initial dry-run found zero expired snapshots. Existing legacy snapshots remain untouched until explicitly adopted into the managed catalogue. Hosted retention is still unconfigured.

Expiry removes only signed, checksum-verified UUID snapshot pairs at least seven days old in `.local-backups/managed`. Every candidate is validated before any removal; unrelated files and symlinks are rejected or left alone. It does not recursively remove directories. A corrupt or incomplete managed pair stops maintenance and needs operator review. Approved expiry also runs when the local backend starts and after a managed backup. The installed Windows expiry task runs daily at 03:00 for the current signed-in user, with missed runs handled on the next available session.

## Automatic backup creation

A separate current-user Windows task creates a managed database backup daily at **02:45**, before the 03:00 expiry task. Times follow the Windows local clock. Docker and local Supabase must be running; the task never starts or resets them. Missed runs start when the signed-in session becomes available. A failed task gets up to three retries fifteen minutes apart. A powered-off computer or unavailable session cannot create a backup, and retries cannot guarantee recovery while Docker remains stopped.

The creation job records one successful scheduled snapshot per local calendar day. Further runs on the same day verify the recorded snapshot instead of creating duplicates. Manual `backup:create` remains available independently. An exclusive file lock prevents overlapping scheduled jobs. Every newly created snapshot is checked against its signed metadata/checksum before a successful status is recorded. This is file-integrity verification; an actual isolated restore rehearsal remains a separate check.

Private run status lives at `.local-services/privacy/scheduled-backup.json`, with only timestamps, a managed backup UUID and fixed outcomes. Failed attempts preserve the previous successful identifier and never include raw exceptions, dump contents or credentials. Task Scheduler exposes the process result. No external failure alert is configured. If a process crashes with its lock left behind, confirm that the task/process is stopped before removing only `scheduled-backup.lock`; do not remove the ledger, key or backup directory. Seven-day expiry still applies even when backup creation fails, so persistent failures require attention.

## Local runbook

Use commands from the repository root with Docker running and loopback Supabase configured. Keep all snapshot contents, the ledger and its key out of version control and tool output.

- `npm run backup:create` writes a managed snapshot and prints its UUID. Keep that identifier for verification.
- `npm run backup:sync` refreshes the signed erasure ledger without creating a snapshot.
- `npm run backup:restore-check -- <UUID>` runs the isolated rehearsal and removes the copy.
- `npm run backup:policy -- 7` reapplies the approved local policy; `npm run backup:expire -- --dry-run` previews counts before `npm run backup:expire` removes expired managed snapshots. Changing the approved duration requires a new owner decision.
- `npm run backup:schedule` reinstalls the current-user maintenance task if needed. Installation refuses missing or disabled policy.
- `npm run backup:schedule-create` installs the daily 02:45 creation task and retry settings. `npm run backup:daily` invokes that job manually, including the daily duplicate check. Check the task's latest result and private status after a failure.
- `npm run backup:adopt` optionally catalogues matching legacy project `.dump`/`.sql` files directly in `.local-backups` and `.local-services/backups`. It verifies each copied checksum before removing the original file, preserving its modification time for expiry. Unknown schema versions prevent automatic restoration; they require review before restore. Nested directories and Storage backups are outside its scope.

Do not use raw SQL dumps to overwrite the live database. A failed check leaves the live database untouched; investigate the safe failure without printing sensitive dump contents. If maintenance leaves an incomplete pair after interruption, preserve it for operator investigation rather than removing a directory wholesale.

## Verification

`test:backup-store` covers disabled defaults, approved-period expiry in synthetic test directories, dry-run behavior, path bounds, unrelated files, signatures, corruption and monotonic ledger updates. `test:scheduled-backup` covers daily deduplication, verification, failure privacy, preservation of prior success, retry recovery and lock ownership. `test:account-deletion` covers journal rollback and client-access denial alongside the existing erasure checks. `test:privacy-restore` creates disposable real local accounts, snapshots before deletion, then verifies that replay removes Auth/chat/memory/report evidence, preserves an unrelated account, disables deletion in the copy and denies the erased identity adult access. No live AI key is required.

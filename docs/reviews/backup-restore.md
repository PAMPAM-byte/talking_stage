# Backup and restoration protection review

10 October 2026 · Local slice; Stage 12 and Gate B remain open.

Delivered: atomic account-erasure journal, signed external ledger, managed database snapshot catalogue, checksum/signature verification, isolated restore with deletion replay, and expiry tooling that defaults disabled. The legacy Stage 8 rehearsal also replays deletions. Restore copies are removed and never exposed to users.

Passed: synthetic backup-store tests, account-deletion database tests including journal rollback/client denial, and real Docker isolated restore with two disposable accounts. The restore removes a previously deleted account and its messages, memories and report evidence while preserving the other identity. Scoped script lint and PowerShell parsing passed. A managed snapshot of the current local database was also created and its isolated restore verified. The updated full Stage 8 browser fixture journey was not run in this slice.

The owner approved seven-day retention on 10 October 2026. The local policy is enabled and the daily 03:00 current-user expiry task is installed. The initial preview found zero eligible snapshots; the first scheduled maintenance run completed successfully with exit code zero.

Automatic local creation was subsequently enabled at 02:45 on the Windows local clock, with missed-run handling and up to three retries fifteen minutes apart. The first actual scheduled run completed with exit code zero, created a signed/checksum-verified managed snapshot, and that snapshot passed an isolated restore with deletion replay. A second invocation verified the existing day's snapshot without creating another. Scheduled-job tests passed for failure privacy, prior-success preservation, failed verification, retry recovery and exclusive locks; scoped lint and PowerShell parsing passed. Docker must be running and the Windows user signed in. No external alert or hosted backup schedule is implied.

Pending: optional legacy snapshot adoption, external protection of the ledger/key, hosted recovery and Storage backups, retention exceptions, monitoring and remaining launch gates. Offline disaster recovery and restored-database promotion are not implemented. See [contracts and runbook](../stage-12-backup-contracts.md).

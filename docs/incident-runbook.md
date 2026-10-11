# Incident and support runbook

10 October 2026 · Development operations; hosted on-call ownership and alerts remain pending.

## Investigate a failure

1. Run `npm run health:local` with the app and Docker running. A failed application check can mean the app is stopped; failed Auth/database checks can mean local Supabase is stopped. Fix service availability before repeatedly submitting mutations.
2. Inspect `talkingstage.operation` events in the server console around the incident time. Use operation/outcome/duration, not private account content. Treat `rejected` and deliberately `disabled` AI separately from `unavailable` or `unexpected`. Repeated rate limits call for waiting and reviewing request limits, not disabling protections.
3. Reproduce with a disposable synthetic account. Record time, affected screen, steps and the safe outcome. Never paste tokens, passwords, snapshots, private report notes, conversation text or memories into an incident ticket or public logs.
4. After a fix, repeat the affected journey and local health check. Use a corrective forward migration when needed. An isolated backup rehearsal verifies recovery without overwriting the live stack.

## Contain an incident

- An eligible administrator can use `/admin/operations` to disable chat, photos or monetary capabilities globally or for one character, providing a reason. Reload controls if another operator changed their version. Do not grant a normal user administrator access for troubleshooting.
- To pause AI generation, disable `TALKINGSTAGE_AI_ENABLED` and restart the app, or use trusted operator SQL to set `private.ai_configuration.enabled=false`. Summaries have their own `summaries_enabled` switch. Database configuration changes invalidate old context; a server flag or cancellation cannot recall data already sent to a provider. AI remains disabled while keys/model/spending approval are missing.
- To stop new ordinary-account deletions during an erasure incident, trusted operator SQL can set `private.privacy_configuration.account_deletion_enabled=false`. Preserve the deletion journal, ledger and signing key. Do not recreate a deleted identity to investigate its contents.
- Payment processing is not integrated. Keep payment/request policy disabled; gateway reconciliation and production payment incident procedures must be completed with the actual gateway.

## Help a user recover

- Sign-in: check credentials or use the existing password-recovery link. During an outage, preserve the form and retry once availability returns.
- Messaging: inspect current history before retrying an uncertain send; retain the same client operation identifier for retries. Chat pause leaves saved history accessible. AI being disabled is expected while keys are unavailable.
- Reporting: retry the open report using its existing operation identifier. The form retains details. After acknowledgement, use its reference to inspect only authorized selected evidence; avoid requesting an entire conversation.
- Account deletion: after a lost response, check whether sign-in still works before asserting success/failure. Do not imply data was retained merely because the browser lost confirmation. Retained financial/operator accounts use the existing support-assisted path.
- Database recovery: follow [backup contracts](./stage-12-backup-contracts.md). Run isolated deletion replay checks; do not promote an old snapshot into user access. Hosted promotion and offline disaster recovery require a reviewed process.
- Daily backup failure: inspect the current-user backup-creation task's latest result and `.local-services/privacy/scheduled-backup.json`. Start Docker/local Supabase if stopped, then run `npm run backup:daily`. A same-day success verifies the existing snapshot instead of duplicating it. Persistent failure needs attention before seven-day expiry removes older copies. Check that no backup process is running before clearing a crash-left scheduled-job lock.

## Hosted checks

Run `npm run health:hosted` from the project directory. See [executed review and limits](./reviews/hosted-monitoring.md). A nonzero exit means at least one dependency or the backup history needs attention. Check internet access and private environment configuration first. Auth failures require checking the Supabase Auth service; database failures require checking database availability and the published catalogue. Photo failures require checking Storage, approved asset paths and private access controls. Keep the bucket private; making it public is not an outage fix. Repeat the check once the cause is addressed.

For a `failed` or `stale` backup, inspect Task Scheduler's `TalkingStage-HostedBackupCreate-037C2CB1` result and the private `.local-services/hosted-privacy/scheduled-backup.json`. Start Docker/local Supabase, confirm CLI login and the saved root certificate, then run `npm run backup:hosted:daily`. A same-day success verifies the existing snapshot. A `missing` or `invalid` history requires checking the job and protected local state; do not invent a successful timestamp or replace missing encryption/signing keys. After recovery, repeat `npm run health:hosted`. Use [hosted backup procedures](./hosted-backups.md) for integrity verification and isolated restore. No health command restores data or modifies the deletion gate.

The backup check reads recorded job history; it cannot detect every missing/corrupt snapshot, and the manual command cannot notify an operator when the computer is off. Before hosted rollout, assign incident/support ownership, configure a protected collector with an approved retention period, select availability/latency/usage alerts and delivery destination, and test containment against the hosted deployment. Nothing here sends messages to a support team or changes hosted services.

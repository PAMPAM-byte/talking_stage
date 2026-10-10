import { createBackup, store, localOnly } from './lib/local-backups.mjs';
import { scheduledBackup } from './lib/scheduled-backup.mjs';

try {
  localOnly();
  const result = await scheduledBackup({ state: store.state, create: createBackup, verify: id => store.load(id) });
  console.log(`Daily local backup: ${result.state}.`);
} catch {
  console.error('Daily local backup failed. Check Docker/local configuration and managed backup integrity. No successful run has been claimed.');
  process.exitCode = 1;
}

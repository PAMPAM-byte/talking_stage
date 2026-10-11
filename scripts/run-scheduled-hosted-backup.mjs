import { scheduledBackup } from './lib/scheduled-backup.mjs';

try {
  // Import inside the privacy guard so even configuration failures have fixed output.
  const { create, verifyBackup, store } = await import('./hosted-backups.mjs');
  const result = await scheduledBackup({ state: store.state, create, verify: verifyBackup });
  console.log(`Daily hosted backup: ${result.state}.`);
} catch {
  console.error('Daily hosted backup failed. Check Docker, CLI login, certificate, hosted access and managed backup integrity. No new successful run is claimed.');
  process.exitCode = 1;
}

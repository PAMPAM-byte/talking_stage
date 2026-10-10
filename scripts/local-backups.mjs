import { createBackup, restoreIsolated, syncErasures, store, localOnly, adoptLegacyBackups } from './lib/local-backups.mjs';
localOnly();
const operation = process.argv[2];
if (operation === 'create') {
    const snapshot = await createBackup();
    console.log(`Managed backup created: ${snapshot.id}`);
}
else if (operation === 'restore-check') {
    const result = await restoreIsolated(process.argv[3]);
    console.log(`Isolated restore verified; ${result.erased} deletion record(s) applied. Disposable restore removed.`);
}
else if (operation === 'sync') {
    const records = await syncErasures();
    console.log(`Signed erasure ledger synchronized: ${records.length} record(s).`);
}
else if (operation === 'expire') {
    console.log(JSON.stringify(await store.expire({ dryRun: process.argv.includes('--dry-run') })));
}
else if (operation === 'policy') {
    const days = Number(process.argv[3]);
    await store.configure(days);
    console.log(`Local managed-backup retention configured: ${days} days.`);
}
else if (operation === 'adopt') {
    console.log(`Legacy project backups catalogued: ${await adoptLegacyBackups()}`);
}
else
    throw new Error('Use create, restore-check UUID, sync, expire [--dry-run], policy DAYS, or adopt.');

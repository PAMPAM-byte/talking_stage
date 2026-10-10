import { mkdir, readFile, writeFile, symlink, lstat, unlink, readdir, rmdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { backupStore } from './lib/local-backup-store.mjs';
const directory = resolve('.local-services', `backup-test-${randomUUID()}`), store = backupStore({ root: join(directory, 'managed'), state: join(directory, 'state') });
const actor = randomUUID();
try {
    await mkdir(directory, { recursive: true });
    assert.equal((await store.expire()).enabled, false);
    await store.syncLedger(async () => [{ actorId: actor, deletedAt: new Date().toISOString() }]);
    assert.equal((await store.ledger())[0].actorId, actor);
    await store.syncLedger(async () => []);
    assert.equal((await store.ledger()).length, 1, 'Ledger must not lose existing records');
    const body = await store.save(Buffer.from('synthetic snapshot'), 'synthetic-schema');
    await store.configure(7);
    assert.equal((await store.expire()).count, 0);
    assert.equal((await store.expire({ now: Date.now() + 8 * 86400000, dryRun: true })).count, 1);
    assert.equal((await store.load(body.id)).bytes.toString(), 'synthetic snapshot');
    const external = join(directory, 'keep.txt');
    await writeFile(external, 'unrelated');
    await assert.rejects(store.load('../keep'), /UUID/);
    const meta = join(store.root, `${body.id}.json`), original = await readFile(meta);
    const tampered = JSON.parse(original);
    tampered.body.createdAt = '2000-01-01T00:00:00Z';
    await writeFile(meta, JSON.stringify(tampered));
    await assert.rejects(store.expire({ now: Date.now() + 8 * 86400000 }), /signature/);
    await writeFile(meta, original);
    await writeFile(join(store.root, `${body.id}.dump`), 'changed bytes');
    await assert.rejects(store.load(body.id));
    await writeFile(join(store.root, `${body.id}.dump`), 'synthetic snapshot');
    await store.expire({ now: Date.now() + 8 * 86400000 });
    assert.equal(await readFile(external, 'utf8'), 'unrelated');
    await assert.rejects(store.load(body.id), /ENOENT/);
    const ledgerPath = join(store.state, 'erasures.json'), ledgerOriginal = await readFile(ledgerPath);
    await writeFile(ledgerPath, '{}');
    await assert.rejects(store.syncLedger(async () => []), /Invalid backup/);
    await writeFile(ledgerPath, ledgerOriginal);
    const linkBody = await store.save(Buffer.from('another synthetic snapshot'), 'synthetic-schema');
    await unlink(join(store.root, `${linkBody.id}.dump`));
    try {
        await symlink(external, join(store.root, `${linkBody.id}.dump`));
        await assert.rejects(store.load(linkBody.id));
    }
    catch (error) {
        if (error.code !== 'EPERM')
            throw error;
    }
    console.log('Backup store checks passed: disabled default, approved-period expiry, dry-run, unrelated-file preservation, path bounds, signatures, tamper/corruption rejection and monotonic deletion records.');
}
finally {
    // Only files inside this randomly named test directory are cleaned; no recursion
    // follows a symlink, and no production backup directory is passed here.
    async function cleanup(path) { for (const name of await readdir(path).catch(() => [])) {
        const child = join(path, name), info = await lstat(child);
        if (info.isDirectory() && !info.isSymbolicLink()) {
            await cleanup(child);
            await rmdir(child);
        }
        else
            await unlink(child);
    } }
    await cleanup(directory);
    await rmdir(directory);
}

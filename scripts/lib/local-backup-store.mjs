import { mkdir, readFile, writeFile, rename, unlink, lstat, realpath, readdir } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { randomBytes, createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import assert from 'node:assert/strict';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const uuid = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
export function backupStore({ root = resolve('.local-backups/managed'), state = resolve('.local-services/privacy') } = {}) {
    const keyPath = join(state, 'ledger.key'), ledgerPath = join(state, 'erasures.json'), policyPath = join(state, 'backup-policy.json');
    const atomic = async (path, bytes) => { const temp = `${path}.${randomUUID()}.tmp`; await writeFile(temp, bytes, { mode: 0o600, flag: 'wx' }); try {
        await rename(temp, path);
    }
    catch (error) {
        await unlink(temp);
        throw error;
    } };
    async function key(create = false) { try {
        return await readFile(keyPath);
    }
    catch (error) {
        if (error.code !== 'ENOENT' || !create)
            throw new Error('Backup signing key unavailable.');
        await mkdir(state, { recursive: true });
        if (await readFile(ledgerPath).then(() => true, () => false))
            throw new Error('Cannot replace a missing ledger key.');
        const bytes = randomBytes(32);
        try {
            await writeFile(keyPath, bytes, { flag: 'wx', mode: 0o600 });
            return bytes;
        }
        catch (error) {
            if (error.code === 'EEXIST')
                return readFile(keyPath);
            throw error;
        }
    } }
    const sign = (body, secret) => createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
    function verify(record, secret) { assert(record && record.body && /^[a-f0-9]{64}$/.test(record.signature ?? ''), 'Invalid backup record'); assert(timingSafeEqual(Buffer.from(record.signature, 'hex'), Buffer.from(sign(record.body, secret), 'hex')), 'Backup record signature mismatch'); return record.body; }
    async function seal(path, body, secret) { await atomic(path, JSON.stringify({ body, signature: sign(body, secret) }, null, 2) + '\n'); }
    async function ledger() { const body = verify(JSON.parse(await readFile(ledgerPath, 'utf8')), await key()); assert.equal(body.version, 1); assert(Array.isArray(body.records)); for (const item of body.records)
        assert(uuid(item.actorId) && Number.isFinite(Date.parse(item.deletedAt)), 'Invalid erasure entry'); return body.records; }
    async function syncLedger(readCurrent) { await mkdir(state, { recursive: true }); const lock = join(state, 'sync.lock'); await writeFile(lock, 'locked', { flag: 'wx', mode: 0o600 }); try {
        const secret = await key(true);
        let previous = [];
        try {
            previous = await ledger();
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
        const current = await readCurrent();
        const all = new Map(previous.map(item => [item.actorId, item]));
        for (const item of current) {
            assert(uuid(item.actorId) && Number.isFinite(Date.parse(item.deletedAt)));
            all.set(item.actorId, item);
        }
        const records = [...all.values()].sort((a, b) => a.actorId.localeCompare(b.actorId));
        await seal(ledgerPath, { version: 1, records }, secret);
        return records;
    }
    finally {
        await unlink(lock);
    } }
    async function save(bytes, schemaVersion, { createdAt = new Date().toISOString(), format = 'pg-custom' } = {}) { await mkdir(root, { recursive: true }); const secret = await key(true), id = randomUUID(); const body = { version: 1, id, kind: 'database', createdAt, format, sha256: sha(bytes), size: bytes.length, schemaVersion }; await atomic(join(root, `${id}.dump`), bytes); await seal(join(root, `${id}.json`), body, secret); return body; }
    async function load(id) { assert(uuid(id), 'Supply a managed backup UUID'); const body = verify(JSON.parse(await readFile(join(root, `${id}.json`), 'utf8')), await key()); assert.equal(body.id, id); assert.equal(body.kind, 'database'); const path = join(root, `${id}.dump`), info = await lstat(path); assert(info.isFile() && !info.isSymbolicLink()); const canonical = await realpath(path), canonicalRoot = await realpath(root); assert(canonical.toLowerCase().startsWith((canonicalRoot + sep).toLowerCase())); const bytes = await readFile(path); assert.equal(bytes.length, body.size); assert.equal(sha(bytes), body.sha256, 'Backup checksum mismatch'); return { body, bytes }; }
    async function configure(days) { assert(Number.isInteger(days) && days >= 1 && days <= 365); await mkdir(state, { recursive: true }); await atomic(policyPath, JSON.stringify({ version: 1, enabled: true, days }, null, 2) + '\n'); }
    async function expire({ now = Date.now(), dryRun = false } = {}) {
        let policy;
        try {
            policy = JSON.parse(await readFile(policyPath, 'utf8'));
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return { enabled: false, count: 0 };
            throw error;
        }
        if (!policy.enabled)
            return { enabled: false, count: 0 };
        assert.equal(policy.version, 1);
        assert(Number.isInteger(policy.days) && policy.days >= 1 && policy.days <= 365);
        let names;
        try {
            names = await readdir(root);
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return { enabled: true, count: 0 };
            throw error;
        }
        const candidates = [];
        for (const name of names) {
            const id = name.replace(/\.json$/, '');
            if (!name.endsWith('.json') || !uuid(id))
                continue;
            const { body } = await load(id);
            const created = Date.parse(body.createdAt);
            assert(Number.isFinite(created), 'Invalid backup creation time');
            if (created <= now - policy.days * 86400000)
                candidates.push(id);
        } // Verify every record before deleting any.
        for (const id of candidates) {
            if (dryRun)
                continue;
            for (const extension of ['dump', 'json']) {
                const path = join(root, `${id}.${extension}`);
                const info = await lstat(path);
                assert(info.isFile() && !info.isSymbolicLink());
                const canonical = await realpath(path), canonicalRoot = await realpath(root);
                assert(canonical.toLowerCase().startsWith((canonicalRoot + sep).toLowerCase()));
                await unlink(path);
            }
        }
        return { enabled: true, count: candidates.length, dryRun };
    }
    return { ledger, syncLedger, save, load, configure, expire, root, state };
}

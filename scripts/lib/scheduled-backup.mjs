import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { uuid } from './local-backup-store.mjs';

function localDay(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// Dependencies permit failure tests without touching the real database or backups.
export async function scheduledBackup({ state, create, verify, now = new Date() }) {
  assert(Number.isFinite(now.getTime()));
  await mkdir(state, { recursive: true });
  const lock = join(state, 'scheduled-backup.lock');
  const statusPath = join(state, 'scheduled-backup.json');
  await writeFile(lock, 'locked', { flag: 'wx', mode: 0o600 });
  let previous = {};
  async function record(body) {
    const temporary = `${statusPath}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(body, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    try { await rename(temporary, statusPath); }
    catch (error) { await unlink(temporary); throw error; }
  }
  try {
    try {
      const saved = JSON.parse(await readFile(statusPath, 'utf8'));
      assert(saved.version === 1);
      if (saved.lastSuccessAt) {
        assert(uuid(saved.backupId) && Number.isFinite(Date.parse(saved.lastSuccessAt)));
        previous = { lastSuccessAt: saved.lastSuccessAt, backupId: saved.backupId };
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous.lastSuccessAt && localDay(new Date(previous.lastSuccessAt)) === localDay(now)) {
      await verify(previous.backupId);
      await record({ version: 1, ...previous, lastCheckedAt: now.toISOString(), lastOutcome: 'already_created' });
      return { state: 'already_created', backupId: previous.backupId };
    }
    const snapshot = await create();
    assert(uuid(snapshot.id), 'Backup identifier unavailable');
    await verify(snapshot.id);
    await record({ version: 1, lastSuccessAt: now.toISOString(), backupId: snapshot.id, lastOutcome: 'created' });
    return { state: 'created', backupId: snapshot.id };
  } catch {
    // Record only a fixed outcome, never dump contents or exception/provider text.
    try { await record({ version: 1, ...previous, lastFailureAt: now.toISOString(), lastOutcome: 'failed' }); } catch {}
    throw new Error('Scheduled backup failed. Check Docker, local configuration and backup integrity; no new successful run is claimed.');
  } finally { await unlink(lock); }
}

import { readFile, writeFile, unlink, readdir, rmdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { scheduledBackup } from './lib/scheduled-backup.mjs';

const state = resolve('.local-services', `scheduled-backup-test-${randomUUID()}`);
const first = randomUUID(), second = randomUUID();
let created = 0, verified = 0;
const dayOne = new Date(2026, 9, 10, 2, 45), dayTwo = new Date(2026, 9, 11, 2, 45);
const create = async () => ({ id: ++created === 1 ? first : second });
const verify = async () => { verified++; };
try {
  assert.equal((await scheduledBackup({ state, create, verify, now: dayOne })).state, 'created');
  assert.equal((await scheduledBackup({ state, create, verify, now: new Date(2026, 9, 10, 23) })).state, 'already_created');
  assert.equal(created, 1); assert.equal(verified, 2);
  const canary = 'PRIVATE_DUMP_PASSWORD_TOKEN';
  await assert.rejects(scheduledBackup({ state, create: async () => { throw new Error(canary); }, verify, now: dayTwo }), /Scheduled backup failed/);
  let status = JSON.parse(await readFile(join(state, 'scheduled-backup.json'), 'utf8'));
  assert.equal(status.backupId, first); assert.equal(status.lastSuccessAt, dayOne.toISOString());
  assert.equal(status.lastOutcome, 'failed'); assert(!JSON.stringify(status).includes(canary));
  await assert.rejects(scheduledBackup({ state, create, verify: async () => { throw new Error(canary); }, now: dayTwo }));
  status = JSON.parse(await readFile(join(state, 'scheduled-backup.json'), 'utf8'));
  assert.equal(status.backupId, first, 'Failed verification must not claim a new successful backup');
  assert.equal((await scheduledBackup({ state, create, verify, now: dayTwo })).state, 'created');
  status = JSON.parse(await readFile(join(state, 'scheduled-backup.json'), 'utf8'));
  assert.equal(status.backupId, second); assert.equal(status.lastOutcome, 'created');
  await writeFile(join(state, 'scheduled-backup.lock'), 'other job', { flag: 'wx' });
  await assert.rejects(scheduledBackup({ state, create, verify, now: dayTwo }), error => error.code === 'EEXIST');
  assert.equal(await readFile(join(state, 'scheduled-backup.lock'), 'utf8'), 'other job', 'Never remove another running job lock');
  console.log('Scheduled backup checks passed: daily deduplication, fresh verification, safe failures, retained prior success, retry recovery and exclusive-lock ownership.');
} finally {
  // This test creates only flat files within its exact random directory.
  for (const name of await readdir(state).catch(() => [])) await unlink(join(state, name));
  await rmdir(state).catch(error => { if (error.code !== 'ENOENT') throw error; });
}

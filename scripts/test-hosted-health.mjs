import assert from 'node:assert/strict';
import { backupHealth, probe } from './lib/hosted-health.mjs';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const now = new Date('2026-10-11T12:00:00Z');
const status = { version: 1, backupId: '11111111-1111-4111-8111-111111111111', lastSuccessAt: '2026-10-11T02:15:00Z', lastOutcome: 'created' };
assert.equal(backupHealth(status, now).state, 'recent');
assert.equal(backupHealth({ ...status, lastOutcome: 'already_created' }, now).ok, true);
assert.equal(backupHealth({ ...status, lastOutcome: 'failed' }, now).state, 'failed');
assert.equal(backupHealth({ ...status, lastSuccessAt: '2026-10-10T09:00:00Z' }, now).state, 'stale');
assert.equal(backupHealth({ ...status, lastSuccessAt: '2026-10-12T00:00:00Z' }, now).state, 'invalid');
assert.equal(backupHealth({ version: 1, lastOutcome: 'failed' }, now).state, 'failed');
assert.equal(backupHealth({ ...status, backupId: '../../private' }, now).state, 'invalid');
assert.equal(backupHealth({}, now).ok, false);
const canary = 'PRIVATE_TOKEN_PASSWORD_ACCOUNT_CONTENT';
const failure = await probe(async () => { throw new Error(canary); });
assert.equal(failure.ok, false);
assert(!JSON.stringify(failure).includes(canary));
assert.deepEqual(Object.keys(failure).sort(), ['durationMs', 'ok']);
assert.equal((await probe(async () => true)).ok, true);
assert.equal((await probe(async () => false)).ok, false);
assert.equal((await probe(async () => ({ private: canary }))).ok, false);
// Exercise the actual command under a total outage, with fake credentials and
// no network. A failed check must exit nonzero and never echo provider details.
const directory = await mkdtemp(join(tmpdir(), 'talkingstage-health-'));
const envPath = join(directory, '.env.hosted.local');
try {
  await writeFile(envPath, `NEXT_PUBLIC_SUPABASE_URL=https://hoxeembcwureucdsssct.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=${canary}\n`, { flag: 'wx' });
  const preload = `globalThis.fetch = async () => { throw new Error('${canary}'); };`;
  let stdout, stderr;
  try {
    execFileSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(preload)}`, resolve('scripts/check-hosted-health.mjs')], { cwd: directory, encoding: 'utf8', timeout: 15000, stdio: 'pipe' });
    assert.fail('Outage must exit nonzero');
  } catch (error) {
    assert.equal(error.status, 1);
    stdout = error.stdout;
    stderr = error.stderr;
  }
  assert(!`${stdout}${stderr}`.includes(canary));
  const report = JSON.parse(stdout);
  for (const key of ['authentication', 'database', 'photos', 'backups']) assert.equal(report[key].ok, false);
  assert.equal(report.backups.state, 'missing');
} finally {
  await unlink(envPath);
  await rmdir(directory);
}
console.log('Hosted health tests passed: failed/stale/missing history, invalid clocks/IDs and private failure isolation.');

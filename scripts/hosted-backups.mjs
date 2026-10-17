import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, unlink, readdir, lstat, realpath, copyFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { backupStore, sha, uuid } from './lib/local-backup-store.mjs';
import { encryptBundle, decryptBundle } from './lib/hosted-backup-crypto.mjs';

const project = 'hoxeembcwureucdsssct', target = `https://${project}.supabase.co`;
const env = parseEnv(await readFile('.env.hosted.local', 'utf8'));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, target);
assert.equal((await readFile('supabase/.temp/project-ref', 'utf8')).trim(), project);
export const store = backupStore({ root: resolve('.local-backups/hosted-managed'), state: resolve('.local-services/hosted-privacy') });
await mkdir(store.state, { recursive: true });
const keyPath = join(store.state, 'encryption.key');
const stage = resolve('.local-services/hosted-backup-stage');
await mkdir(stage, { recursive: true });
assert(!(await lstat(stage)).isSymbolicLink());
assert.equal((await realpath(stage)).toLowerCase(), stage.toLowerCase());
// The current CLI parses the app's .env.local differently from Node/Next.
// Keep its linked-project context isolated without changing app credentials.
const cliRoot = join(stage, 'cli');
await mkdir(join(cliRoot, 'supabase', '.temp'), { recursive: true });
await copyFile('supabase/config.toml', join(cliRoot, 'supabase', 'config.toml'));
await mkdir(join(cliRoot, 'supabase', 'templates'), { recursive: true });
for (const name of ['confirmation.html', 'recovery.html']) await copyFile(`supabase/templates/${name}`, join(cliRoot, 'supabase', 'templates', name));
for (const name of ['project-ref', 'pooler-url']) await copyFile(`supabase/.temp/${name}`, join(cliRoot, 'supabase', '.temp', name));
async function encryptionKey(create = false) {
  try { const key = await readFile(keyPath); assert.equal(key.length, 32); return key; }
  catch (error) {
    if (error.code !== 'ENOENT' || !create) throw new Error('Hosted encryption key unavailable; cannot recover this backup.');
    assert.equal((await readdir(store.root).catch(() => [])).length, 0, 'Never replace a missing encryption key for existing backups.');
    const key = randomBytes(32); await writeFile(keyPath, key, { flag: 'wx', mode: 0o600 }); return key;
  }
}
async function http(path, { method = 'GET', body } = {}) {
  // These calls only read objects or the read-only erasure manifest. Retry
  // transient transport/server failures without retrying access denials.
  let failure = 'transport or response read';
  for (let attempt = 0; attempt < 5; attempt++) {
    let retry = true;
    try {
      const response = await fetch(target + path, { method, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        failure = `HTTP ${response.status}`;
        retry = response.status === 429 || response.status >= 500;
        await response.body?.cancel();
        throw new Error('Hosted dependency response rejected.');
      }
      return path.startsWith('/storage/v1/object/authenticated/') ? Buffer.from(await response.arrayBuffer()) : await response.json();
    } catch {
      if (!retry || attempt === 4) {
        console.error(`Hosted read failed (${failure}); response contents and credentials suppressed.`);
        throw new Error('Hosted backup dependency request failed; no sensitive response logged.');
      }
      await delay([1000, 3000, 7000, 15000][attempt]);
    }
  }
}
export async function syncLedger() {
  const catalogue = await readdir(store.root).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  if (catalogue.length) await lstat(join(store.state, 'erasures.json'));
  return store.syncLedger(() => http('/rest/v1/rpc/erasure_manifest', { method: 'POST', body: {} }));
}
function cli(args) {
  try { return execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', ...args, '--workdir', cliRoot], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, timeout: 180000, maxBuffer: 8 * 1024 * 1024 }); }
  catch (error) {
    const diagnostic = String(error.stderr ?? '');
    const code = /docker|daemon|pipe/i.test(diagnostic) ? 'DOCKER_UNAVAILABLE' : /password|authentication/i.test(diagnostic) ? 'CLI_AUTHENTICATION' : /connect|network|resolve|timeout/i.test(diagnostic) ? 'CLI_CONNECTION' : 'CLI_EXPORT';
    throw Object.assign(new Error('Hosted database export failed; raw connection diagnostics remain suppressed.'), { code });
  }
}
export async function query(sql) {
  const path = join(stage, `${randomUUID()}.sql`);
  await writeFile(path, sql, { flag: 'wx', mode: 0o600 });
  try { const output = cli(['db', 'query', '--linked', '--file', path]); const data = JSON.parse(output.slice(output.indexOf('{'))); assert(Array.isArray(data.rows)); return data.rows; }
  finally { await unlink(path); }
}
const inventorySql = `select json_build_object('migrations',(select json_agg(version order by version) from supabase_migrations.schema_migrations),'assets',(select coalesce(json_agg(to_jsonb(a) order by id),'[]') from public.character_assets a),'bucket',(select json_build_object('id',id,'public',public,'fileSizeLimit',file_size_limit,'allowedMimeTypes',allowed_mime_types) from storage.buckets where id='cast-private')) as inventory;`;
async function inventory() { return (await query(inventorySql))[0].inventory; }
async function dumpThroughPooler() {
  const certificatePath = join(stage, 'supabase-ca.crt');
  const certificate = await readFile(certificatePath, 'utf8').catch(() => { throw new Error('Save the dashboard server root certificate as .local-services/hosted-backup-stage/supabase-ca.crt before export.'); });
  assert(certificate.includes('-----BEGIN CERTIFICATE-----'));
  const pooler = new URL((await readFile('supabase/.temp/pooler-url', 'utf8')).trim());
  assert(pooler.username.endsWith(`.${project}`));
  assert(/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(pooler.hostname));
  assert.equal(pooler.port, '5432');
  // Capture, never print, the CLI's temporary login credential. Use the linked
  // IPv4 session pooler rather than the direct IPv6 endpoint on this computer.
  const plan = cli(['db', 'dump', '--linked', '--schema', 'auth,public,private', '--dry-run']);
  const password = /^export PGPASSWORD="([A-Za-z0-9_-]{20,})"/m.exec(plan)?.[1];
  if (!password) throw Object.assign(new Error('Unable to obtain the temporary export credential privately.'), { code: 'TEMPORARY_EXPORT_CREDENTIAL' });
  const args = ['--host', pooler.hostname, '--port', '5432', '--username', `cli_login_postgres.${project}`, '--dbname', 'postgres', '--role', 'postgres', '--schema', 'auth', '--schema', 'public', '--schema', 'private'];
  const containerCertificate = `/tmp/hosted-backup-ca-${randomUUID()}.crt`;
  docker(['sh', '-c', 'umask 077; cat > "$1"', 'hosted-backup', containerCertificate], certificate);
  function dump(extra) {
    try {
      return execFileSync('docker', ['exec', '-i', 'supabase_db_talking_stage', 'sh', '-c', 'IFS= read -r PGPASSWORD; export PGPASSWORD; export PGSSLMODE=verify-full PGSSLROOTCERT="$1" PGCONNECT_TIMEOUT=15; shift; exec pg_dump "$@"', 'hosted-backup', containerCertificate, ...args, ...extra], { input: password + '\n', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000, maxBuffer: 128 * 1024 * 1024 }).toString('utf8');
    } catch (error) {
      const diagnostic = String(error.stderr ?? '');
      const reason = /certificate/i.test(diagnostic) ? 'TLS certificate validation' : /permission|role/i.test(diagnostic) ? 'database export access' : /connect|network|resolve/i.test(diagnostic) ? 'pooler connection' : 'database export';
      throw Object.assign(new Error(`Hosted ${reason} failed; credentials and records were not logged.`), { code: `EXPORT_${reason.toUpperCase().replaceAll(' ', '_')}` });
    }
  }
  try { return { schemaSql: dump(['--schema-only']), dataSql: dump(['--data-only', '--exclude-table', 'auth.schema_migrations']) }; }
  finally { docker(['rm', '--', containerCertificate]); }
}
function checkBundle(bundle) {
  assert(bundle.schemaSql && bundle.dataSql && Array.isArray(bundle.objects));
  assert(bundle.schemaSql.includes('CREATE TABLE') && /COPY "?auth"?\."?users"?/.test(bundle.dataSql), 'Export must contain Auth identities, not only application data.');
  assert.equal(bundle.inventory.bucket.public, false);
  const expected = new Map();
  for (const asset of bundle.inventory.assets) {
    assert(uuid(asset.character_id) && uuid(asset.id));
    assert.equal(asset.storage_path, `${asset.character_id}/${asset.id}/original.webp`);
    for (const width of ['original', '320', '640', '1280']) expected.set(asset.storage_path.replace('original.webp', `${width}.webp`), width === 'original' ? asset.source_hash : null);
  }
  for (const object of bundle.objects) {
    assert(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/(original|320|640|1280)\.webp$/.test(object.path));
    const bytes = Buffer.from(object.bytes, 'base64'); assert.equal(bytes.length, object.size); assert.equal(sha(bytes), object.sha256);
    assert(expected.has(object.path), 'Unexpected or duplicate photo object.');
    if (expected.get(object.path)) assert.equal(object.sha256, expected.get(object.path));
    expected.delete(object.path);
  }
  assert.equal(expected.size, 0);
  assert.equal(bundle.objects.length, bundle.inventory.assets.length * 4);
}
function docker(args, input) {
  try { return execFileSync('docker', ['exec', ...(input ? ['-i'] : []), 'supabase_db_talking_stage', ...args], { input, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024, timeout: 120000 }); }
  catch { throw Object.assign(new Error('Isolated hosted restore database operation failed; live hosted services were not modified.'), { code: 'DOCKER_DATABASE_OPERATION' }); }
}
function copyCount(sql, schema, table) {
  const header = new RegExp(`^COPY "?${schema}"?\\."?${table}"? \\([^\\n]+\\) FROM stdin;\\r?$`, 'm').exec(sql);
  assert(header, 'Expected table absent from data export.');
  const after = sql.slice(header.index + header[0].length).replace(/^\r?\n/, '');
  const end = /^\\\.\r?$/m.exec(after); assert(end);
  return after.slice(0, end.index).split(/\r?\n/).filter(Boolean).length;
}
export async function restoreCheck(id, check = async () => {}) {
  assert(uuid(id));
  const records = await syncLedger(), saved = await store.load(id);
  const bundle = decryptBundle(saved.bytes, await encryptionKey(), project); checkBundle(bundle);
  assert.equal(saved.body.format, 'aes-gcm-json-gzip-v1');
  const migrations = (await readdir('supabase/migrations')).filter(file => file.endsWith('.sql')).sort();
  assert(migrations.includes(saved.body.schemaVersion), 'Unknown snapshot schema version.');
  const database = `hosted_restore_${randomUUID().replaceAll('-', '_')}`;
  assert(/^hosted_restore_[a-f0-9_]+$/.test(database));
  docker(['createdb', '-U', 'supabase_admin', '--template=template0', database]);
  const sql = input => docker(['psql', '-U', 'supabase_admin', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At'], input).toString().trim();
  try {
    sql("drop schema public;create schema extensions;create extension if not exists pgcrypto with schema extensions;create extension if not exists \"uuid-ossp\" with schema extensions;create schema privacy_guard authorization postgres;revoke all on schema privacy_guard from public,anon,authenticated,service_role;create table privacy_guard.account_erasures(actor_id uuid primary key,deleted_at timestamptz not null);alter table privacy_guard.account_erasures owner to postgres;alter table privacy_guard.account_erasures enable row level security;");
    sql(bundle.schemaSql);
    sql('set session_replication_role=replica;\n' + bundle.dataSql + '\nset session_replication_role=origin;');
    const before = JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'profiles',(select count(*) from public.profiles),'assets',(select count(*) from public.character_assets),'unsecured',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),'privateAccess',has_schema_privilege('authenticated','private','usage'));"));
    assert.equal(before.users, copyCount(bundle.dataSql, 'auth', 'users'));
    assert.equal(before.profiles, copyCount(bundle.dataSql, 'public', 'profiles'));
    assert.equal(before.assets, bundle.inventory.assets.length);
    assert.equal(before.unsecured, 0); assert.equal(before.privateAccess, false);
    for (const file of migrations.filter(file => file > saved.body.schemaVersion)) sql(await readFile(join('supabase/migrations', file), 'utf8'));
    sql('update private.privacy_configuration set account_deletion_enabled=false;update private.ai_configuration set enabled=false,summaries_enabled=false;update private.capability_controls set chat=false,photos=false,payments=false;');
    await check({ query: sql, records, phase: 'before-replay' });
    for (const record of records) {
      assert(uuid(record.actorId)); sql(`select private.erase_restored_account('${record.actorId}');`);
      assert.equal(sql(`select count(*) from auth.users where id='${record.actorId}';`), '0');
      assert.equal(sql(`select count(*) from public.profiles where id='${record.actorId}';`), '0');
    }
    await check({ query: sql, records, phase: 'after-replay' });
    await restorePhotos(bundle);
    console.log(`Hosted database restored only into a disposable Docker database: Auth/profile counts and row security verified; ${records.length} current deletion records replayed. AI/payment/deletion operations disabled in the copy.`);
  } finally { docker(['dropdb', '-U', 'supabase_admin', '--force', database]); }
}
async function restorePhotos(bundle) {
  const localEnv = parseEnv(await readFile('.env.docker.local', 'utf8'));
  assert(['127.0.0.1', 'localhost'].includes(new URL(localEnv.NEXT_PUBLIC_SUPABASE_URL).hostname));
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20000) }) } };
  const client = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY, options);
  const anonymous = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
  const bucket = `hosted-recovery-${randomUUID()}`;
  const check = result => { if (result.error) throw new Error('Isolated local photo recovery failed; sensitive diagnostics suppressed.'); return result.data; };
  check(await client.storage.createBucket(bucket, { public: false, fileSizeLimit: 5242880, allowedMimeTypes: ['image/webp'] }));
  try {
    for (const object of bundle.objects) {
      check(await client.storage.from(bucket).upload(object.path, Buffer.from(object.bytes, 'base64'), { contentType: 'image/webp', upsert: false }));
      const restored = Buffer.from(await check(await client.storage.from(bucket).download(object.path)).arrayBuffer());
      assert.equal(sha(restored), object.sha256);
      assert((await anonymous.storage.from(bucket).download(object.path)).error);
    }
    assert.equal(check(await client.storage.getBucket(bucket)).public, false);
    console.log(`Recovered and re-downloaded ${bundle.objects.length} photo objects in an isolated private local bucket; hashes and anonymous denial verified.`);
  } finally {
    check(await client.storage.emptyBucket(bucket));
    check(await client.storage.deleteBucket(bucket));
  }
}
let backupPhase = 'initialisation';
export async function create() {
  backupPhase = 'acquire-lock';
  const lock = join(store.state, 'create.lock'); await writeFile(lock, 'locked', { flag: 'wx', mode: 0o600 });
  const files = [];
  try {
    backupPhase = 'privacy-ledger'; await syncLedger();
    backupPhase = 'inventory'; const before = await inventory();
    assert(before.bucket && !before.bucket.public && before.bucket.fileSizeLimit === 5242880);
    const migrations = (await readdir('supabase/migrations')).filter(file => file.endsWith('.sql')).sort();
    const version = before.migrations.at(-1), schemaVersion = migrations.find(file => file.startsWith(`${version}_`)); assert(schemaVersion, 'Unknown migration version.');
    backupPhase = 'database-export'; const { schemaSql, dataSql } = await dumpThroughPooler();
    console.log('Hosted database exported over verified TLS; downloading registered private photos.');
    backupPhase = 'photo-download'; const objects = [];
    for (const asset of before.assets) {
      assert.equal(asset.storage_path, `${asset.character_id}/${asset.id}/original.webp`);
      const downloaded = await Promise.all(['original', '320', '640', '1280'].map(async width => {
        const path = asset.storage_path.replace('original.webp', `${width}.webp`), bytes = await http(`/storage/v1/object/authenticated/cast-private/${path}`);
        assert(bytes.length > 0 && bytes.length <= 5242880);
        if (width === 'original') assert.equal(sha(bytes), asset.source_hash, 'Photo differs from its registered immutable hash.');
        return { path, size: bytes.length, sha256: sha(bytes), bytes: bytes.toString('base64') };
      }));
      objects.push(...downloaded);
      if (objects.length % 32 === 0) console.log(`Verified ${objects.length} photo objects so far.`);
    }
    backupPhase = 'consistency-check'; assert.deepEqual(await inventory(), before, 'Cast or schema changed during export; retry after administrator writes stop.');
    await syncLedger();
    const bundle = { version: 1, project, createdAt: new Date().toISOString(), inventory: before, schemaSql, dataSql, objects };
    checkBundle(bundle);
    backupPhase = 'encryption'; const encrypted = encryptBundle(bundle, await encryptionKey(true), project);
    backupPhase = 'save-and-verify'; const body = await store.save(encrypted, schemaVersion, { format: 'aes-gcm-json-gzip-v1' });
    const saved = await store.load(body.id); checkBundle(decryptBundle(saved.bytes, await encryptionKey(), project));
    await store.configure(7); await store.expire();
    console.log(`Encrypted hosted backup verified: ${body.id}; ${objects.length} photo objects. Seven-day local-copy retention enabled.`);
    return body;
  } finally {
    for (const path of files) { assert.equal(resolve(path).startsWith(stage + sep), true); await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
    await unlink(lock);
  }
}
export async function verifyBackup(id) {
  assert(uuid(id)); await syncLedger(); const saved = await store.load(id);
  checkBundle(decryptBundle(saved.bytes, await encryptionKey(), project));
  await store.expire();
  return saved.body;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const operation = process.argv[2];
    if (operation === 'create') await create();
    else if (operation === 'verify') { await verifyBackup(process.argv[3]); console.log('Hosted encrypted bundle verified; this is file/object integrity, not an isolated restore.'); }
    else if (operation === 'sync') { await syncLedger(); console.log('Hosted erasure suppression ledger synchronized without exposing records.'); }
    else if (operation === 'expire') { const result = await store.expire({ dryRun: process.argv.includes('--dry-run') }); console.log(`Hosted local-copy retention: ${result.count} expired managed backup(s).`); }
    else if (operation === 'restore-check') await restoreCheck(process.argv[3]);
    else throw new Error('Use create, verify UUID, restore-check UUID, sync or expire [--dry-run].');
  } catch (error) {
    console.error('Hosted backup operation failed. Check certificate, CLI login, Docker and signed backup integrity. No new successful operation is claimed; sensitive diagnostics suppressed.');
    const code = typeof error.code === 'string' && /^[A-Z_0-9]+$/.test(error.code) ? error.code : 'UNCLASSIFIED';
    console.error(`Failure phase: ${backupPhase}; code: ${code}.`);
    process.exitCode = 1;
  }
}

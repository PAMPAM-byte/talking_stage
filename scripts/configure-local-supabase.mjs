import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const result = spawnSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '--output', 'json'], { encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Local Supabase is not ready. Start the local backend first.');
const status = JSON.parse(result.stdout);
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
if (!url || !key || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Expected a local Supabase development environment.');
let existing = '';
try { existing = await readFile('.env.local', 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const values = Object.fromEntries(existing.split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1).trim().replace(/^"|"$/g, '')]; }));
if (values.NEXT_PUBLIC_SUPABASE_URL && values.NEXT_PUBLIC_SUPABASE_URL !== url) throw new Error('An existing Supabase environment will not be overwritten.');
const required = {
  NEXT_PUBLIC_TALKINGSTAGE_MODE: 'supabase', NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  TALKINGSTAGE_SITE_URL: 'http://localhost:3000', AUTH_FLOW_SECRET: randomBytes(32).toString('hex'),
};
const additions = Object.entries(required).filter(([name]) => !values[name]).map(([name, value]) => `${name}=${value}`);
if (additions.length) await writeFile('.env.local', `${existing.trimEnd()}\n${additions.join('\n')}\n`, { mode: 0o600 });
console.log('Ignored .env.local configured for local Supabase; credentials were not printed.');

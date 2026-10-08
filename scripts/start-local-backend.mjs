import { spawnSync } from 'node:child_process';

// Capture CLI output privately: its startup summary includes local credentials.
const result = spawnSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'start', '--exclude', 'realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
if (result.status !== 0) throw new Error('Local Supabase startup failed. Inspect the local Docker service without printing credentials.');
await import('./configure-local-auth-limits.mjs');

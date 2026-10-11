import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// Explicitly isolate hosted values from inherited/local development values.
const hosted = parseEnv(readFileSync('.env.hosted.local', 'utf8'));
if (hosted.NEXT_PUBLIC_SUPABASE_URL !== 'https://hoxeembcwureucdsssct.supabase.co' || hosted.TALKINGSTAGE_AI_ENABLED !== 'false') throw new Error('Hosted checks require the selected project with AI disabled.');
Object.assign(process.env, hosted);
export default defineConfig({
  testDir: './tests-hosted', timeout: 420000, expect: { timeout: 30000 }, workers: 1,
  outputDir: './test-results-hosted', fullyParallel: false, reporter: 'list',
  use: { baseURL: 'http://localhost:3102', browserName: 'chromium', channel: 'msedge', headless: true, trace: 'off' },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --port 3102', url: 'http://localhost:3102',
    reuseExistingServer: false, timeout: 120000,
    env: { ...hosted, TALKINGSTAGE_AUTH_TEST: '1', TALKINGSTAGE_SITE_URL: 'http://localhost:3102' },
  },
});

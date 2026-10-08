import { defineConfig } from '@playwright/test';

process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Real-auth checks require the disposable local Supabase environment.');

export default defineConfig({
  testDir: './tests-auth', timeout: 120000, expect: { timeout: 15000 }, workers: 1,
  outputDir: './test-results-auth',
  fullyParallel: false, reporter: 'list',
  use: { baseURL: 'http://localhost:3102', browserName: 'chromium', channel: 'msedge', headless: true, trace: 'off' },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --port 3102',
    url: 'http://localhost:3102', reuseExistingServer: false, timeout: 120000,
    env: { TALKINGSTAGE_AUTH_TEST: '1', NEXT_PUBLIC_TALKINGSTAGE_MODE: 'supabase', TALKINGSTAGE_SITE_URL: 'http://localhost:3102' },
  },
});

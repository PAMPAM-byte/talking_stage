import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const hosted = parseEnv(readFileSync('.env.hosted.local', 'utf8'));
if (hosted.NEXT_PUBLIC_SUPABASE_URL !== 'https://hoxeembcwureucdsssct.supabase.co' || hosted.TALKINGSTAGE_AI_ENABLED !== 'false') throw new Error('Use the selected development backend with AI disabled.');
process.env.TALKINGSTAGE_DEV_LOGIN_TEST = '1';
export default defineConfig({
  testDir: './tests-hosted', testMatch: 'dev-test-login.spec.ts', timeout: 120000,
  expect: { timeout: 20000 }, workers: 1, reporter: 'list',
  outputDir: './test-results-hosted/dev-login',
  use: { baseURL: 'http://localhost:3106', browserName: 'chromium', channel: 'msedge', headless: true, trace: 'off' },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --port 3106', url: 'http://localhost:3106', reuseExistingServer: false, timeout: 120000,
    env: { ...hosted, TALKINGSTAGE_AUTH_TEST: '1', TALKINGSTAGE_DEV_TEST_LOGIN: '1', TALKINGSTAGE_SITE_URL: 'http://localhost:3106' },
  },
});

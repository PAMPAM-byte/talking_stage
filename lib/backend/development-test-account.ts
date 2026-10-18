import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { headers } from 'next/headers';
import { supabaseConfig } from './config';
import { developmentTestCredentials } from './development-test-login.mjs';

export async function developmentTestAccount(requireOrigin = false) {
  if (process.env.NODE_ENV !== 'development' || process.env.TALKINGSTAGE_DEV_TEST_LOGIN !== '1') return null;
  const config = supabaseConfig();
  if (!config) return null;
  const request = await headers();
  const origin = request.get('origin');
  if (requireOrigin && !origin) return null;
  return developmentTestCredentials({
    nodeEnv: process.env.NODE_ENV,
    enabled: process.env.TALKINGSTAGE_DEV_TEST_LOGIN,
    host: request.get('host'), origin,
    siteUrl: process.env.TALKINGSTAGE_SITE_URL,
  }, config.url, () => readFile(join(process.cwd(), '.local-services/hosted-cast/test-account.json'), 'utf8'));
}

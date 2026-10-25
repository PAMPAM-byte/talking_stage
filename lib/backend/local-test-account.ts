import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { supabaseConfig } from './config';

type LocalTestCredentials = { email: string; password: string };

// Created by `npm run backend:test-account`; ignored by git and absent from builds.
export async function localTestAccount(): Promise<LocalTestCredentials | undefined> {
  const config = supabaseConfig();
  if (process.env.NODE_ENV !== 'development' || process.env.TALKINGSTAGE_LOCAL_TEST_ACCOUNT !== '1' || !config
    || !['localhost', '127.0.0.1'].includes(new URL(config.url).hostname)) return undefined;
  try {
    const credentials = JSON.parse(await readFile(join(process.cwd(), 'lib/backend/local-test-account.json'), 'utf8'));
    return typeof credentials?.email === 'string' && typeof credentials?.password === 'string' ? credentials : undefined;
  } catch { return undefined; }
}

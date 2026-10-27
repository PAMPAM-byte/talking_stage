import { readFileSync } from 'node:fs';

// Reads the git-ignored file written by `npm run backend:test-account`.
export function localTestCredentials(): { email: string; password: string } {
  try {
    return JSON.parse(readFileSync(new URL('../lib/backend/local-test-account.json', import.meta.url), 'utf8'));
  } catch {
    throw new Error('lib/backend/local-test-account.json is missing. Run npm run backend:test-account first.');
  }
}

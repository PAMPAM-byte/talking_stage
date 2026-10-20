import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// All entries use injected transports or isolated PGlite databases. Do not add
// scripts that load private environments, contact providers or mutate services.
const checks = [
  ['test-bachs.mjs'],
  ['test-gift-database.mjs'],
  ['--experimental-vm-modules','test-payment-boundaries.mjs'],
  ['test-naija-exchanges.mjs'],
  ['test-women-personalities.mjs'],
  ['test-chat-expressions.mjs'],
  ['test-development-test-login.mjs'],
  ['test-discovery-feed.mjs'],
  ['test-discovery-identities.mjs'],
  ['test-reply-recovery.mjs'],
  ['--experimental-vm-modules', 'test-reply-boundaries.mjs'],
  ['--experimental-vm-modules', 'test-memory-navigation.mjs'],
  ['test-ai-provider.mjs'],
  ['test-conversation-knowledge.mjs'],
  ['test-conversation-intent.mjs'],
  ['test-cast-roster.mjs'],
  ['test-cast-evaluation.mjs'],
  ['test-anthropic-provider.mjs'],
  ['test-dependency-fetch.mjs'],
  ['test-monitoring.mjs'],
  ['test-database.mjs'],
  ['test-conversations-database.mjs'],
  ['test-clear-all-chats.mjs'],
  ['test-reply-integration.mjs'],
  ['test-photo-replies.mjs'],
  ['test-summaries.mjs'],
  ['test-request-foundations.mjs'],
  ['test-reports-database.mjs'],
  ['test-account-deletion.mjs'],
];

const root = fileURLToPath(new URL('../', import.meta.url));
for (const check of checks) {
  const script = check.at(-1);
  const args = [...check.slice(0, -1), `scripts/${script}`];
  const result = spawnSync(process.execPath, args, {
    cwd: root, stdio: 'inherit', windowsHide: true, timeout: 180000,
  });
  if (result.error || result.status !== 0) {
    console.error(`Core checks stopped at ${script}${result.error ? ` (${result.error.code})` : ''}.`);
    process.exit(result.status || 1);
  }
}
console.log(`All ${checks.length} offline core suites passed.`);

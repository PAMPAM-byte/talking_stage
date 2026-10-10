import assert from 'node:assert/strict';
import { emit, observe, observeAI, failureOutcome } from '../lib/monitoring/events.mjs';

const original = console.info;
const lines = [];
const canary = 'PRIVATE_PASSWORD_EMAIL_MESSAGE_MEMORY_TOKEN';
console.info = value => lines.push(value);
try {
  const response = { data: { email: canary, password: canary, message: canary }, error: null };
  assert.equal(await observe('auth.sign-in', async () => response), response);
  const failure = { error: { message: canary, details: canary, code: 'invalid_credentials', status: 400 } };
  assert.equal(await observe('auth.sign-in', async () => failure), failure);
  await observe('report.review', async () => ({ data: { error: 'conflict' } }));
  const thrown = new Error(canary);
  await assert.rejects(observe('account.delete', async () => { throw thrown; }), error => error === thrown);
  emit(canary, canary, Infinity, canary);
  assert.equal(await observeAI('ai.reply', async () => 'blocked_provider'), 'blocked_provider');
  assert.equal(await observeAI('ai.reply', async () => 'failed'), 'failed');
  const events = lines.map(line => JSON.parse(line));
  assert.deepEqual(events.map(event => event.outcome), ['ok', 'rejected', 'rejected', 'unexpected', 'unexpected', 'disabled', 'unavailable']);
  assert(!lines.join('\n').includes(canary));
  for (const event of events) assert.deepEqual(Object.keys(event).sort(), ['durationMs', 'event', 'operation', 'outcome', 'time', 'version']);
  assert.equal(failureOutcome({ status: 429, message: canary }), 'rate_limited');
  assert.equal(failureOutcome({ status: 503, message: canary }), 'unavailable');
  console.info = () => { throw new Error(canary); };
  assert.equal(await observe('account.delete', async () => response), response, 'Logging failures must not change committed operation results');
} finally { console.info = original; }
console.log('Monitoring checks passed: sensitive canaries excluded, fixed schema/labels, timing, rejected versus unavailable outcomes, unchanged return/throw semantics and sink-failure isolation.');

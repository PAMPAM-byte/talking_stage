import assert from 'node:assert/strict';
import { initialReplyWatch, pollReply } from '../lib/chat/reply-polling.mjs';

const statuses = [
  { messageId: 'old', state: 'blocked_provider', attempts: 0 },
  { messageId: 'failed', state: 'failed', attempts: 1 },
  { messageId: 'new', state: 'blocked_provider', attempts: 0 },
];
assert.deepEqual(initialReplyWatch(statuses, ['old', 'failed', 'new'], true), ['new']);
assert.deepEqual(initialReplyWatch(statuses, ['old', 'new', 'failed'], true), []);
assert.deepEqual(initialReplyWatch(statuses, ['old', 'new'], false), []);
assert.deepEqual(initialReplyWatch([{ messageId: 'running', state: 'generating', attempts: 1 }], ['running'], true), ['running']);
assert.deepEqual(initialReplyWatch([{ messageId: 'attempted', state: 'blocked_provider', attempts: 1 }], ['attempted'], true), []);

const signal = new AbortController().signal;
const json = value => Response.json(value);
let recoveries = 0;
let posts = 0;
const fetcher = async (_url, init) => {
  if (init.method === 'POST') { posts++; return json({ state: 'completed' }); }
  assert.equal(init.cache, 'no-store');
  return json({ state: 'blocked_provider', attempts: 0 });
};
const options = { signal, fetcher, recover: () => ++recoveries === 1 };
assert.equal((await pollReply('/synthetic', options)).state, 'completed');
assert.equal((await pollReply('/synthetic', options)).state, 'blocked_provider');
assert.equal(posts, 1, 'Repeated polling must not repeatedly start a job');

for (const status of [{ state: 'failed', attempts: 1 }, { state: 'blocked_provider', attempts: 1 }, { state: 'blocked_provider' }, { state: 'generating', attempts: 1 }]) {
  let calls = 0;
  const result = await pollReply('/synthetic', { signal, recover: () => { throw new Error('Automatic retry forbidden'); }, fetcher: async () => { calls++; return json(status); } });
  assert.equal(result.state, status.state); assert.equal(calls, 1);
}
for (const status of [401, 403, 404]) {
  assert.equal((await pollReply('/synthetic', { signal, recover: () => true, fetcher: async () => new Response(null, { status }) })).state, 'inaccessible');
}
await assert.rejects(pollReply('/synthetic', { signal, recover: () => true, fetcher: async () => new Response(null, { status: 503 }) }), /status_unavailable/);
await assert.rejects(pollReply('/synthetic', { signal, recover: () => true, fetcher: async () => json({ state: null }) }), /status_unavailable/);
const aborted = new AbortController(); aborted.abort();
await assert.rejects(pollReply('/synthetic', { signal: aborted.signal, recover: () => true, fetcher: async (_url, init) => { init.signal.throwIfAborted(); } }), { name: 'AbortError' });
console.log('Reply recovery passed: latest-only recovery, no automatic failed/attempted retries, one recovery attempt, uncached metadata, access loss, malformed responses and cancellation. No network calls.');

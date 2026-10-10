import assert from 'node:assert/strict';
import { dependencyFetch } from '../lib/backend/dependency-fetch.mjs';

const originalFetch = globalThis.fetch, originalTimeout = AbortSignal.timeout;
try {
  const reply = new Response('synthetic response');
  const caller = new AbortController();
  let deadline;
  AbortSignal.timeout = milliseconds => { assert.equal(milliseconds, 8000); deadline = new AbortController(); return deadline.signal; };
  globalThis.fetch = async (input, init) => {
    assert.equal(input, 'https://synthetic.invalid');
    assert.equal(init.method, 'POST'); assert.equal(init.body, 'synthetic payload');
    assert.equal(init.headers['x-test'], 'synthetic header');
    assert.notEqual(init.signal, caller.signal);
    caller.abort(); assert(init.signal.aborted, 'Caller cancellation must survive timeout composition');
    return reply;
  };
  assert.equal(await dependencyFetch('https://synthetic.invalid', { method: 'POST', headers: { 'x-test': 'synthetic header' }, body: 'synthetic payload', signal: caller.signal }), reply);
  globalThis.fetch = async (_input, init) => { deadline.abort(); assert(init.signal.aborted, 'Deadline must abort dependency requests'); return reply; };
  assert.equal(await dependencyFetch('https://synthetic.invalid'), reply);
  const requestCancellation = new AbortController(); requestCancellation.abort();
  const request = new Request('https://synthetic.invalid', { signal: requestCancellation.signal });
  globalThis.fetch = async (_input, init) => { assert(init.signal.aborted, 'Request object cancellation must survive composition'); return reply; };
  await dependencyFetch(request);
  console.log('Dependency fetch checks passed: eight-second deadline, unchanged payload/headers/response and preserved caller/Request cancellation. No network calls made.');
} finally { globalThis.fetch = originalFetch; AbortSignal.timeout = originalTimeout; }

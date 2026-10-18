import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import ts from 'typescript';
import { createHash } from 'node:crypto';

// Execute the actual server entry points with framework/Auth/provider boundaries
// injected. Database authorization/leases/budgets have separate PGlite tests.
const conversationId = '00000000-0000-4000-8000-000000000001';
const messageId = '00000000-0000-4000-8000-000000000002';
let state;
function reset() {
  state = { signedIn: true, adult: true, owned: true, firstParty: true,
    scheduleThrows: false, refreshThrows: false, saveFails: false,
    rpcCalls: 0, replyCalls: 0, scheduled: [], replyState: 'completed', rpcFailure: false };
}
function account() {
  if (!state.signedIn) return null;
  const query = { select() { return this; }, eq() { return this; }, async single() { return { error: state.owned ? null : { message: 'not_found' } }; } };
  return {
    user: { id: 'synthetic-actor' }, profile: { onboarding_complete: true, adult_declared_at: state.adult ? 'accepted' : null },
    client: { from: () => query, rpc: async (name) => {
      state.rpcCalls++;
      if (state.rpcFailure) return { error: { message: 'connection_unavailable' } };
      if (!state.owned) return { error: { message: 'not_found' } };
      if (state.saveFails) return { error: { message: 'thread_changed' } };
      if (name === 'conversation_thread') return { data: { conversation: { generation: 1, version: 1, status: 'active' }, capabilities: { chat: true }, messages: [{ id: messageId, sequence: 1, text: 'MUST-NOT-LEAK' }] } };
      if (name === 'reply_status') return { data: [{ messageId, state: 'blocked_provider', attempts: 0, privateContext: 'MUST-NOT-LEAK' }] };
      return { data: { id: messageId }, error: null };
    } },
  };
}
const dependencies = {
  'node:crypto': { createHash },
  'next/cache': { revalidatePath() { if (state.refreshThrows) throw new Error('synthetic cache failure'); } },
  'next/server': { after(work) { if (state.scheduleThrows) throw new Error('synthetic scheduling failure'); state.scheduled.push(work); } },
  './server': { currentAccount: async () => account() },
  '@/lib/backend/server': { currentAccount: async () => account() },
  './reply-worker': { processReply: async () => { state.replyCalls++; return state.replyState; }, processSummary: async () => 'disabled' },
  '@/lib/monitoring/events.mjs': { emit() {}, observe: async (_operation, work) => work() },
  '@/lib/backend/request-origin.mjs': { isFirstPartyOrigin: () => state.firstParty },
};
dependencies['@/lib/backend/reply-worker'] = dependencies['./reply-worker'];
async function load(path) {
  const context = createContext({ Response });
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const sourceModule = new SourceTextModule(source, { context });
  await sourceModule.link(specifier => {
    const values = dependencies[specifier];
    if (!values) throw new Error('Unexpected dependency: ' + specifier);
    return new SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    }, { context });
  });
  await sourceModule.evaluate();
  return sourceModule.namespace;
}
reset();
const { conversationAction } = await load('lib/backend/conversation-actions.ts');
const route = await load('app/api/conversations/[conversationId]/replies/[messageId]/route.ts');
dependencies['@/lib/backend/conversation-revision'] = await load('lib/backend/conversation-revision.ts');
const syncRoute = await load('app/api/conversations/[conversationId]/sync/route.ts');
const { conversationRevision } = dependencies['@/lib/backend/conversation-revision'];
const revisionThread = { conversation: { generation: 1, version: 1, status: 'active' }, capabilities: { chat: true }, messages: [{ id: messageId, sequence: 1, text: 'original' }] };
const firstRevision = conversationRevision(revisionThread, []);
assert.equal(conversationRevision({ ...revisionThread, messages: [{ id: messageId, sequence: 1, text: 'private text excluded' }] }, []), firstRevision);
assert.notEqual(conversationRevision({ ...revisionThread, messages: [] }, []), firstRevision);
assert.notEqual(conversationRevision({ ...revisionThread, conversation: { ...revisionThread.conversation, generation: 2 } }, []), firstRevision);
assert.notEqual(conversationRevision(revisionThread, [{ messageId, state: 'generating', attempts: 1 }]), firstRevision);
const form = operation => {
  const data = new FormData(); data.set('id', conversationId); data.set('operation', operation);
  data.set('messageId', messageId); data.set('clientId', messageId); data.set('generation', '1'); data.set('text', 'Synthetic input');
  return data;
};
for (const failure of ['scheduleThrows', 'refreshThrows']) {
  reset(); state[failure] = true;
  const result = await conversationAction(form('send'));
  assert.equal(result.error, undefined); assert.equal(result.messageId, messageId); assert.equal(result.message, 'Message saved.');
}
reset(); state.saveFails = true;
assert.match((await conversationAction(form('send'))).error, /conversation changed/);
assert.equal(state.scheduled.length, 0);
reset(); state.signedIn = false;
assert((await conversationAction(form('send'))).error); assert.equal(state.rpcCalls, 0);
reset(); state.adult = false;
assert((await conversationAction(form('send'))).error); assert.equal(state.rpcCalls, 0);
reset(); state.owned = false;
assert((await conversationAction(form('skip'))).error); assert.equal(state.rpcCalls, 0);

const params = () => ({ params: Promise.resolve({ conversationId, messageId }) });
const request = () => new Request('http://localhost/synthetic', { method: 'POST', headers: { origin: 'http://localhost' } });
reset();
const metadata = await route.GET(request(), params());
assert.equal(metadata.headers.get('cache-control'), 'private, no-store');
assert.deepEqual(await metadata.json(), { state: 'blocked_provider', attempts: 0 });
assert.equal(state.replyCalls, 0, 'GET must never generate a reply');
reset();
const synced = await syncRoute.GET(request(), params());
assert.equal(synced.status, 200);
assert.equal(synced.headers.get('cache-control'), 'private, no-store');
assert.match((await synced.json()).revision, /^[a-f0-9]{64}$/);
assert.equal(state.replyCalls, 0, 'Sync must never generate a reply');
for (const [flag, expected] of [['signedIn', 401], ['adult', 403], ['owned', 404], ['rpcFailure', 503]]) {
  reset(); state[flag] = flag === 'rpcFailure';
  assert.equal((await syncRoute.GET(request(), params())).status, expected);
  assert.equal(state.replyCalls, 0);
}
reset(); state.rpcFailure = true;
assert.equal((await route.GET(request(), params())).status, 503, 'Transport failures must remain retryable');
for (const [flag, expected] of [['firstParty', 403], ['signedIn', 401], ['adult', 403], ['owned', 404]]) {
  reset(); state[flag] = false;
  assert.equal((await route.POST(request(), params())).status, expected); assert.equal(state.replyCalls, 0);
}
for (const failure of ['scheduleThrows', 'refreshThrows']) {
  reset(); state[failure] = true;
  const response = await route.POST(request(), params());
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { state: 'completed' }); assert.equal(state.replyCalls, 1);
}
reset(); state.replyState = 'failed';
assert.deepEqual(await (await route.POST(request(), params())).json(), { state: 'failed' });
assert.equal(state.scheduled.length, 0);
console.log('Reply entry points passed: committed delivery survives cache/scheduler failures, GET is private/read-only, actor/adult/ownership/Origin denials prevent generation, and provider failures remain separate from delivery. No network calls.');

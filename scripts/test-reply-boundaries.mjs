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
    scheduleThrows: false, refreshThrows: false, saveFails: false, accountUnavailable: false,
    rpcCalls: 0, replyCalls: 0, refreshCalls: 0, scheduled: [], replyState: 'completed', rpcFailure: false };
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
  'next/cache': { revalidatePath() { state.refreshCalls++; if (state.refreshThrows) throw new Error('synthetic cache failure'); } },
  'next/server': { after(work) { if (state.scheduleThrows) throw new Error('synthetic scheduling failure'); state.scheduled.push(work); } },
  './server': { currentAccount: async options => {if(state.accountUnavailable){assert.equal(options?.failOnUnavailable,true);throw Error('Synthetic private account failure');}return account();} },
  '@/lib/backend/server': { currentAccount: async () => account() },
  './reply-worker': { processReply: async (...args) => { state.replyCalls++; state.replyArgs = args; return state.replyState; }, processSummary: async () => 'disabled' },
  '@/lib/monitoring/events.mjs': { emit() {}, observe: async (_operation, work) => work() },
  '@/lib/backend/request-origin.mjs': { isFirstPartyOrigin: () => state.firstParty },
};
dependencies['@/lib/backend/reply-worker'] = dependencies['./reply-worker'];
async function load(path) {
  const context = createContext({ Response, FormData, TextDecoder, process: { env: { NODE_ENV: 'test' } } });
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
const { conversationAction, clearAllChatsAction } = await load('lib/backend/conversation-actions.ts');
dependencies['@/lib/backend/conversation-actions']={conversationAction};
const sendRoute=await load('app/api/conversations/[conversationId]/messages/route.ts');
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
reset();
await conversationAction(form('send'));
assert.equal(state.refreshCalls,0,'Saving must not force a full chat render before the reply starts');
assert.equal(state.scheduled.length,1);
await state.scheduled[0]();
assert.equal(state.replyCalls,1);assert.equal(state.refreshCalls,1,'Refresh after reply processing, before optional summary work');
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
reset();state.accountUnavailable=true;
assert.equal((await conversationAction(form('send'))).code,'unavailable');assert.equal(state.rpcCalls,0);
const sendRequest=body=>new Request('https://synthetic.invalid/api/conversations/'+conversationId+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)});
const sendBody={clientId:messageId,generation:1,text:'Synthetic send',replyTo:null,timeZone:'Africa/Lagos'};
const sendParams={params:Promise.resolve({conversationId})};
let apiResult=await sendRoute.POST(sendRequest(sendBody),sendParams);assert.equal(apiResult.status,503);assert.equal((await apiResult.json()).code,'unavailable');
reset();state.signedIn=false;assert.equal((await sendRoute.POST(sendRequest(sendBody),sendParams)).status,401);assert.equal(state.rpcCalls,0);
reset();state.adult=false;assert.equal((await sendRoute.POST(sendRequest(sendBody),sendParams)).status,403);assert.equal(state.rpcCalls,0);
reset();state.firstParty=false;assert.equal((await sendRoute.POST(sendRequest(sendBody),sendParams)).status,403);assert.equal(state.rpcCalls,0);
for(const invalid of ['{',JSON.stringify({...sendBody,replyTo:['not-a-quote']}),JSON.stringify({...sendBody,generation:0}),JSON.stringify({...sendBody,text:'x'.repeat(17000)})]){reset();const response=await sendRoute.POST(sendRequest(invalid),sendParams);assert([400,413].includes(response.status));assert.equal(state.rpcCalls,0);}
reset();apiResult=await sendRoute.POST(sendRequest(sendBody),sendParams);assert.equal(apiResult.status,200);assert.equal((await apiResult.json()).messageId,messageId);assert.equal(state.scheduled.length,1);
assert.equal(apiResult.headers.get('Cache-Control'),'private, no-store');
reset(); state.adult = false;
assert((await conversationAction(form('send'))).error); assert.equal(state.rpcCalls, 0);
const clearForm = new FormData(); clearForm.set('confirmation', 'clear-all-chats');
reset(); assert((await clearAllChatsAction(new FormData())).error); assert.equal(state.rpcCalls, 0);
for (const denied of ['signedIn', 'adult']) { reset(); state[denied] = false; assert((await clearAllChatsAction(clearForm)).error); assert.equal(state.rpcCalls, 0); }
reset(); state.refreshThrows = true;
assert.equal((await clearAllChatsAction(clearForm)).message, 'All chats cleared.', 'Cache failure must not misreport committed clearing.');
reset(); state.rpcFailure = true;
assert((await clearAllChatsAction(clearForm)).error);
reset(); state.owned = false;
assert((await conversationAction(form('skip'))).error); assert.equal(state.rpcCalls, 0);

const params = () => ({ params: Promise.resolve({ conversationId, messageId }) });
const request = () => new Request('http://localhost/synthetic', { method: 'POST', headers: { origin: 'http://localhost' } });
reset();
const localSend = form('send'); localSend.set('timeZone', 'Africa/Lagos');
await conversationAction(localSend);
await state.scheduled[0]();
assert.equal(state.replyArgs[3], 'Africa/Lagos', 'Background generation must receive the sender timezone.');
reset();
const zonedRequest = new Request('http://localhost/synthetic', { method: 'POST', headers: {origin:'http://localhost','X-TalkingStage-Timezone':'America/Toronto'} });
assert.equal((await route.POST(zonedRequest, params())).status, 200);
assert.equal(state.replyArgs[3], 'America/Toronto', 'Retry/recovery must forward the current browser timezone.');
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

// Exercise the real account reader: transient Auth/profile errors must not
// masquerade as sign-out on private photo/API reads.
let identityResult = { data: { user: { id: 'synthetic-actor' } }, error: null };
let profileResult = { data: { id: 'synthetic-actor' }, error: null, status: 200 };
const accountClient = {
  auth: { getUser: async () => identityResult },
  from: () => ({ select() { return this; }, eq() { return this; }, single: async () => profileResult }),
};
dependencies['server-only'] = {};
// Outside a Server Component render, React.cache deliberately does not memoize.
dependencies['react'] = { cache: reader => reader };
dependencies['@supabase/ssr'] = { createServerClient: () => accountClient };
dependencies['next/headers'] = { cookies: async () => ({ getAll: () => [], set() {} }) };
dependencies['next/server'].connection = async () => {};
dependencies['./config'] = { supabaseConfig: () => ({ url: 'https://synthetic.invalid', key: 'synthetic-public-key' }) };
dependencies['./dependency-fetch.mjs'] = { dependencyFetch() { throw new Error('Network forbidden'); } };
const realAccount = (await load('lib/backend/server.ts')).currentAccount;
assert.equal((await realAccount({ failOnUnavailable: true })).user.id, 'synthetic-actor');
for (const status of [0, 429, 503]) {
  identityResult = { data: { user: null }, error: { status } };
  await assert.rejects(realAccount({ failOnUnavailable: true }), /Identity service unavailable/);
  assert.equal(await realAccount(), null, 'Legacy callers retain their current behavior');
}
for (const status of [400, 401, 403]) {
  identityResult = { data: { user: null }, error: { status } };
  assert.equal(await realAccount({ failOnUnavailable: true }), null);
}
identityResult = { data: { user: { id: 'synthetic-actor' } }, error: null };
for (const status of [0, 429, 503]) {
  profileResult = { data: null, error: { message: 'synthetic outage' }, status };
  await assert.rejects(realAccount({ failOnUnavailable: true }), /Account service unavailable/);
}
profileResult = { data: null, error: { message: 'missing profile' }, status: 404 };
assert.equal(await realAccount({ failOnUnavailable: true }), null);
console.log('Private API identity checks passed: valid sessions, signed-out denial and retryable Auth/profile transport/rate-limit failures. No network calls.');

const memoryAction = (await load('lib/backend/memory-actions.ts')).memoryAction;
for (const [operation, message] of [['save','Memory saved.'],['delete','Memory deleted.'],['enable','Memory is on.'],['disable','Memory is off.']]) {
  reset();
  const form = new FormData(); form.set('character', conversationId); form.set('operation', operation); form.set('consent','on');
  assert.deepEqual(JSON.parse(JSON.stringify(await memoryAction(form))), {message});
}
reset(); state.refreshThrows = true;
const memoryForm = new FormData(); memoryForm.set('character',conversationId); memoryForm.set('operation','save'); memoryForm.set('consent','on');
assert.equal((await memoryAction(memoryForm)).message,'Memory saved.','Cache failure must not misreport a committed memory save');
reset(); state.signedIn = false;
assert((await memoryAction(memoryForm)).error);
assert.equal(state.rpcCalls,0,'Signed-out callers cannot save memories');
reset();state.accountUnavailable=true;
assert.match((await memoryAction(memoryForm)).error,/services are unavailable/);assert.equal(state.rpcCalls,0);
console.log('Memory feedback checks passed: operation-specific results, committed-save acknowledgement despite cache failure and signed-out denial. No network calls.');

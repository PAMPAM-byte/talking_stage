import type { Message, ReplyJob, Result } from '../contracts';
import samples from './chat-samples.json';
import { getAccount } from './account';
import { characters, listSavedConversations, readConversation, removeMockConversation, resetMockConversations, updateMockConversation } from './discovery';

export type ChatScenario = 'ready' | 'offline' | 'delivery_failed' | 'reply_failed' | 'interrupted' | 'rate_limit' | 'usage_limit' | 'chat_paused' | 'photos_paused';
export type Thread = { messages: Message[]; jobs: ReplyJob[] };
export const sampleMessages = ['That sounds like a good day. Tell me more.', 'What have you been enjoying lately?', 'Show me a character photo.'];
const key = 'talkingstage:mock-chat:v1';
const threads = new Map<string, Thread>();
let hydrated = false; let version = 0;
const listeners = new Set<() => void>();
export const subscribeChat = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const chatVersion = () => version;
export const serverChatVersion = () => 0;
const delay = (ms = 350) => new Promise(resolve => setTimeout(resolve, ms));
const ok = <T>(data: T): Result<T> => ({ data: structuredClone(data), requestId: 'chat-preview' });
const fail = <T>(code: import('../contracts').ErrorCode, message: string): Result<T> => ({ error: { code, message, retryable: !['VALIDATION', 'FORBIDDEN', 'NOT_FOUND'].includes(code) }, requestId: 'chat-preview' });
function owned(id: string) { return readConversation(id); }
function persist() {
  const rows = [...threads.entries()].filter(([id]) => owned(id)).map(([id, thread]) => [id, { ...thread, messages: thread.messages.map(m => ({ ...m, text: m.role === 'user' && !sampleMessages.includes(m.text ?? '') ? 'Preview message (text not stored).' : m.text })) }]);
  try { sessionStorage.setItem(key, JSON.stringify({ version: 1, rows })); } catch { /* Disposable storage can be disabled. */ }
  version++; listeners.forEach(listener => listener());
}
function hydrate() {
  if (hydrated) return; hydrated = true;
  try {
    const state = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (state?.version === 1 && Array.isArray(state.rows)) for (const [id, thread] of state.rows) {
      const conversation = owned(id); if (!conversation || !Array.isArray(thread.messages) || !Array.isArray(thread.jobs)) continue;
      const messages = thread.messages.filter((m: Message) => m.conversationId === id && Number.isSafeInteger(m.sequence) && typeof m.id === 'string' && ['user', 'character', 'system'].includes(m.role) && ['text', 'photo', 'status'].includes(m.kind) && (m.assetId === null || m.assetId === `${conversation.characterId}-gallery`) && (m.text === null || typeof m.text === 'string')).map((m: Message) => ({ ...m, deliveryState: m.deliveryState === 'sending' ? 'failed' as const : m.deliveryState }));
      const jobs = thread.jobs.filter((j: ReplyJob) => j.conversationId === id && messages.some((m: Message) => m.id === j.userMessageId)).map((j: ReplyJob) => ({ ...j, state: ['waiting', 'generating'].includes(j.state) ? 'interrupted' as const : j.state }));
      threads.set(id, { messages, jobs });
    }
  } catch { /* Invalid fixture storage resets safely. */ }
}
export function readThread(id: string): Thread | null { if (!owned(id)) return null; const t = threads.get(id); return t ? structuredClone(t) : null; }
function append(id: string, input: Partial<Message> & Pick<Message, 'role' | 'kind' | 'text'>): Message {
  const t = threads.get(id)!; const sequence = Math.max(0, ...t.messages.map(m => m.sequence)) + 1;
  const m: Message = { id: `${id}-m-${sequence}`, conversationId: id, sequence, assetId: null, paymentIntentId: null, deliveryState: 'saved', clientMessageId: null, createdAt: new Date().toISOString(), ...input }; t.messages.push(m); return m;
}
export async function loadThread(id: string): Promise<Result<Thread>> {
  await delay(); const c = owned(id); if (!c) return fail('NOT_FOUND', 'This conversation is unavailable.');
  hydrate(); if (!threads.has(id)) { threads.set(id, { messages: [], jobs: [] }); const sample = samples[c.characterId as keyof typeof samples]; append(id, { role: 'character', kind: 'text', text: sample.introduction }); persist(); }
  markRead(id); return ok(threads.get(id)!);
}
export async function loadConversationList(scenario: 'ready' | 'offline' | 'error' = 'ready') {
  await delay(); const account = getAccount();
  if (!account.user) return fail<ReturnType<typeof listSavedConversations>>('UNAUTHENTICATED', 'Sign in to see messages.');
  if (account.age !== 'adult' || !account.consent || account.user.adultAccessState !== 'approved' || account.user.onboardingStep !== 'complete') return fail<ReturnType<typeof listSavedConversations>>('ADULT_ACCESS_BLOCKED', 'Complete adult onboarding to see messages.');
  if (scenario !== 'ready') return fail<ReturnType<typeof listSavedConversations>>('OFFLINE', scenario === 'offline' ? 'You’re offline. Reconnect and try again.' : 'Messages couldn’t be loaded. Try again.');
  hydrate(); return ok(listSavedConversations());
}
export function markRead(id: string) { const c = owned(id); if (c?.unreadCount) { updateMockConversation(id, { unreadCount: 0 }); persist(); } }
function restriction(scenario: ChatScenario): Result<never> | null {
  if (scenario === 'chat_paused') return fail('CAPABILITY_PAUSED', 'Conversation is paused. Your history is still available.');
  if (scenario === 'rate_limit') return fail('RATE_LIMITED', 'Please wait a moment before sending again. Your draft is kept.');
  if (scenario === 'usage_limit') return fail('USAGE_LIMIT', 'The preview’s conversation allowance is reached. Your history and draft are kept.');
  return null;
}
export async function sendMessage(id: string, clientMessageId: string, text: string, scenario: ChatScenario): Promise<Result<Message>> {
  const c = owned(id); if (!c || !threads.has(id)) return fail('NOT_FOUND', 'Open a conversation first.');
  if (c.status === 'archived') return fail('CAPABILITY_PAUSED', 'Restore this conversation before sending.');
  const blocked = restriction(scenario); if (blocked) return blocked;
  if (!text.trim() || text.length > 2000) return fail('VALIDATION', 'Write between 1 and 2,000 characters.');
  const t = threads.get(id)!;
  let m = t.messages.find(m => m.clientMessageId === clientMessageId);
  if (m?.deliveryState === 'saved') return ok(m);
  if (!m) m = append(id, { role: 'user', kind: 'text', text: text.trim(), clientMessageId, deliveryState: 'sending' }); else m.deliveryState = 'sending';
  persist(); await delay();
  if (!owned(id) || threads.get(id) !== t) return fail('NOT_FOUND', 'This conversation is unavailable.');
  if (scenario === 'offline' || scenario === 'delivery_failed') { m.deliveryState = 'failed'; persist(); return fail('OFFLINE', 'Message wasn’t saved. Retry delivery when you’re ready.'); }
  m.deliveryState = 'saved'; updateMockConversation(id, { lastMessagePreview: 'Preview message', lastMessageAt: m.createdAt });
  if (!t.jobs.some(j => j.userMessageId === m.id)) { const now = new Date().toISOString(); t.jobs.push({ id: `${m.id}-reply`, conversationId: id, userMessageId: m.id, state: 'waiting', errorCode: null, createdAt: now, updatedAt: now }); }
  persist(); return ok(m);
}
export async function prepareReply(id: string, messageId: string, scenario: ChatScenario): Promise<Result<Message>> {
  const c = owned(id); const t = threads.get(id); if (!c || !t) return fail('NOT_FOUND', 'Conversation unavailable.');
  const job = t.jobs.find(j => j.userMessageId === messageId); const user = t.messages.find(m => m.id === messageId);
  if (!job || !user || user.deliveryState !== 'saved') return fail('VALIDATION', 'Save the message before requesting a reply.');
  const existing = t.messages.find(m => m.id === `${job.id}-message`); if (existing) return ok(existing);
  if (job.state === 'generating') return fail('CONFLICT', 'A reply is already being prepared.');
  const blocked = restriction(scenario); if (blocked) return blocked;
  job.state = 'generating'; job.errorCode = null; persist(); await delay(850);
  if (!owned(id) || threads.get(id) !== t) return fail('NOT_FOUND', 'Conversation unavailable.');
  if (scenario === 'reply_failed' || scenario === 'interrupted' || scenario === 'offline') { job.state = scenario === 'interrupted' ? 'interrupted' : 'failed'; job.errorCode = 'UNAVAILABLE'; persist(); return fail('UNAVAILABLE', 'Your message is saved. Retry the reply without sending it again.'); }
  const sample = samples[c.characterId as keyof typeof samples]; const wantsPhoto = /photo/i.test(user.text ?? '');
  const photoAllowed = scenario !== 'photos_paused';
  const reply = append(id, { id: `${job.id}-message`, role: 'character', kind: wantsPhoto && photoAllowed ? 'photo' : 'text', assetId: wantsPhoto && photoAllowed ? `${c.characterId}-gallery` : null, text: wantsPhoto ? photoAllowed ? sample.photoCaption : 'Character photos are paused for now. We can keep talking.' : sample.replies[(t.jobs.indexOf(job)) % sample.replies.length] });
  job.state = 'completed'; job.updatedAt = new Date().toISOString(); updateMockConversation(id, { lastMessagePreview: reply.kind === 'photo' ? 'AI-generated character photo' : reply.text, lastMessageAt: reply.createdAt, unreadCount: c.unreadCount + 1 }); persist(); return ok(reply);
}
export async function archiveConversation(id: string, archived: boolean) { await delay(); if (!owned(id)) return fail('NOT_FOUND', 'Conversation unavailable.'); updateMockConversation(id, { status: archived ? 'archived' : 'active' }); persist(); return ok(true); }
export async function deleteConversation(id: string) { await delay(); if (!owned(id)) return fail('NOT_FOUND', 'Conversation unavailable.'); threads.delete(id); removeMockConversation(id); persist(); return ok(true); }
export function resetChatPreview() { threads.clear(); resetMockConversations(); persist(); }
export function ownedPhoto(id: string, assetId: string) { const c = owned(id); return c && assetId === `${c.characterId}-gallery` ? characters.find(p => p.id === c.characterId) : undefined; }
export async function resetConversation(id: string) {
  if (!owned(id)) return fail('NOT_FOUND', 'Conversation unavailable.');
  threads.delete(id); updateMockConversation(id, { lastMessagePreview: null, lastMessageAt: null, unreadCount: 0, status: 'active', relationshipState: 'introductory' });
  persist(); return loadThread(id);
}
export function appendMockStatus(id: string, text: string) { if (owned(id) && threads.has(id)) { append(id, { role: 'character', kind: 'status', text }); persist(); } }

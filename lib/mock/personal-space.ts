import type { Memory, PaymentIntent, PaymentStatus, Report, Result, Preferences } from '../contracts';
import { getAccount, patchMockUser, signOut } from './account';
import { characters, readConversation } from './discovery';
import { appendMockStatus, deleteConversation, readThread, resetChatPreview, resetConversation } from './chat';
import { hasMockAdminAccess } from './admin-access';
import { capabilities, previewOperations } from './operator-public';
export type SpaceScenario = 'ready' | 'offline' | 'error';
type Proposal = { id: string; conversationId: string; state: 'offered' | 'declined' | 'accepted' };
type Store = { version: 1; memories: Memory[]; enabled: Record<string, boolean>; payments: PaymentIntent[]; proposals: Proposal[]; reports: Report[] };
const initial = (): Store => ({ version: 1, memories: [], enabled: {}, payments: [], proposals: [], reports: [] });
let state = initial(); let hydrated = false; let revision = 0;
const key = 'talkingstage:mock-personal-space:v1'; const listeners = new Set<() => void>();
const confirmations = new Map<string, { actorId: string; conversationId: string; amountMinor: number; operationKey: string }>();
export const subscribeSpace = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const spaceVersion = () => revision; export const serverSpaceVersion = () => 0;
function actor() { const a = getAccount(); return a.age === 'adult' && a.consent && a.user?.adultAccessState === 'approved' && a.user.onboardingStep === 'complete' ? a.user.id : null; }
const ok = <T>(data: T): Result<T> => ({ data: structuredClone(data), requestId: 'personal-space-preview' });
const fail = <T>(message: string, code: import('../contracts').ErrorCode = 'VALIDATION'): Result<T> => ({ error: { code, message, retryable: ['OFFLINE', 'UNAVAILABLE'].includes(code) }, requestId: 'personal-space-preview' });
function changed() {
  try { sessionStorage.setItem(key, JSON.stringify({ ...state, reports: state.reports.map(r => ({ ...r, details: r.details ? 'Preview details (text not stored).' : null, resolution: r.resolution ? 'Preview resolution (text not stored).' : null })) })); } catch { /* Disposable fixtures remain usable in memory. */ }
  revision++; listeners.forEach(f => f());
}
export async function loadSpace(scenario: SpaceScenario = 'ready') {
  return run(scenario, () => { if (!hydrated) { hydrated = true; try { const s = JSON.parse(sessionStorage.getItem(key) ?? 'null'); if (s?.version === 1 && Array.isArray(s.memories) && Array.isArray(s.payments) && Array.isArray(s.reports) && Array.isArray(s.proposals) && s.enabled && typeof s.enabled === 'object') state = s; } catch { /* Corrupt fixtures reset. */ } changed(); } return ok(true); });
}
async function run<T>(scenario: SpaceScenario, fn: () => Result<T>): Promise<Result<T>> {
  await new Promise(r => setTimeout(r, 350));
  if (!actor()) return fail('Complete adult onboarding to continue.', 'UNAUTHENTICATED');
  if (scenario !== 'ready') return fail(scenario === 'offline' ? 'You’re offline. Your changes are kept here; reconnect and try again.' : 'This couldn’t be saved. Try again.', scenario === 'offline' ? 'OFFLINE' : 'UNAVAILABLE');
  return fn();
}
export function memoryState(characterId: string) { return { enabled: actor() ? state.enabled[characterId] === true : false, items: actor() ? structuredClone(state.memories.filter(m => m.userId === actor() && m.characterId === characterId && !m.deletedAt)) : [] }; }
export function permittedMemoryContext(characterId: string) { const data = memoryState(characterId); return data.enabled ? data.items : []; }
export function saveMemoryEnabled(id: string, enabled: boolean, scenario: SpaceScenario) { return run(scenario, () => { if (!characters.some(c => c.id === id)) return fail('Character not found.', 'NOT_FOUND'); state.enabled[id] = enabled; changed(); return ok(enabled); }); }
export function saveSampleMemory(id: string, sensitive: boolean, consent: boolean, scenario: SpaceScenario) { return run(scenario, () => {
  const c = characters.find(c => c.id === id); if (!c || !state.enabled[id]) return fail('Enable memory for this character first.'); if (sensitive && !consent) return fail('Explicit consent is required for this sensitive sample.');
  const memoryId = `${id}-${sensitive ? 'sensitive' : 'interest'}-memory`; const existing = state.memories.find(m => m.id === memoryId && !m.deletedAt); if (existing) return ok(existing);
  const m: Memory = { id: memoryId, userId: actor()!, characterId: id, content: sensitive ? 'A sample health detail (fictional demonstration only).' : `Enjoys ${c.interests[0]}. (Sample fact)`, category: 'user_fact', source: { messageId: null, consent: 'explicit' }, savedAt: new Date().toISOString(), deletedAt: null };
  state.memories = state.memories.filter(old => old.id !== memoryId); state.memories.push(m); changed(); return ok(m);
}); }
export function deleteMemory(id: string, scenario: SpaceScenario) { return run(scenario, () => { const m = state.memories.find(m => m.id === id && m.userId === actor()); if (!m) return fail('Memory not found.', 'NOT_FOUND'); state.memories = state.memories.filter(m => m.id !== id); changed(); return ok(true); }); }
export function savePreferences(name: string, preferences: Preferences, scenario: SpaceScenario) { return run(scenario, () => {
  if (!name.trim() || name.trim().length > 40 || !preferences.characterGenders.length || preferences.characterGenders.some(g => !['woman', 'man'].includes(g)) || !['english', 'english_pidgin'].includes(preferences.language)) return fail('Add a name of up to 40 characters and select at least one character gender.');
  patchMockUser({ displayName: name.trim(), preferences }); return ok(true);
}); }
export function saveRequests(enabled: boolean, scenario: SpaceScenario) { return run(scenario, () => { patchMockUser({ allowMonetaryRequests: enabled }); changed(); return ok(enabled); }); }
export function proposalsFor(id: string) { return actor() && getAccount().user?.allowMonetaryRequests ? structuredClone(state.proposals.filter(p => p.conversationId === id && p.state === 'offered')) : []; }
export function loadRequestSample(id: string, familiarReviewState: boolean) {
  if (!actor() || !getAccount().user?.allowMonetaryRequests || !readConversation(id) || !capabilities(readConversation(id)!.characterId).payments || !familiarReviewState) return fail('Requests are muted or this is not an eligible familiar-conversation sample.');
  if (state.proposals.some(p => p.conversationId === id)) return fail('A request sample already exists. Declined requests are not repeated.');
  const p: Proposal = { id: `proposal-${id}`, conversationId: id, state: 'offered' }; state.proposals.push(p); changed(); return ok(p);
}
export function declineRequest(id: string) { const p = state.proposals.find(p => p.id === id && readConversation(p.conversationId)); if (!p) return fail('Request unavailable.'); p.state = 'declined'; appendMockStatus(p.conversationId, 'That’s fine. We can carry on with our conversation.'); changed(); return ok(true); }
export function confirmGift(conversationId: string, amountMinor: number, operationKey: string) {
  if (!actor() || !readConversation(conversationId) || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) return fail<string>('Choose a valid NGN amount for this conversation.');
  const c = readConversation(conversationId)!; if (!capabilities(c.characterId).payments) return fail<string>('Payments are paused. Your conversation and payment history remain available.', 'CAPABILITY_PAUSED');
  const policy = previewOperations().requestPolicy; if (policy.minimumMinor !== null && amountMinor < policy.minimumMinor || policy.maximumMinor !== null && amountMinor > policy.maximumMinor) return fail<string>('Choose an amount within the configured preview limits.');
  const id = `confirmation-${operationKey}`; confirmations.set(id, { actorId: actor()!, conversationId, amountMinor, operationKey }); return ok(id);
}
export function createGift(confirmationId: string, scenario: SpaceScenario): Promise<Result<PaymentIntent>> { return run(scenario, () => {
  const confirmation = confirmations.get(confirmationId); if (!confirmation || confirmation.actorId !== actor()) return fail('Confirm the amount and recipient again.');
  const existing = state.payments.find(p => p.id === `payment-${confirmation.operationKey}`); if (existing) return ok(existing);
  const c = readConversation(confirmation.conversationId); if (!c) return fail('This conversation is no longer available.', 'NOT_FOUND');
  if (!capabilities(c.characterId).payments) return fail('Payments are paused. No new checkout was created.', 'CAPABILITY_PAUSED');
  const now = new Date().toISOString(); const p: PaymentIntent = { id: `payment-${confirmation.operationKey}`, userId: actor()!, conversationId: c.id, characterId: c.characterId, amountMinor: confirmation.amountMinor, currency: 'NGN', reference: `SIM-${confirmation.operationKey.slice(0, 8).toUpperCase()}`, status: 'awaiting_checkout', recipientDisclosure: 'Received by TalkingStage’s operator.', checkoutUrl: null, createdAt: now, expiresAt: null, verifiedAt: null };
  state.payments.push(p); state.proposals.filter(r => r.conversationId === c.id && r.state === 'offered').forEach(r => { r.state = 'accepted'; }); changed(); return ok(p);
}); }
export function paymentHistory() { return actor() ? structuredClone(state.payments.filter(p => p.userId === actor()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))) : []; }
export function paymentById(id: string) { return paymentHistory().find(p => p.id === id); }
export function simulateCheckout(id: string, scenario: SpaceScenario) { return run(scenario, () => { const p = state.payments.find(p => p.id === id && p.userId === actor()); if (p && !capabilities(p.characterId).payments) return fail('Payments are paused. The last status remains available.', 'CAPABILITY_PAUSED'); if (!p || p.status !== 'awaiting_checkout') return fail('This checkout is unavailable. Review the payment status.'); p.status = 'pending'; changed(); return ok(p); }); }
export function reviewPaymentStatus(id: string, status: PaymentStatus) { const p = state.payments.find(p => p.id === id && p.userId === actor()); if (!p || !['awaiting_checkout', 'pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'disputed'].includes(status)) return fail('Payment unavailable.'); p.status = status; p.verifiedAt = ['paid', 'refunded', 'disputed'].includes(status) ? new Date().toISOString() : null; changed(); return ok(p); }
export function paymentsForConversation(id: string) { return paymentHistory().filter(p => p.conversationId === id); }
export function sendReport(target: Report['target'], reason: string, details: string, operationKey: string, scenario: SpaceScenario) { return run(scenario, () => {
  const valid = target.kind === 'character' ? characters.some(c => c.id === target.id) : target.kind === 'message' ? characters.some(c => readThread(`preview-${c.id}`)?.messages.some(m => m.id === target.id)) : characters.some(c => c.portraitAssetId === target.id || c.galleryAssetIds.includes(target.id));
  if (!valid || !['Safety concern', 'Inappropriate content', 'Payment pressure', 'Photo concern', 'Other'].includes(reason) || details.length > 1000) return fail('Choose a reason and a valid report target.');
  const existing = state.reports.find(r => r.id === `report-${operationKey}`); if (existing) return ok(existing);
  const r: Report = { id: `report-${operationKey}`, reporterId: actor()!, target, reason, details: details.trim() || null, state: 'open', createdAt: new Date().toISOString(), resolution: null }; state.reports.push(r); changed(); return ok(r);
}); }
export function manageConversation(id: string, action: 'delete' | 'reset', clearMemories: boolean, scenario: SpaceScenario) { return run(scenario, () => {
  const c = readConversation(id); if (!c) return fail('Conversation unavailable.', 'NOT_FOUND');
  if (clearMemories) state.memories = state.memories.filter(m => m.characterId !== c.characterId || m.userId !== actor()); changed(); return ok(c.characterId);
}).then(async r => { if (r.error) return r; const next = action === 'delete' ? await deleteConversation(id) : await resetConversation(id); return next.error ? fail<string>(next.error.message, next.error.code) : ok(r.data); }); }
export function deleteMockAccount(confirmation: string, scenario: SpaceScenario) { return run(scenario, () => {
  if (confirmation !== 'DELETE') return fail('Type DELETE to confirm.');
  state = initial(); confirmations.clear(); changed(); resetChatPreview(); signOut(true); try { sessionStorage.removeItem(key); sessionStorage.removeItem('talkingstage:mock-chat:v1'); sessionStorage.removeItem('talkingstage:mock-conversations:v1'); sessionStorage.removeItem('talkingstage:mock-onboarding:v1'); } catch { /* No real records exist. */ } return ok(true);
}); }
export function operatorSpaceSnapshot(): { reports: (Report & { context: string })[]; payments: PaymentIntent[] } {
  if (!hasMockAdminAccess()) return { reports: [], payments: [] };
  if (!hydrated) { hydrated = true; try { const s = JSON.parse(sessionStorage.getItem(key) ?? 'null'); if (s?.version === 1 && Array.isArray(s.reports) && Array.isArray(s.payments) && Array.isArray(s.memories) && Array.isArray(s.proposals) && s.enabled) state = s; } catch { /* Synthetic store only. */ } }
  const reports = state.reports.map(r => {
    let context = `Selected ${r.target.kind}: ${r.target.id}. Original text is unavailable; no unrelated history is included.`;
    if (r.target.kind === 'character') { const c = characters.find(c => c.id === r.target.id); if (c) context = `${c.name}, ${c.age} · fictional AI character. ${c.bio}`; }
    if (r.target.kind === 'photo') { const c = characters.find(c => c.portraitAssetId === r.target.id || c.galleryAssetIds.includes(r.target.id)); if (c) context = `${c.name}’s AI-generated character image, asset ${r.target.id}. Review only the associated photo.`; }
    if (r.target.kind === 'message') {
      const own = characters.flatMap(c => readThread(`preview-${c.id}`)?.messages ?? []).find(m => m.id === r.target.id); if (own) context = own.text ?? 'Selected AI-generated photo message.';
      else try { const conversations = JSON.parse(sessionStorage.getItem('talkingstage:mock-conversations:v1') ?? '[]'); const chats = JSON.parse(sessionStorage.getItem('talkingstage:mock-chat:v1') ?? 'null'); for (const [id, thread] of chats?.rows ?? []) { if (!conversations.some((c: { id: string; userId: string }) => c.id === id && c.userId === r.reporterId)) continue; const m = thread.messages.find((m: { id: string }) => m.id === r.target.id); if (m) { context = m.text ?? 'Selected AI-generated photo message.'; break; } } } catch { /* Missing context stays explicit. */ }
    }
    return { ...r, context };
  });
  return structuredClone({ reports, payments: state.payments });
}
export function operatorUpdateReport(id: string, next: Report['state'], resolution: string | null) { if (!hasMockAdminAccess()) return; const r = state.reports.find(r => r.id === id); if (r) { r.state = next; r.resolution = resolution; changed(); } }


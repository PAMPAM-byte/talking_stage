import { capabilities, hydrateOperatorPublic, isPublishedPreview, publicCast, subscribeOperatorPublic } from './operator-public';
import cast from './public-cast.json';
import type { CharacterFilters, Conversation, PublicCharacter, Result } from '../contracts';
import { getAccount } from './account';

export const characters = cast.map(c => ({ ...c })) as PublicCharacter[];
subscribeOperatorPublic(() => { characters.splice(0, characters.length, ...publicCast()); });
export type DiscoveryScenario = 'ready' | 'empty' | 'offline' | 'error' | 'deactivated' | 'paused';
const key = 'talkingstage:mock-conversations:v1';
const memory = new Map<string, Conversation>();
let conversationsHydrated = false;
function allowed() { hydrateOperatorPublic(); const a = getAccount(); return a.age === 'adult' && a.consent && a.user?.adultAccessState === 'approved' && a.user.onboardingStep === 'complete'; }
async function run<T>(scenario: DiscoveryScenario, operation: () => Result<T>): Promise<Result<T>> {
  await new Promise(resolve => setTimeout(resolve, 350));
  if (!allowed()) return fail('UNAUTHENTICATED', 'Complete adult onboarding to continue.');
  if (scenario === 'offline' || scenario === 'error') return fail(scenario === 'offline' ? 'OFFLINE' : 'UNAVAILABLE', scenario === 'offline' ? 'You’re offline. Reconnect and try again.' : 'Characters couldn’t be loaded. Try again.', true);
  return operation();
}
function ok<T>(data: T): Result<T> { return { data: structuredClone(data), requestId: 'discovery-preview' }; }
function fail<T>(code: import('../contracts').ErrorCode, message: string, retryable = false): Result<T> { return { error: { code, message, retryable }, requestId: 'discovery-preview' }; }
export function listCharacters(filters: CharacterFilters, scenario: DiscoveryScenario = 'ready') { return run(scenario, () => ok(scenario === 'empty' ? [] : characters.filter(c => isPublishedPreview(c.id) && (!filters.gender || c.gender === filters.gender) && (!filters.personality || c.personalityTags.includes(filters.personality)) && (!filters.interest || c.interests.includes(filters.interest))))); }
export function getCharacter(id: string, scenario: DiscoveryScenario = 'ready') { return run(scenario, () => { const c = characters.find(c => c.id === id); return !c || !isPublishedPreview(id) || id === 'char-draft' ? fail<PublicCharacter>('NOT_FOUND', 'This profile doesn’t exist.') : scenario === 'deactivated' || id === 'char-unavailable' ? fail<PublicCharacter>('UNAVAILABLE', 'This character is no longer available.') : ok({ ...c, availability: { chat: scenario !== 'paused' && capabilities(id).chat, photos: capabilities(id).photos } }); }); }
function conversations() {
  if (!conversationsHydrated) {
    conversationsHydrated = true;
    try { const rows: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]'); if (Array.isArray(rows)) for (const r of rows) if (r && typeof r.id === 'string' && r.userId === getAccount().user?.id && characters.some(c => c.id === r.characterId) && r.id === `preview-${r.characterId}`) memory.set(r.id, r); } catch { /* Disposable preview storage may be unavailable. */ }
  }
  return [...memory.values()].filter(c => c.userId === getAccount().user?.id);
}
export function savedConversation(characterId: string) { return allowed() ? conversations().find(c => c.characterId === characterId) : undefined; }
export function startConversation(characterId: string, scenario: DiscoveryScenario = 'ready') { return run(scenario, () => {
  if (scenario === 'paused' || scenario === 'deactivated' || !capabilities(characterId).chat) return fail<Conversation>('CAPABILITY_PAUSED', 'Conversation is unavailable right now. Choose another character.');
  if (!characters.some(c => c.id === characterId)) return fail<Conversation>('NOT_FOUND', 'This character is unavailable.');
  const existing = savedConversation(characterId); if (existing) return ok(existing);
  const now = new Date().toISOString(); const row: Conversation = { id: `preview-${characterId}`, userId: getAccount().user!.id, characterId, status: 'active', relationshipState: 'introductory', lastMessagePreview: null, lastMessageAt: null, unreadCount: 0, version: 1, createdAt: now, updatedAt: now };
  memory.set(row.id, row); try { sessionStorage.setItem(key, JSON.stringify(conversations())); } catch { /* In-memory continuation remains available. */ } return ok(row);
}); }
export function readConversation(id: string) { return allowed() ? conversations().find(c => c.id === id) : undefined; }
export function listSavedConversations() { return allowed() ? structuredClone(conversations()) : []; }
export function updateMockConversation(id: string, patch: Partial<Pick<Conversation, 'status' | 'lastMessagePreview' | 'lastMessageAt' | 'unreadCount' | 'relationshipState'>>) {
  if (!allowed()) return;
  const rows = conversations(); const row = rows.find(c => c.id === id); if (!row) return;
  Object.assign(row, patch, { version: row.version + 1, updatedAt: new Date().toISOString() });
  persistConversations(rows);
}
export function removeMockConversation(id: string) { if (allowed()) persistConversations(conversations().filter(c => c.id !== id)); }
export function resetMockConversations() { if (allowed()) persistConversations([]); }
function persistConversations(rows: Conversation[]) {
  memory.clear(); rows.forEach(row => memory.set(row.id, row));
  // Free-form message text must never enter persisted conversation previews.
  try { sessionStorage.setItem(key, JSON.stringify(rows.map(row => ({ ...row, lastMessagePreview: row.lastMessageAt ? 'Preview conversation' : null })))); } catch { /* Browser-only mock still works in memory. */ }
}
export function assetUrl(characterId: string, kind: 'portrait' | 'gallery') { return `/images/characters/${characterId}-${kind}.webp`; }

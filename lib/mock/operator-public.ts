import base from './public-cast.json';
import type { Operations, PublicCharacter } from '../contracts';

// Only public DTOs and capability state cross this bridge. Never import admin instructions here.
type PublicState = { version: 1; profiles: Record<string, PublicCharacter>; hidden: string[]; assets: Record<string, { characterId: string; url: string | null; eligible: boolean }>; operations: Operations };
const defaults = (): PublicState => ({ version: 1, profiles: {}, hidden: [], assets: {}, operations: { chatEnabled: true, photosEnabled: true, paymentsEnabled: true, characterOverrides: {}, requestPolicy: { minimumMinor: null, maximumMinor: null, cooldownMinutes: null }, usageBudget: null, version: 1, updatedAt: '2026-10-08T08:00:00Z' } });
let state = defaults(); let hydrated = false; let revision = 0;
const key = 'talkingstage:mock-operator-public:v1'; const listeners = new Set<() => void>();
export const subscribeOperatorPublic = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const operatorPublicVersion = () => revision; export const serverOperatorPublicVersion = () => 0;
export function hydrateOperatorPublic() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try { const s = JSON.parse(sessionStorage.getItem(key) ?? 'null'); if (s?.version === 1 && s.profiles && Array.isArray(s.hidden) && s.assets && typeof s.operations?.chatEnabled === 'boolean' && typeof s.operations.photosEnabled === 'boolean' && typeof s.operations.paymentsEnabled === 'boolean') state = s; } catch { /* Disposable controls reset safely. */ }
  revision++; listeners.forEach(f => f());
}
function publish() {
  const assets = Object.fromEntries(Object.entries(state.assets).map(([id, a]) => [id, a.url?.startsWith('blob:') ? { ...a, url: null, eligible: false } : a]));
  try { sessionStorage.setItem(key, JSON.stringify({ ...state, assets })); } catch { /* Preview remains usable in memory. */ }
  revision++; listeners.forEach(f => f());
}
export function publicCast(): PublicCharacter[] { hydrateOperatorPublic(); return [...(base as PublicCharacter[]).map(c => state.profiles[c.id] ?? c), ...Object.values(state.profiles).filter(c => !base.some(b => b.id === c.id))]; }
export function publicCharacter(id: string) { return publicCast().find(c => c.id === id); }
export function isPublishedPreview(id: string) { hydrateOperatorPublic(); return !!publicCharacter(id) && !state.hidden.includes(id); }
export function capabilities(id: string) {
  hydrateOperatorPublic(); const o = state.operations; const c = o.characterOverrides[id]; const visible = isPublishedPreview(id);
  return { chat: visible && o.chatEnabled && c?.chat !== false, photos: visible && o.photosEnabled && c?.photos !== false, payments: visible && o.paymentsEnabled && c?.payments !== false };
}
export function publicAsset(id: string, characterId: string) {
  hydrateOperatorPublic(); const a = state.assets[id];
  if (a) return a.characterId === characterId && a.eligible ? a.url : null;
  const c = (base as PublicCharacter[]).find(c => c.id === characterId);
  return c && (c.portraitAssetId === id || c.galleryAssetIds.includes(id)) ? `/images/characters/${id}.webp` : null;
}
export function previewOperations() { hydrateOperatorPublic(); return structuredClone(state.operations); }
export function commitPublicProfile(profile: PublicCharacter, active: boolean) { hydrateOperatorPublic(); state.profiles[profile.id] = structuredClone(profile); state.hidden = state.hidden.filter(id => id !== profile.id); if (!active) state.hidden.push(profile.id); publish(); }
export function commitPublicAsset(id: string, characterId: string, url: string | null, eligible: boolean) { hydrateOperatorPublic(); state.assets[id] = { characterId, url, eligible }; publish(); }
export function commitOperations(operations: Operations) { hydrateOperatorPublic(); state.operations = structuredClone(operations); publish(); }
export function resetOperatorPublic() { state = defaults(); hydrated = true; publish(); }

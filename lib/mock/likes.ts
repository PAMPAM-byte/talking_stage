// Preview-only likes and coins. Browser session storage, no money, no AI. The live version
// decides likes in the database every 30 minutes; this file imitates that so the screens can
// be reviewed. Each character's choice comes from their own pickiness, fixed per person.
import { MAX_COIN_PURCHASE, RELIKE_AFTER_DAYS, STARTING_COINS, nextReviewAt, validCoinCount } from '../coins';
import { getAccount } from './account';
import { characters, savedConversation, startConversation } from './discovery';

export type LikeRecord = { likedAt: number; reviewAt: number; outcome: 'pending' | 'match' | 'no'; reviewedAt?: number; seen?: boolean };
type LedgerEntry = { kind: 'welcome' | 'purchase' | 'start'; amount: number; at: number; characterId?: string };
type State = { version: 1; coins: number; ledger: LedgerEntry[]; likes: Record<string, LikeRecord>; firstMatchGiven: boolean };

const listeners = new Set<() => void>();
const empty: State = { version: 1, coins: STARTING_COINS, ledger: [], likes: {}, firstMatchGiven: false };
let cache: { key: string; state: State } | null = null;

const storageKey = () => `talkingstage:likes-coins:v1:${getAccount().user?.id ?? 'preview'}`;
function hash(text: string) { let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
/** How often a character likes people back: between 4 and 8 in 10, set by who they are. */
export const likeBackRate = (characterId: string) => 0.4 + (hash(`taste:${characterId}`) % 5) / 10;

function read(): State {
  const key = storageKey();
  if (cache?.key === key) return cache.state;
  let state: State = { ...empty, ledger: [{ kind: 'welcome', amount: STARTING_COINS, at: Date.now() }] };
  try { const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null'); if (saved?.version === 1 && Number.isInteger(saved.coins) && saved.likes) state = saved; } catch { /* Fresh preview state. */ }
  cache = { key, state };
  return state;
}
function write(state: State) {
  cache = { key: storageKey(), state };
  try { sessionStorage.setItem(cache.key, JSON.stringify(state)); } catch { /* In-memory preview still works. */ }
  listeners.forEach(l => l());
}
export const subscribeLikes = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const likesSnapshot = () => read();
const serverSnapshot = empty;
export const likesServerSnapshot = () => serverSnapshot;

/** The 30-minute review: each character decides on the likes that are due. `force` runs it now (preview only). */
export function reviewDueLikes(force = false) {
  const state = read(); const now = Date.now(); let changed = false;
  const likes = { ...state.likes }; let firstMatchGiven = state.firstMatchGiven;
  for (const [id, like] of Object.entries(likes).sort((a, b) => a[1].likedAt - b[1].likedAt)) {
    if (like.outcome !== 'pending' || (!force && like.reviewAt > now)) continue;
    const roll = (hash(`${getAccount().user?.id}:${id}`) % 1000) / 1000;
    // Everyone hears back from at least one character on their first review, so the app never feels broken.
    const match = !firstMatchGiven || roll < likeBackRate(id);
    if (match) firstMatchGiven = true;
    likes[id] = { ...like, outcome: match ? 'match' : 'no', reviewedAt: now, seen: false };
    changed = true;
  }
  if (changed) write({ ...state, likes, firstMatchGiven });
}

export type LikeStatus = 'none' | 'pending' | 'match';
/** A character who said no reads as "pending" until the person may like them again: never announced. */
export function likeStatus(state: State, characterId: string): LikeStatus {
  const like = state.likes[characterId];
  if (!like) return 'none';
  if (like.outcome === 'match') return 'match';
  if (like.outcome === 'no' && Date.now() - (like.reviewedAt ?? 0) > RELIKE_AFTER_DAYS * 86_400_000) return 'none';
  return 'pending';
}

export async function likeCharacter(characterId: string): Promise<{ error?: string; status: LikeStatus }> {
  await new Promise(r => setTimeout(r, 120));
  if (!characters.some(c => c.id === characterId)) return { error: 'This character is unavailable.', status: 'none' };
  const state = read(); const current = likeStatus(state, characterId);
  if (current !== 'none') return { status: current };
  const likedAt = Date.now();
  write({ ...state, likes: { ...state.likes, [characterId]: { likedAt, reviewAt: nextReviewAt(likedAt), outcome: 'pending' } } });
  return { status: 'pending' };
}

export function markMatchesSeen() {
  const state = read(); let changed = false; const likes = { ...state.likes };
  for (const [id, like] of Object.entries(likes)) if (like.outcome === 'match' && !like.seen) { likes[id] = { ...like, seen: true }; changed = true; }
  if (changed) write({ ...state, likes });
}

/** Uses 1 coin, then opens the chat. Coins are only taken if the chat opens; an existing chat is free. */
export async function startWithCoin(characterId: string): Promise<{ id?: string; error?: 'no_coins' | 'not_matched' | 'failed'; message?: string }> {
  const existing = savedConversation(characterId);
  if (existing) return { id: existing.id };
  const state = read();
  if (likeStatus(state, characterId) !== 'match') return { error: 'not_matched', message: 'You can start a conversation once they like you back.' };
  if (state.coins < 1) return { error: 'no_coins', message: 'You’re out of coins.' };
  const result = await startConversation(characterId);
  if (result.error) return { error: 'failed', message: result.error.message };
  const after = read();
  write({ ...after, coins: after.coins - 1, ledger: [...after.ledger, { kind: 'start', amount: -1, at: Date.now(), characterId }] });
  return { id: result.data.id };
}

/** Preview purchase: adds coins straight away. The live version adds them only after Bachs confirms payment. */
export async function buyCoinsPreview(count: number): Promise<{ error?: string }> {
  await new Promise(r => setTimeout(r, 700));
  if (!validCoinCount(count)) return { error: `Choose between 10 and ${MAX_COIN_PURCHASE} coins.` };
  const state = read();
  write({ ...state, coins: state.coins + count, ledger: [...state.ledger, { kind: 'purchase', amount: count, at: Date.now() }] });
  return {};
}

export function matchedCharacters(state: State) {
  return Object.entries(state.likes).filter(([, l]) => l.outcome === 'match')
    .sort((a, b) => (b[1].reviewedAt ?? 0) - (a[1].reviewedAt ?? 0))
    .flatMap(([id, like]) => { const c = characters.find(x => x.id === id); return c ? [{ character: c, like, conversationId: savedConversation(id)?.id }] : []; });
}
export const waitingCount = (state: State) => Object.keys(state.likes).filter(id => likeStatus(state, id) === 'pending').length;

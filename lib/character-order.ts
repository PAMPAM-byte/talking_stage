/** Feature Zuri without changing the relative order of the remaining matches. */
export function featuredCharacterOrder<T extends { name: string }>(characters: readonly T[]): T[] {
  return [...characters.filter(character => character.name === 'Zuri'), ...characters.filter(character => character.name !== 'Zuri')];
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Short, stable key for a shuffle seed, safe to use in storage keys. */
export function shuffleKey(seed: string) {
  return hash(seed).toString(36);
}

/**
 * Founder request, 3 November 2026: discovery starts with a different character on each
 * sign-in instead of always Zuri. The seed (user plus sign-in time) keeps one order for the
 * whole session, so returning to discovery never reshuffles cards already seen.
 */
export function shuffledCharacterOrder<T>(characters: readonly T[], seed: string): T[] {
  const result = [...characters];
  let state = hash(seed) || 1;
  const random = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

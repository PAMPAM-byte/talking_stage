/** Feature Zuri without changing the relative order of the remaining matches. */
export function featuredCharacterOrder<T extends { name: string }>(characters: readonly T[]): T[] {
  return [...characters.filter(character => character.name === 'Zuri'), ...characters.filter(character => character.name !== 'Zuri')];
}

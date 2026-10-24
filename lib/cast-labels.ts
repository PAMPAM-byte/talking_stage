import cast from '@/lib/mock/public-cast.json';

/**
 * "Name, age" from the published catalogue, so marketing copy cannot drift
 * from profiles. Throws for an unknown name so a renamed or removed character
 * fails the build instead of rendering a stale label.
 */
export function characterNameAge(name: string): string {
  const character = cast.find(item => item.name === name);
  if (!character) throw new Error(`Unknown catalogue character: ${name}`);
  return `${character.name}, ${character.age}`;
}

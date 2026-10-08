import { characters } from './discovery';
const focalPoints = {"char-amara":{"portrait":{"x":0.5,"y":0.35},"gallery":{"x":0.5,"y":0.3}},"char-zainab":{"portrait":{"x":0.5,"y":0.35},"gallery":{"x":0.5,"y":0.3}},"char-ifeoma":{"portrait":{"x":0.5,"y":0.25},"gallery":{"x":0.5,"y":0.3}},"char-tomi":{"portrait":{"x":0.5,"y":0.25},"gallery":{"x":0.5,"y":0.3}},"char-tunde":{"portrait":{"x":0.5,"y":0.25},"gallery":{"x":0.5,"y":0.3}},"char-chidi":{"portrait":{"x":0.5,"y":0.25},"gallery":{"x":0.5,"y":0.3}},"char-seyi":{"portrait":{"x":0.5,"y":0.25},"gallery":{"x":0.5,"y":0.3}},"char-idris":{"portrait":{"x":0.5,"y":0.25},"gallery":{"x":0.5,"y":0.3}}};
export function characterAsset(characterId: string, kind: 'portrait' | 'gallery') {
  const character = characters.find(c => c.id === characterId);
  if (!character) throw new Error('Asset has no public character owner.');
  const id = kind === 'portrait' ? character.portraitAssetId : character.galleryAssetIds[0];
  return { id, characterId, displayUrl: `/images/characters/${id}.webp`, altText: `${character.name}, ${character.age}, a fictional adult AI character in a ${kind === 'portrait' ? 'portrait' : 'lifestyle photo'}`, focalPoint: focalPoints[characterId as keyof typeof focalPoints][kind] };
}

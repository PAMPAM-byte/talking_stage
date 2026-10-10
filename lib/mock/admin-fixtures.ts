import planning from '@/docs/stage-0/characters.json';
import expansion from '@/docs/cast-expansion/characters.json';
export type PrivateFixture = { id: string; appearanceContinuity: string; languageStyle: string; warmthAndPace: string; boundaries: string[] };
// This file is available only through the development admin alias.
const fixtures: PrivateFixture[] = [...planning.characters, ...expansion.characters.map(c => ({
  id: c.key, appearanceContinuity: c.appearance, languageStyle: c.voice,
  warmthAndPace: c.pace, boundaries: [c.roleBoundary ?? 'Fictional adult, non-explicit conversation. No real meetings or payment-dependent affection.'],
}))];
export default fixtures;

import roster from '@/docs/cast-50/characters.json';
export type PrivateFixture = { id: string; appearanceContinuity: string; languageStyle: string; warmthAndPace: string; boundaries: string[] };
// This file is available only through the development admin alias.
const fixtures: PrivateFixture[] = roster.characters.map(c => ({
  id: c.key, appearanceContinuity: c.appearance, languageStyle: c.direction,
  warmthAndPace: c.personality.relationship.pace, boundaries: ['Fictional adult AI character. Current provider: non-explicit romance, no erotic chat. No real meetings, money requests or payment-dependent affection.'],
}));
export default fixtures;

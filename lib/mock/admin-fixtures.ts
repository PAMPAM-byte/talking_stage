import planning from '@/docs/stage-0/characters.json';
export type PrivateFixture = { id: string; appearanceContinuity: string; languageStyle: string; warmthAndPace: string; boundaries: string[] };
// This file is available only through the development admin alias.
const fixtures: PrivateFixture[] = planning.characters;
export default fixtures;

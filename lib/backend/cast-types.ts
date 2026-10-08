export type CastProfile = {
  name: string; age: number; gender: 'man' | 'woman'; fictionalLocation: string;
  occupation: string; bio: string; conversationClue: string; interests: string[]; personalityTags: string[];
};
export type CastDraft = { id: string; version: number; status: string; profile: CastProfile; direction: string; instructionVersion: number; updatedAt: string };

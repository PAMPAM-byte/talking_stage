import cast from "@/docs/stage-0/characters.json";
import type { MockSeed } from "@/lib/mock/adapter";
import type { PublicCharacter, User } from "@/lib/contracts";
const date = "2026-10-08T09:00:00Z";
const users: User[] = ["a", "b"].map((letter) => ({ id: `demo-user-${letter}`, displayName: letter === "a" ? "Dami" : "Alex", preferences: { characterGenders: ["woman", "man"], language: "english" }, adultAccessState: "approved", onboardingStep: "complete", allowMonetaryRequests: true, version: 1, createdAt: date, updatedAt: date }));
export const publicCharacters: PublicCharacter[] = cast.characters.map((character) => ({ id: character.id, name: character.name, age: character.age, gender: character.gender as "woman" | "man", fictionalLocation: character.fictionalLocation, bio: character.bio, bioSnippet: character.bioSnippet, occupation: character.occupation, interests: character.interests, personalityTags: character.personalityTags, conversationClue: character.conversationClue, aiLabel: character.aiLabel, portraitAssetId: character.portraitAssetId, galleryAssetIds: character.galleryAssetIds, availability: { chat: true, photos: false } }));
export const previewSeed: MockSeed = {
  characters: publicCharacters, users,
  conversations: users.map((user, index) => ({ id: `conversation-${index}`, userId: user.id, characterId: index === 0 ? "char-amara" : "char-chidi", status: "active", relationshipState: "introductory", lastMessagePreview: "What song are you listening to today?", lastMessageAt: date, unreadCount: 0, version: 1, createdAt: date, updatedAt: date })),
  memories: [{ id: "memory-a", userId: "demo-user-a", characterId: "char-amara", content: "Enjoys Afrobeats playlists.", category: "user_fact", source: { messageId: null, consent: "explicit" }, savedAt: date, deletedAt: null }],
  payments: [{ id: "payment-a", userId: "demo-user-a", conversationId: "conversation-0", characterId: "char-amara", amountMinor: 500000, currency: "NGN", reference: "DEMO-NOT-A-TRANSACTION", status: "pending", recipientDisclosure: "Received by TalkingStage's operator.", checkoutUrl: null, createdAt: date, expiresAt: null, verifiedAt: null }],
};

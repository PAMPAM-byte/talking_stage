import type { CharacterFilters, Collection, Conversation, FrontendAdapter, Memory, PaymentIntent, PublicCharacter, Result, ServiceError, User } from "../contracts";

export type MockScenario = "ready" | "empty" | "offline" | "error";
export type MockSeed = { characters: PublicCharacter[]; users: User[]; conversations: Conversation[]; memories: Memory[]; payments: PaymentIntent[] };
export type MockOptions = { actorId: string | null; scenario?: MockScenario; latencyMs?: number };
export function createMockAdapter(seed: MockSeed, options: MockOptions): FrontendAdapter & { reset: () => void } {
  let state = structuredClone(seed); let sequence = 0;
  async function run<T>(operation: () => T | ServiceError): Promise<Result<T>> {
    const requestId = `mock-request-${++sequence}`;
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, options.latencyMs ?? 450)));
    if (options.scenario === "offline") return { requestId, error: { code: "OFFLINE", message: "You're offline. Reconnect and try again.", retryable: true } };
    if (options.scenario === "error") return { requestId, error: { code: "UNAVAILABLE", message: "This couldn't load. Try again.", retryable: true } };
    const value = operation();
    if (value && typeof value === "object" && "code" in value && "retryable" in value) return { requestId, error: value as ServiceError };
    return { requestId, data: structuredClone(value as T) };
  }
  const denied = (): ServiceError => ({ code: "UNAUTHENTICATED", message: "Sign in to continue.", retryable: false });
  const current = () => state.users.find((user) => user.id === options.actorId);
  const access = (): ServiceError | undefined => { const user = current(); if (!user) return denied(); if (user.adultAccessState === "blocked") return { code: "ADULT_ACCESS_BLOCKED", message: "TalkingStage is for adults 18 and over.", retryable: false }; if (user.adultAccessState !== "approved" || user.onboardingStep !== "complete") return { code: "ONBOARDING_REQUIRED", message: "Complete onboarding to continue.", retryable: false }; };
  const collection = <T,>(items: T[]): Collection<T> => ({ items: options.scenario === "empty" ? [] : items, nextCursor: null });
  return {
    getCurrentUser: () => run(() => current() ?? denied()),
    updatePreferences: (input) => run(() => {
      const user = current(); if (!user) return denied();
      if (input.expectedVersion !== user.version) return { code: "CONFLICT", message: "Your preferences changed. Reload them and try again.", retryable: false };
      if (!input.displayName.trim() || input.displayName.trim().length > 60 || !input.preferences.characterGenders.length || input.preferences.characterGenders.some((gender) => gender !== "woman" && gender !== "man") || !["english", "english_pidgin"].includes(input.preferences.language)) return { code: "VALIDATION", message: "Check your preferences.", fieldErrors: { displayName: "Use a name between 1 and 60 characters and select valid preferences." }, retryable: false };
      user.displayName = input.displayName.trim(); user.preferences = structuredClone(input.preferences); user.version++; user.updatedAt = new Date().toISOString(); return user;
    }),
    listCharacters: (filters: CharacterFilters = {}) => run(() => {
      const error = access(); if (error) return error;
      return collection(state.characters.filter((character) => (!filters.gender || character.gender === filters.gender) && (!filters.personality || character.personalityTags.includes(filters.personality)) && (!filters.interest || character.interests.includes(filters.interest))));
    }),
    getCharacter: (id) => run(() => { const error = access(); if (error) return error; return state.characters.find((character) => character.id === id) ?? { code: "NOT_FOUND", message: "This character isn't available.", retryable: false }; }),
    listConversations: () => run(() => { const error = access(); if (error) return error; return collection(state.conversations.filter((item) => item.userId === options.actorId)); }),
    listMemories: (characterId) => run(() => { const error = access(); if (error) return error; return collection(state.memories.filter((item) => item.userId === options.actorId && item.characterId === characterId && !item.deletedAt)); }),
    listPaymentHistory: () => run(() => { const error = access(); if (error) return error; return collection(state.payments.filter((item) => item.userId === options.actorId)); }),
    reset: () => { state = structuredClone(seed); },
  };
}

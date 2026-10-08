export type Gender = "woman" | "man";
export type Language = "english" | "english_pidgin";
export type AdultAccessState = "not_started" | "declared_adult" | "assurance_pending" | "approved" | "failed" | "blocked";
export type ErrorCode = "UNAUTHENTICATED" | "ONBOARDING_REQUIRED" | "ADULT_ACCESS_BLOCKED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "OFFLINE" | "RATE_LIMITED" | "USAGE_LIMIT" | "CAPABILITY_PAUSED" | "UNAVAILABLE" | "EXPIRED";
export type ServiceError = { code: ErrorCode; message: string; fieldErrors?: Record<string, string>; retryable: boolean };
export type Result<T> = { data: T; requestId: string; error?: never } | { error: ServiceError; requestId: string; data?: never };
export type Collection<T> = { items: T[]; nextCursor: string | null };
export type TransportState<T> = { status: "idle" } | { status: "pending" } | { status: "succeeded"; data: T } | { status: "failed"; error: ServiceError };
export type Preferences = { characterGenders: Gender[]; language: Language };
export type User = { id: string; displayName: string; preferences: Preferences; adultAccessState: AdultAccessState; onboardingStep: "age" | "assurance" | "preferences" | "complete"; allowMonetaryRequests: boolean; version: number; createdAt: string; updatedAt: string };
export type Session = { actorId: string; role: "user" | "admin"; expiresAt: string };
export type PublicCharacter = { id: string; name: string; age: number; gender: Gender; fictionalLocation: string; bioSnippet: string; bio: string; occupation: string; interests: string[]; personalityTags: string[]; conversationClue: string; aiLabel: string; portraitAssetId: string; galleryAssetIds: string[]; availability: { chat: boolean; photos: boolean } };
export type CharacterAsset = { id: string; characterId: string; kind: "portrait" | "gallery" | "chat"; reviewStatus: "pending" | "approved" | "rejected"; publicationState: "draft" | "published"; source: "ai_generated"; displayUrl: string | null; altText: string; focalPoint: { x: number; y: number } };
export type Conversation = { id: string; userId: string; characterId: string; status: "active" | "archived"; relationshipState: "introductory" | "familiar"; lastMessagePreview: string | null; lastMessageAt: string | null; unreadCount: number; version: number; createdAt: string; updatedAt: string };
export type Message = { id: string; conversationId: string; sequence: number; role: "user" | "character" | "system"; kind: "text" | "photo" | "payment" | "status"; text: string | null; assetId: string | null; paymentIntentId: string | null; deliveryState: "queued" | "sending" | "saved" | "failed"; clientMessageId: string | null; createdAt: string };
export type ReplyJob = { id: string; conversationId: string; userMessageId: string; state: "waiting" | "generating" | "completed" | "failed" | "interrupted"; errorCode: ErrorCode | null; createdAt: string; updatedAt: string };
export type Memory = { id: string; userId: string; characterId: string; content: string; category: "user_fact"; source: { messageId: string | null; consent: "explicit" | "ordinary_shared" }; savedAt: string; deletedAt: string | null };
export type MemoryPreferences = { userId: string; characterId: string; enabled: boolean; updatedAt: string };
export type MonetaryProposal = { id: string; conversationId: string; origin: "character" | "user"; amountMinor: number | null; currency: "NGN"; state: "amount_needed" | "awaiting_confirmation" | "confirmed" | "intent_created" | "declined"; policyEligible: boolean; createdAt: string };
export type PaymentStatus = "awaiting_checkout" | "pending" | "paid" | "failed" | "cancelled" | "expired" | "refunded" | "disputed";
export type PaymentIntent = { id: string; userId: string; conversationId: string; characterId: string; amountMinor: number; currency: "NGN"; reference: string; status: PaymentStatus; recipientDisclosure: string; checkoutUrl: string | null; createdAt: string; expiresAt: string | null; verifiedAt: string | null };
export type Report = { id: string; reporterId: string; target: { kind: "message" | "photo" | "character"; id: string }; reason: string; details: string | null; state: "open" | "in_review" | "resolved"; createdAt: string; resolution: string | null };
export type AdminAudit = { id: string; actorId: string; action: string; target: { kind: string; id: string }; createdAt: string; outcome: "succeeded" | "failed" };
export type PaymentEvent = { id: string; intentId: string; gatewayEventId: string; eventType: string; verificationResult: "pending" | "verified" | "rejected"; receivedAt: string; processedAt: string | null };
export type Operations = { chatEnabled: boolean; photosEnabled: boolean; paymentsEnabled: boolean; characterOverrides: Record<string, Partial<{ chat: boolean; photos: boolean; payments: boolean }>>; requestPolicy: { minimumMinor: number | null; maximumMinor: number | null; cooldownMinutes: number | null }; usageBudget: number | null; version: number; updatedAt: string };
export type CharacterFilters = { gender?: Gender; personality?: string; interest?: string };

// Foundation read/preferences contracts. Feature-stage mutations extend these
// interfaces as their screens are built; components never access a fixture store.
export interface FrontendAdapter {
  getCurrentUser(): Promise<Result<User>>;
  updatePreferences(input: { displayName: string; preferences: Preferences; expectedVersion: number }): Promise<Result<User>>;
  listCharacters(filters?: CharacterFilters): Promise<Result<Collection<PublicCharacter>>>;
  getCharacter(id: string): Promise<Result<PublicCharacter>>;
  listConversations(): Promise<Result<Collection<Conversation>>>;
  listMemories(characterId: string): Promise<Result<Collection<Memory>>>;
  listPaymentHistory(): Promise<Result<Collection<PaymentIntent>>>;
}

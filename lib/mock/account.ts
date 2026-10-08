import type { Preferences, Result, User } from "../contracts";

export type AccountScenario = "ready" | "offline" | "failure";
type AccountState = { version: 1; age: "unknown" | "adult" | "blocked"; user: User | null; consent: boolean; deleted?: boolean };
const initial: AccountState = { version: 1, age: "unknown", user: null, consent: false };
const storageKey = "talkingstage:mock-onboarding:v1";
let state = initial;
let hydrated = false;
let request = 0;
const listeners = new Set<() => void>();
// Keep a non-persisted draft across client navigation; never preserve passwords.
export const accountDraft = { email: "" };

// Disposable browser-only demo state. Never store email, passwords, or ID data.
function publish(next: AccountState) {
  state = next;
  try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Demo remains usable when storage is unavailable. */ }
  listeners.forEach((listener) => listener());
}
export function hydrateAccount() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    if (parsed && typeof parsed === "object" && "version" in parsed && parsed.version === 1 && "age" in parsed && ["unknown", "adult", "blocked"].includes(String(parsed.age))) {
      const candidate = parsed as AccountState;
      const user = candidate.user;
      if (!user || (typeof user.displayName === "string" && user.id === "mock-account" && ["not_started", "declared_adult", "assurance_pending", "approved", "failed", "blocked"].includes(user.adultAccessState) && ["age", "assurance", "preferences", "complete"].includes(user.onboardingStep) && Array.isArray(user.preferences?.characterGenders) && user.preferences.characterGenders.every((gender) => gender === "woman" || gender === "man") && ["english", "english_pidgin"].includes(user.preferences.language))) state = { version: 1, age: candidate.age, user, consent: candidate.consent === true };
    }
  } catch { /* Corrupt fixtures reset to signed out. */ }
  listeners.forEach((listener) => listener());
}
export const subscribeAccount = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getAccount = () => state;
export const getServerAccount = () => initial;
export function declareAdult(adult: boolean) { publish({ ...initial, age: adult ? "adult" : "blocked" }); }
export function signOut(deleted = false) { accountDraft.email = ""; publish({ ...initial, deleted }); }
export function accountDestination(user: User | null): string {
  if (!user) return "/sign-in";
  if (user.adultAccessState === "blocked") return "/onboarding/age";
  if (user.adultAccessState !== "approved") return "/onboarding/assurance";
  return user.onboardingStep === "complete" ? "/discover" : "/onboarding/preferences";
}
export function safeReturnPath(value: string | null): string {
  // Only implemented private destinations can be used as return paths.
  const allowed = new Set(["/discover"]);
  return value && allowed.has(value) ? value : "/discover";
}
async function execute<T>(scenario: AccountScenario, operation: () => T): Promise<Result<T>> {
  const requestId = `mock-account-${++request}`;
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (scenario !== "ready") return { requestId, error: { code: scenario === "offline" ? "OFFLINE" : "UNAVAILABLE", message: scenario === "offline" ? "You're offline. Reconnect and try again." : "This couldn't be completed. Try again.", retryable: true } };
  return { requestId, data: operation() };
}
function newUser(): User {
  const timestamp = new Date().toISOString();
  return { id: "mock-account", displayName: "", preferences: { characterGenders: [], language: "english" }, adultAccessState: "declared_adult", onboardingStep: "assurance", allowMonetaryRequests: false, version: 1, createdAt: timestamp, updatedAt: timestamp };
}
export async function registerAccount(email: string, scenario: AccountScenario): Promise<Result<User>> {
  if (state.age !== "adult") return { requestId: "mock-age-required", error: { code: "ADULT_ACCESS_BLOCKED", message: "Confirm adult access before creating an account.", retryable: false } };
  if (email.toLowerCase() === "demo@talkingstage.example") return { requestId: "mock-duplicate", error: { code: "CONFLICT", message: "This demo account already exists. Sign in instead.", retryable: false } };
  return execute(scenario, () => { const user = newUser(); publish({ ...state, user }); return user; });
}
export async function signInAccount(email: string, password: string, scenario: AccountScenario): Promise<Result<User>> {
  if (state.age === "blocked") return { requestId: "mock-underage", error: { code: "ADULT_ACCESS_BLOCKED", message: "TalkingStage is for adults 18 and over.", retryable: false } };
  if (!["demo@talkingstage.example", "pending@talkingstage.example"].includes(email.toLowerCase()) || password !== "TalkingStage123!") return { requestId: "mock-invalid", error: { code: "VALIDATION", message: "The email or password isn't correct.", retryable: false } };
  return execute(scenario, () => {
    const user = newUser();
    if (email.toLowerCase() === "demo@talkingstage.example") { user.displayName = "Dami"; user.preferences = { characterGenders: ["woman", "man"], language: "english" }; user.adultAccessState = "approved"; user.onboardingStep = "complete"; }
    publish({ version: 1, age: "adult", user, consent: user.onboardingStep === "complete" }); return user;
  });
}
export async function simulateAssurance(outcome: "approved" | "failed" | "pending", scenario: AccountScenario) {
  return execute(scenario, () => {
    if (state.user) publish({ ...state, user: { ...state.user, adultAccessState: outcome === "pending" ? "assurance_pending" : outcome, onboardingStep: outcome === "approved" ? "preferences" : "assurance" } });
    return outcome;
  });
}
export async function saveOnboardingPreferences(displayName: string, preferences: Preferences, scenario: AccountScenario) {
  if (!state.user || state.user.adultAccessState !== "approved") return { requestId: "mock-onboarding-required", error: { code: "ONBOARDING_REQUIRED", message: "Complete the age-verification preview first.", retryable: false } } satisfies Result<User>;
  return execute(scenario, () => { const user = { ...state.user!, displayName: displayName.trim(), preferences, version: state.user!.version + 1 }; publish({ ...state, user }); return user; });
}
export function completeOnboarding() {
  if (!state.user || state.user.adultAccessState !== "approved" || !state.user.displayName || !state.user.preferences.characterGenders.length) return false;
  publish({ ...state, consent: true, user: { ...state.user, onboardingStep: "complete" } }); return true;
}
export function patchMockUser(patch: Partial<Pick<User, 'allowMonetaryRequests' | 'displayName' | 'preferences'>>) {
  if (state.user?.adultAccessState !== 'approved' || state.user.onboardingStep !== 'complete') return false;
  publish({ ...state, user: { ...state.user, ...patch, version: state.user.version + 1, updatedAt: new Date().toISOString() } }); return true;
}
export async function requestRecovery(scenario: AccountScenario) { return execute(scenario, () => ({ sent: true })); }
export async function completeRecovery(reference: string | null, scenario: AccountScenario): Promise<Result<{ complete: true }>> {
  if (reference !== "demo-valid") return { requestId: "mock-expired", error: { code: "EXPIRED", message: "This recovery link is invalid or has expired. Request a new one.", retryable: false } };
  return execute(scenario, () => ({ complete: true as const }));
}

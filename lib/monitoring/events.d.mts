export type Operation = 'auth.register' | 'auth.sign-in' | 'auth.recover' | 'auth.password' | 'auth.identity' | 'account.profile' | 'account.preferences' | 'account.onboarding' | 'account.delete' | 'account.cleanup' | 'conversation.change' | 'conversation.skip' | 'report.submit' | 'report.review' | 'ai.reply' | 'ai.summary' | 'server.request';
export type Outcome = 'ok' | 'rejected' | 'rate_limited' | 'unavailable' | 'unexpected' | 'disabled';
export function emit(operation: Operation, outcome: Outcome, durationMs?: number, routeKind?: string): void;
export function failureOutcome(error: unknown): Outcome;
export function observe<T>(operation: Operation, work: () => PromiseLike<T>): Promise<T>;
export function observeAI(operation: Operation, work: () => Promise<string>): Promise<string>;

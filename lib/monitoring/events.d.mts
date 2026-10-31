export type Operation = 'auth.register' | 'auth.sign-in' | 'auth.recover' | 'auth.resend' | 'auth.password' | 'auth.identity' | 'account.profile' | 'account.preferences' | 'account.onboarding' | 'account.delete' | 'account.restore' | 'account.cleanup' | 'conversation.change' | 'conversation.skip' | 'conversation.sync' | 'report.submit' | 'report.review' | 'ai.provider' | 'ai.commit' | 'ai.reply' | 'ai.summary' | 'server.request';
export type Outcome = 'ok' | 'rejected' | 'rate_limited' | 'unavailable' | 'unexpected' | 'disabled';
export function emit(operation: Operation, outcome: Outcome, durationMs?: number, routeKind?: string): void;
export function failureOutcome(error: unknown): Outcome;
export function observe<T>(operation: Operation, work: () => PromiseLike<T>): Promise<T>;
export function observeAI(operation: Operation, work: () => Promise<string>): Promise<string>;
export function emitAIUsage(operation: 'ai.reply' | 'ai.summary', usage: { input: number; cacheWrite: number; cacheRead: number; output: number }): void;
export function emitGiftFailure(stage: 'configuration' | 'reserve' | 'checkout' | 'bind', error: unknown): void;
export function emitReplyQuality(report: { stage: string; repetitionScore: number; flags: string[] }): void;

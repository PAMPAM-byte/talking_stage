// This module accepts only fixed labels. Never pass request or provider objects to emit.
const operations = new Set(['auth.register', 'auth.sign-in', 'auth.recover', 'auth.password', 'auth.identity', 'account.profile', 'account.preferences', 'account.onboarding', 'account.delete', 'account.cleanup', 'conversation.change', 'conversation.skip', 'report.submit', 'report.review', 'ai.reply', 'ai.summary', 'server.request']);
const outcomes = new Set(['ok', 'rejected', 'rate_limited', 'unavailable', 'unexpected', 'disabled']);
const routeKinds = new Set(['render', 'route', 'action', 'proxy']);

export function emit(operation, outcome, durationMs = 0, routeKind) {
    // Diagnostics must never change the result of a successful mutation.
    try {
        const event = {
            event: 'talkingstage.operation', version: 1,
            // Next Cache Components forbids new Date() during prerender error hooks.
            // Timing APIs are permitted for telemetry; pass an explicit timestamp.
            time: new Date(performance.timeOrigin + performance.now()).toISOString(),
            operation: operations.has(operation) ? operation : 'server.request',
            outcome: outcomes.has(outcome) ? outcome : 'unexpected',
            durationMs: Number.isFinite(durationMs) ? Math.max(0, Math.min(3600000, Math.round(durationMs))) : 0,
        };
        if (routeKinds.has(routeKind)) event.routeKind = routeKind;
        console.info(JSON.stringify(event));
    } catch { /* A logging failure cannot roll back an already committed change. */ }
}

export function failureOutcome(error) {
    if (error?.status === 429) return 'rate_limited';
    if (error?.status >= 500 || error?.name === 'AuthRetryableFetchError') return 'unavailable';
    if (['invalid_credentials', 'user_already_exists', 'session_not_found', 'refresh_token_not_found', 'P0001', '23505', 'PGRST116'].includes(error?.code)
        || error?.name === 'AuthSessionMissingError' || [400, 401, 403, 404, 422].includes(error?.status)) return 'rejected';
    return 'unavailable';
}

export async function observe(operation, work) {
    const started = performance.now();
    try {
        const result = await work();
        emit(operation, result?.error ? failureOutcome(result.error) : result?.data?.error ? 'rejected' : 'ok', performance.now() - started);
        return result;
    } catch (error) {
        emit(operation, 'unexpected', performance.now() - started);
        throw error;
    }
}

export async function observeAI(operation, work) {
    const started = performance.now();
    try {
        const state = await work();
        const outcome = state === 'completed' ? 'ok' : state === 'blocked_provider' ? 'disabled'
            : ['failed', 'unavailable'].includes(state) ? 'unavailable' : 'rejected';
        emit(operation, outcome, performance.now() - started);
        return state;
    } catch (error) {
        emit(operation, 'unexpected', performance.now() - started);
        throw error;
    }
}

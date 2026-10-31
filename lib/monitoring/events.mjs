// This module accepts only fixed labels. Never pass request or provider objects to emit.
const operations = new Set(['auth.register', 'auth.sign-in', 'auth.recover', 'auth.resend', 'auth.password', 'auth.identity', 'account.profile', 'account.preferences', 'account.onboarding', 'account.delete', 'account.restore', 'account.cleanup', 'conversation.change', 'conversation.skip', 'conversation.sync', 'report.submit', 'report.review', 'ai.reply', 'ai.provider', 'ai.commit', 'ai.summary', 'server.request']);
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

// Gift checkout failures carry only a fixed step, error code, HTTP status and gateway hostname.
export function emitGiftFailure(stage, error){
    try{
        const stages=new Set(['configuration','reserve','checkout','bind']);
        const codes=new Set(['gateway_unavailable','gateway_timeout','merchant_mismatch','invalid_checkout','invalid_gateway_response','public_return_url_required','invalid_amount','reserve_failed','bind_failed']);
        const event={event:'talkingstage.gift_failure',version:1,stage:stages.has(stage)?stage:'checkout',code:codes.has(error?.code)?error.code:'unexpected'};
        if(Number.isInteger(error?.status)&&error.status>=100&&error.status<600)event.status=error.status;
        if(typeof error?.host==='string'&&/^[a-z0-9.-]{1,80}$/i.test(error.host))event.host=error.host;
        console.warn(JSON.stringify(event));
    }catch{/* Diagnostics never change the user's result. */}
}

export function emitReplyQuality(report){
    try{
        const stages=new Set(['new_match','talking','vibing','close']);
        const flags=new Set(['identity','contact','financial_promise','explicit','minor_reference','distress','sensitive_info']);
        console.info(JSON.stringify({event:'talkingstage.reply_quality',version:1,
            stage:stages.has(report?.stage)?report.stage:'new_match',
            repetitionScore:Number.isFinite(report?.repetitionScore)?Math.max(0,Math.min(1,report.repetitionScore)):0,
            flags:Array.isArray(report?.flags)?[...new Set(report.flags.filter(flag=>flags.has(flag)))]:[]}));
    }catch{/* Diagnostics must never interrupt a committed reply. */}
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

export function emitAIUsage(operation,usage){
    // Token counts only: never prompt, reply or provider body text.
    try{
        const count=value=>Number.isSafeInteger(value)?Math.max(0,Math.min(10000000,value)):0;
        console.info(JSON.stringify({event:'talkingstage.ai_usage',version:1,operation:['ai.reply','ai.summary'].includes(operation)?operation:'ai.reply',
            input:count(usage?.input),cacheWrite:count(usage?.cacheWrite),cacheRead:count(usage?.cacheRead),output:count(usage?.output)}));
    }catch{/* Diagnostics must never interrupt a committed reply. */}
}

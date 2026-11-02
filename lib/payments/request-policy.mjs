// Founder-approved character money-request pacing.
// 3 November 2026 (supersedes 24 October): male and female characters may make a playful
// request, on by default for every adult user (Settings > Monetary requests opts out).
// Requests follow reply milestones per chat, computed in the database by
// private.request_milestone: the first after minimumCompletedExchanges (20), then 30
// more, then 50 more, then every 30 (20, 50, 100, 130, 160 ...). "No thanks" moves on to
// the next milestone; only "stop asking" or Settings stops requests in a chat.
// The one-hour cooldown only prevents two requests in a single sitting. A request suggests
// NGN 2,000–10,000; user-initiated payments keep the NGN 2,000–1,000,000 checkout limits.
export const approvedRequestPolicy = Object.freeze({
    decidedOn: '2026-11-03',
    minimumCompletedExchanges: 20,
    cooldownSeconds: 60 * 60,
    minimumAmountMinor: 200000,
    maximumAmountMinor: 1000000,
});

/** SQL that enables the approved policy. Callers decide which database receives it. */
export function approvedRequestPolicySql(policy = approvedRequestPolicy) {
    for (const value of [policy.minimumCompletedExchanges, policy.cooldownSeconds, policy.minimumAmountMinor, policy.maximumAmountMinor])
        if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid request policy value.');
    if (policy.maximumAmountMinor < policy.minimumAmountMinor) throw new Error('Invalid request policy amounts.');
    return `update private.monetary_request_policy set enabled=true,minimum_completed_exchanges=${policy.minimumCompletedExchanges},cooldown_seconds=${policy.cooldownSeconds},minimum_amount_minor=${policy.minimumAmountMinor},maximum_amount_minor=${policy.maximumAmountMinor} where singleton;`;
}

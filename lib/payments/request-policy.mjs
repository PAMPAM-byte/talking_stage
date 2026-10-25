// Founder-approved character money-request pacing (24 October 2026).
// Female characters may request money from any adult user who has opted in;
// the database already restricts requests to characters with gender 'woman'.
// Amounts repeat the approved NGN 2,000–1,000,000 limits from migration 018.
export const approvedRequestPolicy = Object.freeze({
    decidedOn: '2026-10-24',
    minimumCompletedExchanges: 20,
    cooldownSeconds: 7 * 24 * 60 * 60,
    minimumAmountMinor: 200000,
    maximumAmountMinor: 100000000,
});

/** SQL that enables the approved policy. Callers decide which database receives it. */
export function approvedRequestPolicySql(policy = approvedRequestPolicy) {
    for (const value of [policy.minimumCompletedExchanges, policy.cooldownSeconds, policy.minimumAmountMinor, policy.maximumAmountMinor])
        if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid request policy value.');
    if (policy.maximumAmountMinor < policy.minimumAmountMinor) throw new Error('Invalid request policy amounts.');
    return `update private.monetary_request_policy set enabled=true,minimum_completed_exchanges=${policy.minimumCompletedExchanges},cooldown_seconds=${policy.cooldownSeconds},minimum_amount_minor=${policy.minimumAmountMinor},maximum_amount_minor=${policy.maximumAmountMinor} where singleton;`;
}

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const evaluationCeilingMicroUsd = 1_250_000;
export const pilotKeys = ['char-amara', 'char-zainab', 'char-adaora', 'char-chief-chukwudi', 'char-ese', 'char-ejiro'];
const baseline = ['greeting', 'low-energy', 'reasoned-disagreement'];
const extended = ['flirt', 'reject-flirt', 'switch-register', 'current-price', 'memory-honesty', 'identity', 'serious-disappointment', 'age-disclosure'];
export const digest = text => createHash('sha256').update(text).digest('hex');

export function evaluationPlan(pack, suite) {
    assert.equal(pack.characters.length, 50);
    const ordered = [...pilotKeys.map(key => pack.characters.find(c => c.key === key)), ...pack.characters.filter(c => !pilotKeys.includes(c.key))];
    assert(ordered.every(Boolean));
    return ordered.map(c => ({ key: c.key, name: c.profile.name, pilot: pilotKeys.includes(c.key), cases: [...baseline, ...(pilotKeys.includes(c.key) ? extended : [])].map(id => {
        const item = suite.cases.find(item => item.id === id);
        assert(item && item.history.length === 1 && item.history[0].role === 'user');
        return { id, text: item.history[0].text, expectation: item.expect };
    }) }));
}

export function reservationCost(configuration) {
    for (const field of ['max_input_tokens', 'max_output_tokens', 'input_micro_usd_per_million', 'output_micro_usd_per_million']) assert(Number.isSafeInteger(configuration[field]) && configuration[field] > 0);
    const amount = Math.ceil((configuration.max_input_tokens * configuration.input_micro_usd_per_million + configuration.max_output_tokens * configuration.output_micro_usd_per_million) / 1_000_000);
    assert(Number.isSafeInteger(amount) && amount > 0);
    return amount;
}

export function assertEvaluationAllowance(reservedUpperBound, cost, calls) {
    assert(Number.isSafeInteger(reservedUpperBound) && reservedUpperBound >= 0);
    assert(Number.isSafeInteger(cost) && cost > 0);
    assert(Number.isSafeInteger(calls) && calls >= 0 && calls < 230, 'Evaluation call ceiling reached.');
    assert(reservedUpperBound + cost <= evaluationCeilingMicroUsd, 'Evaluation money ceiling reached; do not increase project/user limits.');
}

export function followupPlan(pack, suite) {
    assert.equal(pack.characters.length, 50);
    assert.equal(suite.baseline.length, 3); assert.equal(suite.pilotExtra.length, 2);
    return pack.characters.map(c => ({ key: c.key, name: c.profile.name, pilot: pilotKeys.includes(c.key), cases: [...suite.baseline, ...(pilotKeys.includes(c.key) ? suite.pilotExtra : [])] }));
}

// Review cues, not naturalness, authenticity or safety verdicts.
export function reviewSignals(text) {
    const words = text.trim().split(/\s+/u).filter(Boolean);
    return { words: words.length, questions: (text.match(/\?/g) ?? []).length,
        longForShortPrompt: words.length > 90,
        stockAssistantOpening: /^(?:as an ai|i understand how you feel|i'm here to (?:help|support)|it sounds like)/i.test(text),
        assistantCheckout: /(?:anything else (?:you(?:'d| would) like|i can)|what would you like to talk about|(?:still )?happy to keep chatting)/i.test(text),
        particleLiteralisation: /\b(?:jare|joor) is (?:a |the )?(?:good|fine|valid|great|nice) (?:place|answer)\b/i.test(text),
        listFormatting: /(?:^|\n)\s*(?:[-*]|\d+[.)])\s/.test(text),
        requiresHumanReview: true };
}

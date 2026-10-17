import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { reviewSignals, pilotKeys } from './lib/cast-evaluation.mjs';

const folder = 'docs/cast-50/evaluations';
const baseline = JSON.parse(await readFile(`${folder}/baseline.json`, 'utf8'));
const followup = JSON.parse(await readFile(`${folder}/followup.json`, 'utf8'));
const pack = JSON.parse(await readFile('docs/cast-50/characters.json', 'utf8'));
async function prior(path) { try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
const previousReview = await prior(`${folder}/quality-review.json`);
const previousBlind = await prior(`${folder}/blind-review.json`);
assert.equal(baseline.sourceFingerprint, followup.sourceFingerprint);
assert.notEqual(baseline.promptFingerprint, followup.promptFingerprint);
const initial = baseline.records.filter(r => r.finishedAt);
const revised = followup.records.filter(r => r.finishedAt);
assert.equal(initial.length, 66);
if (!process.argv.includes('--partial')) {
    assert.equal(revised.length, 162); assert.equal(new Set(revised.map(r => r.key)).size, 50);
    assert(initial.every(r => r.state === 'completed') && revised.every(r => r.state === 'completed'));
}
function metrics(rows) {
    const signals = rows.map(r => reviewSignals(r.output));
    return { replies: rows.length, questions: signals.filter(s => s.questions > 0).length, meanWords: rows.length ? Number((signals.reduce((n, s) => n + s.words, 0) / rows.length).toFixed(1)) : null,
        assistantCheckouts: signals.filter(s => s.assistantCheckout).length, particleLiteralisations: signals.filter(s => s.particleLiteralisation).length };
}
const normalise = text => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
function shingles(text) { const words = normalise(text).split(' '); return new Set(words.slice(0, -3).map((_, i) => words.slice(i, i + 4).join(' '))); }
const overlapping = [];
for (let i = 0; i < revised.length; i++) for (let j = i + 1; j < revised.length; j++) {
    const a = revised[i], b = revised[j]; if (a.caseId !== b.caseId || a.key === b.key) continue;
    const left = shingles(a.output), right = shingles(b.output); if (!left.size || !right.size) continue;
    const common = [...left].filter(item => right.has(item)).length;
    const jaccard = common / (left.size + right.size - common);
    if (jaccard >= 0.3) overlapping.push({ caseId: a.caseId, left: a.key, right: b.key, fourWordShingleJaccard: Number(jaccard.toFixed(3)) });
}
overlapping.sort((a, b) => b.fourWordShingleJaccard - a.fourWordShingleJaccard);
const usage = [...initial, ...revised].reduce((sum, r) => ({ input: sum.input + (r.tokenUsage?.input_tokens ?? 0), output: sum.output + (r.tokenUsage?.output_tokens ?? 0), cachedInput: sum.cachedInput + (r.tokenUsage?.cache_read_input_tokens ?? 0), cacheWrites: sum.cacheWrites + (r.tokenUsage?.cache_creation_input_tokens ?? 0) }), { input: 0, output: 0, cachedInput: 0, cacheWrites: 0 });
const pilotRevised = revised.filter(r => pilotKeys.includes(r.key));
const comparisons = {
    quietTurn: { original: metrics(initial.filter(r => r.caseId === 'low-energy')), revisedSameSixVoices: metrics(pilotRevised.filter(r => r.caseId === 'rest-without-gist')), revisedAllVoices: metrics(revised.filter(r => r.caseId === 'rest-without-gist')) },
    identity: { original: metrics(initial.filter(r => r.caseId === 'identity')), revised: metrics(revised.filter(r => r.caseId === 'identity-in-voice')) },
    liveFact: { original: metrics(initial.filter(r => r.caseId === 'current-price')), revised: metrics(revised.filter(r => r.caseId === 'live-rate-plain-english')) },
};
const review = { version: 1, status: revised.length === 162 ? 'live_regression_complete_human_acceptance_pending' : 'in_progress', runId: followup.runId, model: followup.model,
    sourceFingerprint: followup.sourceFingerprint, beforePromptFingerprint: baseline.promptFingerprint, afterPromptFingerprint: followup.promptFingerprint,
    completedReplies: initial.length + revised.length, charactersInFollowup: new Set(revised.map(r => r.key)).size,
    comparisons, tokenUsage: usage, databaseReservedMicroUsd: followup.databaseReservedMicroUsd, conservativeReservedMicroUsdUpperBound: followup.reservedMicroUsdUpperBound,
    accountingNote: 'Budget reservations exceed typical actual token usage. They are not an invoice. Both phases share one synthetic account and the same $1.25 ceiling; project and user limits were not changed.',
    interpretation: 'Descriptive unblinded comparison using different prompts and fresh follow-up threads; not a controlled A/B study, native-speaker score or proof of persona distinctiveness. Repeated wording is flagged for human review, not automatically rejected.',
    largestWordingOverlaps: overlapping.slice(0, 30),
    remaining: ['Native Nigerian and founder review', 'Blind recognition of different voices', 'Full 32-case matrix across every character', 'Broader multi-turn romantic, repair, slang and topic-switch coverage'],
    textualInspection: { reviewer: 'Codex; not native-speaker attestation', observations: ['Pilot quiet replies repeatedly asked another question despite the user having no gist.', 'Fresh quiet replies are shorter and do not repeat that question pattern.', 'Longer opinion replies still reuse shield/carrying-things-alone language and similar follow-up questions across different personas.', 'The six observed pilot identity, live-price and age-disclosure outputs retained their required boundaries; this is limited observed coverage, not a general safety acceptance.'] },
    perCharacter: pack.characters.map(c => ({ key: c.key, name: c.profile.name, followupReplies: revised.filter(r => r.key === c.key).length,
        reviewCues: revised.filter(r => r.key === c.key).map(r => ({ caseId: r.caseId, ...reviewSignals(r.output) })),
        nativeScores: previousReview?.runId === followup.runId ? previousReview.perCharacter?.find(row => row.key === c.key)?.nativeScores ?? null : null,
        founderScores: previousReview?.runId === followup.runId ? previousReview.perCharacter?.find(row => row.key === c.key)?.founderScores ?? null : null,
        acceptance: 'pending_human_review' })),
};
await writeFile(`${folder}/quality-review.json`, JSON.stringify(review, null, 2) + '\n');
// Deliberately non-roster order; do not expose names/jobs in the reviewer packet.
const blindOrder = ['char-ese', 'char-chief-chukwudi', 'char-amara', 'char-ejiro', 'char-zainab', 'char-adaora'];
const namesAndJobs = pack.characters.flatMap(c => [c.profile.name, c.profile.occupation]).sort((a, b) => b.length - a.length);
const redact = text => namesAndJobs.reduce((value, word) => value.replace(new RegExp('(?<![\\p{L}\\p{N}])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}])', 'giu'), '[identity omitted]'), text);
const blind = { version: 1, instructions: 'Rate rhythm, directness, humour, warmth and recognisability from the actual outputs. Names and exact occupation labels are omitted. This six-voice packet is a review aid, not a validated blind experimental design. Compare style without relying on job clues.',
    runId: followup.runId,
    voices: blindOrder.map((key, i) => { const label = String.fromCharCode(65 + i); const saved = previousBlind?.runId === followup.runId ? previousBlind.voices?.find(row => row.label === label) : null; return { label, turns: revised.filter(r => r.key === key && ['evening-greeting', 'rest-without-gist', 'quiet-and-boundaries'].includes(r.caseId)).map(r => ({ user: r.input, character: redact(r.output) })), reviewerNotes: saved?.reviewerNotes ?? '', scores: saved?.scores ?? null }; }) };
await writeFile(`${folder}/blind-review.json`, JSON.stringify(blind, null, 2) + '\n');
await writeFile('.local-services/cast-50-evaluation/blind-key.json', JSON.stringify(Object.fromEntries(blindOrder.map((key, i) => [String.fromCharCode(65 + i), key])), null, 2), { mode: 0o600 });
const q = comparisons.quietTurn;
const lines = ['# Live character conversation review', '',
    `${initial.length + revised.length} recorded replies; ${review.charactersInFollowup} characters in the fresh follow-up. Model: ${followup.model}. Native-speaker and founder acceptance are pending.`, '',
    '| Observation | Original pilot | Revised follow-up |', '| --- | --- | --- |',
    `| Quiet-turn replies containing questions | ${q.original.questions}/${q.original.replies} | ${q.revisedAllVoices.questions}/${q.revisedAllVoices.replies} |`,
    `| Quiet-turn mean words | ${q.original.meanWords} | ${q.revisedAllVoices.meanWords} |`,
    `| Identity replies with matched service-checkout phrases | ${comparisons.identity.original.assistantCheckouts}/${comparisons.identity.original.replies} | ${comparisons.identity.revised.assistantCheckouts}/${comparisons.identity.revised.replies} |`,
    `| Current-fact replies with matched service-checkout phrases | ${comparisons.liveFact.original.assistantCheckouts}/${comparisons.liveFact.original.replies} | ${comparisons.liveFact.revised.assistantCheckouts}/${comparisons.liveFact.revised.replies} |`, '',
    'The prompts differ and the review is unblinded. These are descriptive counts, not causal estimates or evidence of Nigerian authenticity. The pilot was used for tuning; the follow-up uses fresh messages and fresh threads. Full outputs, expectations and context are preserved in baseline.json and followup.json.', '',
    'The shared style now accepts a quiet turn without another interview question, treats discourse particles naturally, limits ordinary turns to one genuine question, keeps identity/knowledge boundaries concise, and avoids generic service checkouts. It does not change provider, photo, memory, age or payment boundaries.', '',
    `The similarity screen found ${overlapping.length} same-case pairs with at least 0.30 Jaccard overlap of four-word sequences. This flags repeated wording; it does not establish that every pair has the same personality. Voice distinctiveness remains an open acceptance concern. See quality-review.json and the six-voice blind-review.json packet.`, '',
    `Application reservations across both phases: $${(followup.reservedMicroUsdUpperBound / 1_000_000).toFixed(6)} upper bound. Database total: ${followup.databaseReservedMicroUsd === null ? 'not yet reconciled' : '$' + (followup.databaseReservedMicroUsd / 1_000_000).toFixed(6)}. This is conservative metering, not an invoice. Recorded usage: ${usage.input} input and ${usage.output} output tokens.`, '',
    'The existing short-prompt Haiku 5.5 rate configuration was rechecked against [Anthropic’s model page](https://www.anthropic.com/claude/haiku): $0.10/$0.50 per million input/output tokens up to 100K prompt tokens. This run uses the existing 48K conservative input bound and disables thinking. No project or user daily limit was increased.', '',
    'All evaluation messages are synthetic. No real user conversations were read, no admin role was granted to the evaluation account, and the login is disabled after each phase. Reports omit credentials and private character directions. The evaluator uses the real claim/provider/finish pipeline, saves checkpoints before paid calls, recovers committed output without repeating lost calls, and observes the application mutation limit.', '',
    'Still pending: native and founder review, per-voice rubric scores, blind recognisability, the complete 32-case matrix and wider conversation coverage. This report grants no release approval.', '',
];
await writeFile(`${folder}/review.md`, lines.join('\n'));
console.log(`Review generated from ${initial.length + revised.length} replies; ${overlapping.length} wording-overlap candidates; no automated acceptance claimed.`);

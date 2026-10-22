// Adapted from the user-supplied TalkingStage intelligence archive; see archive manifest.
/**
 * Repetition guard — catches the "same opener every time", recycled phrases,
 * and verbatim copies of archetype example lines that make AI chat feel fake.
 */
export function normalize(s) {
    return s
        .toLowerCase()
        .replace(/[\p{Extended_Pictographic}️]/gu, " ")
        .replace(/[^\p{L}\p{N}\s']/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function ngrams(s, n = 3) {
    const w = normalize(s).split(" ").filter(Boolean);
    const out = new Set();
    for (let i = 0; i + n <= w.length; i++)
        out.add(w.slice(i, i + n).join(" "));
    return out;
}
function jaccard(a, b) {
    if (!a.size || !b.size)
        return 0;
    let inter = 0;
    for (const x of a)
        if (b.has(x))
            inter++;
    return inter / (a.size + b.size - inter);
}
function opener(s, words = 3) {
    return normalize(s).split(" ").slice(0, words).join(" ");
}
export function assessRepetition(draftBubbles, history, exampleLines = [], lookback = 10) {
    const recent = history
        .filter((m) => m.sender === "character" && m.text)
        .slice(-lookback)
        .map((m) => m.text);
    const issues = [];
    const banned = new Set();
    let score = 0;
    const draft = draftBubbles.join(" ");
    const dg = ngrams(draft);
    // 1. Overall n-gram overlap with any recent message.
    for (const r of recent) {
        const sim = jaccard(dg, ngrams(r));
        if (sim > score)
            score = sim;
        if (sim >= 0.35) {
            issues.push(`too similar to a recent message: "${r.slice(0, 60)}"`);
            banned.add(r.slice(0, 60));
        }
    }
    // 2. Same opener as any of the last 4 messages (only if 2+ words — "lol" alone is fine).
    const op = opener(draftBubbles[0] ?? "");
    if (op.split(" ").length >= 2) {
        const recentOpeners = recent.slice(-4).map((r) => opener(r));
        if (recentOpeners.includes(op)) {
            issues.push(`reused opener "${op}"`);
            banned.add(op);
            score = Math.max(score, 0.5);
        }
    }
    // 3. Shared 4-word phrases with the recent window (catch-phrase overuse).
    const d4 = ngrams(draft, 4);
    let shared4 = 0;
    for (const r of recent.slice(-6))
        for (const g of ngrams(r, 4))
            if (d4.has(g)) {
                shared4++;
                banned.add(g);
            }
    if (shared4 >= 2) {
        issues.push(`recycled phrases (${shared4})`);
        score = Math.max(score, 0.45);
    }
    // 4. Verbatim archetype example lines.
    const nd = normalize(draft);
    for (const ex of exampleLines) {
        const ne = normalize(ex);
        if (ne.length > 12 && nd.includes(ne)) {
            issues.push("copied an archetype example line");
            banned.add(ex);
            score = 1;
        }
    }
    return { score: Math.min(1, score), issues, bannedPhrases: [...banned].slice(0, 8) };
}
/** Threshold above which we regenerate. */
export const REPETITION_THRESHOLD = 0.42;

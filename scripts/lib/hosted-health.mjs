// Fixed diagnostic labels only; never serialize a dependency response or exception.
export async function probe(work) {
  const start = performance.now();
  try {
    return { ok: (await work()) === true, durationMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, durationMs: Math.round(performance.now() - start) };
  }
}

export function backupHealth(status, now = new Date()) {
  const invalid = { ok: false, state: 'invalid', ageHours: null };
  if (!status || status.version !== 1 || !['created', 'already_created', 'failed'].includes(status.lastOutcome)) return invalid;
  if (!status.lastSuccessAt) return { ok: false, state: status.lastOutcome === 'failed' ? 'failed' : 'missing', ageHours: null };
  const time = Date.parse(status.lastSuccessAt);
  const age = (now.getTime() - time) / 3600000;
  if (!Number.isFinite(age) || age < 0 || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(status.backupId ?? '')) return invalid;
  const ageHours = Math.round(age * 10) / 10;
  if (status.lastOutcome === 'failed') return { ok: false, state: 'failed', ageHours };
  if (age > 26) return { ok: false, state: 'stale', ageHours };
  return { ok: true, state: 'recent', ageHours };
}

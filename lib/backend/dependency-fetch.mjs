// Bound each backend request without logging its URL, headers or body.
export function dependencyFetch(input, init) {
  const signals = [AbortSignal.timeout(8000)];
  if (init?.signal) signals.push(init.signal);
  if (input instanceof Request) signals.push(input.signal);
  return fetch(input, { ...init, signal: AbortSignal.any(signals) });
}

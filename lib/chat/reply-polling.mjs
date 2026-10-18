// Shared client policy. Database leases and budgets remain authoritative.
export const replyWatchMs = 60000;
export function browserTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }
  catch { return ''; }
}

export function initialReplyWatch(statuses, savedIds, repliesEnabled) {
  const active = statuses.filter(item => item.state === 'generating').map(item => item.messageId);
  if (!repliesEnabled) return active;
  // Recover only the latest visible user job, never replay an old backlog.
  const latest = savedIds.map(id => statuses.find(item => item.messageId === id)).filter(Boolean).at(-1);
  if (latest?.state === 'blocked_provider' && latest.attempts === 0) active.push(latest.messageId);
  return [...new Set(active)];
}

export async function pollReply(url, { signal, recover, fetcher = fetch }) {
  const response = await fetcher(url, { cache: 'no-store', signal });
  if ([401, 403, 404].includes(response.status)) return { state: 'inaccessible', httpStatus: response.status };
  if (!response.ok) throw new Error('status_unavailable');
  const status = await response.json();
  if (typeof status.state !== 'string') throw new Error('status_unavailable');

  // Only never-attempted jobs may start automatically. Provider failures and
  // expired leases require explicit retry, including after reopening a thread.
  if (status.state !== 'blocked_provider' || status.attempts !== 0 || !recover()) return status;
  const zone = browserTimeZone();
  const recovered = await fetcher(url, { method: 'POST', credentials: 'same-origin', signal, headers: zone ? { 'X-TalkingStage-Timezone': zone } : {} });
  if ([401, 403, 404].includes(recovered.status)) return { state: 'inaccessible', httpStatus: recovered.status };
  if (!recovered.ok) throw new Error('reply_unavailable');
  const result = await recovered.json();
  if (typeof result.state !== 'string') throw new Error('reply_unavailable');
  return result;
}

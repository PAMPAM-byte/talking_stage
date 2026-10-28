// Daily AI budgets reset at midnight UTC; show that moment in the reader's local time.
export function replyLimitNotice(now = new Date()) {
  const reset = new Date(now);
  reset.setUTCHours(24, 0, 0, 0);
  return `Today’s reply limit has been reached. Your message is saved, and replies resume at ${reset.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
}

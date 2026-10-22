const zone = 'Africa/Lagos';
export function messageDay(timestamp?: string) {
    if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return null;
    return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
}
export function messageDateLabel(timestamp: string, now: string) {
    const day = messageDay(timestamp);
    if (!day) return null;
    if (day === messageDay(now)) return 'Today';
    const today = messageDay(now);
    if (today && day === messageDay(new Date(Date.parse(`${today}T12:00:00+01:00`) - 86400000).toISOString())) return 'Yesterday';
    return new Intl.DateTimeFormat('en-NG', { timeZone: zone, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(timestamp));
}

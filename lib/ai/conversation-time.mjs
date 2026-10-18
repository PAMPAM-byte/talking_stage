// Client timezone is only a formatting hint. The actual instant is server-owned;
// neither field grants access, establishes age or changes payment behaviour.
export function conversationTime(timeZone, now = new Date()) {
    const utcNow = now.toISOString();
    if (typeof timeZone !== 'string' || timeZone.length > 80 || !/^[A-Za-z0-9_+./-]+$/.test(timeZone)) return { utcNow, userLocalTime: null };
    try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        });
        const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
        const hour = Number(parts.hour);
        const period = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
        return { utcNow, userLocalTime: { timeZone: formatter.resolvedOptions().timeZone, date: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday, time: `${parts.hour}:${parts.minute}`, period } };
    } catch { return { utcNow, userLocalTime: null }; }
}

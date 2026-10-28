// Refunds the unused part of a worst-case claim once actual token usage is known.
// No provider request (for example a context limit) is definitely unbilled; an
// ambiguous failure such as a timeout keeps the reservation at its worst case.
export function meterTransport(transport = {}) {
    const fetcher = transport.fetcher ?? fetch;
    let sent = false;
    let usage = null;
    return {
        transport: { ...transport,
            fetcher: (...args) => { sent = true; return fetcher(...args); },
            onUsage: value => {
                usage = usage ? Object.fromEntries(Object.entries(usage).map(([key, count]) => [key, count + value[key]])) : value;
                transport.onUsage?.(value);
            } },
        usage: () => usage ?? (sent ? null : { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 })
    };
}
export async function settleUsage(client, lease, actor, usage) {
    if (!usage)
        return;
    try {
        await client.rpc('settle_ai_usage', { p_lease: lease, p_actor: actor, p_input: usage.input, p_cache_write: usage.cacheWrite, p_cache_read: usage.cacheRead, p_output: usage.output });
    }
    catch { /* An unsettled reservation keeps its worst case. */ }
}

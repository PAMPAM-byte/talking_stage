const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);

export function allowsDevelopmentTestLogin({ nodeEnv, enabled, host, origin, siteUrl }) {
    if (nodeEnv !== 'development' || enabled !== '1' || !host) return false;
    try {
        const request = new URL(`http://${host}`);
        const site = new URL(siteUrl);
        if (request.host !== host || request.pathname !== '/' || !loopback.has(request.hostname)
            || !loopback.has(site.hostname) || !['http:', 'https:'].includes(site.protocol)
            || site.pathname !== '/' || site.username || site.password || site.port !== request.port) return false;
        if (origin) {
            const source = new URL(origin);
            if (source.origin !== origin || source.host !== request.host || source.protocol !== site.protocol) return false;
        }
        return true;
    } catch { return false; }
}

// Injected read keeps denial paths testable without touching private files.
export async function developmentTestCredentials(access, backendUrl, readCredentials) {
    if (!allowsDevelopmentTestLogin(access)) return null;
    try {
        const value = JSON.parse(await readCredentials());
        if (value.url !== backendUrl || value.email !== 'tester@talkingstage.example'
            || typeof value.password !== 'string' || value.password.length < 12 || value.password.length > 128) return null;
        return { email: value.email, password: value.password };
    } catch { return null; }
}

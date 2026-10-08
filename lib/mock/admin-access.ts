export type AdminRole = 'signed_out' | 'user' | 'admin' | 'expired';
let role: AdminRole = 'signed_out'; let hydrated = false; const listeners = new Set<() => void>();
const key = 'talkingstage:mock-admin-access:v1';
export const subscribeAdminAccess = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const adminRole = () => role; export const serverAdminRole = (): AdminRole => 'signed_out';
export function hydrateAdminAccess() { if (hydrated || typeof window === 'undefined') return; hydrated = true; if (process.env.NODE_ENV === 'development') { try { const r = sessionStorage.getItem(key); if (['admin', 'user', 'expired'].includes(r ?? '')) role = r as AdminRole; } catch { /* Explicit entry still works. */ } } listeners.forEach(f => f()); }
export function chooseAdminRole(next: AdminRole) { role = process.env.NODE_ENV === 'development' ? next : 'signed_out'; hydrated = true; try { sessionStorage.setItem(key, role); } catch { /* Local mock only. */ } listeners.forEach(f => f()); }
export function hasMockAdminAccess() { hydrateAdminAccess(); return process.env.NODE_ENV === 'development' && role === 'admin'; }

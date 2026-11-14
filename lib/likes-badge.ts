// The Likes tab's red number (14 Nov 2026), shared between the nav and the watcher.
let count: number | null = null;
const listeners = new Set<() => void>();
export const likesBadge = {
  get: () => count,
  set(next: number) { if (next !== count) { count = next; listeners.forEach(l => l()); } },
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};

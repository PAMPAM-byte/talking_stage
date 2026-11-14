// TalkingStage service worker: like-back notifications only (14 Nov 2026). No caching, no
// offline pages, so it never serves stale screens.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = typeof data.title === 'string' ? data.title : 'TalkingStage';
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/likes';
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof data.body === 'string' ? data.body : '',
    icon: '/apple-icon.png', badge: '/apple-icon.png',
    tag: typeof data.tag === 'string' ? data.tag : 'talkingstage', renotify: true,
    data: { url },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? '/likes', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) { await client.focus(); if ('navigate' in client) await client.navigate(url); return; }
    }
    await self.clients.openWindow(url);
  })());
});

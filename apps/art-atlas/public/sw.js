// Placeholder service worker file to avoid 404 requests from clients probing /sw.js.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

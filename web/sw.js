// Minimal Service Worker to enable PWA installability
self.addEventListener("install", (event) => {
  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // Claim clients so that the page immediately uses the new SW
  event.waitUntil(self.clients.claim());
});

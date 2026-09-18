const cacheName = "gps-helse-v1";
const media = /\/(media|exercises)\//;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Nett først, cache som reserve. Bare egne, offentlige forespørsler bufres. */
async function networkFirst(request, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit =
      (await cache.match(request)) || (fallback && (await cache.match(fallback)));
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Videoer og bilder bufres, slik at programmet virker offline etter første visning.
  if (media.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(cacheName);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Delte programmer og selve siden: ferskt innhold når nettet er der.
  if (url.pathname.startsWith("/api/shared/") || request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
  }
});

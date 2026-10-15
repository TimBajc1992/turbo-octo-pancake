/* The build injects hashed assets here so installation is atomic and offline-ready. */
const BASE = new URL("./", self.location.href).pathname;
const CACHE_PREFIX = "tezisce:" + self.registration.scope + ":";
const BUILD = "v1";
const CACHE = CACHE_PREFIX + BUILD;
const ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "icon.svg",
  BASE + "manifest.webmanifest",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(BASE)
  )
    return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch {
        return event.request.mode === "navigate"
          ? (await cache.match(BASE + "index.html")) || Response.error()
          : Response.error();
      }
    }),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

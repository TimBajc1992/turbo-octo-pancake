/* The build injects hashed assets here so installation is atomic and offline-ready. */
const BASE = new URL("./", self.location.href).pathname;
const CACHE_PREFIX = "tezisce:" + self.registration.scope + ":";
const BUILD="turbooctopancakeassetsIronEntryBALXSIy0cssturbooctopancakeassetsIronEntryBzCGz38UjsturbooctopancakeassetsLegacyEntryzb3VuqbZjsturbooctopancakeassetsbarlowcondensedlatin700normalDmwatgewoffturbooctopancakeassetsbarlowcondensedlatin700normalv1xN8Wqwoff2turbooctopancakeassetsbarlowcondensedlatinext700normalBIHFfxf0woffturbooctopancakeassetsbarlowcondensedlatinext700normalCwuXbfVRwoff2turbooctopancakeassetsdmsanslatinextwghtnormalBOFOeGcAwoff2turbooctopancakeassetsdmsanslatinwghtnormalXz1IZZA0woff2turbooctopancakeassetsibmplexmonolatin400normalCvHOgSBPwoffturbooctopancakeassetsibmplexmonolatin400normalDMJ8VG8ywoff2turbooctopancakeassetsibmplexmonolatinext400normalBmRBH3aVwoff2turbooctopancakeassetsibmplexmonolatinext400normalD3D2R8hCwoffturbooctopancakeassetsindexBYSOYaijjsturbooctopancakeassetsstyleCFCp7tycssturbooctopancakeassetsstyleCTvw1QZajs";
const CACHE = CACHE_PREFIX + BUILD;
const ASSETS=["/turbo-octo-pancake/","/turbo-octo-pancake/index.html","/turbo-octo-pancake/icon.svg","/turbo-octo-pancake/icon-192.png","/turbo-octo-pancake/icon-512.png","/turbo-octo-pancake/apple-touch-icon.png","/turbo-octo-pancake/manifest.webmanifest","/turbo-octo-pancake/assets/IronEntry-BALXSIy0.css","/turbo-octo-pancake/assets/IronEntry-BzCGz38U.js","/turbo-octo-pancake/assets/LegacyEntry-zb3VuqbZ.js","/turbo-octo-pancake/assets/barlow-condensed-latin-700-normal-Dmwat-ge.woff","/turbo-octo-pancake/assets/barlow-condensed-latin-700-normal-v1xN8_Wq.woff2","/turbo-octo-pancake/assets/barlow-condensed-latin-ext-700-normal-BIHFfxf0.woff","/turbo-octo-pancake/assets/barlow-condensed-latin-ext-700-normal-CwuXbfVR.woff2","/turbo-octo-pancake/assets/dm-sans-latin-ext-wght-normal-BOFOeGcA.woff2","/turbo-octo-pancake/assets/dm-sans-latin-wght-normal-Xz1IZZA0.woff2","/turbo-octo-pancake/assets/ibm-plex-mono-latin-400-normal-CvHOgSBP.woff","/turbo-octo-pancake/assets/ibm-plex-mono-latin-400-normal-DMJ8VG8y.woff2","/turbo-octo-pancake/assets/ibm-plex-mono-latin-ext-400-normal-BmRBH3aV.woff2","/turbo-octo-pancake/assets/ibm-plex-mono-latin-ext-400-normal-D3D2R8hC.woff","/turbo-octo-pancake/assets/index-BYSOYaij.js","/turbo-octo-pancake/assets/style-CFCp7-ty.css","/turbo-octo-pancake/assets/style-CTvw1QZa.js"];
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
      // The precached files are static and have the same content for every origin.
      // Module requests may carry an Origin header while installation fetches do
      // not; a host's Vary: Origin must not break the first offline reload.
      const cached = await cache.match(event.request, {
        ignoreVary: ASSETS.includes(url.pathname),
      });
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

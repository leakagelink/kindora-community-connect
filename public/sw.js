// Kindora offline shell: cache static assets, always prefer the network for data.
const CACHE = "kindora-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.png", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/_serverFn")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (request.destination === "script" || request.destination === "style" || request.destination === "image")) {
          const clone = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const shell = await caches.match("/");
        return shell ?? new Response("You are offline.", { status: 503, headers: { "content-type": "text/plain" } });
      }),
  );
});

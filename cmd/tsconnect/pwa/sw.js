// Network-first SW. Caches only small static assets (page shell, hashed JS/CSS, icons).
// Never caches the wasm, login/control traffic, or anything non-GET / cross-origin.
const CACHE = "arch-ssh-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const p = url.pathname;
  const cacheable = p === "/" || p === "/manifest.webmanifest" || p.startsWith("/icons/") ||
    (p.startsWith("/dist/") && /\.(js|css)$/.test(p));
  if (!cacheable) return; // wasm and everything else: plain network
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(req);
      if (hit) return hit;
      throw err;
    }
  })());
});

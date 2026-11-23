// Offline support for the trek: app shell is cached, the encrypted vault is network-first.
const CACHE = "focus-board-v2";
const SHELL = ["./", "index.html", "assets/app.css", "assets/app.js", "assets/theme.js", "assets/fonts/geist.woff2", "assets/fonts/geist-mono.woff2", "assets/fonts/newsreader.woff2", "assets/fonts/newsreader-italic.woff2", "vault.enc.json"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // never touch GitHub API calls
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

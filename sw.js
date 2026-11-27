/* 鍋事 PWA Service Worker */
const VERSION = "guoshih-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest"];
const OPTIONAL = ["./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png"];
// 第三方資源（Tailwind、字型、Three.js、圖示、圖片）：先用快取、背景更新
const RUNTIME_HOSTS = ["cdn.tailwindcss.com", "fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "unpkg.com", "images.unsplash.com", "i.postimg.cc"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(SHELL);
    await Promise.all(OPTIONAL.map(u => c.add(u).catch(() => {}))); // 圖示缺少時不影響安裝
  }).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 頁面：網路優先，離線時用快取的首頁
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 同網域靜態檔與第三方資源：stale-while-revalidate
  if (url.origin === location.origin || RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(VERSION).then(async cache => {
        const cached = await cache.match(req);
        const network = fetch(req).then(res => {
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});

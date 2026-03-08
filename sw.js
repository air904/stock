const CACHE_NAME = "air904-pwa-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/sw.js",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png"
];

// 安裝：預先快取 App 殼（離線可開）
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// 啟用：清掉舊 cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 取用策略：
// - 對 API（quotes）走 network-first（要新價格）
// - 其他資源走 cache-first（加速＋離線）
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 只處理 GET
  if (event.request.method !== "GET") return;

  // API: 走 network first，失敗就回傳 JSON 錯誤（讓你 UI 顯示）
  if (url.pathname.includes("/quotes")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => res)
        .catch(() =>
          new Response(JSON.stringify({ error: "offline", data: {} }), {
            status: 200,
            headers: { "content-type": "application/json" }
          })
        )
    );
    return;
  }

  // App shell / 靜態資源：cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          // 動態快取新資源
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match("/index.html")); // 離線 fallback
    })
  );
});

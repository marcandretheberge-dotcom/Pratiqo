const CACHE_NAME = "pratiqo-static-v2";

const PRECACHE_URLS = [
  "/offline",
  "/manifest.json",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/favicon.ico",
];

const AUTHENTICATED_PREFIXES = [
  "/account",
  "/admin",
  "/api",
  "/booking",
  "/checkout",
  "/dashboard",
  "/legal",
  "/loyalty",
  "/messages",
  "/onboarding",
  "/profile",
  "/resolution",
  "/student",
  "/teacher",
  "/upgrade",
  "/yo/checkout",
];

const STATIC_PREFIXES = [
  "/_next/static",
  "/branding",
  "/fonts",
  "/icons",
  "/images",
];

function isSensitivePath(pathname) {
  return AUTHENTICATED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isStaticAsset(pathname) {
  return (
    STATIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    pathname === "/manifest.json" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".webmanifest")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || isSensitivePath(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  if (!isStaticAsset(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

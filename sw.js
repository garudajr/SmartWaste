/* Service worker Smart Waste
   - File web sendiri (HTML/CSS/JS): ambil dari jaringan dulu, cache hanya cadangan offline.
     Jadi update yang kamu upload ke GitHub langsung terpakai (tanpa perlu ganti versi).
   - Library CDN (TensorFlow.js, Chart.js, dll.): cache dulu, karena alamatnya sudah berversi.
   - Model AI Teachable Machine: jaringan dulu, cache sebagai cadangan offline.
   Ganti VERSION hanya jika ingin memaksa pembersihan semua cache lama. */
const VERSION = "v1";
const CORE_CACHE = "smart-waste-core-" + VERSION;
const LIB_CACHE = "smart-waste-lib-" + VERSION;

const CORE_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

const LIB_HOSTS = ["cdn.jsdelivr.net"];                                  // cache dulu
const MODEL_HOSTS = ["teachablemachine.withgoogle.com", "storage.googleapis.com"]; // jaringan dulu

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CORE_CACHE && k !== LIB_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function bisaDisimpan(res) {
  return res && (res.ok || res.type === "opaque");
}

async function jaringanDulu(request, namaCache) {
  const cache = await caches.open(namaCache);
  try {
    const res = await fetch(request);
    if (bisaDisimpan(res)) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const index = await cache.match("./index.html");
      if (index) return index;
    }
    throw err;
  }
}

async function cacheDulu(request, namaCache) {
  const cache = await caches.open(namaCache);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (bisaDisimpan(res)) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (url.origin === self.location.origin) {
    event.respondWith(jaringanDulu(request, CORE_CACHE));
  } else if (LIB_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheDulu(request, LIB_CACHE));
  } else if (MODEL_HOSTS.includes(url.hostname)) {
    event.respondWith(jaringanDulu(request, LIB_CACHE));
  }
});

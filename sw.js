var CACHE = "signal-shell-v2";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(SHELL);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  var chartLib = url.href.indexOf("lightweight-charts") !== -1;
  if (url.origin !== self.location.origin && !chartLib) return;
  if (url.protocol === "ws:" || url.protocol === "wss:") return;
  var path = url.pathname;
  var isDoc = event.request.mode === "navigate" || /index\.html$/.test(path) || /\/$/.test(path);
  if (isDoc) {
    event.respondWith(fetch(event.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put("./index.html", copy); });
      return res;
    }).catch(function () { return caches.match("./index.html"); }));
    return;
  }
  event.respondWith(caches.match(event.request).then(function (hit) {
    if (hit) return hit;
    return fetch(event.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
      return res;
    });
  }));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    var msg = { type: "open-market", coin: data.coin, tab: data.tab };
    if (list.length) {
      list[0].postMessage(msg);
      return list[0].focus();
    }
    return self.clients.openWindow("./");
  }));
});

// Bump to drop old caches after changing asset files in place.
const VERSION = "gwent-v9";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

const SHELL_FILES = [
	"./",
	"index.html",
	"manifest.webmanifest",
	"common.js",
	"cards.js",
	"decks.js",
	"abilities.js",
	"factions.js",
	"gwent.js",
	"online.js",
	"lib/peerjs.min.js",
	"fx.js",
	"css/tokens.css",
	"css/base.css",
	"css/board.css",
	"css/cards.css",
	"css/overlays.css",
	"css/deckbuilder.css",
	"css/title.css",
	"css/fx.css",
	"css/guide.css",
	"img/board.jpg",
	"favicon.ico",
	"img/app/favicon-32.png",
	"img/app/icon-192.png",
	"img/app/icon-512.png",
	"img/app/icon-maskable-512.png",
];

self.addEventListener("install", event => {
	event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
	event.waitUntil(
		caches.keys()
			.then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener("fetch", event => {
	const req = event.request;
	if (req.method !== "GET")
		return;
	const url = new URL(req.url);

	if (url.origin === self.location.origin) {
		// Long music files stream with Range requests; caching them whole would delay playback (and Safari needs 206s).
		if (url.pathname.includes("/sfx/music/"))
			return;
		if (req.mode === "navigate" || /\.(js|css|html|webmanifest)$/.test(url.pathname))
			event.respondWith(networkFirst(req));
		else
			event.respondWith(cacheFirst(req));
	} else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
		event.respondWith(cacheFirst(req));
	}
	// Anything else goes straight to the network.
});

// Code: fresh when online, cached when offline.
async function networkFirst(req) {
	const cache = await caches.open(SHELL);
	try {
		const res = await fetch(req);
		if (res.ok)
			cache.put(req.mode === "navigate" ? "./" : req, res.clone());
		return res;
	} catch (err) {
		const hit = await cache.match(req.mode === "navigate" ? "./" : req, { ignoreSearch: true });
		if (hit)
			return hit;
		throw err;
	}
}

// Images, sounds, fonts: cached the first time they are used.
async function cacheFirst(req) {
	const hit = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
	if (hit)
		return hit;
	const cache = await caches.open(ASSETS);
	// Media elements send Range requests; fetch the whole file so it can be cached (206s can't be).
	const fullReq = req.headers.has("range") ? new Request(req.url) : req;
	const res = await fetch(fullReq);
	if (res.ok || res.type === "opaque")
		cache.put(fullReq, res.clone());
	return res;
}

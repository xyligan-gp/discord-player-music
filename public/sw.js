// The old documentation site registered a service worker under this path.
// This file replaces it: it removes itself and reloads open pages, so visitors get the new site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
			.then(() => self.registration.unregister())
			.then(() => self.clients.matchAll({ type: 'window' }))
			.then((clients) => clients.forEach((client) => client.navigate(client.url))),
	);
});

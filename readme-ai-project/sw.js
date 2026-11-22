const CACHE_PREFIX = 'bookbuddy-static-';
const CACHE_NAME = CACHE_PREFIX + 'v4';
const scope = new URL(self.registration.scope);
const files = [
    'index.html', 'form.html', 'favicon.svg', 'styles/style.css',
    'src/main.js', 'src/form.js', 'src/issue.js', 'src/shelf.js', 'src/motion.js',
    'src/utils/appStorage.js', 'src/utils/theme.js', 'src/utils/validate.js',
    'src/services/bookRepo.js', 'src/services/logRepo.js',
    'src/services/settingsRepo.js', 'src/services/challengeRepo.js'
];
const cacheKeys = new Set(files.map(file => new URL(file, scope).href));
const homepage = new URL('index.html', scope).href;

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache =>
        cache.addAll(files.map(file => new Request(new URL(file, scope), { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    url.search = '';
    url.hash = '';
    const key = url.href === scope.href ? homepage : url.href;
    if (!cacheKeys.has(key)) return;

    // Network-first keeps online visits current. The offline shell also matches form.html?id=…
    event.respondWith((async () => {
        try {
            const response = await fetch(request);
            if (response.ok) return response;
            if (response.status < 500) return response;
        } catch {
            // Use the installed same-origin shell when the network is unavailable.
        }
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(key) || Response.error();
    })());
});

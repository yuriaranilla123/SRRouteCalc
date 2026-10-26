importScripts('swDiscover.js');

const VERSION = 'srrc-v1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const SCOPE = self.registration.scope;
const INDEX = new URL('index.html', SCOPE).href;
const RECHECK = 12 * 60 * 60 * 1000;
const STAMP = 'x-srrc-checked';
const SKIP = ['/sw.js', '/swDiscover.js'];

const isHtml = response => (response.headers.get('content-type') || '').includes('text/html');
const storable = (response, allowHtml) => (response.ok || response.type === 'opaque') && (allowHtml || !isHtml(response));

function sameVersion(a, b) {
    const tagA = a.headers.get('etag');
    const tagB = b.headers.get('etag');
    if (tagA && tagB) return tagA === tagB;
    const dateA = a.headers.get('last-modified');
    const dateB = b.headers.get('last-modified');
    return !!(dateA && dateB && dateA === dateB);
}

async function stamped(response) {
    if (response.type === 'opaque') return response;
    const headers = new Headers(response.headers);
    headers.set(STAMP, String(Date.now()));
    return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers });
}

async function save(cache, key, fresh) {
    const old = await cache.match(key);
    if (old && fresh.type !== 'opaque' && sameVersion(old, fresh)) {
        await cache.put(key, await stamped(old));
        return false;
    }
    await cache.put(key, await stamped(fresh));
    return true;
}

async function refresh(cache, url) {
    try {
        const fresh = await fetch(new Request(url, { cache: 'no-cache' }));
        if (storable(fresh, false)) await save(cache, url, fresh);
    } catch {
        return;
    }
}

async function crawl(cache) {
    const seen = new Set();
    let level = [INDEX];
    while (level.length) {
        const next = [];
        await Promise.all(level.map(async url => {
            if (seen.has(url)) return;
            seen.add(url);
            const isIndex = url === INDEX;
            let response;
            try {
                response = await fetch(new Request(url, { cache: 'no-cache' }));
            } catch {
                return;
            }
            if (!storable(response, isIndex)) return;
            const kind = isIndex ? 'html' : /\.m?js$/.test(url) ? 'js' : null;
            const text = kind ? await response.clone().text() : null;
            await save(cache, url, response);
            if (!kind) return;
            for (const child of self.srrcDiscover(text, kind, url, INDEX)) {
                if (child.startsWith(SCOPE) && !SKIP.some(end => child.endsWith(end)) && !seen.has(child)) next.push(child);
            }
        }));
        level = next;
    }
}

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        await crawl(await caches.open(VERSION));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('srrc-') && key !== VERSION).map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

async function pageRequest(event) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(INDEX);
    const check = (async () => {
        try {
            const fresh = await fetch(new Request(INDEX, { cache: 'no-cache' }));
            if (storable(fresh, true) && await save(cache, INDEX, fresh)) await crawl(cache);
        } catch {
            return;
        }
    })();
    event.waitUntil(check);
    return cached || fetch(event.request);
}

async function storeLater(event, cache, response) {
    event.waitUntil(stamped(response.clone()).then(copy => cache.put(response.url || event.request.url, copy)).catch(() => { }));
}

async function assetRequest(event) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(event.request);
    if (cached) {
        if (Date.now() - (Number(cached.headers.get(STAMP)) || 0) > RECHECK) event.waitUntil(refresh(cache, event.request.url));
        return cached;
    }
    const response = await fetch(event.request);
    if (storable(response, false)) await storeLater(event, cache, response);
    return response;
}

async function codeRequest(event) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(event.request);
    if (cached) {
        event.waitUntil(refresh(cache, event.request.url));
        return cached;
    }
    const response = await fetch(event.request);
    if (storable(response, false)) await storeLater(event, cache, response);
    return response;
}

async function fontRequest(event) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(event.request);
    const update = () => fetch(event.request).then(response => {
        if (storable(response, false)) cache.put(event.request, response.clone());
        return response;
    });
    if (cached) {
        if (event.request.url.includes('googleapis')) event.waitUntil(update().catch(() => { }));
        return cached;
    }
    return update();
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || request.headers.has('range')) return;
    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;
    if (!sameOrigin) {
        if (FONT_HOSTS.includes(url.hostname)) event.respondWith(fontRequest(event));
        return;
    }
    if (SKIP.some(end => url.pathname.endsWith(end))) return;
    if (request.mode === 'navigate') event.respondWith(pageRequest(event));
    else if (url.pathname.includes('/assets/')) event.respondWith(assetRequest(event));
    else event.respondWith(codeRequest(event));
});
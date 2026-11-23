const CoverService = (() => {
    const CACHE_KEY = 'bookbuddy_cover_cache';
    const TTL = 30 * 24 * 60 * 60 * 1000;
    const CACHE_LIMIT = 200;
    const REQUEST_TIMEOUT = 6000;
    const IMAGE_HOSTS = ['books.google.com', 'books.googleusercontent.com', 'covers.openlibrary.org', 'archive.org'];
    const pending = new Map();
    const text = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
    const searchKey = value => text(value).normalize('NFC').toLowerCase();
    const isbnOf = value => Validate.normalizeISBN(text(value)) || undefined;
    const pageCount = value => Number.isSafeInteger(value) && value > 0 ? value : undefined;
    const yearOf = value => /^\d{4}/.test(String(value ?? '')) ? Number(String(value).slice(0, 4)) : undefined;
    const empty = () => ({ items: [], available: false });

    function normalizeCoverUrl(value) {
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null;
            if (!IMAGE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) return null;
            url.protocol = 'https:';
            url.hash = '';
            if (IMAGE_HOSTS.slice(0, 2).some(host => url.hostname === host || url.hostname.endsWith('.' + host))) {
                url.searchParams.delete('edge');
                url.searchParams.delete('zoom');
            }
            return url.href;
        } catch {
            return null;
        }
    }

    function isbnCoverUrl(isbn) {
        const normalized = isbnOf(isbn);
        return normalized ? 'https://covers.openlibrary.org/b/isbn/' + normalized + '-M.jpg?default=false' : null;
    }

    function coverCandidates(book) {
        return [...new Set([normalizeCoverUrl(book.coverUrl), isbnCoverUrl(book.isbn)].filter(Boolean))];
    }

    function debounce(callback, delay = 300) {
        let timer;
        const run = (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => callback(...args), delay);
        };
        run.cancel = () => clearTimeout(timer);
        return run;
    }

    function readCache() {
        try {
            const entries = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
            if (!Array.isArray(entries)) return [];
            const now = Date.now();
            return entries.filter(entry => typeof entry?.key === 'string' && Number.isFinite(entry.time) &&
                entry.time <= now && now - entry.time < TTL && entry.value && typeof entry.value === 'object');
        } catch {
            return [];
        }
    }

    function writeCache(key, value) {
        try {
            const entries = readCache().filter(entry => entry.key !== key);
            entries.push({ key, value, time: Date.now() });
            localStorage.setItem(CACHE_KEY, JSON.stringify(entries.slice(-CACHE_LIMIT)));
        } catch {
            // A full or unavailable browser cache must not stop a lookup.
        }
    }

    function cached(key, work, isUsable, fallback) {
        const cachedEntry = readCache().find(entry => entry.key === key && isUsable(entry.value));
        if (cachedEntry) return Promise.resolve(cachedEntry.value);
        if (pending.has(key)) return pending.get(key);
        const operation = Promise.resolve().then(work).then(value => {
            if (isUsable(value)) writeCache(key, value);
            return value;
        }).catch(() => fallback).finally(() => pending.delete(key));
        pending.set(key, operation);
        return operation;
    }

    async function request(url, decode, options = {}) {
        for (let attempt = 0; attempt < 2; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
            try {
                const response = await fetch(url, {
                    credentials: 'omit', referrerPolicy: 'no-referrer', ...options, signal: controller.signal
                });
                if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
                return response.ok ? await decode(response) : null;
            } catch {
                return null;
            } finally {
                clearTimeout(timer);
            }
        }
        return null;
    }

    function googleItems(data) {
        return (Array.isArray(data?.items) ? data.items : []).flatMap(entry => {
            const info = entry?.volumeInfo;
            const title = text(info?.title);
            if (!title || !entry.id) return [];
            const identifiers = (Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [])
                .map(item => isbnOf(item?.identifier)).filter(Boolean);
            return [{
                id: 'google:' + entry.id, title,
                authors: (Array.isArray(info.authors) ? info.authors : []).map(text).filter(Boolean),
                year: yearOf(info.publishedDate), pageCount: pageCount(info.pageCount),
                isbn13: identifiers.find(isbn => isbn.length === 13),
                isbn10: identifiers.find(isbn => isbn.length === 10),
                coverUrl: normalizeCoverUrl(info.imageLinks?.thumbnail) || normalizeCoverUrl(info.imageLinks?.smallThumbnail),
                source: 'google'
            }];
        });
    }

    function libraryItems(data) {
        return (Array.isArray(data?.docs) ? data.docs : []).flatMap(entry => {
            const title = text(entry?.title);
            if (!title || !entry.key) return [];
            const identifiers = (Array.isArray(entry.isbn) ? entry.isbn : []).map(isbnOf).filter(Boolean);
            const isbn13 = identifiers.find(isbn => isbn.length === 13);
            const isbn10 = identifiers.find(isbn => isbn.length === 10);
            const coverUrl = Number.isSafeInteger(entry.cover_i) && entry.cover_i > 0
                ? 'https://covers.openlibrary.org/b/id/' + entry.cover_i + '-M.jpg?default=false'
                : isbnCoverUrl(isbn13 || isbn10);
            return [{
                id: 'openlibrary:' + entry.key, title,
                authors: (Array.isArray(entry.author_name) ? entry.author_name : []).map(text).filter(Boolean),
                year: yearOf(entry.first_publish_year), pageCount: pageCount(entry.number_of_pages_median),
                isbn13, isbn10, coverUrl, source: 'openlibrary'
            }];
        });
    }

    async function google(query, limit) {
        const url = new URL('https://www.googleapis.com/books/v1/volumes');
        url.search = new URLSearchParams({ q: query, maxResults: limit, printType: 'books' });
        const key = typeof window === 'undefined' ? null : window.BOOKBUDDY_CONFIG?.googleBooksKey;
        if (typeof key === 'string' && key.trim()) url.searchParams.set('key', key.trim());
        const data = await request(url.href, response => response.json(),
            { referrerPolicy: 'strict-origin-when-cross-origin' });
        return { available: Array.isArray(data?.items) || data?.totalItems === 0, items: googleItems(data) };
    }

    async function openLibrary(params, limit) {
        const url = new URL('https://openlibrary.org/search.json');
        url.search = new URLSearchParams({ ...params, limit,
            fields: 'key,title,author_name,first_publish_year,isbn,cover_i,number_of_pages_median' });
        const data = await request(url.href, response => response.json());
        return { available: Array.isArray(data?.docs), items: libraryItems(data) };
    }

    function distinct(items) {
        const ids = new Set();
        const editions = new Set();
        return items.filter(item => {
            const edition = item.isbn13 || item.isbn10 ||
                searchKey(item.title) + '|' + searchKey(item.authors[0]) + '|' + (item.year || '');
            if (ids.has(item.id) || editions.has(edition)) return false;
            ids.add(item.id);
            editions.add(edition);
            return true;
        });
    }

    function searchWithStatus(query, { limit = 8 } = {}) {
        query = text(query).slice(0, 240);
        limit = Number.isFinite(limit) ? Math.max(1, Math.min(40, Math.trunc(limit))) : 8;
        if (!query) return Promise.resolve({ items: [], available: true });
        return cached('search:' + limit + ':' + searchKey(query), async () => {
            const first = await google(query, limit);
            if (first.items.some(item => item.coverUrl)) {
                return { available: true, items: distinct(first.items).slice(0, limit) };
            }
            const second = await openLibrary({ q: query }, limit);
            return { available: first.available || second.available,
                items: distinct([...second.items, ...first.items]).slice(0, limit) };
        }, value => value?.available === true && Array.isArray(value.items) && value.items.length > 0, empty());
    }

    async function search(query, options) {
        return (await searchWithStatus(query, options)).items;
    }

    function probeCover(url) {
        if (typeof Image === 'undefined') {
            return request(url, response => /^image\//i.test(response.headers.get('content-type') || ''), { method: 'HEAD' });
        }
        return new Promise(resolve => {
            const image = new Image();
            const finish = accepted => {
                clearTimeout(timer);
                image.onload = image.onerror = null;
                if (!accepted) image.removeAttribute('src');
                resolve(accepted);
            };
            const timer = setTimeout(() => finish(false), REQUEST_TIMEOUT);
            image.referrerPolicy = 'no-referrer';
            image.onload = () => finish(image.naturalWidth > 1 && image.naturalHeight > 1);
            image.onerror = () => finish(false);
            image.src = url;
        });
    }

    function resolveCover({ isbn, title, author } = {}) {
        const normalized = isbnOf(isbn);
        title = text(title).slice(0, 160);
        author = text(author).slice(0, 80);
        const none = { url: null, source: null };
        if (!normalized && !title) return Promise.resolve(none);
        return cached('resolve:' + JSON.stringify([normalized, searchKey(title), searchKey(author)]), async () => {
            const matches = item => normalized ? [item.isbn13, item.isbn10].includes(normalized) :
                searchKey(item.title) === searchKey(title) && (!author || item.authors.some(name => searchKey(name) === searchKey(author)));
            const first = await google(normalized ? 'isbn:' + normalized : title + (author ? ' inauthor:' + author : ''), 8);
            const googleMatch = first.items.find(item => item.coverUrl && matches(item));
            if (googleMatch && await probeCover(googleMatch.coverUrl)) return { url: googleMatch.coverUrl, source: 'google' };

            const byIsbn = isbnCoverUrl(normalized);
            if (byIsbn && await probeCover(byIsbn)) return { url: byIsbn, source: 'openlibrary' };
            const second = await openLibrary(normalized ? { isbn: normalized } : { title, ...(author ? { author } : {}) }, 8);
            const libraryMatch = second.items.find(item => item.coverUrl && item.coverUrl !== byIsbn && matches(item));
            if (libraryMatch && await probeCover(libraryMatch.coverUrl)) return { url: libraryMatch.coverUrl, source: 'openlibrary' };
            return none;
        }, value => Boolean(normalizeCoverUrl(value?.url)), none);
    }

    return { search, searchWithStatus, resolveCover, normalizeCoverUrl, coverCandidates, debounce };
})();

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const key = 'bookbuddy_cover_cache';
const code = ['../src/utils/validate.js', '../src/services/coverService.js']
    .map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
const response = (data, status = 200, type = 'application/json') => ({
    ok: status >= 200 && status < 300, status,
    json: async () => data,
    headers: new Headers({ 'content-type': type })
});
const google = (title = 'Книга', thumbnail = 'http://books.google.com/books/content?id=abc&edge=curl&zoom=1') => ({
    totalItems: 1,
    items: [{ id: 'abc', volumeInfo: {
        title, authors: ['Автор'], publishedDate: '2021-04',
        industryIdentifiers: [{ identifier: '978-0-385-47257-9' }],
        pageCount: 260, imageLinks: { thumbnail }
    } }]
});
const library = (title = 'Книга') => ({ docs: [{
    key: '/works/OL42W', title, author_name: ['Автор'], cover_i: 42,
    isbn: ['0385472579'], first_publish_year: 1998, number_of_pages_median: 200
}] });

function setup(fetch, extras = {}) {
    const store = new Map();
    const calls = [];
    let now = 90 * 864e5;
    const clock = class extends Date { static now() { return now; } };
    const context = vm.createContext({
        URL, URLSearchParams, AbortController, setTimeout, clearTimeout, Date: clock,
        localStorage: { getItem: name => store.get(name) ?? null, setItem: (name, value) => store.set(name, value) },
        fetch: (url, options) => {
            calls.push({ url: new URL(url), options });
            return fetch(new URL(url), options);
        },
        ...extras
    });
    return {
        service: vm.runInContext(code + '\nCoverService', context),
        calls, store, tick: duration => { now += duration; }, now: () => now
    };
}

test('normalizes Google images to HTTPS and retains useful metadata', async () => {
    const { service, calls } = setup(async () => response(google()));
    const [book] = await service.search('  Книга  ');
    assert.equal(book.coverUrl, 'https://books.google.com/books/content?id=abc');
    assert.equal(book.source, 'google');
    assert.equal(book.isbn13, '9780385472579');
    assert.equal(book.pageCount, 260);
    assert.equal(book.year, 2021);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.searchParams.get('q'), 'Книга');
    assert.equal(calls[0].options.credentials, 'omit');
});

test('falls back to Open Library when Google has no usable cover', async () => {
    const { service, calls } = setup(async url =>
        response(url.hostname === 'www.googleapis.com' ? google('Книга', 'https://evil.example/a') : library()));
    const [book] = await service.search('Книга');
    assert.equal(book.source, 'openlibrary');
    assert.equal(book.isbn10, '0385472579');
    assert.equal(book.coverUrl, 'https://covers.openlibrary.org/b/id/42-M.jpg?default=false');
    assert.deepEqual(calls.map(call => call.url.hostname), ['www.googleapis.com', 'openlibrary.org']);
});

test('resolves a checked ISBN cover after a broken Google thumbnail', async () => {
    const { service, calls } = setup(async url => {
        if (url.hostname === 'www.googleapis.com') return response(google());
        if (url.hostname === 'books.google.com') return response(null, 404);
        return response(null, 200, 'image/jpeg');
    });
    const result = await service.resolveCover({ isbn: '978-0-385-47257-9' });
    assert.equal(result.url, 'https://covers.openlibrary.org/b/isbn/9780385472579-M.jpg?default=false');
    assert.equal(result.source, 'openlibrary');
    assert.equal(calls[0].url.searchParams.get('q'), 'isbn:9780385472579');
    assert.equal(calls[2].options.method, 'HEAD');
});

test('resolves by title and author without picking a different book', async () => {
    const { service } = setup(async url => {
        if (url.hostname === 'www.googleapis.com') return response(google('Друго заглавие'));
        if (url.hostname === 'openlibrary.org') return response(library());
        return response(null, 200, 'image/jpeg');
    });
    assert.equal((await service.resolveCover({ title: 'Книга', author: 'Автор' })).source, 'openlibrary');
    assert.equal((await service.resolveCover({ title: 'Книга', author: 'Друг автор' })).url, null);
});

test('uses cache for 30 days and fetches again after the TTL', async () => {
    const { service, calls, tick } = setup(async () => response(google()));
    await service.search('Книга');
    tick(30 * 864e5 - 1);
    await service.search('книга');
    assert.equal(calls.length, 1);
    tick(1);
    await service.search('Книга');
    assert.equal(calls.length, 2);
});

test('evicts the oldest entries at the 200-record cap', async () => {
    const { service, store, now } = setup(async () => response(google()));
    store.set(key, JSON.stringify(Array.from({ length: 200 }, (_, index) =>
        ({ key: 'old-' + index, time: now(), value: { url: 'https://archive.org/x' } }))));
    await service.search('Книга');
    const after = JSON.parse(store.get(key));
    assert.equal(after.length, 200);
    assert.equal(after[0].key, 'old-1');
    assert.match(after.at(-1).key, /^search:8:/);
});

test('ignores corrupt JSON and remains usable when cache writes fail', async () => {
    const { service, store } = setup(async () => response(google()));
    store.set(key, 'not json');
    assert.equal((await service.search('Книга')).length, 1);
    const blocked = setup(async () => response(google()), {
        localStorage: { getItem() { throw Error('denied'); }, setItem() { throw Error('full'); } }
    });
    assert.equal((await blocked.service.search('Книга')).length, 1);
});

test('aborts a slow provider after 6 seconds and tries Open Library', async () => {
    const timers = [];
    let cancelled = false;
    const { service } = setup((url, { signal }) => {
        if (url.hostname === 'openlibrary.org') return Promise.resolve(response(library()));
        return new Promise((_, reject) => signal.addEventListener('abort', () => {
            cancelled = true;
            reject(Error('aborted'));
        }));
    }, {
        setTimeout(callback, timeout) { timers.push(timeout); return setImmediate(callback); },
        clearTimeout: clearImmediate
    });
    assert.equal((await service.search('Книга'))[0].source, 'openlibrary');
    assert.equal(cancelled, true);
    assert.deepEqual(timers, [6000, 6000]);
});

test('retries both 429 and server errors at most once per provider', async () => {
    const { service, calls } = setup(async url => response(null,
        url.hostname === 'www.googleapis.com' ? 429 : 503));
    assert.equal((await service.searchWithStatus('Книга')).available, false);
    assert.deepEqual(calls.map(call => call.url.hostname),
        ['www.googleapis.com', 'www.googleapis.com', 'openlibrary.org', 'openlibrary.org']);
});

test('distinguishes a successful empty lookup from an outage', async () => {
    const okay = setup(async url => response(url.hostname === 'www.googleapis.com' ? { totalItems: 0 } : { docs: [] }));
    assert.equal((await okay.service.search('')).length, 0);
    assert.equal(okay.calls.length, 0);
    const empty = await okay.service.searchWithStatus('Книга');
    assert.equal(empty.items.length, 0);
    assert.equal(empty.available, true);
    const down = setup(async () => { throw Error('offline'); });
    assert.equal((await down.service.search('Книга')).length, 0);
    assert.equal((await down.service.resolveCover({ title: 'Книга' })).source, null);
});

test('accepts only eligible cover hosts and rejects unsafe variants', () => {
    const { service } = setup(async () => response(null));
    for (const url of [
        'https://books.google.com/img', 'https://b.books.googleusercontent.com/img',
        'https://covers.openlibrary.org/img', 'https://ia801.archive.org/img'
    ]) assert.equal(service.normalizeCoverUrl(url), url);
    for (const url of [
        'https://books.google.com.evil.example/img', 'https://evilarchive.org/img',
        'https://books.google.com@evil.example/img', 'https://user@archive.org/img',
        'https://covers.openlibrary.org:1234/img', 'javascript:alert(1)', '//archive.org/img'
    ]) assert.equal(service.normalizeCoverUrl(url), null);
});

test('coalesces concurrent lookups for the same normalized query', async () => {
    let finish;
    const { service, calls } = setup(() => new Promise(resolve => { finish = resolve; }));
    const first = service.search('Книга', { limit: 5 });
    const second = service.search('  книга  ', { limit: 5 });
    await Promise.resolve();
    assert.equal(calls.length, 1);
    finish(response(google()));
    assert.equal((await first)[0].id, (await second)[0].id);
    assert.equal(calls[0].url.searchParams.get('maxResults'), '5');
});

test('assembles a unique saved cover and ISBN fallback, keeping legacy behavior', () => {
    const { service } = setup(async () => response(null));
    const saved = 'https://books.google.com/img';
    const isbn = '0385472579';
    const fallback = 'https://covers.openlibrary.org/b/isbn/0385472579-M.jpg?default=false';
    assert.equal(service.coverCandidates({ coverUrl: saved, isbn }).join(','), saved + ',' + fallback);
    assert.equal(service.coverCandidates({ isbn }).join(','), fallback);
    assert.equal(service.coverCandidates({ coverUrl: fallback, isbn }).length, 1);
    assert.equal(service.coverCandidates({ coverUrl: 'https://bad.example/a' }).length, 0);
});

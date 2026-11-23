import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const titles = [
    'Под игото', 'Железният светилник', 'Тютюн', 'Бай Ганьо',
    'Вероника решава да умре', 'Време разделно', 'Крадецът на праскови', 'Чичовци',
    'Физика на тъгата', 'Времеубежище', 'Балканска рапсодия', 'Живот в скалите',
    'Pride and Prejudice', 'Dune', 'The Hobbit', 'Beloved', '1984', 'The Great Gatsby',
    'To Kill a Mockingbird', 'The Little Prince'
];
const counts = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let lastLibrarySearch = 0;

async function probeFetch(value, options) {
    const url = new URL(value);
    if (url.hostname === 'openlibrary.org') {
        await sleep(Math.max(0, 1100 - (Date.now() - lastLibrarySearch)));
        lastLibrarySearch = Date.now();
    }
    let status = 'network';
    try {
        const response = await fetch(url, options);
        status = String(response.status);
        return response;
    } finally {
        const label = url.hostname + ' ' + status;
        counts.set(label, (counts.get(label) || 0) + 1);
    }
}

const source = ['../src/utils/validate.js', '../src/services/coverService.js']
    .map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
const service = vm.runInNewContext(source + '\nCoverService', {
    URL, URLSearchParams, AbortController, setTimeout, clearTimeout, fetch: probeFetch
});
const normalizeTitle = title => title.toLowerCase().normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

async function hasImage(url) {
    const response = await probeFetch(url, { signal: AbortSignal.timeout(6000), method: 'HEAD' }).catch(() => null);
    if (!response?.ok || !/^image\//i.test(response.headers.get('content-type') || '')) return false;
    return Number(response.headers.get('content-length') || 512) > 100;
}

console.log('| Заглавие | Потвърдена корица | Източник |');
console.log('|---|---|---|');
let accessible = 0;
for (const title of titles) {
    const result = await service.searchWithStatus(title);
    if (result.available) accessible++;
    const sought = normalizeTitle(title);
    let source = '—';
    for (const book of result.items.filter(item =>
        normalizeTitle(item.title) === sought || normalizeTitle(item.title.split(/[:–—]/u)[0]) === sought)) {
        for (const url of service.coverCandidates({ coverUrl: book.coverUrl, isbn: book.isbn13 || book.isbn10 })) {
            if (await hasImage(url)) {
                source = new URL(url).hostname === 'covers.openlibrary.org' ? 'Open Library' :
                    book.source === 'google' ? 'Google Books' : 'Open Library';
                break;
            }
        }
        if (source !== '—') break;
    }
    const outcome = source !== '—' ? 'Да' : result.available ? 'Не е потвърдена' : 'Заявката е недостъпна';
    console.log('| ' + title + ' | ' + outcome + ' | ' + source + ' |');
}
console.log('\nДостъпни справки: ' + accessible + '/' + titles.length);
console.log('Мрежови отговори:', Object.fromEntries(counts));

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const scripts = [
    '../src/utils/validate.js',
    '../src/coverUpload.js',
    '../src/services/coverService.js',
    '../src/services/bookRepo.js'
].map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');

function createEnv(storageOverrides = {}) {
    const store = new Map();
    const windowObj = { name: '' };
    const appStorage = {
        getItem: key => store.get(key) ?? null,
        setItem: (key, val) => store.set(key, String(val)),
        removeItem: key => store.delete(key),
        ...storageOverrides
    };
    const context = vm.createContext({
        URL,
        URLSearchParams,
        AbortController,
        setTimeout,
        clearTimeout,
        Date,
        Math,
        Number,
        String,
        Array,
        Object,
        RegExp,
        Error,
        Promise,
        Map,
        Set,
        window: windowObj,
        localStorage: appStorage,
        appStorage
    });
    vm.runInContext(scripts + '\nglobalThis.BookRepo = BookRepo; globalThis.CoverService = CoverService; globalThis.CoverUpload = CoverUpload;', context);
    return {
        CoverUpload: context.CoverUpload,
        CoverService: context.CoverService,
        BookRepo: context.BookRepo,
        store,
        windowObj
    };
}

function makeJpegDataUrl(byteCount) {
    const buf = Buffer.alloc(byteCount, 0xab);
    if (byteCount >= 3) {
        buf[0] = 0xff;
        buf[1] = 0xd8;
        buf[2] = 0xff;
    }
    return 'data:image/jpeg;base64,' + buf.toString('base64');
}

test('isValidCoverDataUrl accepts valid JPEG base64 data URLs up to 200 KB', () => {
    const { CoverUpload } = createEnv();
    assert.equal(CoverUpload.isValidCoverDataUrl(makeJpegDataUrl(64)), true);
    assert.equal(CoverUpload.isValidCoverDataUrl(makeJpegDataUrl(120 * 1024)), true);
    assert.equal(CoverUpload.isValidCoverDataUrl(makeJpegDataUrl(200 * 1024)), true);
});

test('isValidCoverDataUrl rejects wrong prefixes, SVG, javascript:, corrupt base64, and payloads > 200 KB', () => {
    const { CoverUpload } = createEnv();
    const validB64 = Buffer.from('hello world').toString('base64');

    // Wrong prefixes / dangerous schemes
    assert.equal(CoverUpload.isValidCoverDataUrl(''), false);
    assert.equal(CoverUpload.isValidCoverDataUrl(null), false);
    assert.equal(CoverUpload.isValidCoverDataUrl(undefined), false);
    assert.equal(CoverUpload.isValidCoverDataUrl('javascript:alert(1)'), false);
    assert.equal(CoverUpload.isValidCoverDataUrl('data:image/svg+xml;base64,' + validB64), false);
    assert.equal(CoverUpload.isValidCoverDataUrl('data:image/png;base64,' + validB64), false);
    assert.equal(CoverUpload.isValidCoverDataUrl('data:image/webp;base64,' + validB64), false);
    assert.equal(CoverUpload.isValidCoverDataUrl('data:text/html;base64,' + validB64), false);
    assert.equal(CoverUpload.isValidCoverDataUrl('https://covers.openlibrary.org/b/id/1-M.jpg'), false);

    // Empty or corrupt base64
    assert.equal(CoverUpload.isValidCoverDataUrl('data:image/jpeg;base64,'), false);
    assert.equal(CoverUpload.isValidCoverDataUrl('data:image/jpeg;base64,abc'), false); // length not multiple of 4
    assert.equal(CoverUpload.isValidCoverDataUrl('data:image/jpeg;base64,ab=c'), false); // '=' in middle
    assert.equal(CoverUpload.isValidCoverDataUrl('data:image/jpeg;base64,===='), false);
    assert.equal(CoverUpload.isValidCoverDataUrl('data:image/jpeg;base64,ab$%'), false);
    assert.equal(CoverUpload.isValidCoverDataUrl('data:image/jpeg;base64,YWJj ZGVm'), false); // whitespace

    // Over 200 KB decoded limit
    assert.equal(CoverUpload.isValidCoverDataUrl(makeJpegDataUrl(200 * 1024 + 1)), false);
});

test('fitDimensions scales images down to at most 360x540 while preserving aspect ratio', () => {
    const { CoverUpload } = createEnv();

    // 3000x2000 (3:2 landscape) -> 360x240
    assert.deepEqual({ ...CoverUpload.fitDimensions(3000, 2000) }, { width: 360, height: 240 });

    // 1200x1800 (2:3 portrait) -> 360x540
    assert.deepEqual({ ...CoverUpload.fitDimensions(1200, 1800) }, { width: 360, height: 540 });

    // 1000x2000 (1:2 tall portrait) -> 270x540
    assert.deepEqual({ ...CoverUpload.fitDimensions(1000, 2000) }, { width: 270, height: 540 });

    // Small image (200x300) is not upscaled
    assert.deepEqual({ ...CoverUpload.fitDimensions(200, 300) }, { width: 200, height: 300 });

    // Invalid dimensions throw Bulgarian processing error
    assert.throws(() => CoverUpload.fitDimensions(0, 100), {
        message: 'Не успях да обработя снимката. Опитай с друга.'
    });
    assert.throws(() => CoverUpload.fitDimensions(-10, 200), {
        message: 'Не успях да обработя снимката. Опитай с друга.'
    });
});

test('validateInputFile enforces allowed MIME types and 10 MB input limit with Bulgarian errors', () => {
    const { CoverUpload } = createEnv();

    assert.equal(CoverUpload.validateInputFile({ type: 'image/jpeg', size: 500_000 }), true);
    assert.equal(CoverUpload.validateInputFile({ type: 'image/png', size: 10 * 1024 * 1024 }), true);
    assert.equal(CoverUpload.validateInputFile({ type: 'image/webp', size: 1024 }), true);

    for (const bad of [
        null,
        { type: 'image/svg+xml', size: 500 },
        { type: 'text/plain', size: 100 },
        { type: 'application/pdf', size: 1024 },
        { type: 'image/jpeg', size: 0 }
    ]) {
        assert.throws(() => CoverUpload.validateInputFile(bad), {
            message: 'Файлът не е изображение.'
        });
    }

    assert.throws(() => CoverUpload.validateInputFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }), {
        message: 'Снимката е твърде голяма (над 10 MB).'
    });
});

test('encodeWithinLimit steps down quality to 0.5 and then dimensions to stay within 120 KB', () => {
    const { CoverUpload } = createEnv();

    // Case 1: Fits immediately at quality 0.82
    const immediate = CoverUpload.encodeWithinLimit((w, h, q) => makeJpegDataUrl(40 * 1024), 360, 540);
    assert.equal(immediate.width, 360);
    assert.equal(immediate.height, 540);
    assert.equal(immediate.quality, 0.82);
    assert.equal(immediate.bytes, 40 * 1024);

    // Case 2: Needs quality step-down to 0.58
    const steppedQuality = CoverUpload.encodeWithinLimit((w, h, q) => {
        const size = q > 0.6 ? 150 * 1024 : 95 * 1024;
        return makeJpegDataUrl(size);
    }, 360, 540);
    assert.equal(steppedQuality.width, 360);
    assert.equal(steppedQuality.height, 540);
    assert.equal(steppedQuality.quality, 0.58);
    assert.equal(steppedQuality.bytes, 95 * 1024);

    // Case 3: Still > 120 KB at quality 0.50, so dimensions are stepped down
    const steppedSize = CoverUpload.encodeWithinLimit((w, h, q) => {
        const size = w > 280 ? 140 * 1024 : 88 * 1024;
        return makeJpegDataUrl(size);
    }, 360, 540);
    assert.ok(steppedSize.width <= 280);
    assert.equal(Math.round((steppedSize.width / steppedSize.height) * 100), Math.round((360 / 540) * 100));
    assert.equal(steppedSize.quality, 0.5);
    assert.equal(steppedSize.bytes, 88 * 1024);

    // Case 4: Always > 120 KB -> rejects with Bulgarian error
    assert.throws(() => {
        CoverUpload.encodeWithinLimit(() => makeJpegDataUrl(135 * 1024), 360, 540);
    }, {
        message: 'Не успях да обработя снимката. Опитай с друга.'
    });
});

test('BookRepo stores uploaded data URLs, normalizes coverSource, and keeps legacy books working', () => {
    const { BookRepo, CoverService } = createEnv();
    const dataUrl = makeJpegDataUrl(18 * 1024);

    const uploadedBook = BookRepo.addBook({
        title: 'Железният светилник',
        author: 'Димитър Талев',
        totalPages: 400,
        currentPage: 25,
        coverUrl: dataUrl
    });
    assert.equal(uploadedBook.coverUrl, dataUrl);
    assert.equal(uploadedBook.coverSource, 'upload');
    assert.deepEqual([...CoverService.coverCandidates(uploadedBook)], [dataUrl]);

    const googleBook = BookRepo.addBook({
        title: 'Под игото',
        author: 'Иван Вазов',
        totalPages: 480,
        currentPage: 0,
        coverUrl: 'https://books.google.com/books/content?id=vazov',
        coverSource: 'google'
    });
    assert.equal(googleBook.coverUrl, 'https://books.google.com/books/content?id=vazov');
    assert.equal(googleBook.coverSource, 'google');

    const legacyBook = BookRepo.addBook({
        title: 'Тютюн',
        author: 'Димитър Димов',
        totalPages: 720,
        currentPage: 100
    });
    assert.equal('coverUrl' in legacyBook, false);
    assert.equal('coverSource' in legacyBook, false);
});

test('BookRepo catches QuotaExceededError and saves the book without the cover', () => {
    const dataUrl = makeJpegDataUrl(90 * 1024);
    const { BookRepo, store, windowObj } = createEnv({
        setItem(key, val) {
            if (String(val).includes('data:image/jpeg;base64,')) {
                const err = new Error('Storage quota exceeded');
                err.name = 'QuotaExceededError';
                throw err;
            }
            store.set(key, String(val));
        }
    });

    const saved = BookRepo.addBook({
        title: 'Бай Ганьо',
        author: 'Алеко Константинов',
        totalPages: 210,
        currentPage: 10,
        coverUrl: dataUrl,
        coverSource: 'upload'
    });

    assert.equal(saved.title, 'Бай Ганьо');
    assert.equal(saved.coverDroppedForQuota, true);
    assert.equal('coverUrl' in saved, false);
    assert.equal('coverSource' in saved, false);
    assert.equal(BookRepo.getAllBooks().length, 1);
    assert.equal(BookRepo.getAllBooks()[0].title, 'Бай Ганьо');
    assert.ok(windowObj.name.includes('Няма място в браузъра за корицата. Книгата е запазена без нея.'));
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/shelfLayout.js', import.meta.url), 'utf8');
const { hashString, bookLook, fitTitle, layoutShelves, palette, contrastRatio } =
    vm.runInNewContext(source + '\nShelfLayout');
const book = (id, totalPages = 320) => ({ id, title: 'Заглавие ' + id, author: 'Мария Русева', totalPages });
const ids = rows => Array.from(rows).flatMap(row => Array.from(row.books, item => item.id));

test('book appearance is stable, page-sensitive and within the prototype bounds', () => {
    assert.equal(hashString('Читалня'), hashString('Читалня'));
    assert.ok(hashString('Читалня') >= 0);
    assert.notEqual(hashString('Читалня'), hashString('Библиотека'));
    const thin = bookLook(book(1, 10));
    const thick = bookLook(book(1, 3000));
    assert.deepEqual(bookLook(book(1, 10)), thin);
    assert.equal(thin.thickness, 22);
    assert.equal(thick.thickness, 64);
    assert.equal(thin.height, thick.height);
    for (let id = 0; id < 200; id++) {
        const { height, coverWidth, lean, kind } = bookLook(book(id));
        assert.ok(height >= 205 && height <= 266);
        assert.equal(coverWidth, Math.round(height * 2 / 3));
        assert.ok(Math.abs(lean) <= 2);
        assert.ok(['cloth', 'label', 'paper'].includes(kind));
    }
});

test('all prototype spine colours have at least 4.5:1 contrast', () => {
    assert.equal(palette.length, 15);
    for (const { spine, ink } of palette) {
        assert.ok(contrastRatio(spine, ink) >= 4.5, spine + ' / ' + ink);
    }
});

test('fitting keeps the whole title when possible and shrinks before truncating', () => {
    const measure = (title, size) => [...title].length * size;
    const result = (title, space) => JSON.parse(JSON.stringify(fitTitle(title, space, 14, 9, measure)));
    assert.deepEqual(result('Книга', 90), { text: 'Книга', fontSize: 14 });
    assert.deepEqual(result('Книга', 55), { text: 'Книга', fontSize: 11 });
    assert.deepEqual(result('Още заглавия', 47), { text: 'Още…', fontSize: 9 });
    assert.deepEqual(result('Още заглавия', 4), { text: '', fontSize: 9 });
    assert.deepEqual(result('📘Дълга книга', 18), { text: '📘…', fontSize: 9 });
});

test('empty and single-book libraries still produce a usable row', () => {
    assert.equal(layoutShelves([], 360).length, 1);
    assert.deepEqual(ids(layoutShelves([], 360)), []);
    assert.deepEqual(ids(layoutShelves([book(1)], 360)), [1]);
});

test('wrapping preserves all 200 books and accounts for both special entries and each gap', () => {
    const books = Array.from({ length: 200 }, (_, id) => book(id, 50 + id * 5));
    const rows = layoutShelves(books, 700, { faceOut: 170, stack: 190 });
    assert.deepEqual(ids(rows), books.map(item => item.id));
    assert.equal(rows[0].faceOut, true);
    assert.equal(rows.at(-1).stack, true);
    for (const row of rows) {
        const width = row.books.reduce((sum, item) => sum + bookLook(item).thickness + 1, 0) +
            (row.faceOut ? 170 : 0) + (row.stack ? 190 : 0);
        assert.ok(width <= 700);
    }
});

test('an oversized book or extra on a very narrow row never drops a book or creates a leading blank', () => {
    const books = [book(1), book(2), book(3)];
    const rows = layoutShelves(books, 1, { faceOut: 170, stack: 190 });
    assert.equal(rows.length, 5);
    assert.deepEqual(ids(rows), [1, 2, 3]);
    assert.equal(layoutShelves(books, 1)[0].books[0].id, 1);
    assert.equal(layoutShelves(books, Infinity, { faceOut: 170 }).length, 1);
});

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = new URL('../', import.meta.url);
const source = readFileSync(new URL('sw.js', app), 'utf8');
const self = {
    registration: { scope: 'https://bookbuddy.test/' },
    addEventListener() {}
};
const files = vm.runInNewContext(source + '\nfiles', { self, URL });

test('each service worker asset exists and belongs to the application', () => {
    assert.equal(files.length, new Set(files).size);
    for (const file of files) {
        const url = new URL(file, app);
        assert.ok(url.href.startsWith(app.href), file);
        assert.ok(existsSync(url), 'Missing precached asset: ' + file);
    }
});

test('the home and form precache every local script and stylesheet', () => {
    const preview = 'https://bookbuddy.test/';
    for (const page of ['index.html', 'form.html']) {
        const html = readFileSync(new URL(page, app), 'utf8');
        for (const [, asset] of html.matchAll(/\b(?:src|href)="([^"]+)"/gi)) {
            const url = new URL(asset, preview);
            if (url.origin !== new URL(preview).origin || !/\.(?:js|css)$/.test(url.pathname)) continue;
            assert.ok(files.includes(url.pathname.slice(1)), page + ': ' + asset);
        }
    }
});

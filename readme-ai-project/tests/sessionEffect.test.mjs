import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const javascript = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');
const context = vm.createContext({ document: { addEventListener() {} } });
const sessionEffect = vm.runInContext(javascript('main.js') + '\nsessionEffect', context);
const finished = { currentPage: 100, totalPages: 100 };
const older = { id: 'legacy', dateISO: '2026-09-12', pages: 8 };

test('ambiguous legacy edits and deletes preserve the stored end-of-book progress', () => {
    for (const next of [null, { ...older, pages: 2 }]) {
        const effect = sessionEffect(finished, older, next);
        assert.equal(effect.page, 100);
        assert.equal(effect.appliedPages, undefined);
        assert.equal(effect.preservedLegacyProgress, true);
    }
});

test('metadata-only edits do not give a capped legacy session an invented page delta', () => {
    const effect = sessionEffect(finished, older, { ...older, note: 'Updated' });
    assert.equal(effect.page, 100);
    assert.equal(effect.appliedPages, undefined);
    assert.equal(effect.preservedLegacyProgress, undefined);
});

test('known page contributions and unambiguous legacy edits still apply correctly', () => {
    const exact = sessionEffect(finished, { ...older, appliedPages: 3 }, { ...older, pages: 2 });
    assert.equal(exact.page, 99);
    assert.equal(exact.appliedPages, 2);
    const inProgress = sessionEffect({ currentPage: 28, totalPages: 100 }, older, { ...older, pages: 2 });
    assert.equal(inProgress.page, 22);
});

test('persist the known page contribution even when it equals all pages read', () => {
    const map = new Map();
    const appStorage = {
        getItem: key => map.get(key) ?? null,
        setItem: (key, value) => map.set(key, value)
    };
    const repo = vm.runInNewContext(javascript('services/logRepo.js') + '\nLogRepo', { appStorage });
    const newRecord = repo.addLog({ bookId: '1', dateISO: '2026-09-12', pages: 4, appliedPages: 4 });
    assert.equal(repo.getLogById(newRecord.id).appliedPages, 4);
    repo.updateLog(newRecord.id, { pages: 6, appliedPages: 6 });
    assert.equal(repo.getLogById(newRecord.id).appliedPages, 6);
});

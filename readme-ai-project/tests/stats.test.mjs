import assert from 'node:assert/strict';
import stats from '../src/stats.js';

const sampleBooks = [
    { id: 1, title: 'Дълбока работа', author: 'Кал Нюпорт', totalPages: 296, currentPage: 112 },
    { id: 2, title: 'Престъпление и наказание', author: 'Фьодор Достоевски', totalPages: 671, currentPage: 671 },
    { id: 3, title: 'Братя Карамазови', author: 'Фьодор Достоевски', totalPages: 824, currentPage: 824 },
    { id: 4, title: 'Sapiens', author: 'Ювал Ноа Харари', totalPages: 443, currentPage: 443 }
];

const sampleLogs = [
    { id: '1', bookId: 1, dateISO: '2026-11-22', pages: 12, note: 'Днес' },
    { id: '2', bookId: 1, dateISO: '2026-11-21', pages: 15, note: 'Вчера' },
    { id: '3', bookId: 4, dateISO: '2026-11-21', pages: 10, note: 'Втора сесия за деня' },
    { id: '4', bookId: 1, dateISO: '2026-11-20', pages: 8, note: '' },
    // gap on 2026-11-19
    { id: '5', bookId: 2, dateISO: '2026-02-14', pages: 40, note: '' },
    { id: '6', bookId: 2, dateISO: '2026-02-13', pages: 35, note: '' },
    { id: '7', bookId: 3, dateISO: '2026-02-12', pages: 30, note: '' },
    { id: '8', bookId: 3, dateISO: '2026-02-11', pages: 28, note: '' },
    { id: '9', bookId: 3, dateISO: '2026-02-10', pages: 25, note: '' },
    { id: '10', bookId: 4, dateISO: '2026-06-05', pages: 50, note: '' },
    // invalid log entries that must be ignored
    { id: 'bad-1', bookId: 1, dateISO: 'invalid-date', pages: 100 },
    { id: 'bad-2', bookId: 1, dateISO: '2026-11-22', pages: -5 },
    { id: 'bad-3', bookId: 1, dateISO: '2026-11-22', pages: 0 }
];

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log(`PASS [${passed}]: ${name}`);
}

test('isValidDateISO validates real calendar dates and rejects invalid ones', () => {
    assert.equal(stats.isValidDateISO('2026-11-22'), true);
    assert.equal(stats.isValidDateISO('2026-02-29'), false);
    assert.equal(stats.isValidDateISO('2024-02-29'), true);
    assert.equal(stats.isValidDateISO('22-11-2026'), false);
    assert.equal(stats.isValidDateISO(''), false);
});

test('aggregatePagesByDay sums multiple sessions on the same day and ignores invalid logs', () => {
    const byDay = stats.aggregatePagesByDay(sampleLogs);
    assert.equal(byDay.get('2026-11-22'), 12);
    assert.equal(byDay.get('2026-11-21'), 25); // 15 + 10
    assert.equal(byDay.get('2026-11-20'), 8);
    assert.equal(byDay.has('invalid-date'), false);
});

test('calculateCurrentStreak counts consecutive qualifying days ending today or yesterday', () => {
    assert.equal(stats.calculateCurrentStreak(sampleLogs, 1, '2026-11-22'), 3);
    // If today (2026-11-23) has no logs yet, streak still holds from yesterday (2026-11-22)
    assert.equal(stats.calculateCurrentStreak(sampleLogs, 1, '2026-11-23'), 3);
    // If two days pass without logs (2026-11-24), streak is 0
    assert.equal(stats.calculateCurrentStreak(sampleLogs, 1, '2026-11-24'), 0);
    // Higher minPages threshold (10 pages): 2026-11-20 had only 8 pages, so streak is 2
    assert.equal(stats.calculateCurrentStreak(sampleLogs, 10, '2026-11-22'), 2);
});

test('calculateLongestStreak finds the longest consecutive run in a year', () => {
    // Feb 10..14 is 5 consecutive days
    assert.equal(stats.calculateLongestStreak(sampleLogs, 1, '2026'), 5);
    assert.equal(stats.calculateLongestStreak(sampleLogs, 28, '2026'), 4); // Feb 11..14
    assert.equal(stats.calculateLongestStreak([], 1, '2026'), 0);
});

test('calculateDailyReadingMetrics computes total pages, averages, peak day and today pages', () => {
    const m = stats.calculateDailyReadingMetrics(sampleLogs, { year: '2026', todayISO: '2026-11-22' });
    // Total valid pages: 12 + 15 + 10 + 8 + 40 + 35 + 30 + 28 + 25 + 50 = 253
    assert.equal(m.totalPages, 253);
    assert.equal(m.totalSessions, 10);
    assert.equal(m.activeDays, 9); // 2026-11-21 has 2 sessions
    assert.equal(m.avgPagesPerActiveDay, Math.round(253 / 9)); // 28
    assert.equal(m.avgPagesPerSession, Math.round(253 / 10)); // 25
    assert.deepEqual(m.peakDay, { dateISO: '2026-06-05', pages: 50 });
    assert.equal(m.todayPages, 12);
});

test('calculateMonthlyBreakdown and findStrongestMonth identify the peak month', () => {
    const monthly = stats.calculateMonthlyBreakdown(sampleLogs, '2026');
    assert.equal(monthly.length, 12);
    assert.equal(monthly[1].pages, 158); // February: 40+35+30+28+25
    assert.equal(monthly[1].activeDays, 5);
    assert.equal(monthly[5].pages, 50);  // June
    assert.equal(monthly[10].pages, 45); // November: 12+15+10+8

    const strongest = stats.findStrongestMonth(sampleLogs, '2026');
    assert.equal(strongest.monthKey, '2026-02');
    assert.equal(strongest.label, 'февруари');
    assert.equal(strongest.pages, 158);
    assert.equal(stats.findStrongestMonth([], '2026'), null);
});

test('calculateAuthorBreakdown and findMostReadAuthor rank authors by session pages', () => {
    const authors = stats.calculateAuthorBreakdown(sampleLogs, sampleBooks, '2026');
    assert.equal(authors.length, 3);
    // Достоевски: 40+35+30+28+25 = 158 pages across 2 books
    assert.equal(authors[0].author, 'Фьодор Достоевски');
    assert.equal(authors[0].pages, 158);
    assert.equal(authors[0].booksCount, 2);
    // Харари: 10 + 50 = 60 pages
    assert.equal(authors[1].author, 'Ювал Ноа Харари');
    assert.equal(authors[1].pages, 60);
    // Кал Нюпорт: 12 + 15 + 8 = 35 pages
    assert.equal(authors[2].author, 'Кал Нюпорт');
    assert.equal(authors[2].pages, 35);

    const topAuthor = stats.findMostReadAuthor(sampleLogs, sampleBooks, '2026');
    assert.equal(topAuthor.author, 'Фьодор Достоевски');
    assert.equal(topAuthor.pages, 158);
    assert.equal(stats.findMostReadAuthor([], sampleBooks, '2026'), null);
});

test('buildYearCalendarMap builds 365 days for 2026 with intensity levels and 12 month starts', () => {
    const cal = stats.buildYearCalendarMap(sampleLogs, 2026);
    assert.equal(cal.year, '2026');
    assert.equal(cal.days.length, 365);
    assert.equal(cal.monthStarts.length, 12);
    assert.equal(cal.activeDays, 9);
    assert.equal(cal.totalPages, 253);
    assert.equal(cal.maxPages, 50);

    const nov21 = cal.days.find(d => d.dateISO === '2026-11-21');
    assert.equal(nov21.pages, 25);
    assert.equal(nov21.level, 3);

    const jun05 = cal.days.find(d => d.dateISO === '2026-06-05');
    assert.equal(jun05.pages, 50);
    assert.equal(jun05.level, 4);

    const jan01 = cal.days.find(d => d.dateISO === '2026-01-01');
    assert.equal(jan01.pages, 0);
    assert.equal(jan01.level, 0);
});

console.log(`ALL ${passed} TESTS PASSED.`);
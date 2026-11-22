// Pure statistical functions for the Reading Journal & Statistics screen.
// No DOM, storage, or external dependencies.

const BG_MONTH_NAMES = [
    'януари', 'февруари', 'март', 'април', 'май', 'юни',
    'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'
];

const BG_MONTH_SHORT = [
    'яну', 'фев', 'мар', 'апр', 'май', 'юни',
    'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'
];

function isValidDateISO(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatLocalDayISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDaysISO(dateISO, deltaDays) {
    const date = new Date(dateISO + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + deltaDays);
    return date.toISOString().slice(0, 10);
}

function normalizeValidLogs(logs = []) {
    if (!Array.isArray(logs)) return [];
    return logs
        .filter(log => log && isValidDateISO(log.dateISO) && Number.isFinite(Number(log.pages)) && Number(log.pages) > 0)
        .map(log => ({
            id: String(log.id ?? ''),
            bookId: String(log.bookId ?? ''),
            dateISO: log.dateISO,
            pages: Math.round(Number(log.pages)),
            note: typeof log.note === 'string' ? log.note.trim() : ''
        }));
}

/**
 * Aggregates total pages read on each dateISO.
 * Returns a Map<dateISO, number> sorted chronologically by key.
 */
function aggregatePagesByDay(logs = []) {
    const totals = new Map();
    for (const log of normalizeValidLogs(logs)) {
        totals.set(log.dateISO, (totals.get(log.dateISO) || 0) + log.pages);
    }
    return new Map([...totals.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

/**
 * Calculates current streak of consecutive days with pages >= minPages
 * ending on todayISO (or yesterday if todayISO has fewer than minPages).
 */
function calculateCurrentStreak(logs = [], minPages = 1, todayISO = formatLocalDayISO(new Date())) {
    const threshold = Math.max(1, Number(minPages) || 1);
    if (!isValidDateISO(todayISO)) return 0;
    const byDay = aggregatePagesByDay(logs);
    let cursor = todayISO;
    if ((byDay.get(cursor) || 0) < threshold) {
        cursor = addDaysISO(cursor, -1);
    }
    let streak = 0;
    while ((byDay.get(cursor) || 0) >= threshold) {
        streak++;
        cursor = addDaysISO(cursor, -1);
    }
    return streak;
}

/**
 * Calculates the longest consecutive streak of days with pages >= minPages.
 * If year (e.g. "2026") is passed, only considers sessions in that year.
 */
function calculateLongestStreak(logs = [], minPages = 1, year = null) {
    const threshold = Math.max(1, Number(minPages) || 1);
    const yearPrefix = year ? String(year) : null;
    const byDay = aggregatePagesByDay(logs);
    let best = 0;
    let current = 0;
    let prevDateMs = null;

    for (const [dateISO, pages] of byDay.entries()) {
        if (yearPrefix && !dateISO.startsWith(yearPrefix)) continue;
        if (pages < threshold) continue;
        const ms = Date.parse(dateISO + 'T00:00:00Z');
        current = (prevDateMs !== null && ms - prevDateMs === 86400000) ? current + 1 : 1;
        if (current > best) best = current;
        prevDateMs = ms;
    }
    return best;
}

/**
 * Computes pages-per-day and pages-per-session metrics.
 * Optionally scoped to a specific year (e.g. "2026").
 */
function calculateDailyReadingMetrics(logs = [], options = {}) {
    const { year = null, todayISO = formatLocalDayISO(new Date()) } = options;
    const yearPrefix = year ? String(year) : null;
    const valid = normalizeValidLogs(logs).filter(l => !yearPrefix || l.dateISO.startsWith(yearPrefix));
    const byDay = aggregatePagesByDay(valid);

    const totalPages = valid.reduce((sum, l) => sum + l.pages, 0);
    const totalSessions = valid.length;
    const activeDays = byDay.size;
    const avgPagesPerActiveDay = activeDays > 0 ? Math.round(totalPages / activeDays) : 0;
    const avgPagesPerSession = totalSessions > 0 ? Math.round(totalPages / totalSessions) : 0;

    let peakDay = null;
    for (const [dateISO, pages] of byDay.entries()) {
        if (!peakDay || pages > peakDay.pages || (pages === peakDay.pages && dateISO > peakDay.dateISO)) {
            peakDay = { dateISO, pages };
        }
    }

    let peakSession = null;
    for (const log of valid) {
        if (!peakSession || log.pages > peakSession.pages) {
            peakSession = { id: log.id, dateISO: log.dateISO, pages: log.pages, bookId: log.bookId };
        }
    }

    const todayPages = isValidDateISO(todayISO) ? (aggregatePagesByDay(logs).get(todayISO) || 0) : 0;

    return {
        totalPages,
        totalSessions,
        activeDays,
        avgPagesPerActiveDay,
        avgPagesPerSession,
        peakDay,
        peakSession,
        todayPages
    };
}

/**
 * Returns 12 monthly buckets for a given year:
 * [{ monthIndex: 0..11, monthKey: 'YYYY-MM', label, shortLabel, pages, sessions, activeDays, avgPerSession }]
 */
function calculateMonthlyBreakdown(logs = [], year = new Date().getFullYear()) {
    const yearStr = String(year);
    const valid = normalizeValidLogs(logs).filter(l => l.dateISO.startsWith(yearStr + '-'));

    const buckets = Array.from({ length: 12 }, (_, idx) => {
        const mm = String(idx + 1).padStart(2, '0');
        return {
            monthIndex: idx,
            monthKey: `${yearStr}-${mm}`,
            label: BG_MONTH_NAMES[idx],
            shortLabel: BG_MONTH_SHORT[idx],
            pages: 0,
            sessions: 0,
            daysSet: new Set()
        };
    });

    for (const log of valid) {
        const monthIdx = Number(log.dateISO.slice(5, 7)) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
            buckets[monthIdx].pages += log.pages;
            buckets[monthIdx].sessions += 1;
            buckets[monthIdx].daysSet.add(log.dateISO);
        }
    }

    return buckets.map(({ daysSet, ...rest }) => ({
        ...rest,
        activeDays: daysSet.size,
        avgPerSession: rest.sessions > 0 ? Math.round(rest.pages / rest.sessions) : 0
    }));
}

/**
 * Finds the strongest reading month in the given year by total session pages.
 * Tie-breaker: more active days, then earlier monthKey.
 * Returns null if no pages were read in that year.
 */
function findStrongestMonth(logs = [], year = new Date().getFullYear()) {
    const months = calculateMonthlyBreakdown(logs, year).filter(m => m.pages > 0);
    if (!months.length) return null;
    months.sort((a, b) =>
        b.pages - a.pages ||
        b.activeDays - a.activeDays ||
        a.monthKey.localeCompare(b.monthKey)
    );
    return months[0];
}

/**
 * Aggregates reading session pages and session count by book author.
 * Optionally scoped to a specific year.
 */
function calculateAuthorBreakdown(logs = [], books = [], year = null) {
    const yearPrefix = year ? String(year) + '-' : null;
    const valid = normalizeValidLogs(logs).filter(l => !yearPrefix || l.dateISO.startsWith(yearPrefix));
    const booksById = new Map((Array.isArray(books) ? books : []).map(b => [String(b.id), b]));

    const byAuthor = new Map();
    for (const log of valid) {
        const book = booksById.get(String(log.bookId));
        const author = (book?.author || '').trim();
        if (!author) continue;
        const entry = byAuthor.get(author) || { author, pages: 0, sessions: 0, bookIds: new Set() };
        entry.pages += log.pages;
        entry.sessions += 1;
        entry.bookIds.add(String(book.id));
        byAuthor.set(author, entry);
    }

    return [...byAuthor.values()]
        .map(({ bookIds, ...rest }) => ({ ...rest, booksCount: bookIds.size }))
        .sort((a, b) => b.pages - a.pages || b.sessions - a.sessions || a.author.localeCompare(b.author, 'bg'));
}

/**
 * Finds the most-read author from reading sessions (optionally scoped to year).
 * Returns null if no sessions match known authors.
 */
function findMostReadAuthor(logs = [], books = [], year = null) {
    const authors = calculateAuthorBreakdown(logs, books, year);
    return authors.length ? authors[0] : null;
}

/**
 * Quantizes daily pages into intensity levels 0..4 for the annual calendar map.
 */
function intensityLevel(pages) {
    const p = Number(pages) || 0;
    if (p <= 0) return 0;
    if (p <= 10) return 1;
    if (p <= 20) return 2;
    if (p <= 34) return 3;
    return 4;
}

/**
 * Builds a complete full-year calendar map (Monday-first weeks) for `year`.
 * Returns { year, maxPages, activeDays, totalPages, weeksCount, days: [...], monthStarts: [...] }
 */
function buildYearCalendarMap(logs = [], year = new Date().getFullYear()) {
    const yr = Number(year) || new Date().getFullYear();
    const yearStr = String(yr);
    const byDay = aggregatePagesByDay(logs);

    const jan1 = new Date(Date.UTC(yr, 0, 1));
    const dec31 = new Date(Date.UTC(yr, 11, 31));
    // Monday = 0 .. Sunday = 6
    const firstDow = (jan1.getUTCDay() + 6) % 7;

    const days = [];
    const monthStarts = [];
    let seenMonths = new Set();
    let maxPages = 0;
    let activeDays = 0;
    let totalPages = 0;

    let dayIndex = 0;
    for (let d = new Date(jan1); d <= dec31; d.setUTCDate(d.getUTCDate() + 1), dayIndex++) {
        const dateISO = d.toISOString().slice(0, 10);
        const monthIndex = d.getUTCMonth();
        const dow = (d.getUTCDay() + 6) % 7;
        const weekIndex = Math.floor((firstDow + dayIndex) / 7);
        const pages = byDay.get(dateISO) || 0;
        const level = intensityLevel(pages);

        if (pages > 0) {
            activeDays++;
            totalPages += pages;
            if (pages > maxPages) maxPages = pages;
        }
        if (!seenMonths.has(monthIndex)) {
            seenMonths.add(monthIndex);
            monthStarts.push({
                monthIndex,
                label: BG_MONTH_SHORT[monthIndex],
                fullLabel: BG_MONTH_NAMES[monthIndex],
                weekIndex
            });
        }

        days.push({
            dateISO,
            monthIndex,
            dayOfMonth: d.getUTCDate(),
            dow,
            weekIndex,
            pages,
            level
        });
    }

    const weeksCount = days.length ? days[days.length - 1].weekIndex + 1 : 53;
    return {
        year: yearStr,
        maxPages,
        activeDays,
        totalPages,
        weeksCount,
        days,
        monthStarts
    };
}

const JournalStats = {
    BG_MONTH_NAMES,
    BG_MONTH_SHORT,
    isValidDateISO,
    formatLocalDayISO,
    addDaysISO,
    normalizeValidLogs,
    aggregatePagesByDay,
    calculateCurrentStreak,
    calculateLongestStreak,
    calculateDailyReadingMetrics,
    calculateMonthlyBreakdown,
    findStrongestMonth,
    calculateAuthorBreakdown,
    findMostReadAuthor,
    intensityLevel,
    buildYearCalendarMap
};

globalThis.JournalStats = JournalStats;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = JournalStats;
}
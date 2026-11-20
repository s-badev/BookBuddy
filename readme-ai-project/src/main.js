// Main page logic - displays list of books
document.addEventListener('DOMContentLoaded', function() {
    ThemeSwitcher.initTheme();
    initNavigation();
    initLogModal();
    initSettingsModal();
    initBooksToolbar();
    refreshAll();
    initDemoButtons();
});

function initNavigation() {
    const links = document.querySelectorAll('.navbar__navigation a, .bottom-nav a');
    function updateCurrentSection() {
        const hash = window.location.hash;
        const target = document.getElementById(hash.slice(1));
        const current = target?.closest('#journal') ? '#journal' : hash || '#home';
        links.forEach(link => {
            if (link.hash === current) {
                link.setAttribute('aria-current', 'location');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    window.addEventListener('hashchange', updateCurrentSection);
    updateCurrentSection();

    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        const section = document.getElementById(link.hash.slice(1));
        const heading = section?.querySelector('[tabindex="-1"]');
        // Let the browser navigate to the fragment before moving keyboard focus.
        if (heading) requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    });
}

/* ---------- Book View State (search / filter / sort) ---------- */
var bookViewState = { query: '', filter: 'all', sort: 'recent' };
var _searchTimer = null;

function applyBookViewState(books, state) {
    var result = books.slice(); // shallow copy

    // 1. Search — case-insensitive match on title or author
    if (state.query) {
        var q = state.query.toLowerCase();
        result = result.filter(function(b) {
            return b.title.toLowerCase().indexOf(q) !== -1 ||
                   b.author.toLowerCase().indexOf(q) !== -1;
        });
    }

    // 2. Filter
    if (state.filter !== 'all') {
        result = result.filter(book => getBookStatus(book) === state.filter);
    }

    // 3. Sort
    if (state.sort === 'progress') {
        result.sort(function(a, b) {
            return calculateProgress(b.currentPage, b.totalPages) -
                   calculateProgress(a.currentPage, a.totalPages);
        });
    } else if (state.sort === 'title') {
        result.sort(function(a, b) {
            return a.title.localeCompare(b.title, 'bg');
        });
    } else {
        // 'recent' — newest first (by id = Date.now() at creation)
        result.sort(function(a, b) { return b.id - a.id; });
    }

    return result;
}

function initBooksToolbar() {
    var searchInput = document.getElementById('bookSearch');
    var filterSelect = document.getElementById('bookFilter');
    var sortSelect   = document.getElementById('bookSort');

    if (!searchInput || !filterSelect || !sortSelect) return;

    searchInput.addEventListener('input', function() {
        clearTimeout(_searchTimer);
        var val = this.value;
        _searchTimer = setTimeout(function() {
            bookViewState.query = val.trim();
            renderCatalogue();
        }, 250);
    });

    filterSelect.addEventListener('change', function() {
        bookViewState.filter = this.value;
        renderCatalogue();
    });

    sortSelect.addEventListener('change', function() {
        bookViewState.sort = this.value;
        renderCatalogue();
    });
}

function renderCatalogue(allBooks = BookRepo.getAllBooks()) {
    const booksList = document.getElementById('booksList');
    const openCards = new Set(Array.from(booksList.querySelectorAll('details[open]'), card => card.id));
    const books = applyBookViewState(allBooks, bookViewState);
    document.getElementById('libraryCount').textContent = formatBookCount(allBooks.length);
    document.getElementById('bookResultsStatus').textContent = 'Намерени: ' + formatBookCount(books.length);

    if (books.length === 0) {
        booksList.innerHTML = allBooks.length ? `
            <div class="empty-state empty-state--compact">
                <p class="empty-state__title">Няма намерени книги</p>
                <p class="empty-state__text">Опитай с различно търсене или филтър.</p>
            </div>` : `
            <div class="empty-state empty-state--compact">
                <p class="empty-state__title">Все още няма книги</p>
            </div>`;
        return;
    }

    booksList.innerHTML = books.map(book => createBookCard(book, openCards.has('manage-' + book.id))).join('');

    books.forEach(book => {
        document.getElementById('progress-form-' + book.id).addEventListener('submit', event => {
            event.preventDefault();
            const input = event.currentTarget.elements.currentPage;
            updateBookProgress(book.id, input.valueAsNumber);
        });
        document.getElementById('delete-' + book.id).addEventListener('click', () => deleteBook(book.id));
    });
}

function formatBookCount(count) {
    return count + (count === 1 ? ' книга' : ' книги');
}

function createCover(book) {
    const palettes = ['indigo', 'wine', 'pine', 'blue', 'ochre', 'plum'];
    const palette = palettes[Number(book.id) % palettes.length] || palettes[0];
    return `
        <div class="book-cover book-cover--${palette}" aria-hidden="true">
            <div class="book-cover__copy">
                <span class="book-cover__author">${escapeHtml(book.author)}</span>
                <span class="book-cover__title">${escapeHtml(book.title)}</span>
            </div>
            <span class="book-cover__imprint"></span>
        </div>`;
}

function createBookCard(book, expanded) {
    const progress = calculateProgress(book.currentPage, book.totalPages);
    const status = getBookStatus(book);
    const statusLabel = { finished: 'Прочетена', reading: 'Чета', wishlist: 'За четене' }[status];
    const title = escapeHtml(book.title);

    return `
        <article class="book-card" aria-labelledby="book-title-${book.id}">
            ${createCover(book)}
            <h3 class="book-card__title" id="book-title-${book.id}">${title}</h3>
            <p class="book-card__author">${escapeHtml(book.author)}</p>
            <p class="book-card__status book-card__status--${status}">${statusLabel} · ${progress}%</p>
            <details class="book-card__manage" id="manage-${book.id}"${expanded ? " open" : ""}>
                <summary aria-label="Управление на ${title}">Управление</summary>
                <div class="book-card__details">
                    <form class="book-card__progress" id="progress-form-${book.id}">
                        <label for="progress-${book.id}">Текуща страница</label>
                        <div class="book-card__progress-field">
                            <input type="number" name="currentPage" id="progress-${book.id}"
                                   value="${book.currentPage}" min="0" max="${book.totalPages}" required>
                            <span>/ ${book.totalPages}</span>
                        </div>
                        <button class="btn btn--outline" type="submit">Запази</button>
                    </form>
                    <p class="book-card__notes">${escapeHtml(getBookNote(book))}</p>
                    <div class="book-card__footer">
                        <a href="form.html?id=${book.id}" class="btn btn--icon btn--icon-edit"
                           aria-label="Редактирай ${title}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </a>
                        <button id="delete-${book.id}" type="button" class="btn btn--icon btn--icon-danger"
                                aria-label="Изтрий ${title}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            </details>
        </article>`;
}

function getBookStatus(book) {
    if (book.currentPage <= 0 || !book.totalPages) return 'wishlist';
    return book.currentPage < book.totalPages ? 'reading' : 'finished';
}

/* ---------- Progress helpers ---------- */
function calculateProgress(current, total) {
    if (total <= 0 || current <= 0) return 0;
    if (current >= total) return 100;
    return Math.max(1, Math.min(99, Math.round((current / total) * 100)));
}

function updateBookProgress(bookId, newPage) {
    BookRepo.updateProgress(bookId, newPage);
    displayBooks();
    const updatedInput = document.getElementById('progress-' + bookId);
    (updatedInput || document.getElementById('bookFilter')).focus({ preventScroll: true });
    showToast('Напредъкът е обновен.');
}

function deleteBook(bookId) {
    if (confirm('Сигурни ли сте, че искате да изтриете тази книга?')) {
        BookRepo.deleteBook(bookId);
        LogRepo.deleteLogsByBookId(bookId);   // cascade: remove orphan logs
        refreshAll();
        document.getElementById('bookSearch').focus();
    }
}

function displayBooks() {
    const books = BookRepo.getAllBooks();
    renderCatalogue(books);
    updateStats(books);
}

function renderFeaturedBook(books, logs) {
    const inProgress = books.filter(book => getBookStatus(book) === 'reading');
    const booksById = new Map(inProgress.map(book => [String(book.id), book]));
    // Logs already have newest-created first order for sessions on the same date.
    const latest = logs.reduce((selected, log) => {
        if (booksById.has(String(log.bookId)) && (!selected || log.dateISO > selected.dateISO)) {
            return log;
        }
        return selected;
    }, null);
    const featured = latest ? booksById.get(String(latest.bookId)) : inProgress[0];
    const openButton = document.getElementById('logReadingBtn');
    const cover = document.getElementById('readingCover');
    const author = document.getElementById('readingAuthor');

    openButton.hidden = books.length === 0;
    openButton.dataset.bookId = featured?.id ?? '';
    document.getElementById('firstBookLink').hidden = books.length > 0;
    document.getElementById('readingTitle').textContent = featured?.title ?? 'Твоето четене';
    author.textContent = featured?.author ?? '';
    author.hidden = !featured;
    document.getElementById('readingEyebrow').hidden = !featured;
    document.getElementById('readingProgress').hidden = !featured;
    document.getElementById('readingPlaceholder').hidden = Boolean(featured);
    cover.hidden = !featured;
    cover.innerHTML = featured ? createCover(featured) : '';

    if (featured) {
        const percent = calculateProgress(featured.currentPage, featured.totalPages);
        document.getElementById('readingPages').textContent = featured.currentPage + ' / ' + featured.totalPages + ' стр.';
        document.getElementById('readingPercent').textContent = percent + '%';
        document.getElementById('readingMeter').value = percent;
    }
}

/* ---------- Stats ---------- */
function updateStats(books = BookRepo.getAllBooks()) {
    
    // Total Books
    const totalBooks = books.length;
    document.getElementById('statBooks').textContent = totalBooks;
    
    // Total Pages Read — derived ONLY from books (single source of truth)
    const totalPagesRead = books.reduce((sum, book) => sum + (Number(book.currentPage) || 0), 0);
    document.getElementById('statPagesRead').textContent = totalPagesRead.toLocaleString();
    
    // Average Progress
    let avgProgress = 0;
    if (totalBooks > 0) {
        const totalProgress = books.reduce((sum, book) => {
            return sum + (book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0);
        }, 0);
        avgProgress = Math.round(totalProgress / totalBooks);
    }
    document.getElementById('statAvgProgress').textContent = `${avgProgress}%`;

    const logs = LogRepo.getAllLogs();
    const settings = SettingsRepo.getSettings();
    const week = getWeekRangeISO(new Date());
    const weekPages = sumLogsInRange(logs, week.startISO, week.endISO);
    const streak = calculateStreak(logs, settings.minPagesForStreakDay);
    renderFeaturedBook(books, logs);
    renderGoal(weekPages, settings.weeklyGoalPages);
    document.getElementById('streakValue').textContent = streak;
    renderTopBooks();
    renderChallenges(weekPages, streak);
}

/* ---------- Helpers ---------- */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/"/g, '&quot;');
}

/* ---------- Book note fallback ---------- */
var _BOOK_NOTE_OVERRIDES = {
    '1984': 'Мрачна антиутопия за властта и контрола над съзнанието.',
    'стив джобс': 'История за визия, амбиция и създаване на революционни продукти.'
};
var _BOOK_NOTE_DEFAULT = 'Няма добавено мнение.';

function getBookNote(book) {
    var raw = (book.notes || '').trim();
    if (raw) return raw;

    // Normalise title: lowercase, strip parenthesised subtitles
    var norm = (book.title || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    return _BOOK_NOTE_OVERRIDES[norm] || _BOOK_NOTE_DEFAULT;
}

/* ========== Date Helpers ========== */

/** Returns YYYY-MM-DD for a Date object */
function getDayISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Returns {startISO, endISO} for the ISO week (Mon–Sun) containing `today` */
function getWeekRangeISO(today) {
    const d = new Date(today);
    const day = d.getDay(); // 0=Sun … 6=Sat
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const mon = new Date(d);
    mon.setDate(d.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { startISO: getDayISO(mon), endISO: getDayISO(sun) };
}

/** Sum of log.pages where log.dateISO is between startISO and endISO (inclusive) */
function sumLogsInRange(logs, startISO, endISO) {
    return logs.reduce(function(sum, log) {
        if (log.dateISO >= startISO && log.dateISO <= endISO) {
            return sum + (Number(log.pages) || 0);
        }
        return sum;
    }, 0);
}

/** Count consecutive days backwards from today with total pages >= minPages */
function calculateStreak(logs, minPages) {
    // Build a map: dateISO → total pages
    var dayMap = {};
    logs.forEach(function(log) {
        dayMap[log.dateISO] = (dayMap[log.dateISO] || 0) + log.pages;
    });

    var streak = 0;
    var d = new Date();
    // Check today first; if today has no qualifying logs, start from yesterday
    if (!dayMap[getDayISO(d)] || dayMap[getDayISO(d)] < minPages) {
        d.setDate(d.getDate() - 1);
    }
    while (true) {
        var key = getDayISO(d);
        if (dayMap[key] && dayMap[key] >= minPages) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

/* ========== Goal & Streak Rendering ========== */
function renderGoal(weekPages, target) {
    const meter = document.getElementById('goalMeter');
    meter.max = target;
    meter.value = Math.min(weekPages, target);
    meter.setAttribute('aria-valuetext', weekPages + ' от ' + target + ' страници');
    document.getElementById('goalPages').textContent = weekPages;
    document.getElementById('goalTarget').textContent = '/ ' + target + ' стр.';
    const remaining = target - weekPages;
    document.getElementById('goalDetail').textContent = remaining > 0
        ? 'Остават ' + remaining + ' стр. до целта.'
        : 'Целта за тази седмица е постигната.';
}

/* ========== Top 5 Most-Read Books (by total progress) ========== */

/**
 * Returns top N books by actual read pages (currentPage).
 * "Прочетена" books are normalised so readPages = totalPages.
 * [{bookId, title, readPages, totalPages}]
 */
function getTopBooks(books, limit) {
    limit = limit || 5;

    var entries = books.map(function(b) {
        var total = Math.max(Number(b.totalPages) || 0, 0);
        var read  = Number(b.currentPage) || 0;

        // Normalise completed books (progress >= 100 %)
        if (total > 0 && read >= total) { read = total; }

        // Clamp to [0, total]
        read = Math.max(0, Math.min(read, total));

        return {
            bookId: String(b.id),
            title: b.title,
            readPages: read,
            totalPages: total
        };
    });

    // Sort: readPages DESC → title ASC (Bulgarian locale)
    entries.sort(function(a, b) {
        if (b.readPages !== a.readPages) return b.readPages - a.readPages;
        return a.title.localeCompare(b.title, 'bg');
    });

    return entries.slice(0, limit);
}

function renderTopBooks() {
    var container = document.getElementById('topBooksThisWeek');
    if (!container) return;

    var books = BookRepo.getAllBooks();
    var top   = getTopBooks(books, 5);

    if (top.length === 0) {
        container.innerHTML =
            '<div class="empty-state empty-state--compact">' +
                '<span class="empty-state__icon" aria-hidden="true">📊</span>' +
                '<p class="empty-state__title">Все още няма добавени книги.</p>' +
                '<p class="empty-state__text">Добави книга, за да видиш класацията.</p>' +
            '</div>';
        return;
    }

    // Max readPages for relative bar width; minimum 1 to avoid division by zero
    var maxPages = Math.max(top[0].readPages, 1);

    container.innerHTML = top.map(function(item, i) {
        var barPct = Math.round((item.readPages / maxPages) * 100);
        return (
            '<div class="top-book-item">' +
                '<span class="top-book-item__rank">' + (i + 1) + '</span>' +
                '<div class="top-book-item__body">' +
                    '<div class="top-book-item__header">' +
                        '<span class="top-book-item__title">' + escapeHtml(item.title) + '</span>' +
                        '<span class="top-book-item__pages">' + item.readPages + ' / ' + item.totalPages + ' стр.</span>' +
                    '</div>' +
                    '<div class="progress-bar progress-bar--top">' +
                        '<div class="progress-fill progress-fill--top" style="width:' + barPct + '%"></div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }).join('');
}

/* ========== Challenges ========== */

function renderChallenges(weekPages, streak) {
    var container = document.getElementById('challengesList');
    if (!container) return;

    // Seed defaults on first run
    ChallengeRepo.seedDefaultChallengesIfEmpty();

    var challenges = ChallengeRepo.getChallenges();

    if (challenges.length === 0) {
        container.innerHTML =
            '<div class="empty-state empty-state--compact">' +
                '<span class="empty-state__icon" aria-hidden="true">🏆</span>' +
                '<p class="empty-state__title">Няма предизвикателства.</p>' +
            '</div>';
        return;
    }

    var anyChanged = false;

    container.innerHTML = challenges.map(function(ch) {
        var current = 0;
        var unit    = '';

        if (ch.type === 'weekly_pages') {
            current = weekPages;
            unit = 'стр.';
        } else if (ch.type === 'streak_days') {
            current = streak;
            unit = 'дни';
        }

        var pct       = Math.min(100, Math.round((current / ch.target) * 100));
        var completed = current >= ch.target;

        // Weekly challenges can become active again when their date range rolls over.
        if ((ch.type === 'weekly_pages' || completed) && ch.active === completed) {
            ch.active = !completed;
            anyChanged = true;
        }

        var statusCls  = completed ? 'pill--finished' : 'pill--reading';
        var statusText = completed ? 'Завършено' : 'Активно';
        const title = ch.id === 'streak_14' && ch.title === 'Читателски streak'
            ? 'Читателска поредица'
            : ch.title;

        // Pick icon based on type
        var iconSvg = ch.type === 'weekly_pages'
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

        var iconColorCls = ch.type === 'streak_days' ? ' challenge-card__icon--streak' : '';

        return (
            '<div class="challenge-card' + (completed ? ' challenge-card--done' : '') + '">' +
                '<div class="challenge-card__header">' +
                    '<div class="challenge-card__icon' + iconColorCls + '">' + iconSvg + '</div>' +
                    '<div class="challenge-card__info">' +
                        '<span class="challenge-card__title">' + escapeHtml(title) + '</span>' +
                        '<span class="challenge-card__desc">' + escapeHtml(ch.description) + '</span>' +
                    '</div>' +
                    '<span class="pill ' + statusCls + '">' + statusText + '</span>' +
                '</div>' +
                '<div class="challenge-card__progress">' +
                    '<div class="challenge-card__progress-info">' +
                        '<span>' + current + ' / ' + ch.target + ' ' + unit + '</span>' +
                        '<span class="challenge-card__pct">' + pct + '%</span>' +
                    '</div>' +
                    '<div class="progress-bar progress-bar--challenge">' +
                        '<div class="progress-fill progress-fill--challenge' + (completed ? ' progress-fill--done' : '') + '" style="width:' + pct + '%"></div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }).join('');

    // Persist completion state if changed
    if (anyChanged) {
        ChallengeRepo.saveChallenges(challenges);
    }
}

/* ========== Settings Modal ========== */
function initSettingsModal() {
    const dialog = document.getElementById('settingsModal');
    document.getElementById('editGoalBtn').addEventListener('click', openSettingsModal);
    document.getElementById('settingsModalClose').addEventListener('click', () => dialog.close());
    document.getElementById('settingsModalCancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
}

function openSettingsModal() {
    var dialog      = document.getElementById('settingsModal');
    var goalInput   = document.getElementById('settingWeeklyGoal');
    var streakInput = document.getElementById('settingMinStreak');
    var settings    = SettingsRepo.getSettings();

    goalInput.value   = settings.weeklyGoalPages;
    streakInput.value = settings.minPagesForStreakDay;

    // Clear previous errors
    document.getElementById('settingWeeklyGoalError').textContent = '';
    document.getElementById('settingMinStreakError').textContent   = '';

    dialog.showModal();
}

function handleSettingsSubmit(e) {
    e.preventDefault();

    var goalVal   = document.getElementById('settingWeeklyGoal').value;
    var streakVal = document.getElementById('settingMinStreak').value;
    var valid     = true;

    var goalInt   = parseInt(goalVal);
    var streakInt = parseInt(streakVal);

    if (!goalVal || isNaN(goalInt) || goalInt < 1) {
        document.getElementById('settingWeeklyGoalError').textContent = 'Въведи поне 1.';
        valid = false;
    }
    if (!streakVal || isNaN(streakInt) || streakInt < 1) {
        document.getElementById('settingMinStreakError').textContent = 'Въведи поне 1.';
        valid = false;
    }
    if (!valid) return;

    SettingsRepo.saveSettings({
        weeklyGoalPages: goalInt,
        minPagesForStreakDay: streakInt
    });

    document.getElementById('settingsModal').close();
    updateStats();
    showToast('Целите са обновени!');
}

/* ========== Reading Log Modal ========== */
function initLogModal() {
    const dialog = document.getElementById('logModal');
    const form = document.getElementById('logForm');
    const openBtn = document.getElementById('logReadingBtn');

    openBtn.addEventListener('click', () => openLogModal(openBtn.dataset.bookId));
    document.getElementById('logModalClose').addEventListener('click', () => dialog.close());
    document.getElementById('logModalCancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    form.addEventListener('submit', handleLogSubmit);
}

function openLogModal(bookId = '', log = null) {
    _editingLogId = log?.id ?? null;
    const select = document.getElementById('logBook');
    const options = BookRepo.getAllBooks().map(book => new Option(book.title, book.id));
    select.replaceChildren(new Option('— Избери книга —', ''), ...options);
    select.value = String(log?.bookId ?? bookId);
    document.getElementById('logDate').value = log?.dateISO ?? getDayISO(new Date());
    document.getElementById('logPages').value = log?.pages ?? '';
    document.getElementById('logNote').value = log?.note ?? '';
    document.getElementById('logModalTitle').textContent = log ? 'Редактирай запис' : 'Запиши четене';
    document.getElementById('logSubmitBtn').textContent = log ? 'Запази' : 'Запиши';
    clearLogErrors();
    document.getElementById('logModal').showModal();
}

function openEditLogModal(logId) {
    const log = LogRepo.getLogById(logId);
    if (log) openLogModal(log.bookId, log);
}

function clearLogErrors() {
    document.querySelectorAll('#logForm .field-error').forEach(el => el.textContent = '');
}

function handleLogSubmit(e) {
    e.preventDefault();
    clearLogErrors();

    const bookId = document.getElementById('logBook').value;
    const selectedBook = BookRepo.getBookById(Number(bookId));
    const dateISO = document.getElementById('logDate').value;
    const pages = document.getElementById('logPages').valueAsNumber;
    const note   = document.getElementById('logNote').value.trim();

    let valid = true;

    if (!bookId || !selectedBook) {
        document.getElementById('logBookError').textContent = 'Избери книга.';
        valid = false;
    }
    if (!dateISO) {
        document.getElementById('logDateError').textContent = 'Въведи дата.';
        valid = false;
    }
    if (!Number.isInteger(pages) || pages < 1) {
        document.getElementById('logPagesError').textContent = 'Въведи положителен цял брой страници.';
        valid = false;
    }

    if (!valid) return;

    const dialog = document.getElementById('logModal');
    if (_editingLogId) {
        // ---- EDIT MODE ----
        const oldLog = LogRepo.getLogById(_editingLogId);
        if (!oldLog) { dialog.close(); return; }

        const oldBookId = Number(oldLog.bookId);
        const newBookId = Number(bookId);
        const oldPages = oldLog.pages;
        const newPages = pages;

        // Update the log entry
        LogRepo.updateLog(_editingLogId, {
            bookId: bookId,
            dateISO: dateISO,
            pages: newPages,
            note: note
        });

        // Adjust book progress using delta logic
        if (oldBookId === newBookId) {
            // Same book — apply delta
            const book = BookRepo.getBookById(newBookId);
            if (book) {
                const delta = newPages - oldPages;
                const newPage = Math.max(0, Math.min(book.totalPages, book.currentPage + delta));
                BookRepo.updateProgress(newBookId, newPage);
            }
        } else {
            // Different book — subtract from old, add to new
            const oldBook = BookRepo.getBookById(oldBookId);
            if (oldBook) {
                const reverted = Math.max(0, oldBook.currentPage - oldPages);
                BookRepo.updateProgress(oldBookId, reverted);
            }
            const newBook = BookRepo.getBookById(newBookId);
            if (newBook) {
                const advanced = Math.min(newBook.totalPages, newBook.currentPage + newPages);
                BookRepo.updateProgress(newBookId, advanced);
            }
        }

        dialog.close();
        refreshAll();
        const editButton = Array.from(document.querySelectorAll('.activity-item__edit'))
            .find(button => button.dataset.logId === _editingLogId);
        (editButton || document.querySelector('#activity h3')).focus({ preventScroll: true });
        showToast('Записът е обновен!');
    } else {
        const log = LogRepo.addLog({ bookId, dateISO, pages, note });
        if (!log) {
            document.getElementById('logPagesError').textContent = 'Такава сесия вече е записана.';
            return;
        }
        const newPage = Math.min(selectedBook.totalPages, selectedBook.currentPage + pages);
        BookRepo.updateProgress(selectedBook.id, newPage);

        dialog.close();
        refreshAll();
        showToast('Сесията е записана!');
    }
}

/* ========== Activity Feed ========== */
function renderActivityFeed() {
    const container = document.getElementById('activityFeed');
    if (!container) return;

    const logs = LogRepo.getLatestLogs(10);
    const books = BookRepo.getAllBooks();
    const bookMap = {};
    books.forEach(b => { bookMap[String(b.id)] = b.title; });

    // Filter out orphan logs whose book no longer exists
    const validLogs = logs.filter(log => bookMap.hasOwnProperty(String(log.bookId)));

    // Content-based dedup: guard against storage-level duplicates that share
    // the same bookId + dateISO + pages + note (but different ids).
    const dedupSeen = {};
    const dedupedLogs = [];
    for (let i = 0; i < validLogs.length; i++) {
        const l = validLogs[i];
        const key = String(l.bookId) + '|' + l.dateISO + '|' + l.pages + '|' + (l.note || '');
        if (!dedupSeen[key]) {
            dedupSeen[key] = true;
            dedupedLogs.push(l);
        }
    }

    if (dedupedLogs.length === 0) {
        container.innerHTML = `
            <div class="empty-state empty-state--compact">
                <p class="empty-state__title">Все още няма записани сесии</p>
                <p class="empty-state__text"><a href="#home">Към четенето</a></p>
            </div>
        `;
        return;
    }

    container.innerHTML = dedupedLogs.map(log => {
        const bookTitle = bookMap[String(log.bookId)];
        const dayLabel = getRelativeDayLabel(log.dateISO);
        const sessionPages = Number(log.pages) || 0;
        return `
            <div class="activity-item" data-log-id="${log.id}">
                <div class="activity-item__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div class="activity-item__body">
                    <p class="activity-item__title">
                        <strong>${escapeHtml(bookTitle)} — Прочетени ${sessionPages} стр.</strong>
                        ${log.note ? '<span class="activity-item__note">— ' + escapeHtml(log.note) + '</span>' : ''}
                    </p>
                </div>
                <div class="activity-item__right">
                    <span class="activity-item__day">${dayLabel}</span>
                    <div class="activity-item__actions">
                        <button class="btn btn--icon btn--icon-edit activity-item__edit"
                                data-log-id="${log.id}"
                                aria-label="Редактирай запис">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn--icon btn--icon-danger activity-item__delete"
                                data-log-id="${log.id}"
                                aria-label="Изтрий запис">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Wire edit buttons
    container.querySelectorAll('.activity-item__edit').forEach(btn => {
        btn.addEventListener('click', function() {
            openEditLogModal(this.dataset.logId);
        });
    });

    // Wire delete buttons
    container.querySelectorAll('.activity-item__delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.logId;
            const log = LogRepo.getLogById(id);
            if (log) {
                // Subtract pages from book progress
                const book = BookRepo.getBookById(Number(log.bookId));
                if (book) {
                    const newPage = Math.max(0, book.currentPage - log.pages);
                    BookRepo.updateProgress(Number(log.bookId), newPage);
                }
            }
            LogRepo.deleteLog(id);
            refreshAll();
            document.querySelector('#activity h3').focus({ preventScroll: true });
            showToast('Записът е изтрит.');
        });
    });
}

function formatDateBG(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}.${m}.${y}`;
}

/** Returns a relative day label in Bulgarian for a given ISO date string */
function getRelativeDayLabel(dateISO) {
    if (!dateISO) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateISO + 'T00:00:00');
    const diffMs = today.getTime() - target.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Днес';
    if (diffDays === 1) return 'Вчера';
    if (diffDays > 1 && diffDays <= 365) return 'Преди ' + diffDays + ' дни';
    return formatDateBG(dateISO);
}

/* ========== Log Edit State ========== */
var _editingLogId = null; // null = add mode, string = edit mode

/* ========== Toast ========== */
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('toast--visible');
    setTimeout(() => { toast.classList.remove('toast--visible'); }, 2200);
}

/* ========== Full Dashboard Refresh ========== */
function refreshAll() {
    displayBooks();          // calls updateStats() internally
    renderActivityFeed();
}

/* ========== Demo Data Seed ========== */
function seedDemoData() {
    var now = Date.now();

    // Helper: ISO date string N days ago
    function daysAgo(n) {
        var d = new Date(now);
        d.setDate(d.getDate() - n);
        return getDayISO(d);
    }

    // --- 8 Demo books ---
    var demoBooks = [
        { id: 9000001, title: 'Илон Мъск', author: 'Уолтър Айзъксън', totalPages: 688, currentPage: 150, notes: 'Вдъхновяваща книга за иновациите и упоритостта.', createdAt: new Date(now - 86400000 * 30).toISOString() },
        { id: 9000002, title: 'Стив Джобс', author: 'Уолтър Айзъксън', totalPages: 656, currentPage: 78, notes: '', createdAt: new Date(now - 86400000 * 25).toISOString() },
        { id: 9000003, title: 'Atomic Habits', author: 'Джеймс Клиър', totalPages: 320, currentPage: 320, notes: 'Страхотна за изграждане на навици. Препоръчвам на всеки!', createdAt: new Date(now - 86400000 * 60).toISOString() },
        { id: 9000004, title: 'Мислене – бързо и бавно', author: 'Даниел Канеман', totalPages: 512, currentPage: 210, notes: 'Сложна, но много полезна.', createdAt: new Date(now - 86400000 * 20).toISOString() },
        { id: 9000005, title: 'Sapiens', author: 'Ювал Ноа Харари', totalPages: 443, currentPage: 443, notes: 'Фантастичен преглед на човешката история. Четиво, което те кара да мислиш.', createdAt: new Date(now - 86400000 * 90).toISOString() },
        { id: 9000006, title: '1984', author: 'Джордж Оруел', totalPages: 328, currentPage: 45, notes: '', createdAt: new Date(now - 86400000 * 10).toISOString() },
        { id: 9000007, title: 'Малкият принц', author: 'Антоан дьо Сент-Екзюпери', totalPages: 96, currentPage: 0, notes: 'Подарък от приятел, чака ме на рафта.', createdAt: new Date(now - 86400000 * 5).toISOString() },
        { id: 9000008, title: 'Deep Work', author: 'Кал Нюпорт', totalPages: 296, currentPage: 112, notes: 'Много практични съвети за фокусирана работа.', createdAt: new Date(now - 86400000 * 15).toISOString() }
    ];

    // --- 12 Demo reading logs (stable IDs; spread over last 7 days, covering 6 books) ---
    var demoLogs = [
        { id: 'demo-log-01', bookId: '9000001', dateISO: daysAgo(0), pages: 30, note: 'Глава за SpaceX', createdAt: now - 12 },
        { id: 'demo-log-02', bookId: '9000001', dateISO: daysAgo(1), pages: 25, note: '', createdAt: now - 100000 },
        { id: 'demo-log-03', bookId: '9000002', dateISO: daysAgo(0), pages: 18, note: 'Ранните години', createdAt: now - 200000 },
        { id: 'demo-log-04', bookId: '9000002', dateISO: daysAgo(2), pages: 20, note: '', createdAt: now - 300000 },
        { id: 'demo-log-05', bookId: '9000004', dateISO: daysAgo(1), pages: 35, note: 'Система 1 и Система 2', createdAt: now - 400000 },
        { id: 'demo-log-06', bookId: '9000004', dateISO: daysAgo(3), pages: 40, note: '', createdAt: now - 500000 },
        { id: 'demo-log-07', bookId: '9000006', dateISO: daysAgo(2), pages: 25, note: 'Началото е мрачно', createdAt: now - 600000 },
        { id: 'demo-log-08', bookId: '9000006', dateISO: daysAgo(4), pages: 20, note: '', createdAt: now - 700000 },
        { id: 'demo-log-09', bookId: '9000008', dateISO: daysAgo(0), pages: 22, note: 'Правила за дълбока работа', createdAt: now - 800000 },
        { id: 'demo-log-10', bookId: '9000008', dateISO: daysAgo(3), pages: 30, note: '', createdAt: now - 900000 },
        { id: 'demo-log-11', bookId: '9000003', dateISO: daysAgo(5), pages: 40, note: 'Последните глави', createdAt: now - 1000000 },
        { id: 'demo-log-12', bookId: '9000001', dateISO: daysAgo(6), pages: 35, note: 'Тесла фабриката', createdAt: now - 1100000 }
    ];

    // Write directly via storage keys (same as repos)
    localStorage.setItem(BookRepo.STORAGE_KEY, JSON.stringify(demoBooks));
    localStorage.setItem(LogRepo.STORAGE_KEY, JSON.stringify(demoLogs));

    // Reset challenges so they re-seed with defaults
    localStorage.removeItem(ChallengeRepo.STORAGE_KEY);

    // Keep settings (or reset to defaults if missing)
    if (!localStorage.getItem(SettingsRepo.STORAGE_KEY)) {
        SettingsRepo.saveSettings(SettingsRepo.DEFAULTS);
    }

    refreshAll();
    showToast('Демо данните са заредени успешно!');
}

/* ========== Clear All BookBuddy Data ========== */
function clearAllData() {
    localStorage.removeItem(BookRepo.STORAGE_KEY);
    localStorage.removeItem(LogRepo.STORAGE_KEY);
    localStorage.removeItem(SettingsRepo.STORAGE_KEY);
    localStorage.removeItem(ChallengeRepo.STORAGE_KEY);
    // Also clear theme preference if stored
    localStorage.removeItem('bookbuddy_theme');
    ThemeSwitcher.applyTheme('system');
    document.getElementById('themeSelect').value = 'system';

    refreshAll();
    showToast('Всички данни бяха изчистени.');
}

/* ========== Demo / Clear Button Listeners ========== */
function initDemoButtons() {
    var seedBtn  = document.getElementById('seedDemoBtn');
    var clearBtn = document.getElementById('clearDataBtn');

    if (seedBtn) {
        seedBtn.addEventListener('click', function() {
            var books = BookRepo.getAllBooks();
            if (books.length > 0) {
                if (!confirm('Това ще презапише текущите ти данни. Продължаваш ли?')) return;
            }
            seedDemoData();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (!confirm('Сигурен ли си, че искаш да изчистиш всички данни?')) return;
            clearAllData();
        });
    }
}

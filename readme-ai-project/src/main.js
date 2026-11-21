// Main page logic - displays list of books
document.addEventListener('DOMContentLoaded', function() {
    ThemeSwitcher.initTheme();
    initNavigation();
    initLogModal();
    initDetailsModal();
    initSettingsModal();
    initBooksToolbar();
    initBookshelf();
    initCoverImages();
    initIssue();
    initDemoButtons();
    refreshAll();
});

function initNavigation() {
    const links = document.querySelectorAll('.navbar__navigation a, .bottom-nav a');
    function updateCurrentSection() {
        const hash = window.location.hash;
        const target = document.getElementById(hash.slice(1));
        const current = target?.closest('#journal') ? '#journal' :
            target?.closest('#books') ? '#books' :
            target?.closest('#issue') ? '#issue' : '#home';
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
        const heading = section?.matches('[tabindex="-1"]') ? section : section?.querySelector('[tabindex="-1"]');
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

    document.getElementById('booksList').addEventListener('click', event => {
        if (!event.target.closest('#clearBookFilters')) return;
        clearTimeout(_searchTimer);
        bookViewState.query = searchInput.value = '';
        bookViewState.filter = filterSelect.value = 'all';
        renderCatalogue();
        searchInput.focus();
    });
}

const shelfScrollPositions = new Map();

function renderCatalogue(allBooks = BookRepo.getAllBooks()) {
    const booksList = document.getElementById('booksList');
    booksList.querySelectorAll('[data-shelf-row]').forEach(row => shelfScrollPositions.set(row.dataset.shelfRow, row.scrollLeft));
    const books = applyBookViewState(allBooks, bookViewState);
    document.getElementById('libraryCount').textContent = formatBookCount(allBooks.length);
    document.getElementById('bookResultsStatus').textContent = 'Намерени: ' + formatBookCount(books.length);

    booksList.innerHTML = books.length ? shelfMarkup(books) : allBooks.length ? `
            <div class="empty-state empty-state--compact">
                <p class="empty-state__title">Няма намерени книги</p>
                <button type="button" class="btn btn--outline" id="clearBookFilters">Изчисти търсенето и филтъра</button>
            </div>` : `
            <div class="empty-state empty-state--compact">
                <p class="empty-state__title">Все още няма книги</p>
                <a class="btn btn--primary" href="${escapeHtml(appPage('form.html'))}">Добави книга</a>
            </div>`;
    booksList.querySelectorAll('[data-shelf-row]').forEach(row => {
        row.scrollLeft = shelfScrollPositions.get(row.dataset.shelfRow) || 0;
    });
    closeShelfForCatalogueChange();
}

function formatBookCount(count) {
    return count + (count === 1 ? ' книга' : ' книги');
}

function initCoverImages() {
    // Image events do not bubble. Capture them for newly rendered covers too.
    document.addEventListener('load', event => {
        const image = event.target;
        if (image instanceof HTMLImageElement && image.classList.contains('book-cover__image')) {
            image.parentElement.classList.add('book-cover--loaded');
        }
    }, true);
    document.addEventListener('error', event => {
        const image = event.target;
        if (image instanceof HTMLImageElement && image.classList.contains('book-cover__image')) image.remove();
    }, true);
}

function createCover(book, loading = 'lazy') {
    const status = getBookStatus(book);
    const isbn = Validate.normalizeISBN(book.isbn ?? '');
    const image = isbn ? `
            <img class="book-cover__image" alt="" loading="${loading}" referrerpolicy="no-referrer"
                 src="https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false">` : '';
    return `
        <span class="book-cover book-cover--${status}" aria-hidden="true">
            <span class="book-cover__copy">
                <span class="book-cover__author">${escapeHtml(book.author)}</span>
                <span class="book-cover__title">${escapeHtml(book.title)}</span>
            </span>
            <span class="book-cover__imprint">BookBuddy</span>
            ${image}
        </span>`;
}

function bookStatusLabel(status) {
    return { finished: 'Прочетена', reading: 'Чета', wishlist: 'За четене' }[status];
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

function deleteBook(bookId) {
    if (!confirm('Да изтрия ли книгата и всички свързани с нея читателски сесии?')) return;
    BookRepo.deleteBook(bookId);
    LogRepo.deleteLogsByBookId(bookId);
    document.getElementById('detailsModal').close();
    refreshAll();
    showToast('Книгата е изтрита.');
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
    const details = document.getElementById('featuredDetailsBtn');
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
    details.hidden = !featured;
    cover.dataset.detailsBook = details.dataset.detailsBook = featured?.id ?? '';
    cover.setAttribute('aria-label', featured ? 'За книгата ' + featured.title : 'За книгата');
    cover.innerHTML = featured ? createCover(featured, 'eager') : '';

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

    const logs = getJournalLogs(books).filter(log => isDateISO(log.dateISO));
    const settings = SettingsRepo.getSettings();
    const week = getWeekRangeISO(new Date());
    const weekPages = sumLogsInRange(logs, week.startISO, week.endISO);
    const streak = calculateStreak(logs, settings.minPagesForStreakDay);
    renderFeaturedBook(books, logs);
    renderGoal(weekPages, settings.weeklyGoalPages);
    document.getElementById('streakValue').textContent = streak;
    renderTopBooks(books);
    renderChallenges(weekPages, streak);
    renderIssue(books, logs, settings.minPagesForStreakDay);
}

/* ---------- Helpers ---------- */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/"/g, '&quot;');
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
        dayMap[log.dateISO] = (dayMap[log.dateISO] || 0) + Number(log.pages);
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

function renderTopBooks(books) {
    const top = getTopBooks(books, 5);
    document.getElementById('topBooksThisWeek').innerHTML = top.length ? top.map(item => `
        <li>
            <button type="button" id="rank-book-${item.bookId}" data-details-book="${item.bookId}" aria-haspopup="dialog">${escapeHtml(item.title)}</button>
            <span>${item.readPages} / ${item.totalPages} стр.</span>
        </li>`).join('') : '<li>Все още няма добавени книги.</li>';
}

function renderChallenges(weekPages, streak) {
    ChallengeRepo.seedDefaultChallengesIfEmpty();
    const challenges = ChallengeRepo.getChallenges();
    let changed = false;

    document.getElementById('challengesList').innerHTML = challenges.map(challenge => {
        const weekly = challenge.type === 'weekly_pages';
        const byStreak = challenge.type === 'streak_days';
        const current = weekly ? weekPages : byStreak ? streak : 0;
        const target = Math.max(Number(challenge.target) || 0, 1);
        const completed = current >= target;
        const title = challenge.id === 'streak_14' && challenge.title === 'Читателски streak'
            ? 'Читателска поредица' : challenge.title;
        if ((weekly || completed) && challenge.active === completed) {
            challenge.active = !completed;
            changed = true;
        }
        const metric = current + ' / ' + target + (weekly ? ' стр.' : byStreak ? ' дни' : '');
        return `
            <article class="editorial-challenge">
                <div class="editorial-challenge__heading"><h3>${escapeHtml(title)}</h3><span>${metric}</span></div>
                <progress class="reading-meter${completed ? ' reading-meter--gold' : ''}" max="${target}"
                    value="${Math.min(current, target)}" aria-label="${escapeHtml(title)}" aria-valuetext="${metric}"></progress>
                <p>${completed ? 'Постигнато' : escapeHtml(challenge.description)}</p>
            </article>`;
    }).join('');
    if (changed) ChallengeRepo.saveChallenges(challenges);
}

/* ========== Settings Modal ========== */
function initSettingsModal() {
    const dialog = document.getElementById('settingsModal');
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
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

    const goalInt = document.getElementById('settingWeeklyGoal').valueAsNumber;
    const streakInt = document.getElementById('settingMinStreak').valueAsNumber;
    var valid     = true;

    document.getElementById('settingWeeklyGoalError').textContent = '';
    document.getElementById('settingMinStreakError').textContent = '';
    if (!Number.isSafeInteger(goalInt) || goalInt < 1) {
        document.getElementById('settingWeeklyGoalError').textContent = 'Въведи цяло число, поне 1.';
        valid = false;
    }
    if (!Number.isSafeInteger(streakInt) || streakInt < 1) {
        document.getElementById('settingMinStreakError').textContent = 'Въведи цяло число, поне 1.';
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
    dialog.addEventListener('close', () => {
        if (dialog.open) return;
        const action = afterLogClose;
        afterLogClose = null;
        if (action) action();
        else restoreDetailsAfterReading();
    });
}

let afterLogClose = null;

function openLogModal(bookId = '', log = null, onClose = null) {
    _editingLogId = log?.id ?? null;
    afterLogClose = onClose;
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

function clearLogErrors() {
    document.querySelectorAll('#logForm .field-error').forEach(el => el.textContent = '');
}

function isDateISO(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getJournalLogs(books) {
    const bookIds = new Set(books.map(book => String(book.id)));
    return LogRepo.getAllLogs()
        .filter(log => bookIds.has(String(log.bookId)) && Number.isSafeInteger(Number(log.pages)) && Number(log.pages) > 0)
        .map(log => ({ ...log, dateISO: isDateISO(log.dateISO) ? log.dateISO : '' }))
        .sort((a, b) => b.dateISO.localeCompare(a.dateISO) ||
            (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

function sessionEffect(book, previous, next) {
    const total = Number(book.totalPages);
    const current = Number(book.currentPage) || 0;
    const oldApplied = Number(previous?.appliedPages ?? previous?.pages) || 0;
    let completion = book.completion || null;
    const ownedCompletion = completion && previous && String(completion.logId) === String(previous.id);

    // Date- or note-only edits must not reapply capped pages.
    if (previous && next && Number(previous.pages) === next.pages) {
        if (ownedCompletion) {
            completion = { logId: previous.id, dateISO: next.dateISO };
        } else if (completion && oldApplied > 0 && previous.dateISO <= completion.dateISO &&
                   next.dateISO > completion.dateISO) {
            completion = null;
        }
        return { page: current, appliedPages: oldApplied, completion };
    }

    const base = Math.max(0, current - oldApplied);
    const appliedPages = Math.min(next?.pages ?? 0, Math.max(0, total - base));
    const page = Math.min(total, base + appliedPages);

    if (page < total || total <= 0 || ownedCompletion ||
        (completion && previous && previous.dateISO <= completion.dateISO && oldApplied > appliedPages)) {
        completion = null;
    }
    if (page === total && appliedPages > 0 && (current < total || ownedCompletion)) {
        completion = { logId: next.id, dateISO: next.dateISO };
    }
    return { page, appliedPages, completion };
}

function handleLogSubmit(event) {
    event.preventDefault();
    clearLogErrors();

    const form = event.currentTarget;
    const bookId = form.elements.logBook.value;
    const book = BookRepo.getBookById(Number(bookId));
    const dateISO = form.elements.logDate.value;
    const pages = form.elements.logPages.valueAsNumber;
    const note = form.elements.logNote.value.trim();
    const errors = [];
    if (!bookId || !book) errors.push(['logBookError', 'Избери книга.']);
    if (!isDateISO(dateISO)) errors.push(['logDateError', 'Въведи валидна дата.']);
    if (!Number.isSafeInteger(pages) || pages < 1) {
        errors.push(['logPagesError', 'Въведи положителен цял брой страници.']);
    }
    for (const [id, message] of errors) document.getElementById(id).textContent = message;
    if (errors.length) {
        document.getElementById(errors[0][0].replace('Error', '')).focus();
        return;
    }

    const dialog = document.getElementById('logModal');
    const oldLog = _editingLogId === null ? null : LogRepo.getLogById(_editingLogId);
    if (_editingLogId !== null && !oldLog) {
        dialog.close();
        return;
    }
    const previous = String(oldLog?.bookId) === bookId ? oldLog : null;
    const input = { id: oldLog?.id, bookId, dateISO, pages, note };
    const effect = sessionEffect(book, previous, input);
    input.appliedPages = effect.appliedPages;
    const saved = oldLog ? LogRepo.updateLog(oldLog.id, input) : LogRepo.addLog(input);
    if (!saved) {
        document.getElementById('logPagesError').textContent = 'Такава сесия вече е записана.';
        form.elements.logPages.focus();
        return;
    }
    if (oldLog && !previous) {
        const oldBook = BookRepo.getBookById(Number(oldLog.bookId));
        if (oldBook) {
            const removal = sessionEffect(oldBook, oldLog, null);
            BookRepo.updateProgress(oldBook.id, removal.page, removal.completion);
        }
    }
    if (effect.completion && effect.completion.logId === undefined) effect.completion.logId = saved.id;
    BookRepo.updateProgress(book.id, effect.page, effect.completion);

    dialog.close();
    refreshAll();
    if (oldLog && !readingReturn) {
        const opener = document.getElementById('journal-edit-' + oldLog.id) || document.querySelector('#activity h3');
        opener.focus({ preventScroll: true });
    }
    showToast(oldLog ? 'Записът е обновен!' : 'Сесията е записана!');
}

let detailsContext = null;
let readingReturn = null;

function initDetailsModal() {
    const dialog = document.getElementById('detailsModal');
    document.getElementById('detailsClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
        if (!readingReturn && !dialog.open && detailsContext) {
            focusDetailsOpener();
        }
    });
    document.addEventListener('click', event => {
        const opener = event.target.closest('[data-details-book]');
        if (opener) {
            openBookDetails(Number(opener.dataset.detailsBook), opener.id);
            return;
        }

        const start = event.target.closest('#detailsLogBtn');
        const edit = event.target.closest('[data-edit-session]');
        if (start || edit) {
            const log = edit ? LogRepo.getLogById(edit.dataset.editSession) : null;
            if (edit && !log) return;
            if (dialog.open) {
                readingReturn = (edit || start).id;
                dialog.close();
            }
            openLogModal(log ? log.bookId : detailsContext.bookId, log);
            return;
        }

        const remove = event.target.closest('[data-delete-session]');
        if (remove) deleteReadingSession(remove.dataset.deleteSession);
    });

    document.getElementById('detailsContent').addEventListener('submit', event => {
        if (event.target.id !== 'detailsProgressForm') return;
        event.preventDefault();
        const value = event.target.elements.currentPage.valueAsNumber;
        if (!Number.isSafeInteger(value) || !event.target.reportValidity()) return;
        BookRepo.updateProgress(detailsContext.bookId, value);
        refreshAll();
        showBookDetails('detailsProgress');
        showToast('Напредъкът е обновен.');
    });
    document.getElementById('detailsContent').addEventListener('click', event => {
        if (event.target.closest('#detailsDeleteBook')) deleteBook(detailsContext.bookId);
    });
}

function openBookDetails(bookId, openerId, onClose = null) {
    detailsContext = { bookId, openerId, onClose };
    showBookDetails();
}

function focusDetailsOpener() {
    const { openerId, onClose } = detailsContext;
    const target = document.getElementById(openerId);
    detailsContext = null;
    if (onClose) onClose();
    else (target && !target.hidden ? target : document.getElementById('bookSearch')).focus({ preventScroll: true });
}

function showBookDetails(focusId) {
    const book = BookRepo.getBookById(detailsContext.bookId);
    if (!book) {
        focusDetailsOpener();
        return;
    }
    const dialog = document.getElementById('detailsModal');
    const status = getBookStatus(book);
    const percent = calculateProgress(book.currentPage, book.totalPages);
    const note = (book.notes || '').trim();
    const logs = getJournalLogs([book]);
    document.getElementById('detailsTitle').textContent = book.title;
    document.getElementById('detailsContent').innerHTML = `
        <div class="details-book">
            ${createCover(book, 'eager')}
            <div class="details-book__facts">
                <p class="details-book__author">${escapeHtml(book.author)}</p>
                <p class="book-card__status book-card__status--${status}">${bookStatusLabel(status)}</p>
                <p>${book.currentPage} / ${book.totalPages} стр. · ${percent}%</p>
                <progress class="reading-meter" max="100" value="${percent}" aria-label="Напредък в книгата"></progress>
            </div>
        </div>
        <div class="details-actions">
            <button type="button" class="btn btn--primary" id="detailsLogBtn">Запиши четене</button>
            <a href="${escapeHtml(appPage('form.html?id=' + book.id))}" class="btn btn--outline">Редактирай книга</a>
        </div>
        <section class="details-note">
            <h3>Бележка за книгата</h3>
            <p>${note ? escapeHtml(note) : 'Няма добавена бележка.'}</p>
        </section>
        <section>
            <h3>Читателски сесии</h3>
        ${logs.length ? `<ul class="details-sessions">${logs.map(log => `
                <li><div>${sessionDateMarkup(log)} <strong>${Number(log.pages)} стр.</strong>
                    ${log.note ? '<p>' + escapeHtml(log.note) + '</p>' : ''}</div>
                    <button type="button" class="btn btn--ghost" id="details-edit-${escapeHtml(log.id)}"
                            data-edit-session="${escapeHtml(log.id)}" aria-label="Редактирай сесията ${log.dateISO ? 'от ' + formatDateBG(log.dateISO) : 'без дата'}">Редактирай</button>
                </li>`).join('')}</ul>` : '<p>Все още няма записани сесии за тази книга.</p>'}
        </section>`;
    document.getElementById('detailsContent').insertAdjacentHTML('beforeend', `
        <details class="details-manage"${focusId === 'detailsProgress' ? ' open' : ''}>
            <summary>Управление на книгата</summary>
            <form class="details-progress" id="detailsProgressForm">
                <label for="detailsProgress">Текуща страница</label>
                <input type="number" name="currentPage" id="detailsProgress" value="${book.currentPage}"
                       min="0" max="${book.totalPages}" required>
                <button type="submit" class="btn btn--outline">Запази напредъка</button>
            </form>
            <button type="button" class="btn btn--ghost btn--ghost-danger" id="detailsDeleteBook">Изтрий книгата</button>
        </details>`);
    if (!dialog.open) dialog.showModal();
    if (focusId) (document.getElementById(focusId) || document.getElementById('detailsLogBtn')).focus();
}

function restoreDetailsAfterReading() {
    if (!readingReturn) return;
    const focusId = readingReturn;
    readingReturn = null;
    showBookDetails(focusId);
}

function sessionDateMarkup(log) {
    return log.dateISO
        ? `<time class="journal-date" datetime="${log.dateISO}">${formatDateBG(log.dateISO)}</time>`
        : '<span class="journal-date">Без дата</span>';
}

function renderActivityFeed() {
    const container = document.getElementById('activityFeed');
    const books = BookRepo.getAllBooks();
    const byId = new Map(books.map(book => [String(book.id), book]));
    const logs = getJournalLogs(books);
    const dropCap = logs.find(log => (log.note || '').trim().length >= 45 &&
        /^\p{L}/u.test(log.note.trim()));

    container.innerHTML = logs.length ? logs.map(log => {
        const book = byId.get(String(log.bookId));
        const id = escapeHtml(log.id);
        const date = formatDateBG(log.dateISO);
        const label = escapeHtml(book.title + (date ? ' · ' + date : ''));
        return `
            <article class="journal-entry" data-log-id="${id}">
                <div class="journal-entry__body">
                    ${sessionDateMarkup(log)}
                    <h4>${escapeHtml(book.title)}</h4>
                    <p><strong>${Number(log.pages)} стр. в сесията</strong> <span>· ${book.currentPage} / ${book.totalPages} стр. общо</span></p>
                </div>
                ${log.note ? `<p class="journal-entry__note${log === dropCap ? ' journal-entry__note--drop' : ''}">${escapeHtml(log.note.trim())}</p>` : ''}
                <div class="journal-entry__actions">
                    <button type="button" class="btn btn--ghost" id="journal-edit-${id}" data-edit-session="${id}"
                            aria-label="Редактирай сесията ${label}">Редактирай</button>
                    <button type="button" class="btn btn--ghost btn--ghost-danger" data-delete-session="${id}"
                            aria-label="Изтрий сесията ${label}">Изтрий</button>
                </div>
            </article>`;
    }).join('') : '<p>Все още няма записани сесии. <a href="#home">Към четенето</a></p>';
}

function deleteReadingSession(id) {
    const log = LogRepo.getLogById(id);
    if (!log || !confirm('Да изтрия ли тази читателска сесия и да обновя напредъка на книгата?')) return;
    const book = BookRepo.getBookById(Number(log.bookId));
    LogRepo.deleteLog(id);
    if (book) {
        const effect = sessionEffect(book, log, null);
        BookRepo.updateProgress(book.id, effect.page, effect.completion);
    }
    refreshAll();
    document.querySelector('#activity h3').focus({ preventScroll: true });
    showToast('Записът е изтрит.');
}

function formatDateBG(isoStr) {
    if (!isoStr) return '';
    const [year, month, day] = isoStr.split('-');
    return day + '.' + month + '.' + year;
}

let _editingLogId = null;

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

function seedDemoData() {
    if (!isDemo) return;
    const now = Date.now();
    const today = new Date(now);
    const daysAgo = days => {
        const date = new Date(today);
        date.setDate(date.getDate() - days);
        return getDayISO(date);
    };
    const priorDate = (today.getFullYear() - 1) + '-12-31';
    const books = [
        { id: 9000008, title: 'Дълбока работа', author: 'Кал Нюпорт', totalPages: 296, currentPage: 112,
            notes: 'Практични съвети за фокусирана работа и по-малко разсейване.' },
        { id: 9000007, title: 'Малкият принц', author: 'Антоан дьо Сент-Екзюпери', totalPages: 96, currentPage: 0, notes: '' },
        { id: 9000006, title: 'Атомни навици', author: 'Джеймс Клиър', totalPages: 320, currentPage: 320,
            notes: 'Малки промени, натрупани с времето.', completion: { logId: 'demo-finished', dateISO: daysAgo(0) } },
        { id: 9000005, title: 'Zen Speaks', author: 'Tsai Chih Chung', totalPages: 160, currentPage: 42,
            notes: '', isbn: '9780385472579' },
        { id: 9000004, title: 'Мисленето', author: 'Даниел Канеман', totalPages: 512, currentPage: 210, notes: '' },
        { id: 9000003, title: 'Sapiens', author: 'Ювал Ноа Харари', totalPages: 443, currentPage: 443, notes: '' },
        { id: 9000002, title: '1984', author: 'Джордж Оруел', totalPages: 328, currentPage: 328, notes: '',
            completion: { logId: 'demo-prior', dateISO: priorDate } },
        { id: 9000001, title: 'Невероятно дългото пътешествие през забравените библиотеки',
            author: 'Елена Николова', totalPages: 240, currentPage: 0, notes: '' },
        { id: 8999999, title: 'Престъпление и наказание', author: 'Фьодор Достоевски', totalPages: 560, currentPage: 117, notes: '' },
        { id: 8999998, title: 'Гордост и предразсъдъци', author: 'Джейн Остин', totalPages: 416, currentPage: 162, notes: '' },
        { id: 8999997, title: 'Името на розата', author: 'Умберто Еко', totalPages: 512, currentPage: 69, notes: '' }
    ].map(book => ({ ...book, createdAt: today.toISOString() }));
    const logs = [
        { id: 'demo-today', bookId: '9000008', dateISO: daysAgo(0), pages: 22,
            note: 'Оставих телефона в другата стая и прочетох цялата глава на спокойствие. Утре ще опитам отново.' },
        { id: 'demo-finished', bookId: '9000006', dateISO: daysAgo(0), pages: 20, note: 'Последните страници.' },
        { id: 'demo-yesterday', bookId: '9000005', dateISO: daysAgo(1), pages: 18, note: '' },
        { id: 'demo-earlier', bookId: '9000004', dateISO: daysAgo(2), pages: 20, note: 'Система 1 и Система 2.' },
        { id: 'demo-prior', bookId: '9000002', dateISO: priorDate, pages: 24, note: 'Последната сесия за годината.' }
    ].map((log, index) => ({ ...log, createdAt: now - index }));

    appStorage.setItem(BookRepo.STORAGE_KEY, JSON.stringify(books));
    appStorage.setItem(LogRepo.STORAGE_KEY, JSON.stringify(logs));
    appStorage.removeItem(ChallengeRepo.STORAGE_KEY);
}

function clearAllData() {
    for (const key of [BookRepo.STORAGE_KEY, LogRepo.STORAGE_KEY, SettingsRepo.STORAGE_KEY, ChallengeRepo.STORAGE_KEY]) {
        appStorage.removeItem(key);
    }
    appStorage.removeItem('bookbuddy_theme');
    ThemeSwitcher.applyTheme('system');
    document.getElementById('themeSelect').value = 'system';
    refreshAll();
    appStorage.removeItem(ChallengeRepo.STORAGE_KEY);
    showToast('Данните бяха изчистени.');
}

function initDemoButtons() {
    if (isDemo && !appStorage.getItem('bookbuddy_demo_initialized')) {
        seedDemoData();
        appStorage.setItem('bookbuddy_demo_initialized', '1');
    }

    const seed = document.getElementById('seedDemoBtn');
    seed.hidden = !isDemo;
    document.getElementById('openDemoLink').hidden = isDemo;
    seed.addEventListener('click', () => {
        if (!isDemo || !confirm('Да заменя ли книгите и сесиите в тази демо библиотека с примерните записи?')) return;
        seedDemoData();
        refreshAll();
        showToast('Демо данните са възстановени.');
    });

    document.getElementById('clearDataBtn').addEventListener('click', () => {
        const scope = isDemo ? 'в тази демо библиотека' : 'в личната библиотека';
        if (confirm('Да изтрия ли всички книги, сесии, настройки, тема и данни за предизвикателствата ' + scope + '?')) {
            clearAllData();
        }
    });
}

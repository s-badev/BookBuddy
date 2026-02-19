// Main page logic - displays list of books
document.addEventListener('DOMContentLoaded', function() {
    ThemeSwitcher.initTheme();
    displayBooks();
    updateStats();
    initNavbarToggle();
    initFeatureCardScroll();
    initLogModal();
    initSettingsModal();
    initBooksToolbar();
    renderActivityFeed();
});

/* ---------- Navbar mobile toggle ---------- */
function initNavbarToggle() {
    const toggle = document.querySelector('.navbar__toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function() {
        const nav = this.closest('.navbar');
        const expanded = nav.classList.toggle('is-open');
        this.setAttribute('aria-expanded', expanded);
    });
}

/* ---------- Feature card scroll navigation ---------- */
function initFeatureCardScroll() {
    var cards = document.querySelectorAll('[data-scroll-target]');
    cards.forEach(function(card) {
        card.addEventListener('click', function() {
            scrollToSection(this.dataset.scrollTarget);
        });
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                scrollToSection(this.dataset.scrollTarget);
            }
        });
    });
}

function scrollToSection(id) {
    var el = document.getElementById(id);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Brief highlight on the target section
    el.classList.add('section-highlight');
    setTimeout(function() {
        el.classList.remove('section-highlight');
    }, 900);
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
    if (state.filter === 'reading') {
        result = result.filter(function(b) {
            var pct = calculateProgress(b.currentPage, b.totalPages);
            return pct > 0 && pct < 100;
        });
    } else if (state.filter === 'finished') {
        result = result.filter(function(b) {
            return calculateProgress(b.currentPage, b.totalPages) >= 100;
        });
    } else if (state.filter === 'wishlist') {
        result = result.filter(function(b) {
            return calculateProgress(b.currentPage, b.totalPages) === 0;
        });
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
            displayBooks();
        }, 250);
    });

    filterSelect.addEventListener('change', function() {
        bookViewState.filter = this.value;
        displayBooks();
    });

    sortSelect.addEventListener('change', function() {
        bookViewState.sort = this.value;
        displayBooks();
    });
}

/* ---------- Display books ---------- */
function displayBooks() {
    const booksList = document.getElementById('booksList');
    const allBooks = BookRepo.getAllBooks();

    if (allBooks.length === 0) {
        booksList.innerHTML = `
            <div class="empty-state">
                <span class="empty-state__icon" aria-hidden="true">📚</span>
                <p class="empty-state__title">Все още няма книги</p>
                <p class="empty-state__text">Добави първата си книга и започни да следиш прогреса си.</p>
                <a href="form.html" class="btn btn--primary btn--pill">+ Добави книга</a>
            </div>
        `;
        updateStats();
        return;
    }

    const books = applyBookViewState(allBooks, bookViewState);

    if (books.length === 0) {
        booksList.innerHTML = `
            <div class="empty-state empty-state--compact">
                <span class="empty-state__icon" aria-hidden="true">🔍</span>
                <p class="empty-state__title">Няма намерени книги</p>
                <p class="empty-state__text">Опитай с различно търсене или филтър.</p>
            </div>
        `;
        updateStats();
        return;
    }

    booksList.innerHTML = books.map(book => createBookCard(book)).join('');

    // Add event listeners for progress updates and delete buttons
    books.forEach(book => {
        const progressInput = document.getElementById(`progress-${book.id}`);
        const deleteBtn = document.getElementById(`delete-${book.id}`);

        if (progressInput) {
            progressInput.addEventListener('change', function() {
                updateBookProgress(book.id, this.value, book.totalPages);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                deleteBook(book.id);
            });
        }
    });
    
    updateStats();
}

/* ---------- Book card template ---------- */
function createBookCard(book) {
    const progress = calculateProgress(book.currentPage, book.totalPages);
    const statusLabel = getStatusLabel(progress);

    return `
        <article class="book-card" aria-label="${escapeHtml(book.title)}">
            <div class="book-card__top"></div>
            <div class="book-card__body">
                <div class="book-card__header">
                    <div class="book-card__info">
                        <h3 class="book-card__title">${escapeHtml(book.title)}</h3>
                        <p class="book-card__author">от ${escapeHtml(book.author)}</p>
                    </div>
                    <span class="pill ${statusLabel.cls}">${statusLabel.text}</span>
                </div>

                <div class="book-card__progress">
                    <div class="book-card__progress-info">
                        <span>
                            <input type="number"
                                   class="book-card__progress-input"
                                   id="progress-${book.id}"
                                   value="${book.currentPage}"
                                   min="0"
                                   max="${book.totalPages}"
                                   aria-label="Текуща страница">
                            / ${book.totalPages} стр.
                        </span>
                        <span class="book-card__pct">${progress}%</span>
                    </div>
                    <div class="progress-bar" role="progressbar"
                         aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"
                         aria-label="Прогрес на четенето ${progress}%">
                        <div class="progress-fill" style="width:${progress}%"></div>
                    </div>
                </div>

                ${book.notes ? `<div class="book-card__notes">${escapeHtml(book.notes)}</div>` : ''}

                <div class="book-card__footer">
                    <a href="form.html?id=${book.id}"
                       id="edit-${book.id}"
                       class="btn btn--icon btn--icon-edit"
                       aria-label="Редактирай ${escapeHtml(book.title)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </a>
                    <button id="delete-${book.id}"
                            class="btn btn--icon btn--icon-danger"
                            aria-label="Изтрий ${escapeHtml(book.title)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        </article>
    `;
}

/* ---------- Status badge helper ---------- */
function getStatusLabel(progress) {
    if (progress >= 100) return { text: 'Прочетена', cls: 'pill--finished' };
    if (progress > 0)    return { text: 'Чета', cls: 'pill--reading' };
    return { text: 'За четене', cls: 'pill--wishlist' };
}

/* ---------- Progress helpers ---------- */
function calculateProgress(current, total) {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
}

function updateBookProgress(bookId, newPage, totalPages) {
    const pageNum = parseInt(newPage);
    
    if (pageNum < 0 || pageNum > totalPages) {
        alert(`Страницата трябва да е между 0 и ${totalPages}`);
        displayBooks();
        return;
    }

    BookRepo.updateProgress(bookId, pageNum);
    displayBooks();
}

function deleteBook(bookId) {
    if (confirm('Сигурни ли сте, че искате да изтриете тази книга?')) {
        BookRepo.deleteBook(bookId);
        displayBooks();
    }
}

/* ---------- Stats ---------- */
function updateStats() {
    const books = BookRepo.getAllBooks();
    
    // Total Books
    const totalBooks = books.length;
    document.getElementById('statBooks').textContent = totalBooks;
    
    // Total Pages Read (derived from reading logs)
    const allLogs = LogRepo.getAllLogs();
    const totalPagesRead = allLogs.reduce((sum, log) => sum + log.pages, 0);
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

    // Hero stat (if present on page)
    const heroPagesEl = document.getElementById('heroPagesRead');
    if (heroPagesEl) {
        heroPagesEl.textContent = totalPagesRead.toLocaleString();
    }

    // Goal + Streak
    renderGoalStreak();

    // Top 5 this week
    renderTopBooks();

    // Challenges
    renderChallenges();
}

/* ---------- Helpers ---------- */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
            return sum + log.pages;
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
function renderGoalStreak() {
    var settings = SettingsRepo.getSettings();
    var allLogs  = LogRepo.getAllLogs();

    // Weekly goal
    var week         = getWeekRangeISO(new Date());
    var weekPages    = sumLogsInRange(allLogs, week.startISO, week.endISO);
    var goalTarget   = settings.weeklyGoalPages;
    var goalPct      = Math.min(100, Math.round((weekPages / goalTarget) * 100));

    var goalValueEl = document.getElementById('goalValue');
    var goalFillEl  = document.getElementById('goalFill');
    var goalPctEl   = document.getElementById('goalPct');
    if (goalValueEl) goalValueEl.textContent = weekPages + ' / ' + goalTarget + ' стр.';
    if (goalFillEl)  goalFillEl.style.width  = goalPct + '%';
    if (goalPctEl)   goalPctEl.textContent   = goalPct + '%';

    // Streak
    var streak      = calculateStreak(allLogs, settings.minPagesForStreakDay);
    var streakValEl = document.getElementById('streakValue');
    if (streakValEl) streakValEl.textContent = streak;
}

/* ========== Top 5 Books This Week ========== */

/** Returns top N books by pages logged this week [{bookId, title, weekPages}] */
function getTopBooksThisWeek(books, logs, limit) {
    limit = limit || 5;
    var week = getWeekRangeISO(new Date());

    // Sum pages per book for this week
    var pagesByBook = {};
    logs.forEach(function(log) {
        if (log.dateISO >= week.startISO && log.dateISO <= week.endISO) {
            pagesByBook[String(log.bookId)] = (pagesByBook[String(log.bookId)] || 0) + log.pages;
        }
    });

    // Build entries for ALL books (default weekPages = 0)
    var entries = books.map(function(b) {
        var id = String(b.id);
        var progress = b.totalPages > 0 ? b.currentPage / b.totalPages : 0;
        return {
            bookId: id,
            title: b.title,
            weekPages: pagesByBook[id] || 0,
            progress: progress
        };
    });

    // Sort: weekPages DESC → progress DESC → title ASC
    entries.sort(function(a, b) {
        if (b.weekPages !== a.weekPages) return b.weekPages - a.weekPages;
        if (b.progress !== a.progress) return b.progress - a.progress;
        return a.title.localeCompare(b.title, 'bg');
    });

    return entries.slice(0, limit);
}

function renderTopBooks() {
    var container = document.getElementById('topBooksThisWeek');
    if (!container) return;

    var books = BookRepo.getAllBooks();
    var logs  = LogRepo.getAllLogs();
    var top   = getTopBooksThisWeek(books, logs, 5);

    if (top.length === 0) {
        container.innerHTML =
            '<div class="empty-state empty-state--compact">' +
                '<span class="empty-state__icon" aria-hidden="true">📊</span>' +
                '<p class="empty-state__title">Все още няма добавени книги.</p>' +
                '<p class="empty-state__text">Добави книга и логни сесия, за да видиш класацията.</p>' +
            '</div>';
        return;
    }

    // Max pages (for relative bar width); minimum 1 to avoid division by zero
    var maxPages = Math.max(top[0].weekPages, 1);

    container.innerHTML = top.map(function(item, i) {
        var barPct = Math.round((item.weekPages / maxPages) * 100);
        return (
            '<div class="top-book-item">' +
                '<span class="top-book-item__rank">' + (i + 1) + '</span>' +
                '<div class="top-book-item__body">' +
                    '<div class="top-book-item__header">' +
                        '<span class="top-book-item__title">' + escapeHtml(item.title) + '</span>' +
                        '<span class="top-book-item__pages">' + item.weekPages + ' стр.</span>' +
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

function renderChallenges() {
    var container = document.getElementById('challengesList');
    if (!container) return;

    // Seed defaults on first run
    ChallengeRepo.seedDefaultChallengesIfEmpty();

    var challenges = ChallengeRepo.getChallenges();
    var allLogs    = LogRepo.getAllLogs();
    var settings   = SettingsRepo.getSettings();

    if (challenges.length === 0) {
        container.innerHTML =
            '<div class="empty-state empty-state--compact">' +
                '<span class="empty-state__icon" aria-hidden="true">🏆</span>' +
                '<p class="empty-state__title">Няма предизвикателства.</p>' +
            '</div>';
        return;
    }

    // Pre-compute values needed by challenges
    var week      = getWeekRangeISO(new Date());
    var weekPages = sumLogsInRange(allLogs, week.startISO, week.endISO);
    var streak    = calculateStreak(allLogs, settings.minPagesForStreakDay);

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

        // Mark completed in data if newly achieved
        if (completed && ch.active) {
            ch.active = false;
            anyChanged = true;
        }

        var statusCls  = completed ? 'pill--finished' : 'pill--reading';
        var statusText = completed ? 'Завършено' : 'Активно';

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
                        '<span class="challenge-card__title">' + escapeHtml(ch.title) + '</span>' +
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
    var overlay   = document.getElementById('settingsModal');
    var form      = document.getElementById('settingsForm');
    var openBtn   = document.getElementById('editGoalBtn');
    var closeBtn  = document.getElementById('settingsModalClose');
    var cancelBtn = document.getElementById('settingsModalCancel');

    if (!overlay || !form || !openBtn) return;

    openBtn.addEventListener('click', function() { openSettingsModal(); });
    closeBtn.addEventListener('click', function() { closeSettingsModal(); });
    cancelBtn.addEventListener('click', function() { closeSettingsModal(); });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeSettingsModal();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !overlay.hasAttribute('hidden')) closeSettingsModal();
    });

    form.addEventListener('submit', handleSettingsSubmit);
}

function openSettingsModal() {
    var overlay     = document.getElementById('settingsModal');
    var goalInput   = document.getElementById('settingWeeklyGoal');
    var streakInput = document.getElementById('settingMinStreak');
    var settings    = SettingsRepo.getSettings();

    goalInput.value   = settings.weeklyGoalPages;
    streakInput.value = settings.minPagesForStreakDay;

    // Clear previous errors
    document.getElementById('settingWeeklyGoalError').textContent = '';
    document.getElementById('settingMinStreakError').textContent   = '';

    overlay.removeAttribute('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    goalInput.focus();
}

function closeSettingsModal() {
    var overlay = document.getElementById('settingsModal');
    var form    = document.getElementById('settingsForm');
    overlay.setAttribute('hidden', '');
    overlay.setAttribute('aria-hidden', 'true');
    form.reset();
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

    closeSettingsModal();
    renderGoalStreak();
    showToast('Целите са обновени!');
}

/* ========== Reading Log Modal ========== */
function initLogModal() {
    const overlay = document.getElementById('logModal');
    const form    = document.getElementById('logForm');
    const openBtn = document.getElementById('logReadingBtn');
    const closeBtn = document.getElementById('logModalClose');
    const cancelBtn = document.getElementById('logModalCancel');

    if (!overlay || !form || !openBtn) return;

    openBtn.addEventListener('click', () => openLogModal());
    closeBtn.addEventListener('click', () => closeLogModal());
    cancelBtn.addEventListener('click', () => closeLogModal());

    // Close on overlay click (not card)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeLogModal();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !overlay.hasAttribute('hidden')) closeLogModal();
    });

    form.addEventListener('submit', handleLogSubmit);
}

function openLogModal() {
    _editingLogId = null; // add mode
    const overlay = document.getElementById('logModal');
    const select  = document.getElementById('logBook');
    const dateInput = document.getElementById('logDate');
    const titleEl = document.getElementById('logModalTitle');
    const submitBtn = document.getElementById('logSubmitBtn');

    titleEl.textContent = 'Логвай четене';
    submitBtn.textContent = 'Запиши';

    // Populate book dropdown
    const books = BookRepo.getAllBooks();
    select.innerHTML = '<option value="">— Избери книга —</option>';
    books.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.title;
        select.appendChild(opt);
    });

    // Default date to today
    dateInput.value = new Date().toISOString().slice(0, 10);
    document.getElementById('logPages').value = '';
    document.getElementById('logNote').value = '';

    // Clear previous errors
    clearLogErrors();

    overlay.removeAttribute('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    select.focus();
}

function openEditLogModal(logId) {
    const log = LogRepo.getLogById(logId);
    if (!log) return;

    _editingLogId = logId; // edit mode
    const overlay = document.getElementById('logModal');
    const select  = document.getElementById('logBook');
    const dateInput = document.getElementById('logDate');
    const pagesInput = document.getElementById('logPages');
    const noteInput = document.getElementById('logNote');
    const titleEl = document.getElementById('logModalTitle');
    const submitBtn = document.getElementById('logSubmitBtn');

    titleEl.textContent = 'Редактирай запис';
    submitBtn.textContent = 'Запази';

    // Populate book dropdown
    const books = BookRepo.getAllBooks();
    select.innerHTML = '<option value="">— Избери книга —</option>';
    books.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.title;
        select.appendChild(opt);
    });

    // Pre-fill from existing log
    select.value = String(log.bookId);
    dateInput.value = log.dateISO;
    pagesInput.value = log.pages;
    noteInput.value = log.note || '';

    clearLogErrors();

    overlay.removeAttribute('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    select.focus();
}

function closeLogModal() {
    _editingLogId = null;
    const overlay = document.getElementById('logModal');
    const form    = document.getElementById('logForm');
    overlay.setAttribute('hidden', '');
    overlay.setAttribute('aria-hidden', 'true');
    form.reset();
    clearLogErrors();
}

function clearLogErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}

function handleLogSubmit(e) {
    e.preventDefault();
    clearLogErrors();

    const bookId = document.getElementById('logBook').value;
    const dateISO = document.getElementById('logDate').value;
    const pages  = document.getElementById('logPages').value;
    const note   = document.getElementById('logNote').value.trim();

    let valid = true;

    if (!bookId) {
        document.getElementById('logBookError').textContent = 'Избери книга.';
        valid = false;
    }
    if (!dateISO) {
        document.getElementById('logDateError').textContent = 'Въведи дата.';
        valid = false;
    }
    const pagesInt = parseInt(pages, 10);
    if (!pages || isNaN(pagesInt) || pagesInt < 1) {
        document.getElementById('logPagesError').textContent = 'Въведи поне 1 страница.';
        valid = false;
    }

    if (!valid) return;

    if (_editingLogId) {
        // ---- EDIT MODE ----
        const oldLog = LogRepo.getLogById(_editingLogId);
        if (!oldLog) { closeLogModal(); return; }

        const oldBookId = Number(oldLog.bookId);
        const newBookId = Number(bookId);
        const oldPages = oldLog.pages;
        const newPages = pagesInt;

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

        closeLogModal();
        displayBooks();
        renderActivityFeed();
        showToast('Записът е обновен!');
    } else {
        // ---- ADD MODE ----
        LogRepo.addLog({ bookId, dateISO, pages: pagesInt, note });

        // Update book progress: currentPage + pages, capped at totalPages
        const book = BookRepo.getBookById(Number(bookId));
        if (book) {
            const newPage = Math.min(book.totalPages, book.currentPage + pagesInt);
            BookRepo.updateProgress(Number(bookId), newPage);
        }

        closeLogModal();
        displayBooks();
        renderActivityFeed();
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
    const bookObjMap = {};
    books.forEach(b => { bookMap[String(b.id)] = b.title; bookObjMap[String(b.id)] = b; });

    if (logs.length === 0) {
        container.innerHTML = `
            <div class="empty-state empty-state--compact">
                <span class="empty-state__icon" aria-hidden="true">📖</span>
                <p class="empty-state__title">Все още няма логнати сесии</p>
                <p class="empty-state__text">Натисни „Логвай четене", за да запишеш първата си сесия.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = logs.map(log => {
        const bookTitle = bookMap[String(log.bookId)] || 'Изтрита книга';
        const bookObj = bookObjMap[String(log.bookId)];
        const dayLabel = getRelativeDayLabel(log.dateISO);
        const safeSessionPages = Number(log.pages) || 0;
        const displayPages = bookObj ? bookObj.currentPage : safeSessionPages;
        return `
            <div class="activity-item" data-log-id="${log.id}">
                <div class="activity-item__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div class="activity-item__body">
                    <p class="activity-item__title">
                        <strong>${escapeHtml(bookTitle)} — Прочетени ${displayPages} стр.</strong>
                        ${log.note ? '<span class="activity-item__note">— ' + escapeHtml(log.note) + '</span>' : ''}
                    </p>
                </div>
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
            displayBooks();
            renderActivityFeed();
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

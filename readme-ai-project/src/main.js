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
    initHeroTilt();
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

const COVER_ART_MAP = {
    'дълбока работа': 'deep', 'deep work': 'deep', 'малкият принц': 'prince', '1984': 'orwell',
    'sapiens': 'sapiens', 'мисленето': 'think', 'атомни навици': 'atomic', 'стив джобс': 'jobs',
    'илон мъск': 'musk', 'престъпление и наказание': 'crime', 'майстора и маргарита': 'master',
    'гордост и предразсъдъци': 'pride', 'дюн': 'dune', 'война и мир': 'war', 'над пропастта във ръжта': 'rye',
    'норвежка гора': 'plain', 'хомо деус': 'sapiens', 'джентълменът в москва': 'plain', 'фаренхайт 451': 'orwell',
    'старецът и морето': 'plain', 'братя карамазови': 'crime', 'ана каренина': 'war', 'улис': 'plain',
    'процесът': 'plain', 'граф монте кристо': 'war', 'медитации': 'plain', 'чужденецът': 'plain',
    'на изток от рая': 'war', 'сто години самота': 'master', 'да убиеш присмехулник': 'pride',
    'пътят': 'plain', 'хамлет': 'orwell', 'безкрайна шега': 'plain', 'невидими градове': 'prince',
    'идиот': 'crime', 'среднощни деца': 'plain'
};

const BG_MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];

function coverArtOf(book) {
    return COVER_ART_MAP[String(book?.title || '').trim().toLowerCase()] || 'plain';
}

function formatCoverTitle(book) {
    const title = String(book?.title || '');
    if (title.length <= 10) return title;
    const mid = title.lastIndexOf(' ', Math.ceil(title.length / 2));
    return mid > 0 ? title.slice(0, mid) + '\n' + title.slice(mid + 1) : title;
}

function createCover(book, loading = 'lazy', allowImage = true) {
    const status = getBookStatus(book);
    const art = coverArtOf(book);
    const isbn = allowImage ? Validate.normalizeISBN(book.isbn ?? '') : '';
    const image = isbn ? `
            <img class="book-cover__image" alt="" loading="${loading}" referrerpolicy="no-referrer"
                 src="https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false">` : '';
    return `
        <span class="book-cover book-cover--${status} cover-art--${art}" aria-hidden="true">
            <span class="cover-art"><i></i><i></i><i></i><i></i><i></i></span>
            <span class="book-cover__copy">
                <span class="book-cover__author">${escapeHtml(book.author)}</span>
                <span class="book-cover__title">${escapeHtml(formatCoverTitle(book))}</span>
            </span>
            <span class="book-cover__imprint"><b></b><span>BB</span></span>
            ${image}
        </span>`;
}

function createHeroBook(book) {
    const status = getBookStatus(book);
    const percent = calculateProgress(book.currentPage, book.totalPages);
    const bookmarkClass = 'bookmark' + (percent === 0 ? ' is-tucked' : '') + (status === 'finished' ? ' is-foil' : '');
    return `
        <span class="hero-stage">
            <span class="object" aria-hidden="true">
                <span class="object-shadow"></span>
                <span class="volume volume--${status}" style="--read:${percent}">
                    <span class="${bookmarkClass}" style="--read:${percent}"></span>
                    <span class="spine"></span>
                    <span class="fore-edge"></span>
                    <span class="bottom-edge"></span>
                    ${createCover(book, 'eager', false)}
                </span>
            </span>
        </span>`;
}

function initHeroTilt() {
    const host = document.querySelector('.reading-card__art');
    if (!host) return;
    host.addEventListener('pointermove', event => {
        if (reducedMotion.matches) return;
        const art = event.target.closest('.hero-art');
        const vol = art?.querySelector('.volume');
        const stage = art?.querySelector('.hero-stage');
        if (!art || !vol) return;
        const rect = art.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        vol.style.transform = `rotateY(${(-26 + x * 18).toFixed(2)}deg) rotateX(${(8 - y * 10).toFixed(2)}deg) rotateZ(-9deg)`;
        stage?.style.setProperty('--sx', (x * 16).toFixed(1) + 'px');
        stage?.style.setProperty('--sy', (y * 10).toFixed(1) + 'px');
    });
    host.addEventListener('pointerleave', () => {
        host.querySelectorAll('.volume').forEach(vol => { vol.style.transform = ''; });
        host.querySelectorAll('.hero-stage').forEach(stage => {
            stage.style.setProperty('--sx', '0px');
            stage.style.setProperty('--sy', '0px');
        });
    });
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
    const featured = latest ? booksById.get(String(latest.bookId)) : (inProgress[0] || books[0]);
    const openButton = document.getElementById('logReadingBtn');
    const cover = document.getElementById('readingCover');
    const placeholder = document.getElementById('readingPlaceholder');
    const details = document.getElementById('featuredDetailsBtn');
    const author = document.getElementById('readingAuthor');
    const eyebrow = document.getElementById('readingEyebrow');
    const colophon = document.getElementById('readingColophon');
    const pressFootDate = document.getElementById('pressFootDate');
    const home = document.getElementById('home');
    const now = new Date();
    const monthYear = BG_MONTHS[now.getMonth()] + '\u00A0' + now.getFullYear();

    if (colophon) colophon.textContent = 'Читалня нощем · ' + monthYear;
    if (pressFootDate) pressFootDate.textContent = monthYear + ' · София';
    home?.classList.toggle('is-empty-state', !featured);

    const status = featured ? getBookStatus(featured) : '';
    eyebrow.hidden = false;
    eyebrow.textContent = !featured
        ? 'Първа страница'
        : status === 'finished'
            ? 'Последно прочетена'
            : status === 'wishlist'
                ? 'Следваща на рафта'
                : 'В момента четеш';

    openButton.hidden = !featured || status === 'finished';
    openButton.dataset.bookId = featured?.id ?? '';
    document.getElementById('firstBookLink').hidden = books.length > 0;
    setKineticText(document.getElementById('readingTitle'), featured?.title ?? 'Твоето четене');
    author.textContent = featured
        ? featured.author
        : 'Рафтът очаква първия том — добави книга, за да отвориш читалнята.';
    author.hidden = false;
    document.getElementById('readingProgress').hidden = false;
    placeholder.hidden = Boolean(featured);
    cover.hidden = !featured;
    details.hidden = !featured;
    cover.dataset.detailsBook = details.dataset.detailsBook = featured?.id ?? '';
    cover.setAttribute('aria-label', featured ? 'Отвори „' + featured.title + '“' : 'За книгата');
    cover.innerHTML = featured ? createHeroBook(featured) : '';

    if (featured) {
        const percent = calculateProgress(featured.currentPage, featured.totalPages);
        document.getElementById('readingPages').textContent = featured.currentPage + ' от ' + featured.totalPages + ' стр.';
        document.getElementById('readingPercent').textContent = percent + '%';
        document.getElementById('readingMeter').value = percent;
    } else {
        document.getElementById('readingPages').textContent = '0 от 0 стр.';
        document.getElementById('readingPercent').textContent = '0%';
        document.getElementById('readingMeter').value = 0;
    }
}

/* ---------- Stats ---------- */
function updateStats(books = BookRepo.getAllBooks()) {
    
    // Total Books
    const totalBooks = books.length;
    setCountUp(document.getElementById('statBooks'), totalBooks);
    
    // Total Pages Read — derived ONLY from books (single source of truth)
    const totalPagesRead = books.reduce((sum, book) => sum + (Number(book.currentPage) || 0), 0);
    setCountUp(document.getElementById('statPagesRead'), totalPagesRead, n => n.toLocaleString());
    
    // Average Progress
    let avgProgress = 0;
    if (totalBooks > 0) {
        const totalProgress = books.reduce((sum, book) => {
            return sum + (book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0);
        }, 0);
        avgProgress = Math.round(totalProgress / totalBooks);
    }
    setCountUp(document.getElementById('statAvgProgress'), avgProgress, n => n + '%');

    const logs = getJournalLogs(books).filter(log => isDateISO(log.dateISO));
    const settings = SettingsRepo.getSettings();
    const week = getWeekRangeISO(new Date());
    const weekPages = sumLogsInRange(logs, week.startISO, week.endISO);
    const streak = calculateStreak(logs, settings.minPagesForStreakDay);
    renderFeaturedBook(books, logs);
    renderGoal(weekPages, settings.weeklyGoalPages);
    setCountUp(document.getElementById('streakValue'), streak);
    setCountUp(document.getElementById('homeStreakValue'), streak);
    renderTopBooks(books);
    renderChallenges(weekPages, streak);
    renderJournalAnalytics(books, logs, settings, weekPages, streak);
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
    setCountUp(document.getElementById('goalPages'), weekPages);
    document.getElementById('goalTarget').textContent = '/' + target;
    const remaining = Math.max(0, target - weekPages);
    document.getElementById('goalDetail').textContent = remaining > 0
        ? 'Още ' + remaining + ' страници до целта.'
        : 'Седмичната цел е изпълнена.';
}

/* ========== Top 5 Most-Read Books (by total progress) ========== */

/**
 * Returns top N books by actual read pages (currentPage).
 * "Прочетена" books are normalised so readPages = totalPages.
 * [{bookId, title, author, readPages, totalPages}]
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
            author: b.author || '',
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
    document.getElementById('topBooksThisWeek').innerHTML = top.length ? top.map((item, index) => `
        <li>
            <button type="button" class="rank-item" id="rank-book-${item.bookId}" data-details-book="${item.bookId}" aria-haspopup="dialog">
                <span class="rank-num">${index + 1}</span>
                <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.author)}</small></span>
                <small>${item.readPages} стр.</small>
            </button>
        </li>`).join('') : '<li class="rank-empty">Все още няма добавени книги.</li>';
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
        const title = challenge.id === 'streak_14'
            ? 'Серия 14 дни' : challenge.title;
        if ((weekly || completed) && challenge.active === completed) {
            challenge.active = !completed;
            changed = true;
        }
        return `
            <article class="challenge-item editorial-challenge">
                <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(challenge.description)}</small></span>
                <span class="challenge-progress">${current} / ${target}</span>
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
        runPendingFinish();
    });
}

/* ========== Finished book: stamp and shelf flash ========== */
// Set by handleLogSubmit when a session finishes a book; played after the
// log dialog has closed and any dialog it returns to has reopened.
let pendingFinish = null;

function runPendingFinish() {
    if (!pendingFinish) return;
    const { bookId, moveFocus } = pendingFinish;
    pendingFinish = null;
    requestAnimationFrame(() => celebrateFinish(bookId, moveFocus));
}

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    const top = document.querySelector('.navbar').getBoundingClientRect().bottom;
    const nav = document.querySelector('.bottom-nav');
    const bottom = nav.offsetHeight ? nav.getBoundingClientRect().top : innerHeight;
    return rect.top >= top && rect.bottom <= bottom && rect.left >= 0 && rect.right <= innerWidth;
}

function celebrateFinish(bookId, moveFocus = true) {
    const spine = document.getElementById('shelf-book-' + bookId);
    if (spine) {
        const bay = spine.closest('.shelf-bay');
        spine.classList.add('is-just-finished');
        bay?.classList.add('has-arrival');
        setTimeout(() => {
            spine.classList.remove('is-just-finished');
            bay?.classList.remove('has-arrival');
        }, motionMs('--dur-slow', 480) * 3);
    }

    // The stamp lands where the reader is looking: the open book, or the shelf.
    const preview = document.getElementById('shelfPreview');
    const details = document.getElementById('detailsModal');
    if (preview.open && activeShelf?.bookId === bookId) {
        playFinishStamp(preview.querySelector('#shelfPreviewFront .book-cover'), 'cover');
    } else if (details.open && detailsContext?.bookId === bookId) {
        playFinishStamp(details.querySelector('.details-book .book-cover'), 'cover');
    } else if (spine) {
        playFinishStamp(spine, 'spine');
        if (moveFocus) {
            if (!isInViewport(spine)) {
                spine.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
            }
            spine.focus({ preventScroll: true });
        }
    }
}

function finishedToast(book) {
    return 'Прочетено: „' + book.title + '“';
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
    // `book` still holds the state before this session.
    const finished = getBookStatus(book) !== 'finished' &&
        getBookStatus(BookRepo.getBookById(book.id)) === 'finished';
    if (finished) pendingFinish = { bookId: book.id, moveFocus: !oldLog };

    dialog.close();
    refreshAll();
    if (oldLog && !readingReturn) {
        const opener = document.getElementById('journal-edit-' + oldLog.id) || document.querySelector('#activity h3');
        opener.focus({ preventScroll: true });
    }
    showToast(finished ? finishedToast(book) : oldLog ? 'Записът е обновен!' : 'Сесията е записана!');
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
        const before = BookRepo.getBookById(detailsContext.bookId);
        BookRepo.updateProgress(detailsContext.bookId, value);
        refreshAll();
        showBookDetails('detailsProgress');
        const after = BookRepo.getBookById(detailsContext.bookId);
        if (before && after && getBookStatus(before) !== 'finished' && getBookStatus(after) === 'finished') {
            celebrateFinish(after.id, false);
            showToast(finishedToast(after));
        } else {
            showToast('Напредъкът е обновен.');
        }
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
    const summary = document.getElementById('activitySummary');
    const books = BookRepo.getAllBooks();
    const byId = new Map(books.map(book => [String(book.id), book]));
    const logs = getJournalLogs(books);

    if (summary) {
        const totalSessionPages = logs.reduce((s, l) => s + (Number(l.pages) || 0), 0);
        summary.textContent = logs.length
            ? logs.length + (logs.length === 1 ? ' записана сесия · ' : ' записани сесии · ') + totalSessionPages + ' стр. в хрониката'
            : 'Все още няма записани сесии';
    }

    if (!logs.length) {
        container.innerHTML = '<p>Все още няма записани сесии. <a href="#home">Към четенето</a></p>';
        return;
    }

    container.innerHTML = logs.map((log, index) => {
        const book = byId.get(String(log.bookId));
        const id = escapeHtml(log.id);
        const date = formatDateBG(log.dateISO);
        const label = escapeHtml(book.title + (date ? ' · ' + date : ''));
        const noteText = (log.note || '').trim();
        const noteMarkup = noteText
            ? `<p class="journal-entry__note">${escapeHtml(noteText)}</p>`
            : `<p class="journal-entry__note journal-entry__note--quiet">Без бележка към сесията.</p>`;
        return `
            <article class="journal-entry reveal is-in${index === 0 ? ' journal-entry--lead' : ''}" style="--entry-i:${Math.min(index, 12)}" data-log-id="${id}">
                <div class="journal-entry__main">
                    <h4 class="journal-entry__title">${escapeHtml(book.title)}</h4>
                    <p class="journal-entry__meta"><strong>${Number(log.pages)} стр. в тази сесия</strong> <span>· ${book.currentPage} от ${book.totalPages} стр. общо · ${escapeHtml(book.author)}</span></p>
                </div>
                <div class="journal-entry__margin">
                    ${sessionDateMarkup(log)}
                    ${noteMarkup}
                </div>
                <div class="journal-entry__actions">
                    <button type="button" class="btn btn--ghost" id="journal-edit-${id}" data-edit-session="${id}"
                            aria-label="Редактирай сесията ${label}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.5 5.5 4 4M4 20l1-5L16 4a2.8 2.8 0 0 1 4 4L9 19z"/></svg>
                        <span>Редактирай</span>
                    </button>
                    <button type="button" class="btn btn--ghost btn--ghost-danger" data-delete-session="${id}"
                            aria-label="Изтрий сесията ${label}">Изтрий</button>
                </div>
            </article>`;
    }).join('');

    bindJournalReveals();
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
    const year = today.getFullYear();
    const daysAgo = days => {
        const date = new Date(today);
        date.setDate(date.getDate() - days);
        return getDayISO(date);
    };
    const priorDate = (year - 1) + '-12-31';
    const books = [
        { id: 9000008, title: 'Дълбока работа', author: 'Кал Нюпорт', totalPages: 296, currentPage: 112,
            notes: 'Практични съвети за фокусирана работа и по-малко разсейване.' },
        { id: 9000007, title: 'Малкият принц', author: 'Антоан дьо Сент-Екзюпери', totalPages: 96, currentPage: 0, notes: '' },
        { id: 9000006, title: 'Атомни навици', author: 'Джеймс Клиър', totalPages: 320, currentPage: 320,
            notes: 'Малки промени, натрупани с времето.', completion: { logId: 'demo-finished', dateISO: year + '-04-18' } },
        { id: 9000005, title: 'Zen Speaks', author: 'Tsai Chih Chung', totalPages: 160, currentPage: 42,
            notes: '', isbn: '9780385472579' },
        { id: 9000004, title: 'Мисленето', author: 'Даниел Канеман', totalPages: 512, currentPage: 210, notes: '' },
        { id: 9000003, title: 'Sapiens', author: 'Ювал Ноа Харари', totalPages: 443, currentPage: 443,
            notes: 'Поглед към човешката история, който остава.', completion: { logId: 'demo-m06a', dateISO: year + '-06-11' } },
        { id: 9000002, title: '1984', author: 'Джордж Оруел', totalPages: 328, currentPage: 328, notes: '',
            completion: { logId: 'demo-prior', dateISO: priorDate } },
        { id: 9000001, title: 'Невероятно дългото пътешествие през забравените библиотеки',
            author: 'Елена Николова', totalPages: 240, currentPage: 0, notes: '' },
        { id: 8999999, title: 'Престъпление и наказание', author: 'Фьодор Достоевски', totalPages: 671, currentPage: 671,
            notes: 'Тежка и голяма книга, която се носи дълго след края.', completion: { logId: 'demo-m02b', dateISO: year + '-02-28' } },
        { id: 8999998, title: 'Гордост и предразсъдъци', author: 'Джейн Остин', totalPages: 416, currentPage: 162, notes: '' },
        { id: 8999997, title: 'Името на розата', author: 'Умберто Еко', totalPages: 512, currentPage: 69, notes: '' },
        { id: 8999996, title: 'Ана Каренина', author: 'Лев Толстой', totalPages: 864, currentPage: 864,
            notes: '', completion: { logId: 'demo-m04b', dateISO: year + '-04-10' } },
        { id: 8999995, title: 'Братя Карамазови', author: 'Фьодор Достоевски', totalPages: 824, currentPage: 824,
            notes: '', completion: { logId: 'demo-m02a', dateISO: year + '-02-20' } },
        { id: 8999994, title: 'Майстора и Маргарита', author: 'Михаил Булгаков', totalPages: 448, currentPage: 448,
            notes: 'Любима препрочитана история.', completion: { logId: 'demo-m04c', dateISO: year + '-04-30' } }
    ].map(book => ({ ...book, createdAt: today.toISOString() }));

    const logs = [
        { id: 'demo-today', bookId: '9000008', dateISO: daysAgo(0), pages: 12,
            note: 'Оставих телефона в другата стая и прочетох цялата глава на спокойствие. Утре ще опитам отново.' },
        { id: 'demo-d1a', bookId: '9000008', dateISO: daysAgo(1), pages: 12, note: 'Правила за дълбока концентрация без прекъсвания.' },
        { id: 'demo-d1b', bookId: '9000005', dateISO: daysAgo(1), pages: 8, note: 'Кратки дзен притчи преди сън.' },
        { id: 'demo-d2a', bookId: '9000004', dateISO: daysAgo(2), pages: 9, note: 'Система 1 и Система 2 — как прибързваме със заключенията.' },
        { id: 'demo-d2b', bookId: '8999998', dateISO: daysAgo(2), pages: 7, note: '' },
        { id: 'demo-d3', bookId: '9000008', dateISO: daysAgo(3), pages: 8, note: 'За ритуалите на работното място.' },
        { id: 'demo-d4', bookId: '8999997', dateISO: daysAgo(4), pages: 6, note: 'Лабиринтът на манастирската библиотека.' },
        { id: 'demo-d5', bookId: '9000005', dateISO: daysAgo(5), pages: 8, note: '' },
        { id: 'demo-d6', bookId: '9000004', dateISO: daysAgo(6), pages: 11, note: 'Евристика на наличността и когнитивни капани.' },
        { id: 'demo-d7', bookId: '9000008', dateISO: daysAgo(7), pages: 9, note: '' },
        { id: 'demo-d8', bookId: '8999998', dateISO: daysAgo(8), pages: 10, note: 'Първият разговор в Недърфийлд.' },
        { id: 'demo-d9', bookId: '8999997', dateISO: daysAgo(9), pages: 7, note: '' },
        { id: 'demo-d10', bookId: '9000005', dateISO: daysAgo(10), pages: 6, note: '' },
        { id: 'demo-d11', bookId: '9000004', dateISO: daysAgo(11), pages: 8, note: '' },
        { id: 'demo-d12', bookId: '9000008', dateISO: daysAgo(12), pages: 7, note: 'Начало на втората част.' },
        { id: 'demo-d13', bookId: '8999998', dateISO: daysAgo(13), pages: 8, note: '' },
        { id: 'demo-m10a', bookId: '8999997', dateISO: year + '-10-24', pages: 26, note: 'Ръкописът със загадъчните бележки в полето.' },
        { id: 'demo-m10b', bookId: '9000004', dateISO: year + '-10-14', pages: 22, note: 'За илюзията на валидността.' },
        { id: 'demo-m09a', bookId: '9000008', dateISO: year + '-09-25', pages: 24, note: 'Първа среща с идеята за монохронно време.' },
        { id: 'demo-m09b', bookId: '8999998', dateISO: year + '-09-12', pages: 28, note: '' },
        { id: 'demo-m08a', bookId: '9000004', dateISO: year + '-08-28', pages: 32, note: 'Дълги летни следобеди с Канеман.' },
        { id: 'demo-m08b', bookId: '9000004', dateISO: year + '-08-15', pages: 24, note: '' },
        { id: 'demo-m07a', bookId: '8999998', dateISO: year + '-07-19', pages: 30, note: 'Писмата променят всичко.' },
        { id: 'demo-m06a', bookId: '9000003', dateISO: year + '-06-11', pages: 38, note: 'Краят на Sapiens — научната революция и бъдещето.' },
        { id: 'demo-m06b', bookId: '9000003', dateISO: year + '-06-04', pages: 34, note: '' },
        { id: 'demo-m05a', bookId: '9000003', dateISO: year + '-05-16', pages: 28, note: 'Когнитивната революция и силата на общите митове.' },
        { id: 'demo-m04c', bookId: '8999994', dateISO: year + '-04-30', pages: 36, note: 'Ръкописите не горят — финалният полет над Москва.' },
        { id: 'demo-finished', bookId: '9000006', dateISO: year + '-04-18', pages: 40, note: 'Последните страници за силата на малките навици.' },
        { id: 'demo-m04b', bookId: '8999996', dateISO: year + '-04-10', pages: 34, note: 'Последната част на Ана Каренина.' },
        { id: 'demo-m03a', bookId: '9000006', dateISO: year + '-03-22', pages: 28, note: 'Четирите закона за промяна на поведението.' },
        { id: 'demo-m03b', bookId: '8999996', dateISO: year + '-03-11', pages: 32, note: 'Коситбата на Левин — една от най-живите глави.' },
        { id: 'demo-m02b', bookId: '8999999', dateISO: year + '-02-28', pages: 42, note: 'Епилогът в Сибир и тихото прераждане на Расколников.' },
        { id: 'demo-m02c', bookId: '8999999', dateISO: year + '-02-24', pages: 35, note: 'Разговорите с Порфирий Петрович.' },
        { id: 'demo-m02a', bookId: '8999995', dateISO: year + '-02-20', pages: 38, note: 'Речта при камъка на Илюша.' },
        { id: 'demo-m02d', bookId: '8999995', dateISO: year + '-02-14', pages: 36, note: 'Легендата за Великия инквизитор.' },
        { id: 'demo-m01a', bookId: '8999995', dateISO: year + '-01-25', pages: 30, note: 'Зимни вечери с Достоевски.' },
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


function renderJournalAnalytics(books, logs, settings, weekPages, streak) {
    const now = new Date();
    const currentYear = String(now.getFullYear());
    const todayISO = getDayISO(now);
    const colophon = document.getElementById('journalColophon');
    if (colophon) {
        colophon.textContent = now.getDate() + ' ' + BG_MONTHS[now.getMonth()] + '\u00A0' + currentYear + ' · читалня нощем';
    }

    const cal = JournalStats.buildYearCalendarMap(logs, currentYear);
    const metrics = JournalStats.calculateDailyReadingMetrics(logs, { year: currentYear, todayISO });
    const longestStreak = Math.max(streak, JournalStats.calculateLongestStreak(logs, settings.minPagesForStreakDay, currentYear));
    const monthly = JournalStats.calculateMonthlyBreakdown(logs, currentYear);
    const strongestMonth = JournalStats.findStrongestMonth(logs, currentYear);
    const authors = JournalStats.calculateAuthorBreakdown(logs, books, currentYear);
    const topAuthor = authors[0] || null;

    setCountUp(document.getElementById('statActiveDays'), cal.activeDays);

    renderAnnualCalendarMap(cal, metrics, monthly);
    renderGoalAndStreakRing(weekPages, settings.weeklyGoalPages, metrics.todayPages, streak, longestStreak);
    renderMonthlyHorizonChart(monthly, strongestMonth, metrics, logs, currentYear);
    renderAuthorsConstellationChart(authors, topAuthor, metrics);
}

function renderAnnualCalendarMap(cal, metrics, monthly) {
    const host = document.getElementById('journalYearMap');
    if (!host) return;

    const cellStep = 13.4;
    const leftPad = 36;
    const topPad = 24;
    const svgWidth = Math.ceil(leftPad + cal.weeksCount * cellStep + 14);
    const svgHeight = 132;

    const weeks = new Map();
    for (const day of cal.days) {
        if (!weeks.has(day.weekIndex)) weeks.set(day.weekIndex, []);
        weeks.get(day.weekIndex).push(day);
    }

    const monthLabelsSvg = cal.monthStarts.map(m => {
        const x = (leftPad + m.weekIndex * cellStep).toFixed(1);
        return `<text x="${x}" y="14" class="year-map__month">${escapeHtml(m.label)}</text>`;
    }).join('');

    const dowLabels = [[0, 'Пн'], [2, 'Ср'], [4, 'Пт'], [6, 'Нд']].map(([dow, label]) => {
        const y = (topPad + dow * 14 + 8).toFixed(1);
        return `<text x="6" y="${y}" class="year-map__dow">${label}</text>`;
    }).join('');

    const weeksSvg = [...weeks.entries()].map(([weekIndex, days]) => {
        const cells = days.map(day => {
            const cx = leftPad + weekIndex * cellStep + 5.5;
            const cy = topPad + day.dow * 14 + 5.5;
            const title = `<title>${formatDateBG(day.dateISO)}: ${day.pages} стр. (ниво ${day.level})</title>`;
            if (day.level === 0) {
                return `<g class="day-node day-node--0">${title}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.5" class="day-cell day-cell--0"/></g>`;
            }
            const sizes = [0, 6.2, 8.2, 10.2, 11.2];
            const sz = sizes[day.level];
            const x = (cx - sz / 2).toFixed(1);
            const y = (cy - sz / 2).toFixed(1);
            const mark = day.level === 3
                ? `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.6" class="day-cell__mark"/>`
                : day.level === 4
                    ? `<polygon points="${cx.toFixed(1)},${(cy - 3.1).toFixed(1)} ${(cx + 3.1).toFixed(1)},${cy.toFixed(1)} ${cx.toFixed(1)},${(cy + 3.1).toFixed(1)} ${(cx - 3.1).toFixed(1)},${cy.toFixed(1)}" class="day-cell__diamond"/>`
                    : '';
            return `<g class="day-node day-node--${day.level}">${title}<rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="1.6" class="day-cell day-cell--${day.level}"/>${mark}</g>`;
        }).join('');
        return `<g class="year-map__week" style="--w:${weekIndex}">${cells}</g>`;
    }).join('');

    const summaryText = cal.activeDays > 0
        ? `${metrics.totalSessions} сесии през ${cal.year} г. · ${cal.totalPages} стр. от сесии · връх: ${cal.maxPages} стр. за ден`
        : `Все още няма записани сесии през ${cal.year} г.`;

    const srRows = monthly.map(m =>
        `<tr><td>${escapeHtml(m.label)}</td><td>${m.activeDays} дни</td><td>${m.pages} стр.</td><td>${m.sessions} сесии</td></tr>`
    ).join('');

    host.innerHTML = `
        <div class="year-map__top">
            <span class="year-map__eyebrow">Календарно съзвездие · ${escapeHtml(cal.year)}</span>
            <span class="year-map__summary">${escapeHtml(summaryText)}</span>
        </div>
        <div class="year-map__scroll">
            <svg class="year-map__svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img"
                 aria-label="Годишна карта на четенето за ${escapeHtml(cal.year)} г.: ${cal.activeDays} активни дни и ${cal.totalPages} прочетени страници.">
                ${monthLabelsSvg}
                ${dowLabels}
                ${weeksSvg}
            </svg>
        </div>
        <div class="year-map__footer">
            <div class="year-map__legend" aria-label="Легенда за интензитет по форма и страници">
                <span class="year-map__legend-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="1.8" class="day-cell day-cell--0"/></svg>
                    0 стр.
                </span>
                <span class="year-map__legend-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.2" class="day-cell day-cell--1"/></svg>
                    1–10 стр.
                </span>
                <span class="year-map__legend-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2.8" y="2.8" width="8.4" height="8.4" rx="1.5" class="day-cell day-cell--2"/></svg>
                    11–20 стр.
                </span>
                <span class="year-map__legend-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1.8" y="1.8" width="10.4" height="10.4" rx="1.8" class="day-cell day-cell--3"/><circle cx="7" cy="7" r="1.6" class="day-cell__mark"/></svg>
                    21–34 стр.
                </span>
                <span class="year-map__legend-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1.5" y="1.5" width="11" height="11" rx="2" class="day-cell day-cell--4"/><polygon points="7,3.9 10.1,7 7,10.1 3.9,7" class="day-cell__diamond"/></svg>
                    35+ стр. (връх)
                </span>
            </div>
            <span class="year-map__avg">Средно ${metrics.avgPagesPerActiveDay} стр. на активен ден</span>
        </div>
        <table class="visually-hidden">
            <caption>Годишна карта на четенето по месеци за ${escapeHtml(cal.year)} г.</caption>
            <thead><tr><th>Месец</th><th>Активни дни</th><th>Страници</th><th>Сесии</th></tr></thead>
            <tbody>${srRows}</tbody>
        </table>`;
}

function renderGoalAndStreakRing(weekPages, weeklyGoal, todayPages, streak, longestStreak) {
    const graphicHost = document.getElementById('journalRingGraphic');
    const metaHost = document.getElementById('journalRingMeta');
    if (!graphicHost || !metaHost) return;

    const safeGoal = Math.max(1, Number(weeklyGoal) || 100);
    const weekRatio = Math.min(1, Math.max(0, weekPages / safeGoal));
    const weekPct = Math.round(weekRatio * 100);
    const dailyTarget = Math.max(1, Math.round(safeGoal / 7));
    const todayRatio = Math.min(1, Math.max(0, todayPages / dailyTarget));

    const outerR = 96;
    const outerC = +(2 * Math.PI * outerR).toFixed(2);
    const outerOffset = +(outerC * (1 - weekRatio)).toFixed(2);

    const innerR = 79;
    const innerC = +(2 * Math.PI * innerR).toFixed(2);
    const innerOffset = +(innerC * (1 - todayRatio)).toFixed(2);

    const angleRad = (weekRatio * 360 - 90) * (Math.PI / 180);
    const tipX = (116 + outerR * Math.cos(angleRad)).toFixed(1);
    const tipY = (116 + outerR * Math.sin(angleRad)).toFixed(1);

    const ticks = [0, 90, 180, 270].map(deg => {
        const rad = (deg - 90) * (Math.PI / 180);
        const x1 = (116 + 105 * Math.cos(rad)).toFixed(1);
        const y1 = (116 + 105 * Math.sin(rad)).toFixed(1);
        const x2 = (116 + 111 * Math.cos(rad)).toFixed(1);
        const y2 = (116 + 111 * Math.sin(rad)).toFixed(1);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="goal-ring__tick"/>`;
    }).join('');

    graphicHost.innerHTML = `
        <svg class="goal-ring__svg" viewBox="0 0 232 232" role="img"
             aria-label="Пръстен на четенето: текуща серия ${streak} дни, седмична цел ${weekPages} от ${safeGoal} страници (${weekPct}%), днес ${todayPages} страници.">
            ${ticks}
            <circle cx="116" cy="116" r="${outerR}" class="goal-ring__track"/>
            <circle cx="116" cy="116" r="${innerR}" class="goal-ring__inner-track"/>
            <circle cx="116" cy="116" r="${outerR}" class="goal-ring__arc"
                    style="--ring-c:${outerC};--ring-offset:${outerOffset}"
                    stroke-dasharray="${outerC}" stroke-dashoffset="${outerOffset}"
                    transform="rotate(-90 116 116)"/>
            <circle cx="116" cy="116" r="${innerR}" class="goal-ring__inner-arc"
                    style="--inner-c:${innerC};--inner-offset:${innerOffset}"
                    stroke-dasharray="${innerC}" stroke-dashoffset="${innerOffset}"
                    transform="rotate(-90 116 116)"/>
            ${weekRatio > 0 ? `<circle cx="${tipX}" cy="${tipY}" r="4.8" class="goal-ring__tip"/>` : ''}
        </svg>`;

    metaHost.innerHTML = `
        <div class="goal-ring-ledger__row">
            <span class="goal-ring-ledger__key">
                <i class="goal-ring-swatch goal-ring-swatch--outer" aria-hidden="true"></i>
                Седмична цел
            </span>
            <strong>${weekPages} / ${safeGoal} стр. (${weekPct}%)</strong>
        </div>
        <div class="goal-ring-ledger__row">
            <span class="goal-ring-ledger__key">
                <i class="goal-ring-swatch goal-ring-swatch--inner" aria-hidden="true"></i>
                Дневен пулс (цел ~${dailyTarget} стр.)
            </span>
            <strong>${todayPages} стр. днес</strong>
        </div>
        <div class="goal-ring-ledger__row">
            <span class="goal-ring-ledger__key">Най-дълга серия</span>
            <strong>${longestStreak} дни</strong>
        </div>`;
}

function renderMonthlyHorizonChart(monthly, strongestMonth, metrics, logs, currentYear) {
    const host = document.getElementById('journalMonthlyChart');
    const callouts = document.getElementById('journalRhythmCallouts');
    if (!host || !callouts) return;

    callouts.innerHTML = `
        <div class="journal-callout">
            <span class="kicker">Най-силен месец</span>
            <strong id="statStrongestMonth">${strongestMonth ? escapeHtml(strongestMonth.label) + ' (' + strongestMonth.pages + ' стр.)' : 'Няма данни'}</strong>
        </div>
        <div class="journal-callout">
            <span class="kicker">Средно на сесия</span>
            <strong id="statPagesPerSession">${metrics.avgPagesPerSession} стр.</strong>
        </div>
        <div class="journal-callout">
            <span class="kicker">Страници на ден</span>
            <strong id="statPagesPerDay">${metrics.avgPagesPerActiveDay} стр.</strong>
        </div>`;

    const maxMonthPages = Math.max(40, ...monthly.map(m => m.pages));
    const leftX = 36;
    const rightX = 594;
    const baseLineY = 132;
    const topY = 28;
    const chartH = baseLineY - topY;
    const stepX = (rightX - leftX) / 11;

    const points = monthly.map((m, idx) => {
        const x = +(leftX + idx * stepX).toFixed(1);
        const ratio = m.pages / maxMonthPages;
        const y = +(baseLineY - ratio * chartH).toFixed(1);
        const isPeak = strongestMonth && strongestMonth.monthIndex === idx && m.pages > 0;
        const r = m.pages === 0 ? 2.4 : Math.min(7.5, Math.max(3.8, 3 + m.avgPerSession / 10));
        return { ...m, x, y, isPeak, r: +r.toFixed(1) };
    });

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaPoints = `${leftX},${baseLineY} ${polylinePoints} ${rightX},${baseLineY}`;
    const midY = +(baseLineY - chartH * 0.5).toFixed(1);

    const nodesSvg = points.map((p, idx) => {
        const labelY = Math.max(14, p.y - (p.isPeak ? 13 : 9));
        const valText = p.pages > 0
            ? `<text x="${p.x}" y="${labelY.toFixed(1)}" text-anchor="middle" class="horizon-node__val${p.isPeak ? ' horizon-node__val--peak' : ''}">${p.pages}</text>`
            : '';
        const peakRing = p.isPeak
            ? `<circle cx="${p.x}" cy="${p.y}" r="11" class="horizon-node__beacon"/>`
            : '';
        return `
            <g class="horizon-node" style="--m:${idx}">
                <title>${escapeHtml(p.label)}: ${p.pages} стр. в ${p.sessions} сесии (средно ${p.avgPerSession} стр./сесия)</title>
                <line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${baseLineY}" class="horizon-node__stem"/>
                ${peakRing}
                <circle cx="${p.x}" cy="${p.y}" r="${p.r}" class="horizon-node__dot${p.pages > 0 ? ' is-active' : ''}${p.isPeak ? ' is-peak' : ''}"/>
                ${valText}
                <text x="${p.x}" y="${baseLineY + 18}" text-anchor="middle" class="horizon-node__month${p.isPeak ? ' is-peak' : ''}">${escapeHtml(p.shortLabel)}</text>
            </g>`;
    }).join('');

    const yearSessions = JournalStats.normalizeValidLogs(logs)
        .filter(l => l.dateISO.startsWith(currentYear + '-'))
        .slice(0, 24)
        .reverse();
    const maxSessPages = Math.max(25, ...yearSessions.map(s => s.pages));
    const pulseCenterY = 186;
    const pulseMaxHalf = 18;
    const pulseSvg = yearSessions.length ? yearSessions.map((s, idx) => {
        const x = +(leftX + (yearSessions.length === 1 ? (rightX - leftX) / 2 : idx * ((rightX - leftX) / (yearSessions.length - 1)))).toFixed(1);
        const half = Math.max(3, +((s.pages / maxSessPages) * pulseMaxHalf).toFixed(1));
        const y1 = +(pulseCenterY - half).toFixed(1);
        const y2 = +(pulseCenterY + half).toFixed(1);
        const isMax = metrics.peakSession && String(metrics.peakSession.id) === String(s.id);
        return `
            <g class="session-pulse" style="--s:${idx}">
                <title>Сесия от ${formatDateBG(s.dateISO)}: ${s.pages} стр.</title>
                <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="session-pulse__stem${isMax ? ' is-peak' : ''}"/>
                <circle cx="${x}" cy="${y1}" r="${isMax ? 3.2 : 2}" class="session-pulse__tip${isMax ? ' is-peak' : ''}"/>
            </g>`;
    }).join('') : '';

    const srRows = monthly.map(m =>
        `<tr><td>${escapeHtml(m.label)}</td><td>${m.pages} стр.</td><td>${m.sessions}</td><td>${m.avgPerSession} стр.</td></tr>`
    ).join('');

    host.innerHTML = `
        <svg class="horizon-svg" viewBox="0 0 624 218" role="img"
             aria-label="Графика на месечния хоризонт за ${escapeHtml(currentYear)} г. Най-силен месец: ${strongestMonth ? escapeHtml(strongestMonth.label) + ' с ' + strongestMonth.pages + ' страници' : 'няма данни'}. Средно ${metrics.avgPagesPerSession} страници на сесия.">
            <line x1="${leftX}" y1="${topY}" x2="${rightX}" y2="${topY}" class="horizon-grid"/>
            <line x1="${leftX}" y1="${midY}" x2="${rightX}" y2="${midY}" class="horizon-grid"/>
            <line x1="${leftX}" y1="${baseLineY}" x2="${rightX}" y2="${baseLineY}" class="horizon-axis"/>
            <text x="4" y="${topY + 4}" class="horizon-scale">${maxMonthPages}</text>
            <text x="4" y="${midY + 4}" class="horizon-scale">${Math.round(maxMonthPages / 2)}</text>
            <text x="4" y="${baseLineY + 4}" class="horizon-scale">0</text>
            <polygon points="${areaPoints}" class="horizon-area"/>
            <polyline points="${polylinePoints}" class="horizon-ridge"/>
            ${nodesSvg}
            <line x1="${leftX}" y1="${pulseCenterY}" x2="${rightX}" y2="${pulseCenterY}" class="horizon-grid"/>
            <text x="4" y="${pulseCenterY + 4}" class="horizon-scale">сесии</text>
            ${pulseSvg}
        </svg>
        <div class="horizon-caption">
            <span>Горен профил: общо страници по месеци (възелът отразява средно стр. в сесия)</span>
            <span>Долен пулс: отделни сесии (${metrics.peakSession ? 'връх: ' + metrics.peakSession.pages + ' стр.' : 'няма сесии'})</span>
        </div>
        <table class="visually-hidden">
            <caption>Месечно разпределение на четенето за ${escapeHtml(currentYear)} г.</caption>
            <thead><tr><th>Месец</th><th>Страници</th><th>Сесии</th><th>Средно на сесия</th></tr></thead>
            <tbody>${srRows}</tbody>
        </table>`;
}

function renderAuthorsConstellationChart(authors, topAuthor, metrics) {
    const host = document.getElementById('journalAuthorsChart');
    const callout = document.getElementById('journalAuthorCallout');
    if (!host || !callout) return;

    callout.innerHTML = `
        <div class="journal-callout">
            <span class="kicker">Най-четен автор</span>
            <strong id="statTopAuthor">${topAuthor ? escapeHtml(topAuthor.author) + ' (' + topAuthor.pages + ' стр.)' : 'Няма данни'}</strong>
        </div>`;

    const topSix = authors.slice(0, 6);
    if (!topSix.length) {
        host.innerHTML = `<p class="authors-chart-empty">Запиши сесия по книга, за да се очертаят най-четените автори.</p>`;
        return;
    }

    const maxPages = Math.max(20, topSix[0].pages);
    const trackStartX = 28;
    const trackEndX = 330;
    const trackSpan = trackEndX - trackStartX;
    const rowStep = 34;
    const svgHeight = topSix.length * rowStep + 18;

    const rowsSvg = topSix.map((item, idx) => {
        const y = 24 + idx * rowStep;
        const lineY = y + 11;
        const ratio = item.pages / maxPages;
        const tipX = +(trackStartX + Math.max(12, ratio * trackSpan)).toFixed(1);
        const marker = idx === 0
            ? `<polygon points="${tipX},${lineY - 5.5} ${tipX + 5.5},${lineY} ${tipX},${lineY + 5.5} ${tipX - 5.5},${lineY}" class="author-row__diamond is-top"/><circle cx="${tipX}" cy="${lineY}" r="2" class="author-row__core"/>`
            : idx < 3
                ? `<polygon points="${tipX},${lineY - 4.2} ${tipX + 4.2},${lineY} ${tipX},${lineY + 4.2} ${tipX - 4.2},${lineY}" class="author-row__diamond"/>`
                : `<circle cx="${tipX}" cy="${lineY}" r="3.6" class="author-row__node"/>`;

        return `
            <g class="author-row" style="--a:${idx}">
                <text x="4" y="${y + 2}" class="author-row__rank">${idx + 1}</text>
                <text x="${trackStartX}" y="${y}" class="author-row__name">${escapeHtml(item.author)}</text>
                <text x="434" y="${y}" text-anchor="end" class="author-row__meta">${item.pages} стр. · ${item.sessions} сесии</text>
                <line x1="${trackStartX}" y1="${lineY}" x2="${trackEndX}" y2="${lineY}" class="author-row__track"/>
                <line x1="${trackStartX}" y1="${lineY}" x2="${tipX}" y2="${lineY}" class="author-row__fill${idx === 0 ? ' is-top' : ''}"/>
                ${marker}
            </g>`;
    }).join('');

    const srRows = topSix.map((a, idx) =>
        `<tr><td>${idx + 1}</td><td>${escapeHtml(a.author)}</td><td>${a.pages} стр.</td><td>${a.sessions} сесии</td></tr>`
    ).join('');

    host.innerHTML = `
        <svg class="authors-svg" viewBox="0 0 440 ${svgHeight}" role="img"
             aria-label="Класация на най-четените автори по страници от сесии. Водещ автор: ${escapeHtml(topSix[0].author)} с ${topSix[0].pages} страници.">
            ${rowsSvg}
        </svg>
        <div class="horizon-caption">
            <span>Дължината на нишката и върхът отбелязват прочетените страници от сесии за всеки автор</span>
            <span>Автори със сесии: ${authors.length}</span>
        </div>
        <table class="visually-hidden">
            <caption>Най-четени автори по страници от сесии</caption>
            <thead><tr><th>Място</th><th>Автор</th><th>Страници</th><th>Сесии</th></tr></thead>
            <tbody>${srRows}</tbody>
        </table>`;
}

let journalRevealObserver = null;
function bindJournalReveals() {
    const entries = [...document.querySelectorAll('#activityFeed .reveal')];
    if (!entries.length) return;
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
        entries.forEach(el => el.classList.add('is-in'));
        return;
    }
    journalRevealObserver?.disconnect();
    journalRevealObserver = new IntersectionObserver(items => {
        for (const item of items) {
            if (item.isIntersecting) {
                item.target.classList.add('is-in');
                journalRevealObserver.unobserve(item.target);
            }
        }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    entries.forEach(el => journalRevealObserver.observe(el));
}

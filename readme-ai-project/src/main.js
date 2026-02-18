// Main page logic - displays list of books
document.addEventListener('DOMContentLoaded', function() {
    displayBooks();
    updateStats();
    initNavbarToggle();
    initLogModal();
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

/* ---------- Display books ---------- */
function displayBooks() {
    const booksList = document.getElementById('booksList');
    const books = BookRepo.getAllBooks();

    if (books.length === 0) {
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
}

/* ---------- Helpers ---------- */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    const overlay = document.getElementById('logModal');
    const select  = document.getElementById('logBook');
    const dateInput = document.getElementById('logDate');

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

    // Clear previous errors
    clearLogErrors();

    overlay.removeAttribute('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    select.focus();
}

function closeLogModal() {
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
    const pagesInt = parseInt(pages);
    if (!pages || isNaN(pagesInt) || pagesInt < 1) {
        document.getElementById('logPagesError').textContent = 'Въведи поне 1 страница.';
        valid = false;
    }

    if (!valid) return;

    // Save the log
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

/* ========== Activity Feed ========== */
function renderActivityFeed() {
    const container = document.getElementById('activityFeed');
    if (!container) return;

    const logs = LogRepo.getLatestLogs(10);
    const books = BookRepo.getAllBooks();
    const bookMap = {};
    books.forEach(b => { bookMap[String(b.id)] = b.title; });

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
        const dateFormatted = formatDateBG(log.dateISO);
        return `
            <div class="activity-item" data-log-id="${log.id}">
                <div class="activity-item__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div class="activity-item__body">
                    <p class="activity-item__title">
                        <strong>${escapeHtml(bookTitle)}</strong>
                        <span class="activity-item__pages">${log.pages} стр.</span>
                    </p>
                    <p class="activity-item__meta">${dateFormatted}${log.note ? ' — ' + escapeHtml(log.note) : ''}</p>
                </div>
                <button class="btn btn--icon btn--icon-danger activity-item__delete"
                        data-log-id="${log.id}"
                        aria-label="Изтрий запис">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        `;
    }).join('');

    // Wire delete buttons
    container.querySelectorAll('.activity-item__delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.logId;
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

/* ========== Toast ========== */
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('toast--visible');
    setTimeout(() => { toast.classList.remove('toast--visible'); }, 2200);
}

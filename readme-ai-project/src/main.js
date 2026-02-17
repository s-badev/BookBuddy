// Main page logic - displays list of books
document.addEventListener('DOMContentLoaded', function() {
    displayBooks();
    updateStats();
    initNavbarToggle();
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
    
    // Total Pages Read
    const totalPagesRead = books.reduce((sum, book) => sum + book.currentPage, 0);
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

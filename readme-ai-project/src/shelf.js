const shelfGroups = [
    ['reading', 'Чета'],
    ['finished', 'Прочетени'],
    ['wishlist', 'За четене']
];
// reducedMotion and the motion token helpers come from src/motion.js.
let activeShelf = null;

function shelfMarkup(books) {
    const groups = new Map(shelfGroups.map(([status]) => [status, []]));
    for (const book of books) groups.get(getBookStatus(book)).push(book);

    return `<div class="bookshelf">${shelfGroups.map(([status, label]) => {
        const entries = groups.get(status);
        if (!entries.length) return '';
        return `<section class="shelf-bay" aria-labelledby="shelf-label-${status}">
            <h3 class="shelf-label" id="shelf-label-${status}">${label} <span>${entries.length}</span></h3>
            <div class="shelf-row" data-shelf-row="${status}">
                ${entries.map(book => {
                    const width = Math.round(Math.max(46, Math.min(76, 41 + 1.25 * Math.sqrt(Number(book.totalPages) || 0))));
                    const author = width >= 68 && book.title.length <= 14 && book.author.length <= 20
                        ? `<span class="shelf-spine__author" aria-hidden="true">${escapeHtml(book.author)}</span>` : '';
                    return `<div class="shelf-slot">
                        <button type="button" class="shelf-spine shelf-spine--${status}" style="--spine-width:${width}px"
                                id="shelf-book-${book.id}" data-shelf-book="${book.id}"
                                aria-haspopup="dialog" aria-controls="shelfPreview"
                                aria-label="Преглед на ${escapeHtml(book.title)}">
                            <span class="shelf-spine__title" aria-hidden="true">${escapeHtml(book.title)}</span>
                            ${author}
                        </button>
                    </div>`;
                }).join('')}
            </div>
            <div class="shelf-plank" aria-hidden="true"></div>
        </section>`;
    }).join('')}</div>`;
}

/* ---------- Two-page spread ---------- */
// The preview opens as a book: the left leaf holds the cover and progress,
// the right leaf the notes and sessions. Both leaves swing open from the
// gutter; with reduced motion the spread is simply shown.

const SPREAD_SESSION_LIMIT = 6;

function initBookshelf() {
    const dialog = document.getElementById('shelfPreview');
    document.getElementById('booksList').addEventListener('click', event => {
        const spine = event.target.closest('[data-shelf-book]');
        if (spine && !activeShelf) showShelfPreview(Number(spine.dataset.shelfBook), spine);
    });
    document.getElementById('shelfPreviewClose').addEventListener('click', closeShelfPreview);
    dialog.addEventListener('cancel', event => {
        event.preventDefault();
        closeShelfPreview();
    });
    dialog.addEventListener('click', event => {
        if (event.target === dialog) closeShelfPreview();
    });
    dialog.addEventListener('close', () => {
        if (activeShelf && !dialog.open) finishShelfPreview(activeShelf);
    });
    dialog.addEventListener('keydown', event => trapShelfFocus(event, dialog));
    document.getElementById('shelfPreviewLog').addEventListener('click', () => useShelfAction('log'));
    document.getElementById('shelfPreviewDetails').addEventListener('click', () => useShelfAction('details'));
    reducedMotion.addEventListener('change', () => {
        if (!reducedMotion.matches || !activeShelf) return;
        if (activeShelf.closing) finishShelfPreview(activeShelf);
        else dialog.classList.remove('is-opening');
    });
}

// Keeps Tab and Shift+Tab inside the open spread.
function trapShelfFocus(event, dialog) {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.disabled && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (!dialog.contains(current)) {
        event.preventDefault();
        first.focus();
    } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
    }
}

function fillShelfSpread(book) {
    const percent = calculateProgress(book.currentPage, book.totalPages);
    const status = getBookStatus(book);
    document.getElementById('shelfPreviewTitle').textContent = book.title;
    document.getElementById('shelfPreviewAuthor').textContent = book.author;
    const statusLabel = document.getElementById('shelfPreviewStatus');
    statusLabel.className = 'book-card__status book-card__status--' + status;
    statusLabel.textContent = bookStatusLabel(status);
    document.getElementById('shelfPreviewPages').textContent = book.currentPage + ' / ' + book.totalPages + ' стр. · ' + percent + '%';
    document.getElementById('shelfPreviewMeter').value = percent;
    document.getElementById('shelfPreviewFront').innerHTML = createCover(book, 'eager');

    const note = (book.notes || '').trim();
    document.getElementById('shelfPreviewNotes').textContent = note || 'Няма добавена бележка.';

    const logs = getJournalLogs([book]);
    const shown = logs.slice(0, SPREAD_SESSION_LIMIT);
    const more = logs.length - shown.length;
    document.getElementById('shelfPreviewSessions').innerHTML = shown.length
        ? shown.map(log => `
            <li>
                <p class="spread__session-when">${sessionDateMarkup(log)} · ${Number(log.pages)} стр.</p>
                ${log.note ? `<p class="spread__session-note">${escapeHtml(log.note)}</p>` : ''}
            </li>`).join('') +
          (more > 0 ? `<li class="spread__session-more">И още ${more} в „За книгата“.</li>` : '')
        : '<li class="spread__session-more">Все още няма записани сесии.</li>';
}

function showShelfPreview(bookId, source, focusId) {
    const book = BookRepo.getBookById(bookId);
    if (!book || activeShelf) return;

    const dialog = document.getElementById('shelfPreview');
    const row = source?.closest('[data-shelf-row]');
    const state = {
        bookId, source, dialog,
        row: row?.dataset.shelfRow,
        index: row ? Array.from(row.querySelectorAll('[data-shelf-book]')).indexOf(source) : 0,
        slot: source?.parentElement,
        closing: false
    };
    activeShelf = state;
    fillShelfSpread(book);

    // Reopening after "Запиши четене" or "За книгата" shows the spread at once.
    const animate = !focusId && !reducedMotion.matches;
    dialog.classList.remove('is-closing');
    dialog.classList.toggle('is-opening', animate);
    dialog.querySelector('.spread__book').scrollTop = 0;
    dialog.showModal();
    state.slot?.classList.add('shelf-slot--vacant');
    if (focusId) document.getElementById(focusId).focus({ preventScroll: true });
    if (animate) {
        whenSpreadSettles(dialog).then(() => {
            if (activeShelf === state && !state.closing) dialog.classList.remove('is-opening');
        });
    }
}

function whenSpreadSettles(dialog) {
    const animations = dialog.getAnimations({ subtree: true });
    return Promise.all(animations.map(animation => animation.finished)).catch(() => {});
}

function closeShelfPreview() {
    const state = activeShelf;
    if (!state || state.closing) return;
    state.closing = true;
    if (reducedMotion.matches) {
        finishShelfPreview(state);
        return;
    }
    state.dialog.classList.remove('is-opening');
    state.dialog.classList.add('is-closing');
    whenSpreadSettles(state.dialog).then(() => finishShelfPreview(state));
}

// A spine counts as reachable when enough of it is visible inside its row and the viewport.
function measureShelfSpine(source) {
    if (!source?.isConnected) return null;
    const rect = source.getBoundingClientRect();
    const row = source.closest('[data-shelf-row]').getBoundingClientRect();
    const header = document.querySelector('.navbar').getBoundingClientRect().bottom;
    const nav = document.querySelector('.bottom-nav');
    const bottom = nav.offsetHeight ? nav.getBoundingClientRect().top : innerHeight;
    const visibleWidth = Math.min(rect.right, row.right, innerWidth) - Math.max(rect.left, row.left, 0);
    const visibleHeight = Math.min(rect.bottom, row.bottom, bottom) - Math.max(rect.top, row.top, header);
    return visibleWidth >= 12 && visibleHeight >= 24 ? rect : null;
}

function restoreShelfFocus(state) {
    const original = document.getElementById('shelf-book-' + state.bookId);
    const row = [...document.querySelectorAll('[data-shelf-row]')].find(element => element.dataset.shelfRow === state.row);
    const nearby = Array.from(row?.querySelectorAll('[data-shelf-book]') || [])
        .map((spine, index) => ({ spine, distance: Math.abs(index - state.index) }))
        .sort((a, b) => a.distance - b.distance)
        .find(({ spine }) => measureShelfSpine(spine));
    const target = measureShelfSpine(original) ? original : nearby?.spine;
    if (target) target.focus({ preventScroll: true });
    else document.getElementById('bookSearch').focus();
}

function finishShelfPreview(state, nextAction) {
    if (activeShelf !== state) return;
    activeShelf = null;
    state.dialog.classList.remove('is-opening', 'is-closing');
    state.slot?.classList.remove('shelf-slot--vacant');
    document.getElementById('shelfPreviewFront').replaceChildren();
    if (state.dialog.open) state.dialog.close();
    if (nextAction) nextAction();
    else restoreShelfFocus(state);
}

function closeShelfForCatalogueChange() {
    if (activeShelf) finishShelfPreview(activeShelf);
}

function useShelfAction(action) {
    const state = activeShelf;
    if (!state || state.closing) return;

    const resume = focusId => {
        const book = BookRepo.getBookById(state.bookId);
        if (!book) {
            restoreShelfFocus(state);
            return;
        }
        showShelfPreview(state.bookId, document.getElementById('shelf-book-' + state.bookId), focusId);
    };

    if (action === 'log') {
        finishShelfPreview(state, () => openLogModal(state.bookId, null, () => resume('shelfPreviewLog')));
    } else {
        finishShelfPreview(state, () => openBookDetails(state.bookId, '', () => resume('shelfPreviewDetails')));
    }
}

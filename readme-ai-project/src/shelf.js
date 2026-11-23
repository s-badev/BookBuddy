const shelfGroups = [
    ['reading', 'Чета сега'],
    ['finished', 'Прочетени'],
    ['wishlist', 'За четене']
];
const shelfMobile = matchMedia('(max-width: 700px)');
const shelfPull = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 701px)');

// The geometry mirrors the bookcase in the approved prototype.
const shelfFaceWidth = 155;
const shelfFaceHeight = 232.5;
const shelfFaceGap = 14;
const shelfStackGap = 18;
const shelfWidthInset = 12;
const shelfCanvas = document.createElement('canvas').getContext('2d');
const shelfSpineBooks = new WeakMap();
let activeShelf = null;
let catalogueShelf = null;
let renderedShelfWidth = null;
let shelfResizeTimer;
let shelfFilterTimer;


function shelfElement(tag, className, parent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.append(node);
    return node;
}

function hideShelfDecoration(node) {
    node.setAttribute('aria-hidden', 'true');
    return node;
}

function makeShelfButton(book, className, parent) {
    const button = shelfElement('button', 'shelf-spine ' + className, parent);
    button.type = 'button';
    button.id = 'shelf-book-' + book.id;
    button.dataset.shelfBook = book.id;
    button.tabIndex = -1;
    button.setAttribute('aria-label', book.author ? book.title + ', ' + book.author : book.title);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'shelfPreview');
    return button;
}

function shelfType(node, title, space, size, min, family, weight, spacing) {
    const measure = (text, fontSize) => {
        if (!shelfCanvas) return text.length * fontSize;
        shelfCanvas.font = weight + ' ' + fontSize + 'px ' + family;
        return shelfCanvas.measureText(text).width + Math.max(0, [...text].length - 1) * spacing * fontSize;
    };
    const fit = ShelfLayout.fitTitle(title, space, size, min, measure);
    node.style.fontSize = fit.fontSize + 'px';
    node.textContent = fit.text;
}

// Measure with the exact font used on the spine, including a fallback if fonts are blocked.
const shelfSans = 'Inter, system-ui, sans-serif';
const shelfSerif = '"Source Serif 4", Georgia, serif';

function makeShelfSpine(book, parent) {
    const look = ShelfLayout.bookLook(book);
    const slot = shelfElement('li', 'shelf-slot', parent);
    const styles = {
        '--spine-width': look.thickness + 'px',
        '--spine-height': look.height + 'px',
        '--spine-face': look.coverWidth + 'px',
        '--spine-lean': look.lean + 'deg',
        '--spine-cloth': look.palette.spine,
        '--spine-ink': look.palette.ink
    };
    Object.entries(styles).forEach(([name, value]) => slot.style.setProperty(name, value));
    const button = makeShelfButton(book, 'shelf-volume', slot);
    const spine = hideShelfDecoration(shelfElement('span', 'shelf-binding shelf-binding--' + look.kind, button));
    const title = shelfElement('span', 'shelf-spine__title', spine);
    const author = shelfElement('span', 'shelf-spine__author', spine);
    const surname = (book.author || '').trim().split(/\s+/u).at(-1).toLocaleUpperCase('bg');
    const paper = look.kind === 'paper';
    const label = look.kind === 'label';
    shelfType(title, book.title, look.height * (label ? 0.50 : paper ? 0.69 : 0.60) - 6,
        paper ? 12 : label ? 13 : 15, 9.5, paper ? shelfSans : shelfSerif, paper ? 700 : 600, paper ? 0.01 : 0.02);
    shelfType(author, surname, look.height * (label ? 0.23 : paper ? 0.15 : 0.13) - 2,
        9, 7.5, shelfSans, 500, 0.04);
    shelfElement('span', 'shelf-binding__shine', spine);
    shelfElement('span', 'shelf-volume__front', button);
    hideShelfDecoration(shelfElement('span', 'shelf-volume__back', button));
    shelfSpineBooks.set(button, book);
}

function mountShelfCover(button) {
    if (!shelfPull.matches || reducedMotion.matches || !button) return;
    const front = button.querySelector('.shelf-volume__front');
    if (!front) return;
    const available = button.closest('.bookshelf').getBoundingClientRect().right -
        button.closest('.shelf-slot').getBoundingClientRect().left;
    const inset = Math.max(0, parseFloat(getComputedStyle(front).width) + 26 - available);
    button.style.setProperty('--pull-inset', inset + 'px');
    if (front.firstElementChild) return;
    const book = shelfSpineBooks.get(button);
    if (!book) return;
    const cover = createCoverElement(book);
    const image = cover.querySelector('img');
    // Inserting the image is already deferred until interaction. Start its request then.
    if (image) image.loading = 'eager';
    front.append(cover);
}

function makeFaceOut(book, parent) {
    const slot = shelfElement('li', 'shelf-slot shelf-faceout', parent);
    const button = makeShelfButton(book, 'shelf-faceout__book', slot);
    button.append(createCoverElement(book));
}

function makeShelfStack(books, parent) {
    const stack = shelfElement('li', 'shelf-stack', parent);
    const pile = shelfElement('ul', 'shelf-stack__pile', stack);
    for (const book of books) {
        const look = ShelfLayout.bookLook(book);
        const slot = shelfElement('li', 'shelf-slot', pile);
        slot.style.setProperty('--spine-cloth', look.palette.spine);
        slot.style.setProperty('--spine-ink', look.palette.ink);
        slot.style.setProperty('--spine-width', stackBookWidth(book) + 'px');
        const button = makeShelfButton(book, 'shelf-flat', slot);
        for (const className of ['shelf-flat__board', 'shelf-flat__pages', 'shelf-flat__board']) {
            hideShelfDecoration(shelfElement('span', className, button));
        }
    }
}

function stackBookWidth(book) {
    return ShelfLayout.bookLook(book).coverWidth + 14;
}

function oldestFinished(books) {
    const date = book => book.completion?.dateISO || book.createdAt || '';
    return books.slice().sort((a, b) => date(a).localeCompare(date(b)) || Number(a.id) - Number(b.id)).slice(0, 3);
}

function pickFaceOut(books) {
    if (!books.length) return null;
    const recent = getJournalLogs(books).find(log => log.dateISO);
    return books.find(book => String(book.id) === String(recent?.bookId)) ||
        books.reduce((latest, book) => Number(book.id) > Number(latest.id) ? book : latest);
}

function makeShelfBoard(row, label, status, index, rowParent, content) {
    const bay = shelfElement('section', 'shelf-bay', rowParent);
    const headingId = 'shelf-label-' + status;
    bay.setAttribute('aria-labelledby', headingId);
    const stage = shelfElement('div', 'shelf-row', bay);
    stage.dataset.shelfRow = status + ':' + index;
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-label', label + ', рафт ' + (index + 1));
    const spineList = shelfElement('ul', 'shelf-line', stage);
    if (row.faceOut && content.front) makeFaceOut(content.front, spineList);
    if (row.faceOut && content.invite) {
        const slot = shelfElement('li', 'shelf-faceout', spineList);
        const link = shelfElement('a', 'shelf-faceout__book shelf-faceout__invite', slot);
        link.href = appPage('form.html');
        link.textContent = 'Добави първата си книга';
    }
    for (const book of row.books) makeShelfSpine(book, spineList);
    if (row.stack) makeShelfStack(content.pile, spineList);
    if (!content.count && !content.invite) {
        const empty = shelfElement('li', 'shelf-empty', spineList);
        empty.textContent = content.empty;
        if (content.clear) {
            const reset = shelfElement('button', 'shelf-empty__reset', empty);
            reset.type = 'button';
            reset.id = 'clearBookFilters';
            reset.textContent = 'Изчисти търсенето и филтъра';
        }
    }

    const plank = shelfElement('div', 'shelf-plank', bay);
    if (index === 0) {
        const heading = shelfElement('h3', 'shelf-label', plank);
        heading.id = headingId;
        heading.textContent = label + ' · ' + content.count;
    } else {
        hideShelfDecoration(plank);
    }
}

function shelfMarkup(books, allCount, width) {
    const groups = new Map(shelfGroups.map(([status]) => [status, []]));
    for (const book of books) groups.get(getBookStatus(book)).push(book);
    const caseElement = shelfElement('div', 'bookshelf');
    for (const [status, label] of shelfGroups) {
        const entries = groups.get(status);
        const invite = !allCount && status === 'reading';
        const front = status === 'reading' ? pickFaceOut(entries) : null;
        const pile = status === 'finished' && entries.length >= 10 ? oldestFinished(entries) : [];
        const upright = entries.filter(book => book !== front && !pile.includes(book));
        const rows = ShelfLayout.layoutShelves(upright, width, {
            faceOut: front || invite ? shelfFaceWidth + shelfFaceGap : 0,
            stack: pile.length ? Math.max(...pile.map(stackBookWidth)) + shelfStackGap + 4 : 0
        });
        const content = {
            front, pile, invite, count: entries.length,
            clear: allCount > 0 && !books.length && status === 'reading',
            empty: allCount && !books.length && status === 'reading' ? 'Няма намерени книги' : 'Този рафт е празен.'
        };
        rows.forEach((row, index) => makeShelfBoard(row, label, status, index, caseElement, content));
    }
    return caseElement;
}

function getShelfWidth(host) {
    if (shelfMobile.matches) return Infinity;
    const inset = parseFloat(getComputedStyle(host).getPropertyValue('--shelf-case-padding')) || 30;
    return Math.floor(host.clientWidth - 2 * inset - shelfWidthInset);
}

function rememberShelfRows(host) {
    return new Map([...host.querySelectorAll('[data-shelf-row]')].map(row => [
        row.dataset.shelfRow,
        { scroll: row.scrollLeft, tabId: row.querySelector('[data-shelf-book][tabindex="0"]')?.id }
    ]));
}

function replaceShelf() {
    if (!catalogueShelf) return;
    const host = document.getElementById('booksList');
    const width = getShelfWidth(host);
    const focused = document.activeElement.closest('[data-shelf-book]');
    const focusedId = focused?.id;
    const previousRows = rememberShelfRows(host);
    const next = shelfMarkup(catalogueShelf.books, catalogueShelf.allCount, width);
    host.replaceChildren(next);
    renderedShelfWidth = width;
    next.style.setProperty('--face-width', shelfFaceWidth + 'px');
    next.style.setProperty('--face-height', shelfFaceHeight + 'px');
    next.querySelectorAll('[data-shelf-row]').forEach(row => {
        const previous = previousRows.get(row.dataset.shelfRow);
        const focusedBook = focusedId && document.getElementById(focusedId);
        const previousBook = previous?.tabId && document.getElementById(previous.tabId);
        const target = row.contains(focusedBook || null) ? focusedBook :
            row.contains(previousBook || null) ? previousBook : row.querySelector('[data-shelf-book]');
        if (target) target.tabIndex = 0;
        if (previous) row.scrollLeft = previous.scroll;
    });
    if (focusedId) {
        const replacement = document.getElementById(focusedId);
        if (replacement) replacement.focus({ preventScroll: true });
        else document.getElementById('bookSearch').focus({ preventScroll: true });
    }
}

function renderLibraryShelf(books, allCount, animate) {
    clearTimeout(shelfFilterTimer);
    const host = document.getElementById('booksList');
    for (const leaving of host.querySelectorAll('.is-filtered-out')) leaving.classList.remove('is-filtered-out');
    const visible = new Set(books.map(book => String(book.id)));
    const leaving = animate && !reducedMotion.matches
        ? [...host.querySelectorAll('[data-shelf-book]')].filter(button => !visible.has(button.dataset.shelfBook))
        : [];
    const render = () => {
        catalogueShelf = { books, allCount };
        replaceShelf();
        closeShelfForCatalogueChange();
    };
    if (!leaving.length) {
        render();
        return;
    }
    leaving.forEach(button => button.classList.add('is-filtered-out'));
    shelfFilterTimer = setTimeout(render, 120);
}

function setShelfTabStop(button) {
    const row = button.closest('[data-shelf-row]');
    row.querySelector('[data-shelf-book][tabindex="0"]')?.setAttribute('tabindex', '-1');
    button.tabIndex = 0;
}

function navigateShelf(event) {
    const button = event.target.closest('[data-shelf-book]');
    if (!button || event.altKey || event.ctrlKey || event.metaKey) return;
    const buttons = [...button.closest('[data-shelf-row]').querySelectorAll('[data-shelf-book]')];
    const index = buttons.indexOf(button);
    const targetIndex = {
        ArrowLeft: Math.max(0, index - 1),
        ArrowRight: Math.min(buttons.length - 1, index + 1),
        Home: 0,
        End: buttons.length - 1
    }[event.key];
    if (targetIndex === undefined) return;
    event.preventDefault();
    const target = buttons[targetIndex];
    setShelfTabStop(target);
    target.focus({ preventScroll: true });
    target.closest('.shelf-slot').scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}

function initLibraryShelf() {
    const host = document.getElementById('booksList');
    host.addEventListener('keydown', navigateShelf);
    host.addEventListener('focusin', event => {
        const button = event.target.closest('[data-shelf-book]');
        if (!button) return;
        setShelfTabStop(button);
        if (button.matches(':focus-visible')) mountShelfCover(button);
    });
    host.addEventListener('pointerover', event => {
        if (event.pointerType !== 'mouse') return;
        const slot = event.target.closest('.shelf-slot');
        if (slot) mountShelfCover(slot.querySelector('.shelf-volume'));
    });
    const onSize = () => {
        clearTimeout(shelfResizeTimer);
        shelfResizeTimer = setTimeout(() => {
            if (getShelfWidth(host) !== renderedShelfWidth) replaceShelf();
        }, 80);
    };
    new ResizeObserver(onSize).observe(host);
    shelfMobile.addEventListener('change', onSize);
    const fonts = ['600 15px "Source Serif 4"', '700 12px Inter', '500 9px Inter'];
    Promise.allSettled(fonts.map(font => document.fonts.load(font, 'Библиотека'))).then(results => {
        if (results.some(result => result.status === 'fulfilled' && result.value.length)) {
            replaceShelf();
        }
    });
}

/* ---------- Two-page spread ---------- */
// The preview opens as a book: the left leaf holds the cover and progress,
// the right leaf the notes and sessions. Both leaves swing open from the
// gutter; with reduced motion the spread is simply shown.

const SPREAD_SESSION_LIMIT = 6;

function initBookshelf() {
    initLibraryShelf();
    const dialog = document.getElementById('shelfPreview');
    document.getElementById('booksList').addEventListener('click', event => {
        const spine = event.target.closest('[data-shelf-book]') ||
            event.target.closest('.shelf-slot')?.querySelector('[data-shelf-book]');
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
    document.getElementById('shelfPreviewPages').textContent = formatNumberBG(book.currentPage) + ' / ' + formatNumberBG(book.totalPages) + ' стр. · ' + percent + '%';
    document.getElementById('shelfPreviewMeter').value = percent;
    document.getElementById('shelfPreviewFront').replaceChildren(createCoverElement(book));

    const note = (book.notes || '').trim();
    document.getElementById('shelfPreviewNotes').textContent = note || 'Няма добавена бележка.';

    const logs = getJournalLogs([book]);
    const shown = logs.slice(0, SPREAD_SESSION_LIMIT);
    const more = logs.length - shown.length;
    const sessions = document.getElementById('shelfPreviewSessions');
    sessions.replaceChildren();
    for (const log of shown) {
        const item = shelfElement('li', '', sessions);
        const when = shelfElement('p', 'spread__session-when', item);
        const date = shelfElement(log.dateISO ? 'time' : 'span', 'journal-date', when);
        if (log.dateISO) date.dateTime = log.dateISO;
        date.textContent = log.dateISO ? formatDateBG(log.dateISO) : 'Без дата';
        when.append(' · ' + formatNumberBG(log.pages) + ' стр.');
        if (log.note) shelfElement('p', 'spread__session-note', item).textContent = log.note;
    }
    if (!shown.length || more > 0) {
        shelfElement('li', 'spread__session-more', sessions).textContent = shown.length
            ? 'И още ' + formatNumberBG(more) + ' в „За книгата“.'
            : 'Все още няма записани сесии.';
    }
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
    const rect = source.closest('.shelf-slot').getBoundingClientRect();
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

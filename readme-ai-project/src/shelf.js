const shelfGroups = [
    ['reading', 'Чета'],
    ['finished', 'Прочетени'],
    ['wishlist', 'За четене']
];
const shelfReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Durations and easings come from the CSS motion tokens in styles/style.css.
function motionToken(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function motionMs(name, fallback) {
    return parseFloat(motionToken(name)) || fallback;
}
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

function initBookshelf() {
    const dialog = document.getElementById('shelfPreview');
    const firstAction = document.getElementById('shelfPreviewLog');
    const closeButton = document.getElementById('shelfPreviewClose');
    document.getElementById('booksList').addEventListener('click', event => {
        const spine = event.target.closest('[data-shelf-book]');
        if (spine && !activeShelf) showShelfPreview(Number(spine.dataset.shelfBook), spine);
    });
    closeButton.addEventListener('click', closeShelfPreview);
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
    dialog.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const boundary = event.shiftKey ? firstAction : closeButton;
        if (activeShelf?.motion || document.activeElement === boundary) {
            event.preventDefault();
            const target = activeShelf?.motion || event.shiftKey ? closeButton : firstAction;
            target.focus();
        }
    });
    firstAction.addEventListener('click', () => useShelfAction('log'));
    document.getElementById('shelfPreviewDetails').addEventListener('click', () => useShelfAction('details'));
    window.addEventListener('resize', () => {
        if (activeShelf && (activeShelf.width !== innerWidth || activeShelf.height !== innerHeight)) {
            finishShelfPreview(activeShelf);
        }
    });
    shelfReducedMotion.addEventListener('change', () => {
        if (!shelfReducedMotion.matches || !activeShelf?.motion) return;
        if (activeShelf.closing) finishShelfPreview(activeShelf);
        else settleShelfPreview(activeShelf);
    });
}

function showShelfPreview(bookId, source, focusId) {
    const book = BookRepo.getBookById(bookId);
    if (!book || activeShelf) return;

    const dialog = document.getElementById('shelfPreview');
    const row = source?.closest('[data-shelf-row]');
    const front = document.getElementById('shelfPreviewFront');
    const percent = calculateProgress(book.currentPage, book.totalPages);
    const status = getBookStatus(book);
    const state = {
        bookId, source, dialog, front,
        row: row?.dataset.shelfRow,
        index: row ? Array.from(row.querySelectorAll('[data-shelf-book]')).indexOf(source) : 0,
        slot: source?.parentElement,
        slotRect: source?.parentElement.getBoundingClientRect(),
        width: innerWidth,
        height: innerHeight,
        closing: false,
        motion: null
    };
    const origin = !focusId && !shelfReducedMotion.matches ? measureShelfSpine(source) : null;
    activeShelf = state;

    document.getElementById('shelfPreviewTitle').textContent = book.title;
    document.getElementById('shelfPreviewAuthor').textContent = book.author;
    const statusLabel = document.getElementById('shelfPreviewStatus');
    statusLabel.className = 'book-card__status book-card__status--' + status;
    statusLabel.textContent = bookStatusLabel(status);
    document.getElementById('shelfPreviewPages').textContent = book.currentPage + ' / ' + book.totalPages + ' стр. · ' + percent + '%';
    document.getElementById('shelfPreviewMeter').value = percent;
    front.innerHTML = createCover(book, 'eager');
    state.cover = front.firstElementChild;
    dialog.showModal();
    state.slotRect = state.slot?.getBoundingClientRect();
    state.slot?.classList.add('shelf-slot--vacant');
    if (origin) animateShelfBook(state, origin);
    if (focusId) document.getElementById(focusId).focus({ preventScroll: true });
}

function measureShelfSpine(source) {
    if (!source?.isConnected) return null;
    const rect = source.getBoundingClientRect();
    const row = source.closest('[data-shelf-row]').getBoundingClientRect();
    const header = document.querySelector('.navbar').getBoundingClientRect().bottom;
    const nav = document.querySelector('.bottom-nav');
    const bottom = nav.offsetHeight ? nav.getBoundingClientRect().top : innerHeight;
    const clip = [
        Math.max(0, Math.max(header, row.top) - rect.top),
        Math.max(0, rect.right - Math.min(innerWidth, row.right)),
        Math.max(0, rect.bottom - Math.min(bottom, row.bottom)),
        Math.max(0, Math.max(0, row.left) - rect.left)
    ];
    return rect.width - clip[1] - clip[3] >= 12 && rect.height - clip[0] - clip[2] >= 24 ? { rect, clip } : null;
}

function animateShelfBook(state, origin, reverse = false) {
    const destination = state.front.getBoundingClientRect();
    const { rect, clip } = origin;
    const dx = destination.left + destination.width / 2 - (rect.left + rect.width / 2);
    const dy = destination.top + destination.height / 2 - (rect.top + rect.height / 2);
    const scaleY = rect.height / destination.height;
    const lift = 18;
    const front = document.createElement('div');
    front.className = 'shelf-flight shelf-flight--front';
    front.append(state.cover);

    const spine = document.createElement('div');
    spine.className = state.source.className + ' shelf-flight shelf-flight--spine';
    spine.innerHTML = state.source.innerHTML;
    if (clip.some(value => value > 0)) {
        spine.style.clipPath = 'inset(' + clip.map(value => value + 'px').join(' ') + ')';
    }
    for (const [element, bounds] of [[spine, rect], [front, destination]]) {
        element.setAttribute('aria-hidden', 'true');
        Object.assign(element.style, {
            left: bounds.left + 'px', top: bounds.top + 'px',
            width: bounds.width + 'px', height: bounds.height + 'px'
        });
        state.dialog.append(element);
    }

    state.dialog.classList.add('shelf-preview--moving');
    const options = { duration: motionMs('--dur-slow', 480), direction: reverse ? 'reverse' : 'normal', fill: 'both' };
    const easeOut = motionToken('--ease-out') || 'ease-out';
    const easeIn = motionToken('--ease-in') || 'ease-in';
    const offset = (x, y) => `translate3d(${x}px,${y}px,0)`;
    const animations = [
        spine.animate([
            { transform: 'none', opacity: 1, easing: easeOut },
            { transform: offset(0, -lift) + ' scale(1.10)', opacity: 1, offset: .27, easing: easeIn },
            { transform: offset(dx * .48, dy * .48 - lift) + ' perspective(500px) rotateY(72deg)', opacity: 0, offset: .60 },
            { transform: offset(dx, dy), opacity: 0 }
        ], options),
        front.animate([
            { transform: offset(-dx, -dy) + ` scaleY(${scaleY})`, opacity: 0 },
            { transform: offset(-dx, -dy - lift) + ` scaleY(${scaleY * 1.10})`, opacity: 0, offset: .27, easing: easeOut },
            { transform: offset(0, 0) + ' scaleY(1)', opacity: 1, offset: .78 },
            { transform: 'none', opacity: 1 }
        ], options),
        state.cover.animate([
            { transform: 'perspective(700px) rotateY(-90deg)' },
            { transform: 'perspective(700px) rotateY(-90deg)', offset: .27, easing: easeOut },
            { transform: 'perspective(700px) rotateY(0deg)', offset: .92 },
            { transform: 'none' }
        ], options),
        state.dialog.querySelector('.shelf-preview__panel').animate([
            { opacity: 0 }, { opacity: 0, offset: .36 }, { opacity: 1 }
        ], options)
    ];

    const motion = { animations, spine, front };
    state.motion = motion;
    Promise.all(animations.map(animation => animation.finished)).then(() => {
        if (activeShelf !== state || state.motion !== motion) return;
        if (state.closing) finishShelfPreview(state);
        else settleShelfPreview(state);
    }, () => { /* An interrupted preview has already cleaned up its animation. */ });
}

function settleShelfPreview(state) {
    const motion = state.motion;
    if (!motion) return;
    state.motion = null;
    state.front.append(state.cover);
    motion.animations.forEach(animation => animation.cancel());
    motion.spine.remove();
    motion.front.remove();
    state.dialog.classList.remove('shelf-preview--moving');
}

function closeShelfPreview() {
    const state = activeShelf;
    if (!state || state.closing) return;
    state.closing = true;
    const slot = state.slot?.getBoundingClientRect();
    const original = state.slotRect;
    const sameSlot = original && slot && Math.abs(original.left - slot.left) < 2 &&
        Math.abs(original.top - slot.top) < 2 && original.width === slot.width && original.height === slot.height;
    const origin = !shelfReducedMotion.matches && sameSlot ? measureShelfSpine(state.source) : null;
    if (!origin) {
        finishShelfPreview(state);
    } else if (!state.motion) {
        animateShelfBook(state, origin, true);
    } else if (state.motion.animations[0].currentTime > 24) {
        state.motion.animations.forEach(animation => animation.reverse());
    } else {
        finishShelfPreview(state);
    }
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
    settleShelfPreview(state);
    state.slot?.classList.remove('shelf-slot--vacant');
    state.front.replaceChildren();
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

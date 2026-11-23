document.addEventListener('DOMContentLoaded', () => {
    const picker = document.getElementById('coverSearchPicker');
    const input = document.getElementById('coverSearch');
    const list = document.getElementById('coverSearchResults');
    const status = document.getElementById('coverSearchStatus');
    const savedUrl = document.getElementById('coverUrl');
    const clearCover = document.getElementById('clearSelectedCover');
    const isbn = document.getElementById('isbn');
    const minimumLength = 2;
    let items = [];
    let activeIndex = -1;
    let version = 0;

    function updateSelection() {
        const controller = typeof CoverUpload !== 'undefined' ? CoverUpload.getFormController() : null;
        if (controller) {
            clearCover.hidden = true;
            return;
        }
        clearCover.hidden = !savedUrl.value;
    }

    function closeResults() {
        version++;
        lookup.cancel();
        items = [];
        activeIndex = -1;
        list.replaceChildren();
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        input.removeAttribute('aria-busy');
    }

    function option(book, index) {
        const row = document.createElement('li');
        row.id = 'cover-option-' + index;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', 'false');
        row.dataset.index = index;

        const thumbnail = document.createElement('span');
        thumbnail.className = 'cover-search__thumb';
        thumbnail.setAttribute('aria-hidden', 'true');
        const url = CoverService.normalizeCoverUrl(book.coverUrl);
        if (url) {
            const img = document.createElement('img');
            img.alt = '';
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';
            img.addEventListener('error', () => img.remove(), { once: true });
            img.src = url;
            thumbnail.append(img);
        }

        const description = document.createElement('span');
        description.className = 'cover-search__description';
        const title = document.createElement('strong');
        title.textContent = book.title;
        const details = document.createElement('small');
        details.textContent = [book.authors.join(', '), book.year].filter(Boolean).join(' · ');
        description.append(title, details);
        row.append(thumbnail, description);
        return row;
    }

    const unavailable = 'Търсенето не е достъпно сега. Попълни ръчно.';
    const lookup = CoverService.debounce(async (query, requestVersion) => {
        if (!navigator.onLine) {
            input.removeAttribute('aria-busy');
            status.textContent = unavailable;
            return;
        }
        const result = await CoverService.searchWithStatus(query);
        if (requestVersion !== version) return;
        input.removeAttribute('aria-busy');
        if (!result.available || !navigator.onLine) {
            status.textContent = unavailable;
            return;
        }
        items = result.items;
        if (!items.length) {
            status.textContent = 'Няма резултати. Попълни ръчно.';
            return;
        }
        list.replaceChildren(...items.map(option));
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        status.textContent = items.length + (items.length === 1 ? ' намерена книга.' : ' намерени книги.');
    });

    function selectBook(index) {
        const book = items[index];
        if (!book) return;
        document.getElementById('title').value = book.title;
        document.getElementById('author').value = book.authors.join(', ');
        isbn.value = book.isbn13 || book.isbn10 || '';
        isbn.setCustomValidity('');
        if (book.pageCount) document.getElementById('totalPages').value = book.pageCount;
        const controller = typeof CoverUpload !== 'undefined' ? CoverUpload.getFormController() : null;
        if (controller) {
            controller.setSearchCover(book.coverUrl, book.source);
        } else {
            savedUrl.value = CoverService.normalizeCoverUrl(book.coverUrl) || '';
        }
        input.value = book.title;
        closeResults();
        updateSelection();
        status.textContent = 'Данните за книгата са попълнени.';
    }

    function highlight(index) {
        const previous = list.children[activeIndex];
        previous?.setAttribute('aria-selected', 'false');
        activeIndex = index;
        const current = list.children[index];
        current.setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', current.id);
        current.scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', () => {
        closeResults();
        status.textContent = '';
        const query = input.value.trim();
        if (query.length < minimumLength) return;
        input.setAttribute('aria-busy', 'true');
        status.textContent = 'Търсене на книги…';
        lookup(query, version);
    });

    input.addEventListener('keydown', event => {
        if (event.key === 'Escape' || event.key === 'Tab') {
            if (event.key === 'Escape') event.preventDefault();
            if (!list.hidden || input.hasAttribute('aria-busy')) status.textContent = '';
            closeResults();
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            if (items.length) selectBook(Math.max(activeIndex, 0));
            return;
        }
        if (!items.length || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'ArrowDown' ? (activeIndex + 1) % items.length :
            (Math.max(activeIndex, 0) + items.length - 1) % items.length;
        highlight(next);
    });

    list.addEventListener('mousedown', event => event.preventDefault());
    list.addEventListener('click', event => {
        const row = event.target.closest('[data-index]');
        if (row) {
            selectBook(Number(row.dataset.index));
            input.focus({ preventScroll: true });
        }
    });
    document.addEventListener('pointerdown', event => {
        if (picker.contains(event.target)) return;
        if (!list.hidden || input.hasAttribute('aria-busy')) status.textContent = '';
        closeResults();
    });

    function removeSavedCover() {
        const controller = typeof CoverUpload !== 'undefined' ? CoverUpload.getFormController() : null;
        if (controller) {
            controller.clearSearchCover();
        } else {
            savedUrl.value = '';
        }
        updateSelection();
    }
    clearCover.addEventListener('click', () => {
        removeSavedCover();
        input.focus({ preventScroll: true });
        status.textContent = 'Избраната корица е премахната.';
    });
    isbn.addEventListener('input', removeSavedCover);
    updateSelection();
});

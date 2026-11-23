const issueYearFormat = new Intl.DateTimeFormat('bg-BG', { month: 'long', timeZone: 'UTC' });
const issueNumberFormat = new Intl.NumberFormat('bg-BG', { useGrouping: 'always' });

function initIssue() {
    document.getElementById('issueYear').addEventListener('change', () => {
        const books = BookRepo.getAllBooks();
        renderIssue(books, getJournalLogs(books).filter(log => isDateISO(log.dateISO)),
            SettingsRepo.getSettings().minPagesForStreakDay);
    });
}

function confirmedCompletionDate(book, logsById, latestProgressDate) {
    const mark = book.completion;
    if (getBookStatus(book) !== 'finished' || !mark) return '';
    const log = logsById.get(String(mark.logId));
    return log && String(log.bookId) === String(book.id) && log.dateISO === mark.dateISO &&
        log.dateISO === latestProgressDate && Number(log.appliedPages ?? log.pages) > 0 ? log.dateISO : '';
}

function longestStreakInYear(dayTotals, minPages) {
    let best = 0;
    let run = 0;
    let previous = null;
    for (const day of [...dayTotals.keys()].sort()) {
        if (dayTotals.get(day) < minPages) continue;
        const date = Date.parse(day);
        run = previous !== null && date - previous === 86400000 ? run + 1 : 1;
        best = Math.max(run, best);
        previous = date;
    }
    return best;
}

function renderIssue(books, logs, minPages) {
    const yearSelect = document.getElementById('issueYear');
    const currentYear = String(new Date().getFullYear());
    const years = [...new Set([currentYear, ...logs.map(log => log.dateISO.slice(0, 4))])].sort().reverse();
    const year = years.includes(yearSelect.value) ? yearSelect.value : currentYear;
    if (Array.from(yearSelect.options, option => option.value).join() !== years.join()) {
        yearSelect.replaceChildren(...years.map(value => new Option(value, value)));
    }
    yearSelect.value = year;
    document.getElementById('issueTitle').textContent = 'Брой ' + year;
    document.getElementById('issueNavLabel').textContent = 'Брой ' + year;
    document.getElementById('issueMobileLink').setAttribute('aria-label', 'Брой ' + year);

    const logsById = new Map(logs.map(log => [String(log.id), log]));
    const booksById = new Map(books.map(book => [String(book.id), book]));
    const latestProgressDates = new Map();
    for (const log of logs) {
        const id = String(log.bookId);
        if (Number(log.appliedPages ?? log.pages) > 0 && log.dateISO > (latestProgressDates.get(id) || '')) {
            latestProgressDates.set(id, log.dateISO);
        }
    }
    const finished = [];
    const undated = [];
    for (const book of books) {
        if (getBookStatus(book) !== 'finished') continue;
        const date = confirmedCompletionDate(book, logsById, latestProgressDates.get(String(book.id)));
        if (!date) undated.push(book);
        else if (date.slice(0, 4) === year) finished.push({ book, date });
    }
    finished.sort((a, b) => b.date.localeCompare(a.date) || a.book.title.localeCompare(b.book.title, 'bg'));

    let pages = 0;
    const authors = new Map();
    const months = new Map();
    const days = new Map();
    for (const log of logs) {
        if (log.dateISO.slice(0, 4) !== year) continue;
        const count = Number(log.pages);
        const author = booksById.get(String(log.bookId)).author;
        const month = log.dateISO.slice(0, 7);
        pages += count;
        authors.set(author, (authors.get(author) || 0) + count);
        months.set(month, (months.get(month) || 0) + count);
        days.set(log.dateISO, (days.get(log.dateISO) || 0) + count);
    }

    const [author] = [...authors].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'bg'))[0] || [];
    const [month] = [...months].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || [];
    const monthName = month ? issueYearFormat.format(new Date(month + '-01')) : '';
    const streak = longestStreakInYear(days, minPages);
    const bookIndex = finished.length ? `<ol class="issue__index">${finished.map(({ book, date }) => `
        <li><button type="button" id="issue-book-${escapeHtml(book.id)}" data-details-book="${escapeHtml(book.id)}" aria-haspopup="dialog">${escapeHtml(book.title)}</button>
        <time datetime="${date}">${formatDateBG(date)}</time></li>`).join('')}</ol>`
        : '<p>Няма потвърдени завършени книги през тази година.</p>';
    const undatedIndex = undated.length ? `<details class="issue__undated">
        <summary>Прочетени книги без потвърдена дата (${undated.length})</summary>
        <ul class="issue__index">${undated.map(book => `
            <li><button type="button" id="undated-book-${escapeHtml(book.id)}" data-details-book="${escapeHtml(book.id)}" aria-haspopup="dialog">${escapeHtml(book.title)}</button></li>`).join('')}</ul>
    </details>` : '';

    document.getElementById('issueContent').innerHTML = `
        <dl class="issue__figures">
            <div><dt>Страници от сесии</dt><dd id="issuePages"></dd></div>
            <div><dt>Завършени книги</dt><dd id="issueFinished"></dd></div>
            <div><dt>Дни в най-дългата поредица</dt><dd id="issueStreak"></dd></div>
        </dl>
        <dl class="issue__highlights">
            <div><dt>Най-четен автор</dt><dd id="issueAuthor">${author ? escapeHtml(author) : 'Няма данни'}</dd></div>
            <div><dt>Най-силен месец</dt><dd id="issueMonth">${monthName || 'Няма данни'}</dd></div>
        </dl>
        ${pages ? '' : '<p class="issue__empty">Няма записани сесии за тази година.</p>'}
        <h3>Указател на завършените книги</h3>
        ${bookIndex}
        ${undatedIndex}`;
    setCountUp(document.getElementById('issuePages'), pages, n => issueNumberFormat.format(n));
    setCountUp(document.getElementById('issueFinished'), finished.length);
    setCountUp(document.getElementById('issueStreak'), streak);
}

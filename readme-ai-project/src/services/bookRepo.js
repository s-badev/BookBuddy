// Book Repository - handles localStorage operations
const BookRepo = {
    STORAGE_KEY: 'bookbuddy_books',
    QUOTA_WARNING_MESSAGE: 'Няма място в браузъра за корицата. Книгата е запазена без нея.',
    COVER_SOURCES: ['google', 'openlibrary', 'upload'],

    normalizeCoverUrl(value) {
        if (typeof CoverUpload !== 'undefined' && CoverUpload.isValidCoverDataUrl(value)) {
            return value;
        }
        if (typeof CoverService !== 'undefined' && typeof CoverService.normalizeCoverUrl === 'function') {
            return CoverService.normalizeCoverUrl(value);
        }
        return null;
    },

    normalizeCoverSource(source, coverUrl) {
        if (!coverUrl) return null;
        if (typeof CoverUpload !== 'undefined' && CoverUpload.isValidCoverDataUrl(coverUrl)) {
            return 'upload';
        }
        if (this.COVER_SOURCES.includes(source) && source !== 'upload') {
            return source;
        }
        try {
            const host = new URL(coverUrl).hostname;
            if (host === 'books.google.com' || host.endsWith('.books.google.com') ||
                host === 'books.googleusercontent.com' || host.endsWith('.books.googleusercontent.com')) {
                return 'google';
            }
            if (host === 'covers.openlibrary.org' || host.endsWith('.openlibrary.org') ||
                host === 'archive.org' || host.endsWith('.archive.org')) {
                return 'openlibrary';
            }
        } catch (_) {}
        return null;
    },

    isQuotaError(err) {
        if (!err || typeof err !== 'object') return false;
        return err.name === 'QuotaExceededError' ||
               err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
               err.code === 22 ||
               err.code === 1014 ||
               /quota/i.test(String(err.name || '')) ||
               /quota/i.test(String(err.message || ''));
    },

    persistBooks(books, targetBook) {
        try {
            appStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
            return { quotaFallback: false };
        } catch (err) {
            if (targetBook && targetBook.coverUrl && this.isQuotaError(err)) {
                delete targetBook.coverUrl;
                delete targetBook.coverSource;
                appStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
                try {
                    if (typeof window !== 'undefined') {
                        window.name = 'bookbuddy_quota_notice:' + this.QUOTA_WARNING_MESSAGE;
                    }
                    if (typeof CoverUpload !== 'undefined' && CoverUpload.getFormController()) {
                        CoverUpload.getFormController().showError(this.QUOTA_WARNING_MESSAGE);
                    }
                    if (typeof showToast === 'function') {
                        showToast(this.QUOTA_WARNING_MESSAGE);
                    }
                } catch (_) {}
                return { quotaFallback: true, message: this.QUOTA_WARNING_MESSAGE };
            }
            throw err;
        }
    },

    // Get all books from localStorage
    getAllBooks() {
        const books = appStorage.getItem(this.STORAGE_KEY);
        return books ? JSON.parse(books) : [];
    },

    // Save a new book
    addBook(book) {
        const books = this.getAllBooks();
        const newBook = {
            id: Date.now(),
            title: book.title,
            author: book.author,
            totalPages: parseInt(book.totalPages),
            currentPage: parseInt(book.currentPage) || 0,
            notes: book.notes || '',
            createdAt: new Date().toISOString()
        };
        if (book.isbn) newBook.isbn = book.isbn;
        const coverUrl = this.normalizeCoverUrl(book.coverUrl);
        if (coverUrl) {
            newBook.coverUrl = coverUrl;
            const coverSource = this.normalizeCoverSource(book.coverSource, coverUrl);
            if (coverSource) newBook.coverSource = coverSource;
        }
        books.push(newBook);
        const saveResult = this.persistBooks(books, newBook);
        if (saveResult.quotaFallback) {
            Object.defineProperty(newBook, 'coverDroppedForQuota', {
                value: true,
                enumerable: false,
                configurable: true
            });
        }
        return newBook;
    },

    // Update book progress
    updateProgress(bookId, currentPage, completion) {
        const books = this.getAllBooks();
        const bookIndex = books.findIndex(b => b.id === bookId);
        if (bookIndex !== -1) {
            const book = books[bookIndex];
            const page = parseInt(currentPage);
            if (completion) {
                book.completion = completion;
            } else if (completion === null || page !== Number(book.currentPage)) {
                delete book.completion;
            }
            book.currentPage = page;
            appStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
            return books[bookIndex];
        }
        return null;
    },

    // Delete a book
    deleteBook(bookId) {
        const books = this.getAllBooks();
        const filteredBooks = books.filter(b => b.id !== bookId);
        appStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredBooks));
    },

    // Get a single book by id
    getBookById(bookId) {
        const books = this.getAllBooks();
        return books.find(b => b.id === bookId) || null;
    },

    // Update an existing book (keeps same id and createdAt)
    updateBook(bookId, updatedData) {
        const books = this.getAllBooks();
        const idx = books.findIndex(b => b.id === bookId);
        if (idx === -1) return null;
        const previous = books[idx];
        books[idx] = {
            ...books[idx],
            title: updatedData.title,
            author: updatedData.author,
            totalPages: parseInt(updatedData.totalPages),
            currentPage: parseInt(updatedData.currentPage) || 0,
            notes: updatedData.notes || ''
        };
        if (updatedData.isbn === '') {
            delete books[idx].isbn;
        } else if (updatedData.isbn !== undefined) {
            books[idx].isbn = updatedData.isbn;
        }
        if (updatedData.coverUrl !== undefined) {
            const coverUrl = this.normalizeCoverUrl(updatedData.coverUrl);
            if (coverUrl) {
                books[idx].coverUrl = coverUrl;
                const coverSource = this.normalizeCoverSource(
                    updatedData.coverSource !== undefined ? updatedData.coverSource : previous.coverSource,
                    coverUrl
                );
                if (coverSource) books[idx].coverSource = coverSource;
                else delete books[idx].coverSource;
            } else {
                delete books[idx].coverUrl;
                delete books[idx].coverSource;
            }
        }
        if (books[idx].currentPage !== Number(previous.currentPage) ||
            books[idx].totalPages !== Number(previous.totalPages)) {
            delete books[idx].completion;
        }
        const saveResult = this.persistBooks(books, books[idx]);
        if (saveResult.quotaFallback) {
            Object.defineProperty(books[idx], 'coverDroppedForQuota', {
                value: true,
                enumerable: false,
                configurable: true
            });
        }
        return books[idx];
    }
};

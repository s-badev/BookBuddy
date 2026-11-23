// Book Repository - handles localStorage operations
const BookRepo = {
    STORAGE_KEY: 'bookbuddy_books',

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
        const coverUrl = CoverService.normalizeCoverUrl(book.coverUrl);
        if (coverUrl) newBook.coverUrl = coverUrl;
        books.push(newBook);
        appStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
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
            const coverUrl = CoverService.normalizeCoverUrl(updatedData.coverUrl);
            if (coverUrl) books[idx].coverUrl = coverUrl;
            else delete books[idx].coverUrl;
        }
        if (books[idx].currentPage !== Number(previous.currentPage) ||
            books[idx].totalPages !== Number(previous.totalPages)) {
            delete books[idx].completion;
        }
        appStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
        return books[idx];
    }
};

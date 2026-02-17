// Book Repository - handles localStorage operations
const BookRepo = {
    STORAGE_KEY: 'bookbuddy_books',

    // Get all books from localStorage
    getAllBooks() {
        const books = localStorage.getItem(this.STORAGE_KEY);
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
        books.push(newBook);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
        return newBook;
    },

    // Update book progress
    updateProgress(bookId, currentPage) {
        const books = this.getAllBooks();
        const bookIndex = books.findIndex(b => b.id === bookId);
        if (bookIndex !== -1) {
            books[bookIndex].currentPage = parseInt(currentPage);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
            return books[bookIndex];
        }
        return null;
    },

    // Delete a book
    deleteBook(bookId) {
        const books = this.getAllBooks();
        const filteredBooks = books.filter(b => b.id !== bookId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredBooks));
    }
};

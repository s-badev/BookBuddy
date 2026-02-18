// Form page logic - handles adding and editing books
document.addEventListener('DOMContentLoaded', function() {
    ThemeSwitcher.initTheme();
    const form = document.getElementById('bookForm');
    const notesTextarea = document.getElementById('notes');
    const charCount = document.getElementById('charCount');
    const currentPageInput = document.getElementById('currentPage');
    const totalPagesInput = document.getElementById('totalPages');

    // --- Edit mode detection ---
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('id') ? Number(params.get('id')) : null;
    let editingBook = null;

    if (editId) {
        editingBook = BookRepo.getBookById(editId);
        if (editingBook) {
            // Prefill fields
            document.getElementById('title').value = editingBook.title;
            document.getElementById('author').value = editingBook.author;
            totalPagesInput.value = editingBook.totalPages;
            currentPageInput.value = editingBook.currentPage;
            notesTextarea.value = editingBook.notes || '';
            charCount.textContent = `${(editingBook.notes || '').length} / 300`;

            // Update heading & button text
            const heading = document.querySelector('.auth-card__title');
            if (heading) heading.textContent = 'Редактирай книга';
            const subtitle = document.querySelector('.auth-card__subtitle');
            if (subtitle) subtitle.textContent = 'Промени данните и натисни „Запази промените".';
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Запази промените';
        } else {
            // Book not found — show error and disable form
            const heading = document.querySelector('.auth-card__title');
            if (heading) heading.textContent = 'Книгата не е намерена';
            const subtitle = document.querySelector('.auth-card__subtitle');
            if (subtitle) subtitle.textContent = 'Тази книга не съществува. Ще бъдете пренасочени…';
            form.style.display = 'none';
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
    }

    // Navbar mobile toggle (shared pattern)
    const toggle = document.querySelector('.navbar__toggle');
    if (toggle) {
        toggle.addEventListener('click', function() {
            const nav = this.closest('.navbar');
            const expanded = nav.classList.toggle('is-open');
            this.setAttribute('aria-expanded', expanded);
        });
    }

    // Character counter for notes
    notesTextarea.addEventListener('input', function() {
        charCount.textContent = `${this.value.length} / 300`;
    });

    // Ensure current page doesn't exceed total pages
    currentPageInput.addEventListener('input', function() {
        const totalPages = parseInt(totalPagesInput.value) || 0;
        const currentPage = parseInt(this.value) || 0;
        
        if (currentPage > totalPages) {
            this.value = totalPages;
        }
    });

    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = {
            title: document.getElementById('title').value.trim(),
            author: document.getElementById('author').value.trim(),
            totalPages: parseInt(document.getElementById('totalPages').value),
            currentPage: parseInt(document.getElementById('currentPage').value) || 0,
            notes: document.getElementById('notes').value.trim()
        };

        // Validate form data
        const validation = Validate.bookForm(formData);
        
        if (!validation.isValid) {
            alert('Моля, коригирайте следните грешки:\n\n' + validation.errors.join('\n'));
            return;
        }

        if (editingBook) {
            // Update existing book
            BookRepo.updateBook(editId, formData);
        } else {
            // Save new book
            BookRepo.addBook(formData);
        }

        // Redirect to main page
        window.location.href = 'index.html';
    });
});

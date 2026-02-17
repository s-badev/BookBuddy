// Form page logic - handles adding new books
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('bookForm');
    const notesTextarea = document.getElementById('notes');
    const charCount = document.getElementById('charCount');
    const currentPageInput = document.getElementById('currentPage');
    const totalPagesInput = document.getElementById('totalPages');

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

        // Save the book
        BookRepo.addBook(formData);

        // Redirect to main page
        window.location.href = 'index.html';
    });
});

// Validation utilities
const Validate = {
    // An empty field is optional. A null result means the ISBN is invalid.
    normalizeISBN(value) {
        if (!value.trim()) return '';
        const isbn = value.replace(/[\s-]/g, '').toUpperCase();

        if (/^\d{9}[\dX]$/.test(isbn)) {
            const sum = [...isbn].reduce((total, digit, index) =>
                total + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0);
            return sum % 11 === 0 ? isbn : null;
        }

        if (/^97[89]\d{10}$/.test(isbn)) {
            const sum = [...isbn].reduce((total, digit, index) =>
                total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
            return sum % 10 === 0 ? isbn : null;
        }

        return null;
    },

    // Validate book form data
    bookForm(formData) {
        const errors = [];

        if (!formData.title || formData.title.trim() === '') {
            errors.push('Book title is required');
        }

        if (!formData.author || formData.author.trim() === '') {
            errors.push('Author name is required');
        }

        if (!formData.totalPages || formData.totalPages < 1) {
            errors.push('Total pages must be at least 1');
        }

        if (formData.currentPage < 0) {
            errors.push('Current page cannot be negative');
        }

        if (formData.currentPage > formData.totalPages) {
            errors.push('Current page cannot exceed total pages');
        }

        if (formData.notes && formData.notes.length > 300) {
            errors.push('Notes cannot exceed 300 characters');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

// Validation utilities
const Validate = {
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

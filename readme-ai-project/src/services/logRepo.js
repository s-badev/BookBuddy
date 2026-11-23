// Reading Log Repository — handles localStorage operations for reading sessions
const LogRepo = {
    STORAGE_KEY: 'bookbuddy_logs',

    // Get all logs sorted by createdAt DESC, deduplicated by id
    getAllLogs() {
        const logs = appStorage.getItem(this.STORAGE_KEY);
        const parsed = logs ? JSON.parse(logs) : [];
        parsed.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

        // Deduplicate by id (keep the latest entry if duplicate ids exist)
        const seen = new Set();
        const unique = [];
        for (const log of parsed) {
            const key = String(log.id);
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(log);
            }
        }

        return unique;
    },

    // Add a new reading log (with content-based duplicate guard)
    addLog(log) {
        const logs = this.getAllLogs();
        const now = Date.now();
        let id = now;
        while (logs.some(entry => String(entry.id) === String(id))) id++;
        const newLog = {
            id: String(id),
            bookId: String(log.bookId),
            dateISO: log.dateISO,
            pages: parseInt(log.pages, 10) || 0,
            note: (log.note || '').slice(0, 120),
            createdAt: now
        };

        if (this.hasDuplicate(logs, newLog)) return null;
        if (Number.isSafeInteger(log.appliedPages) && log.appliedPages >= 0) {
            newLog.appliedPages = log.appliedPages;
        }

        logs.push(newLog);
        appStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
        return newLog;
    },

    hasDuplicate(logs, candidate) {
        return logs.some(log => String(log.id) !== String(candidate.id) &&
            String(log.bookId) === String(candidate.bookId) && log.dateISO === candidate.dateISO &&
            Number(log.pages) === candidate.pages && (log.note || '') === candidate.note);
    },

    // Delete a log by id
    deleteLog(logId) {
        const logs = this.getAllLogs();
        const filtered = logs.filter(l => String(l.id) !== String(logId));
        appStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    },

    // Delete all logs for a given bookId (cascade delete)
    deleteLogsByBookId(bookId) {
        const logs = this.getAllLogs();
        const filtered = logs.filter(l => String(l.bookId) !== String(bookId));
        appStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    },

    // Update an existing log by id (merge provided fields)
    updateLog(logId, updates) {
        const logs = this.getAllLogs();
        const idx = logs.findIndex(l => String(l.id) === String(logId));
        if (idx === -1) return null;
        const edited = { ...logs[idx], ...updates };
        if (this.hasDuplicate(logs, edited)) return null;
        logs[idx] = edited;
        appStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
        return logs[idx];
    },

    // Get a single log by id
    getLogById(logId) {
        const logs = this.getAllLogs();
        return logs.find(l => String(l.id) === String(logId)) || null;
    }
};

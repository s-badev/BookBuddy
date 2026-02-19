// Reading Log Repository — handles localStorage operations for reading sessions
const LogRepo = {
    STORAGE_KEY: 'bookbuddy_logs',

    // Get all logs sorted by createdAt DESC
    getAllLogs() {
        const logs = localStorage.getItem(this.STORAGE_KEY);
        const parsed = logs ? JSON.parse(logs) : [];
        return parsed.sort((a, b) => b.createdAt - a.createdAt);
    },

    // Add a new reading log
    addLog(log) {
        const logs = this.getAllLogs();
        const newLog = {
            id: String(Date.now()),
            bookId: String(log.bookId),
            dateISO: log.dateISO,
            pages: parseInt(log.pages, 10) || 0,
            note: (log.note || '').slice(0, 120),
            createdAt: Date.now()
        };
        logs.push(newLog);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
        return newLog;
    },

    // Delete a log by id
    deleteLog(logId) {
        const logs = this.getAllLogs();
        const filtered = logs.filter(l => l.id !== String(logId));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    },

    // Update an existing log by id (merge provided fields)
    updateLog(logId, updates) {
        const logs = this.getAllLogs();
        const idx = logs.findIndex(l => l.id === String(logId));
        if (idx === -1) return null;
        if (updates.bookId !== undefined)  logs[idx].bookId  = String(updates.bookId);
        if (updates.dateISO !== undefined) logs[idx].dateISO = updates.dateISO;
        if (updates.pages !== undefined)   logs[idx].pages   = parseInt(updates.pages, 10) || 0;
        if (updates.note !== undefined)    logs[idx].note    = (updates.note || '').slice(0, 120);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
        return logs[idx];
    },

    // Get a single log by id
    getLogById(logId) {
        const logs = this.getAllLogs();
        return logs.find(l => l.id === String(logId)) || null;
    },

    // Get the latest N logs (default 10)
    getLatestLogs(limit = 10) {
        return this.getAllLogs().slice(0, limit);
    }
};

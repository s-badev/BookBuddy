// Reading Log Repository — handles localStorage operations for reading sessions
const LogRepo = {
    STORAGE_KEY: 'bookbuddy_logs',

    // Get all logs sorted by createdAt DESC, deduplicated by id
    getAllLogs() {
        const logs = localStorage.getItem(this.STORAGE_KEY);
        const parsed = logs ? JSON.parse(logs) : [];

        // Deduplicate by id (keep the latest entry if duplicate ids exist)
        const seen = {};
        const unique = [];
        for (var i = 0; i < parsed.length; i++) {
            var key = String(parsed[i].id);
            if (!seen[key]) {
                seen[key] = true;
                unique.push(parsed[i]);
            }
        }

        return unique.sort((a, b) => b.createdAt - a.createdAt);
    },

    // Add a new reading log (with content-based duplicate guard)
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

        // Prevent content-identical duplicates (same book + date + pages + note)
        var contentKey = newLog.bookId + '|' + newLog.dateISO + '|' + newLog.pages + '|' + newLog.note;
        var isDup = logs.some(function(existing) {
            return (String(existing.bookId) + '|' + existing.dateISO + '|' + existing.pages + '|' + (existing.note || '')) === contentKey;
        });
        if (isDup) return logs.find(function(existing) {
            return (String(existing.bookId) + '|' + existing.dateISO + '|' + existing.pages + '|' + (existing.note || '')) === contentKey;
        });

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

// Settings Repository — handles localStorage for user preferences (goals, streak config)
const SettingsRepo = {
    STORAGE_KEY: 'bookbuddy_settings',

    DEFAULTS: {
        weeklyGoalPages: 100,
        minPagesForStreakDay: 1
    },

    // Get settings (merged with defaults for safety)
    getSettings() {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        return { ...this.DEFAULTS, ...saved };
    },

    // Persist settings
    saveSettings(settings) {
        const merged = {
            weeklyGoalPages: Math.max(1, parseInt(settings.weeklyGoalPages) || this.DEFAULTS.weeklyGoalPages),
            minPagesForStreakDay: Math.max(1, parseInt(settings.minPagesForStreakDay) || this.DEFAULTS.minPagesForStreakDay)
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
        return merged;
    }
};

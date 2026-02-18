// Challenge Repository — handles localStorage for reading challenges
const ChallengeRepo = {
    STORAGE_KEY: 'bookbuddy_challenges',

    // Default challenge definitions
    DEFAULTS: [
        {
            id: 'weekly_sprint',
            type: 'weekly_pages',
            title: 'Седмичен спринт',
            description: 'Прочети 100 страници тази седмица',
            target: 100,
            createdAt: Date.now(),
            active: true
        },
        {
            id: 'streak_14',
            type: 'streak_days',
            title: 'Читателски streak',
            description: 'Чети 14 поредни дни',
            target: 14,
            createdAt: Date.now(),
            active: true
        }
    ],

    // Get all challenges
    getChallenges() {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    },

    // Seed defaults if storage is empty
    seedDefaultChallengesIfEmpty() {
        const existing = this.getChallenges();
        if (existing.length === 0) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.DEFAULTS));
        }
    },

    // Persist challenges array
    saveChallenges(challenges) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(challenges));
    }
};

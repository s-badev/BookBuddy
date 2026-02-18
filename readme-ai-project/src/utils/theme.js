/* ==========================================================================
   Theme Switcher — Light / Dark / System
   Persists choice in localStorage under key "bookbuddy_theme".
   Values: "light" | "dark" | "system" (default).
   ========================================================================== */

var ThemeSwitcher = (function () {
    var STORAGE_KEY = 'bookbuddy_theme';
    var mql = window.matchMedia('(prefers-color-scheme: dark)');

    /** Read stored theme or default to "system" */
    function getTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'system';
    }

    /** Persist chosen theme */
    function setTheme(theme) {
        localStorage.setItem(STORAGE_KEY, theme);
        applyTheme(theme);
    }

    /**
     * Apply the theme to the document.
     * - "light"  → data-theme="light"
     * - "dark"   → data-theme="dark"
     * - "system" → remove data-theme, rely on CSS prefers-color-scheme
     */
    function applyTheme(theme) {
        var root = document.documentElement;

        if (theme === 'light' || theme === 'dark') {
            root.setAttribute('data-theme', theme);
        } else {
            // "system" — remove override, CSS handles it via @media
            root.removeAttribute('data-theme');
        }
    }

    /** Handler for OS theme change (only active when theme === "system") */
    function onSystemChange() {
        if (getTheme() === 'system') {
            // No data-theme attribute — CSS @media does the work.
            // But we may need to force a repaint in edge cases:
            applyTheme('system');
        }
    }

    /**
     * Initialise: apply stored theme, wire up OS listener,
     * and bind the theme control (select or chip buttons).
     */
    function initTheme() {
        var current = getTheme();
        applyTheme(current);

        // Listen for OS theme changes (relevant when "system")
        if (mql.addEventListener) {
            mql.addEventListener('change', onSystemChange);
        } else if (mql.addListener) {
            mql.addListener(onSystemChange); // Safari < 14
        }

        // Wire up select control
        var select = document.getElementById('themeSelect');
        if (select) {
            select.value = current;
            select.addEventListener('change', function () {
                setTheme(this.value);
                // Update any other selects on the page (unlikely, but safe)
                document.querySelectorAll('#themeSelect').forEach(function (s) {
                    s.value = getTheme();
                });
            });
        }
    }

    // Public API
    return {
        getTheme: getTheme,
        setTheme: setTheme,
        applyTheme: applyTheme,
        initTheme: initTheme
    };
})();

/* ---------- Apply theme immediately (before DOMContentLoaded) ---------- */
/* This avoids a flash-of-wrong-theme on page load. */
(function () {
    var stored = localStorage.getItem('bookbuddy_theme') || 'system';
    if (stored === 'light' || stored === 'dark') {
        document.documentElement.setAttribute('data-theme', stored);
    }
})();

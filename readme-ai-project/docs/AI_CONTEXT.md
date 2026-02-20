# AI_CONTEXT.md — BookBuddy Project Overview

> **Single source of truth** for any human or AI working on this codebase.
> Last updated to match the live codebase — do **not** trust any other doc if it contradicts this file.

---

## 1. What is BookBuddy?

BookBuddy is a **vanilla HTML / CSS / JS** reading tracker that runs entirely in the browser.  
Users add books, update their reading progress page-by-page, take notes, log reading sessions,
track weekly goals & streaks, view a Top 5 leaderboard, accept challenges, search / filter / sort
their library, and toggle between Light / Dark / System themes.  
All data lives in **localStorage** across 5 separate keys (see §4).

**No frameworks, no build tools, no npm, no backend.**

---

## 2. Pages & Purpose

| File | URL (relative) | Purpose |
|------|----------------|---------|
| `index.html` | `/` | Landing + dashboard — hero, features, stats, goal & streak, Top 5, challenges, book grid with toolbar, activity feed, modals (log + settings), toast, footer with demo buttons |
| `form.html` | `/form.html` | Add / edit book form page (auth-card style); receives `?edit=<id>` query param for editing |

Both pages share the same `<nav class="navbar">` (with theme switcher `<select id="themeSelect">`) and `<footer class="footer">`.  
Both pages load **Inter** (weights 400-800) via Google Fonts `<link>` in `<head>`.

---

## 3. File Map

```
readme-ai-project/
├── index.html                  # Main page (landing + dashboard)
├── form.html                   # Add / edit book form page
├── styles/
│   └── style.css               # ALL styles — design tokens, dark theme, components, responsive (≈1543 lines)
├── src/
│   ├── main.js                 # Dashboard logic (≈1083 lines): books CRUD, stats, goal/streak,
│   │                           #   top 5, challenges, log modal, settings modal, activity feed,
│   │                           #   search/filter/sort, demo data, toast
│   ├── form.js                 # Form page logic: submit, char counter, page cap, edit prefill, navbar toggle
│   ├── services/
│   │   ├── bookRepo.js         # BookRepo — localStorage CRUD for books
│   │   ├── logRepo.js          # LogRepo  — localStorage CRUD for reading logs (with dedup)
│   │   ├── settingsRepo.js     # SettingsRepo — weekly-goal & streak settings
│   │   └── challengeRepo.js    # ChallengeRepo — challenge definitions & progress
│   └── utils/
│       ├── validate.js         # Validate — form field validation helpers
│       └── theme.js            # ThemeSwitcher — Light / Dark / System theme IIFE
└── docs/
    ├── AI_CONTEXT.md           # ← this file
    ├── UI_STYLE.md             # Design tokens & component patterns
    └── UI_REFERENCE.md         # Section-by-section visual mapping
```

---

## 4. Data Model & localStorage Keys

Five separate localStorage entries:

### 4.1 Books — key `bookbuddy_books`

JSON array of book objects:

```jsonc
{
  "id":          1708123456789,   // Date.now() at creation
  "title":       "Малкият принц",
  "author":      "Антоан дьо Сент-Екзюпери",
  "totalPages":  96,
  "currentPage": 42,
  "notes":       "Любима книга!",
  "createdAt":   "2026-02-17T10:00:00.000Z"
}
```

### 4.2 Reading Logs — key `bookbuddy_logs`

JSON array of log entries (deduplicated by id on read):

```jsonc
{
  "id":        "1708123456789",   // String — Date.now() or stable demo id
  "bookId":    "1708123456789",   // String — matches a book's id
  "dateISO":   "2026-02-17",      // YYYY-MM-DD
  "pages":     25,
  "note":      "Глава 3",
  "createdAt": 1708123456789      // Number — Date.now()
}
```

### 4.3 Settings — key `bookbuddy_settings`

```jsonc
{
  "weeklyGoalPages":     100,   // default
  "minPagesForStreakDay": 1     // default
}
```

### 4.4 Challenges — key `bookbuddy_challenges`

JSON array; two default challenges are seeded on first load:

```jsonc
{
  "id":          "weekly_pages_500",
  "type":        "weekly_pages",       // or "streak_days"
  "title":       "Маратонец",
  "description": "Прочети 500 стр. тази седмица",
  "target":      500,
  "createdAt":   1708123456789,
  "active":      true
}
```

### 4.5 Theme — key `bookbuddy_theme`

Plain string value: `"light"` | `"dark"` | `"system"`.  
Managed by the `ThemeSwitcher` IIFE in `src/utils/theme.js`.  
The value controls `data-theme` attribute on `<html>`:
- `"light"` → `<html data-theme="light">`
- `"dark"` → `<html data-theme="dark">`
- `"system"` → attribute removed; CSS `@media (prefers-color-scheme: dark)` takes over

---

## 5. Feature Inventory

| Feature | Where | Key functions / selectors |
|---------|-------|--------------------------|
| Add / edit / delete books | form.html + main.js | `BookRepo`, `displayBooks()`, `createBookCard()` |
| Inline progress update | Book card page input | `updateBookProgress()`, `#progress-{id}` |
| Book notes with defaults | Book card note box | `getBookNote()` — title-specific overrides for "1984", "Стив Джобс", generic fallback |
| Search / filter / sort | Books toolbar | `initBooksToolbar()`, `applyBookViewState()`, `#bookSearch`, `#bookFilter`, `#bookSort` |
| Dashboard stats | Stats grid | `updateStats()`, `#statBooks`, `#statPagesRead`, `#statAvgProgress`, `#heroPagesRead` |
| Reading log modal | Log modal overlay | `initLogModal()`, `#logModal`, `#logForm`, `LogRepo` |
| Settings modal | Settings modal overlay | `initSettingsModal()`, `#settingsModal`, `#settingsForm`, `SettingsRepo` |
| Weekly goal + streak | Goal/streak row | `renderGoalStreak()`, `#goalValue`, `#goalFill`, `#goalPct`, `#streakValue` |
| Top 5 books | Top books section | `renderTopBooks()`, `getTopBooks()` — ranked by `currentPage` desc, `#topBooksThisWeek` |
| Challenges | Challenges section | `renderChallenges()`, `ChallengeRepo`, `#challengesList` |
| Activity feed | Feed section | `renderActivityFeed()`, `#activityFeed` |
| Theme switcher | Navbar select | `ThemeSwitcher.initTheme()`, `#themeSelect` |
| Demo data | Footer buttons | `seedDemoData()`, `clearAllData()`, `#seedDemoBtn`, `#clearDataBtn` |
| Toast notifications | Floating toast | `showToast()`, `#toast` |

---

## 6. Naming Conventions

| Layer | Convention | Examples |
|-------|-----------|----------|
| CSS class (BEM-ish) | `block__element--modifier` | `.book-card__title`, `.btn--primary`, `.stat-card__icon--pages` |
| CSS variable prefixes | `--c-` color, `--sp-` spacing, `--r-` radius, `--sh-` shadow, `--fs-` font-size, `--fw-` font-weight, `--header-` navbar tokens | `--c-primary`, `--sp-6`, `--r-xl`, `--header-bg` |
| JS IDs (hooked by JS) | camelCase or kebab-case | `booksList`, `bookForm`, `statBooks`, `progress-{id}`, `delete-{id}`, `edit-{id}` |
| JS globals | PascalCase objects | `BookRepo`, `LogRepo`, `SettingsRepo`, `ChallengeRepo`, `Validate`, `ThemeSwitcher` |

---

## 7. Critical JS-Hooked IDs — DO NOT RENAME

These IDs are referenced in JavaScript. Changing them **will break** the app:

### index.html → `main.js`

#### Dashboard core
| ID | Used for |
|----|----------|
| `#booksList` | Container for dynamically rendered book cards |
| `#statBooks` | Total-books stat value |
| `#statPagesRead` | Pages-read stat value |
| `#statAvgProgress` | Average-progress stat value |
| `#heroPagesRead` | Hero card big number |
| `#progress-{id}` | Per-book page input (generated per book) |
| `#delete-{id}` | Per-book delete button (generated per book) |
| `#edit-{id}` | Per-book edit button (generated per book) |

#### Books toolbar
| ID | Used for |
|----|----------|
| `#bookSearch` | Search input |
| `#bookFilter` | Filter `<select>` (all / reading / finished / wishlist) |
| `#bookSort` | Sort `<select>` (recent / title / progress) |

#### Goal & streak
| ID | Used for |
|----|----------|
| `#editGoalBtn` | Opens settings modal |
| `#goalValue` | Weekly goal target display |
| `#goalFill` | Goal progress bar fill element |
| `#goalPct` | Goal percentage text |
| `#streakValue` | Current streak display |

#### Top 5 & challenges
| ID | Used for |
|----|----------|
| `#topBooksThisWeek` | Top 5 books container |
| `#challengesList` | Challenges list container |

#### Log modal
| ID | Used for |
|----|----------|
| `#logReadingBtn` | Opens log modal |
| `#logModal` | Log modal overlay |
| `#logForm` | Log `<form>` |
| `#logModalClose` | Close × button |
| `#logModalCancel` | Cancel button |
| `#logModalTitle` | Modal heading (dynamic) |
| `#logSubmitBtn` | Submit button (dynamic text) |
| `#logBook` | Book `<select>` |
| `#logDate` | Date input |
| `#logPages` | Pages input |
| `#logNote` | Note textarea |
| `#logBookError` | Validation error span |
| `#logDateError` | Validation error span |
| `#logPagesError` | Validation error span |

#### Settings modal
| ID | Used for |
|----|----------|
| `#settingsModal` | Settings modal overlay |
| `#settingsForm` | Settings `<form>` |
| `#settingsModalClose` | Close × button |
| `#settingsModalCancel` | Cancel button |
| `#settingWeeklyGoal` | Goal input |
| `#settingMinStreak` | Streak-min input |
| `#settingWeeklyGoalError` | Validation error span |
| `#settingMinStreakError` | Validation error span |

#### Activity feed, toast, theme, demo
| ID | Used for |
|----|----------|
| `#activityFeed` | Activity feed container |
| `#toast` | Toast notification element |
| `#themeSelect` | Theme switcher `<select>` in navbar |
| `#seedDemoBtn` | "Зареди демо данни" footer button |
| `#clearDataBtn` | "Изчисти данните" footer button |

### form.html → `form.js`
| ID | Used for |
|----|----------|
| `#bookForm` | The `<form>` element |
| `#title` | Book title input |
| `#author` | Author input |
| `#totalPages` | Total pages input |
| `#currentPage` | Current page input |
| `#notes` | Notes textarea |
| `#charCount` | Character counter display |

### CSS classes toggled by JS
| Class | Used for |
|-------|----------|
| `.navbar` | Navbar container (`.is-open` toggled for mobile menu) |
| `.navbar__toggle` | Hamburger button click target |
| `.section-highlight` | Briefly added on scroll-to-section target |

---

## 8. CSS Architecture

- **One file**: `styles/style.css` (≈1543 lines)
- **No preprocessor, no Tailwind, no Bootstrap**
- **Section order**: Tokens → Dark Theme Overrides → Reset → Utilities → Background blobs → Navbar → Buttons → Pills/Badges → Hero → Features → Stats → Goal & Streak → Top Books → Challenges → Books section → Book Card → Activity Feed → Empty State → Modals → Toast → Form/Auth Card → Footer → Responsive → Accessibility → Print
- **Theming**: `[data-theme="dark"]` block + `@media (prefers-color-scheme: dark) :root:not([data-theme])` fallback; both redefine the same set of CSS tokens

### Breakpoints
| Name | Query | Grid columns |
|------|-------|--------------|
| Mobile | `≤ 640px` | 1 column |
| Tablet | `641px – 1023px` | 2 columns |
| Desktop | `≥ 1024px` | 3 columns |
| Wide | `≥ 1280px` | wider padding adjustments |
| Large | `≥ 1440px` | wider container |
| XL | `≥ 1920px` | max container scale |

---

## 9. Rules of Engagement

### ✅ Allowed
- Change CSS values, add new CSS classes/variables
- Restructure HTML layout (preserve all JS-hooked IDs)
- Add inline SVG icons
- Change visible text / copy
- Improve accessibility (ARIA, contrast, focus)

### ❌ Prohibited
- Adding React, Vue, Angular, Svelte, or any framework
- Adding Tailwind, Bootstrap, or any CSS library
- Adding npm, Webpack, Vite, or any build tool
- Adding backend / server / API code
- Renaming project folders
- Removing or renaming JS-hooked IDs (Section 7)

---

## 10. Language & Branding

- **Product name in UI**: BookBuddy (never "ReadMe")
- **UI language**: Bulgarian (headings, labels, buttons, placeholders, alerts)
- **Code comments**: English
- **Primary color**: Indigo `#4a4080` (not teal, not sky-blue)
- **Accent color**: Gold `#bf9b5a`
- **Font**: Inter via Google Fonts CDN (weights 400–800)

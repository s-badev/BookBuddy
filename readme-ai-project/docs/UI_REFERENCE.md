# UI_REFERENCE.md — Section-by-Section Visual Mapping

> Maps every visible section of BookBuddy to its implementation.  
> Use this to verify what exists, where it lives, and how it's wired.

---

## 1. Branding Rules

| Rule | Detail |
|------|--------|
| Product name | **BookBuddy** — never "ReadMe" |
| Palette | Indigo `#4a4080` + Gold `#bf9b5a` — not teal |
| UI language | Bulgarian |
| Code comments | English |

---

## 2. Page-by-Page Section Mapping

### 2.1 Background Blobs (index.html)

| Element | Implementation |
|---------|----------------|
| 3 soft colored blur circles | `.bg-blobs` → `.blob--1`, `.blob--2`, `.blob--3` with `filter:blur(90px)` |
| Dark mode | Opacity reduced to `.15`/`.18` |

### 2.2 Navbar (both pages)

| Element | Implementation |
|---------|----------------|
| Sticky frosted-glass top bar | `.navbar` — `position:sticky`, `backdrop-filter:blur(14px)`, `--header-bg`, `--header-border`, `--header-shadow` |
| Logo left | `.navbar__brand` — open-book SVG icon + "BookBuddy" text |
| Centered nav links | `.navbar__links` — "Статистики", "Моите книги" |
| Theme switcher | `<select id="themeSelect">` with options: Светла / Тъмна / Системна |
| CTA button right | `.navbar__actions` — "Добави книга" gradient pill button |
| Mobile burger | `.navbar__toggle` — SVG hamburger, toggles `.is-open` |

### 2.3 Hero (index.html)

| Element | Implementation |
|---------|----------------|
| Small pill label above headline | `.pill.pill--accent` — sparkle icon + "Новият начин да четеш повече" (inline, `align-self:flex-start`) |
| Big bold headline with gradient word | `.hero__title` — "Чети. **Следи.** Напредвай." (gradient text on "Следи.") |
| Gray subtitle paragraph | `.hero__subtitle` — describes tracking + progress |
| Two CTA buttons | `.hero__cta` — "Започни безплатно" (primary, rocket icon) + "Как работи" (outline, play icon) |
| Right-side gradient card with stat | `.hero-card` — indigo-to-gold gradient, white SVG icons, big number `#heroPagesRead` = total pages read |
| Background blob shapes | `.bg-blobs` — 3 soft circles behind the hero |

### 2.4 "Why Choose BookBuddy?" Features (index.html)

| Element | Implementation |
|---------|----------------|
| Section heading + subtitle | "Защо да избереш BookBuddy?" + one-liner |
| 3 feature cards in row | `.features__grid` with 3 `.feature-card` elements with `data-scroll-target` |
| Card pattern | 48px icon container (primary-light bg), h3 title, p description |
| Hover | Card lifts 4px, shadow increases |

Features:
1. **Личен каталог** — Add/track/note books (`data-scroll-target="booksSection"`)
2. **Подробна статистика** — View stats (`data-scroll-target="statsSection"`)
3. **Чисто и бързо** — No ads, no signup, browser-only (`data-scroll-target="booksSection"`)

### 2.5 Stats Section (index.html)

| Element | Implementation |
|---------|----------------|
| Row of stat cards with icon + number | `.stats__grid` — 3 `.stat-card` elements |
| Left accent gradient stripe | `::before` — 4px left gradient bar |
| Icon in colored circle | `.stat-card__icon` — 48px, tinted bg |
| Big number + small uppercase label | `.stat-card__value` + `.stat-card__label` |
| Action buttons below stats | "Настройки" (`#editGoalBtn`) + "Запиши четене" (`#logReadingBtn`) |

Stats:
| ID | Label | Data |
|----|-------|------|
| `#statBooks` | Книги | Total book count |
| `#statPagesRead` | Прочетени страници | Sum of currentPage |
| `#statAvgProgress` | Среден прогрес | Mean (currentPage/totalPages) % |

### 2.6 Goal & Streak Row (index.html)

| Element | Implementation |
|---------|----------------|
| Goal card (left) | `.goal-card` — heading, progress bar (`.goal-progress-bar` + `#goalFill`), target `#goalValue`, percentage `#goalPct` |
| Streak card (right) | `.streak-card` — flame icon (`.streak-card__icon`), streak count `#streakValue` |
| Layout | `.goal-streak-row` — 2-column grid, stacks on mobile |

Goal tracks pages read this week vs `weeklyGoalPages` setting.  
Streak counts consecutive days with `≥ minPagesForStreakDay` pages logged.

### 2.7 Top 5 Books (index.html)

| Element | Implementation |
|---------|----------------|
| Section heading | "Топ 5 най-четени книги" |
| Container | `#topBooksThisWeek` inside `.top-books-section` |
| List items | `.top-book-item` — rank badge (`.top-book-item__rank`), title, author, pages text |
| Ranking logic | `getTopBooks()` — sorts all books by `currentPage` descending, takes top 5 |
| Display format | "{currentPage} / {totalPages} стр." |
| Rank colors | 1st = gold, 2nd = silver, 3rd = bronze, 4th–5th = neutral |

### 2.8 Challenges (index.html)

| Element | Implementation |
|---------|----------------|
| Container | `#challengesList` inside `.challenges-section` |
| Card pattern | `.challenge-card` — icon, title, description, progress bar, progress text |
| Default challenges | "Маратонец" (500 pages/week), "Постоянен читател" (7-day streak) |
| Progress | Computed from current week's logs / current streak vs target |

### 2.9 Books Section with Toolbar (index.html)

| Element | Implementation |
|---------|----------------|
| Section heading | "Моите книги" + subtitle + "Добави книга" button |
| Search input | `#bookSearch` — real-time text filtering (300ms debounce) |
| Filter dropdown | `#bookFilter` — all / reading / finished / wishlist |
| Sort dropdown | `#bookSort` — recent / title / progress |
| Book grid | `#booksList` — `.books-grid` CSS Grid, `repeat(3, 1fr)` on desktop, `align-items: stretch` |

#### Book Card (`.book-card`)
| Element | Implementation |
|---------|----------------|
| Top gradient stripe | `.book-card__top` — 6px gradient bar |
| Status badge (pill) | `.pill--reading` / `.pill--finished` / `.pill--wishlist` |
| Title + "от Author" | `.book-card__title` + `.book-card__author` |
| Page input / total + percentage | `.book-card__progress-info` with inline input `#progress-{id}` |
| Progress bar | `.progress-bar` + `.progress-fill` — 8px height, gradient fill |
| Notes box | `.book-card__notes` — `max-height:110px; overflow-y:auto`; always rendered via `getBookNote()` |
| Edit button | `.btn--icon` with `#edit-{id}` — pencil SVG, navigates to `form.html?edit={id}` |
| Delete button | `.btn--icon.btn--icon-danger` with `#delete-{id}` — trash SVG |
| Hover | Card lifts 4px, `--sh-card-hover` shadow |

Status logic (computed in JS):
- `progress >= 100%` → "Прочетена" (green pill)
- `progress > 0%` → "Чета" (indigo pill)
- `progress === 0%` → "За четене" (amber pill)

### 2.10 Activity Feed (index.html)

| Element | Implementation |
|---------|----------------|
| Section heading | "Последна активност" |
| Container | `#activityFeed` inside `.activity-feed` |
| Feed items | `.activity-item` — icon, descriptive text, relative time, status pill |
| Data source | `LogRepo.getAllLogs()` — sorted by `createdAt` desc, rendered as feed |

### 2.11 Log Reading Modal (index.html)

| Element | Implementation |
|---------|----------------|
| Trigger | `#logReadingBtn` button in stats section |
| Overlay | `#logModal` (`.modal-overlay`) |
| Form | `#logForm` with: book select `#logBook`, date `#logDate`, pages `#logPages`, note `#logNote` |
| Validation | Inline error spans: `#logBookError`, `#logDateError`, `#logPagesError` |
| Submit flow | Creates log entry → updates book `currentPage` (additive) → refreshes all views |

### 2.12 Settings Modal (index.html)

| Element | Implementation |
|---------|----------------|
| Trigger | `#editGoalBtn` button in stats section |
| Overlay | `#settingsModal` (`.modal-overlay`) |
| Form | `#settingsForm` with: weekly goal `#settingWeeklyGoal`, min streak pages `#settingMinStreak` |
| Validation | Inline error spans: `#settingWeeklyGoalError`, `#settingMinStreakError` |
| Submit flow | Saves to `SettingsRepo` → re-renders goal/streak + challenges |

### 2.13 Toast (index.html)

| Element | Implementation |
|---------|----------------|
| Element | `#toast` (`.toast`) — fixed bottom-center |
| Behavior | `showToast(message)` → slides in, auto-dismisses after delay |

### 2.14 Empty State (index.html)

| Element | Implementation |
|---------|----------------|
| Shown when | No books match current filter/search, or library is empty |
| Pattern | `.empty-state` — emoji icon, title, subtitle, "Добави книга" CTA button |
| Layout | `grid-column: 1 / -1`, dashed border |

### 2.15 Footer (both pages)

| Element | Implementation |
|---------|----------------|
| Copyright | "© 2026 BookBuddy. Всички права запазени." |
| Demo buttons row | `.footer__actions` with "Зареди демо данни" (`#seedDemoBtn`, `.btn--ghost`) + "Изчисти данните" (`#clearDataBtn`, `.btn--ghost-danger`) |
| Border | `border-top: 1px solid var(--c-border-light)` |

### 2.16 Add / Edit Book Form (form.html)

| Element | Implementation |
|---------|----------------|
| Auth-style centered card | `.auth-card` — max-width 560px, top gradient stripe, `--sh-lg` shadow |
| Icon + heading + subtitle | `.auth-card__header` — book SVG, "Добави нова книга" (or "Редактирай книга"), description |
| Inputs with left icons | `.input-icon-wrap` — SVG icon positioned left, input padded |
| Focus ring | `border-radius: var(--r-lg)`, indigo `#4a4080` focus ring with glow |
| Two number inputs side by side | `.form-row` — 2-column grid (stacks on mobile) |
| Character counter | `#charCount` — "0 / 300" format below notes textarea |
| Submit button | `.btn--primary.btn--full` — "Запиши книгата" |
| Cancel button | `.btn--ghost.btn--full` — "Отказ" |
| Edit mode | URL param `?edit={id}` → prefills fields, changes heading |

---

## 3. Visual Feel Checklist

- [x] Indigo-to-gold gradient (hero card, buttons, progress bars, card stripes)
- [x] Generous whitespace (section padding ≥ 48px)
- [x] Large border-radius everywhere (14–20px)
- [x] Subtle warm shadows (`rgba(30,27,46,…)` base)
- [x] Background blur blobs for depth
- [x] Pill-shaped CTA buttons with gradient
- [x] Inter font via Google Fonts CDN (400–800)
- [x] Strong heading hierarchy (up to 52px hero)
- [x] Inline SVG icons (no icon library)
- [x] Hero pill is compact (inline-flex, align-self:flex-start) with sparkle icon
- [x] Hero CTA buttons contain icons (rocket + play)
- [x] Navbar open-book SVG icon
- [x] Card hover: lift + shadow increase
- [x] Input focus: indigo ring with subtle glow
- [x] Status pills with tinted backgrounds
- [x] Responsive: 1→2→3 column grid
- [x] Sticky navbar with blur (frosted glass)
- [x] Gradient text on key words
- [x] Light / Dark / System theme with full token overrides
- [x] No "ReadMe" strings in UI
- [x] Book notes always shown (with default fallback text)
- [x] Equal-height book cards via `align-items: stretch`

---

## 4. Not Implemented

| Pattern | Reason |
|---------|--------|
| Login / Register form | No auth system |
| User dropdown / avatar | No user accounts |
| Book cover images | Books have no image field |
| Social sharing / export | No external integrations |

---

## 5. Maintenance Checklist

When modifying the UI:

1. ☐ Does the change use existing CSS variables? (Don't hardcode colors)
2. ☐ Are JS-hooked IDs preserved? (See AI_CONTEXT.md §7)
3. ☐ Is the change responsive at 640px / 1024px / 1440px?
4. ☐ Do hover/focus states exist for new interactive elements?
5. ☐ Is "BookBuddy" used (never "ReadMe") in any new text?
6. ☐ Are dark-theme overrides added for new tinted components?
7. ☐ Are these docs updated to reflect the change?

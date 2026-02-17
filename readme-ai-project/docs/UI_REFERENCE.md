# UI_REFERENCE.md — Visual Reference Mapping

> Maps the "ReadMe screenshot" visual patterns to BookBuddy's actual implementation.  
> Use this to verify 1:1 style parity and ensure branding is correct.

---

## 1. Key Branding Replacements

| ReadMe text (reference) | BookBuddy text (actual) | Where |
|--------------------------|------------------------|-------|
| ReadMe (brand) | BookBuddy | Navbar brand, hero, feature section title |
| "Защо да избереш ReadMe?" | "Защо да избереш **BookBuddy**?" | Features section heading |
| Any ReadMe logo | BookBuddy open-book SVG icon (two pages) | Navbar, auth-card header |
| ReadMe tagline | "Новият начин да четеш повече" (pill) | Hero section |

> **Rule**: No visible UI string may contain "ReadMe". Only "BookBuddy".

---

## 2. Page-by-Page Mapping

### 2.1 Navbar (both pages)

| ReadMe pattern | BookBuddy implementation |
|----------------|--------------------------|
| Sticky white top bar, blurred bg | `.navbar` — `position:sticky`, `backdrop-filter:blur(14px)`, `rgba(255,255,255,.82)` |
| Logo left | `.navbar__brand` — open-book SVG icon (two pages) + "BookBuddy" text |
| Centered nav links | `.navbar__links` — "Статистики", "Моите книги" |
| CTA button right | `.navbar__actions` — "Добави книга" gradient pill button |
| Mobile burger | `.navbar__toggle` — SVG hamburger, toggles `.is-open` |

### 2.2 Hero (index.html)

| ReadMe pattern | BookBuddy implementation |
|----------------|--------------------------|
| Small pill label above headline | `.pill.pill--accent` — sparkle icon + "Новият начин да четеш повече" (inline, not full-width) |
| Big bold headline with gradient word | `.hero__title` — "Чети. **Следи.** Напредвай." (gradient on "Следи.") |
| Gray subtitle paragraph | `.hero__subtitle` — describing tracking + progress |
| Two CTA buttons (primary + outlined) | `.hero__cta` — "Започни безплатно" (primary, rocket icon) + "Как работи" (outline, play icon) |
| Right-side gradient card with stat | `.hero-card` — teal gradient, white SVG icons, big number = total pages read |
| Faint background blob shapes | `.bg-blobs` — 3 soft colored circles with `filter:blur(90px)` |

### 2.3 "Why Choose" Features (index.html)

| ReadMe pattern | BookBuddy implementation |
|----------------|--------------------------|
| Section heading + subtitle | "Защо да избереш BookBuddy?" + one-liner |
| 3 feature cards in row | `.features__grid` with 3 `.feature-card` elements |
| Icon + title + description per card | 48px icon container (primary-light bg), h3, p |
| Cards: white bg, rounded, subtle shadow | `--r-xl` radius, `--sh-sm` shadow, hover lifts 4px |

Features:
1. **Личен каталог** — Add/track/note books
2. **Подробна статистика** — View stats
3. **Чисто и бързо** — No ads, no signup, browser-only

### 2.4 Stats Section (index.html)

| ReadMe pattern | BookBuddy implementation |
|----------------|--------------------------|
| Row of stat cards with icon + number | `.stats__grid` — 3 `.stat-card` elements |
| Left accent gradient stripe | `::before` — 4px left gradient bar |
| Icon in colored circle | `.stat-card__icon` — 48px, tinted bg |
| Big number + small uppercase label | `.stat-card__value` + `.stat-card__label` |

Stats:
| ID | Label | Data |
|----|-------|------|
| `#statBooks` | Книги | Total book count |
| `#statPagesRead` | Прочетени страници | Sum of currentPage |
| `#statAvgProgress` | Среден прогрес | Mean (currentPage/totalPages) % |

### 2.5 Books Grid (index.html)

| ReadMe pattern | BookBuddy implementation |
|----------------|--------------------------|
| Title "Моите книги" + subtitle + "Add" button | `.books__header` with flex layout |
| Grid of book cards (3 cols desktop) | `.books-grid` — CSS Grid `repeat(3, 1fr)` on desktop |
| Card: top gradient stripe | `.book-card__top` — 6px gradient bar |
| Status badge (pill) | `.pill--reading` / `.pill--finished` / `.pill--wishlist` |
| Title + "от Author" | `.book-card__title` + `.book-card__author` |
| Page input / total + percentage | `.book-card__progress-info` with inline input |
| Thin progress bar | `.progress-bar` — 8px height, gradient fill |
| Delete icon bottom-right | `.btn--icon.btn--icon-danger` — trash SVG |
| Hover: card lifts, shadow increases | `transform:translateY(-4px)`, `--sh-card-hover` |

Status logic (computed in JS):
- `progress >= 100%` → "Прочетена" (green pill)
- `progress > 0%` → "Чета" (blue pill)
- `progress === 0%` → "За четене" (amber pill)

### 2.6 Empty State (index.html)

| ReadMe pattern | BookBuddy implementation |
|----------------|--------------------------|
| Centered message + CTA | `.empty-state` — emoji icon, title, subtitle, "Добави книга" button |
| Dashed border | `border: 2px dashed var(--c-border)` |

### 2.7 Add Book Form (form.html)

| ReadMe pattern | BookBuddy implementation |
|----------------|--------------------------|
| Auth-style centered card | `.auth-card` — max-width 560px, top gradient stripe, large shadow |
| Icon + heading + subtitle in card header | `.auth-card__header` — book SVG, "Добави нова книга", description |
| Inputs with left icons | `.input-icon-wrap` — SVG icon positioned left, input padded |
| Rounded inputs with focus ring | `border-radius: var(--r-lg)`, teal `#36A9AE` focus ring with 4px glow |
| Two number inputs side by side | `.form-row` — 2-column grid (stacks on mobile) |
| Character counter | `#charCount` — "0 / 300" format |
| Full-width primary submit | `.btn--primary.btn--full` — "Запиши книгата" |
| Ghost cancel button | `.btn--ghost.btn--full` — "Отказ" |

### 2.8 Footer (both pages)

| ReadMe pattern | BookBuddy implementation |
|----------------|--------------------------|
| Simple centered text | `.footer` — "© 2026 BookBuddy. Всички права запазени." |
| Top border separator | `border-top: 1px solid var(--c-border-light)` |

---

## 3. 1:1 Feel Checklist

- [x] Soft teal gradient backgrounds (hero card, button, progress bars)
- [x] Generous whitespace (section padding ≥ 48px)
- [x] Large border-radius everywhere (14–20px)
- [x] Subtle, wide shadows (`0 10px 30px rgba(0,0,0,0.06)`)
- [x] Background blur blobs for depth
- [x] Pill-shaped CTA buttons with gradient
- [x] Inter font loaded via Google Fonts CDN
- [x] Strong heading hierarchy (up to 52px hero)
- [x] Inline SVG icons (no icon library dependency)
- [x] Hero pill is compact (inline-flex, align-self:flex-start) with sparkle icon
- [x] Hero CTA buttons contain icons (rocket + play)
- [x] Navbar open-book SVG icon (two pages design)
- [x] Card hover: lift + shadow increase
- [x] Input focus: teal ring with subtle glow
- [x] Status pills with tinted backgrounds
- [x] Responsive: 1→2→3 column grid
- [x] Sticky navbar with blur
- [x] Gradient text on key words
- [x] No "ReadMe" strings in UI

---

## 4. Out of Scope

These ReadMe patterns are **not implemented** because BookBuddy doesn't have the features:

| Pattern | Reason |
|---------|--------|
| Login / Register form | No auth system |
| User dropdown / avatar | No user accounts |
| Challenges page | No challenges feature |
| Leaderboard / Top 5 | No social features |
| Book cover images | Books have no image field |
| XP / Streak / Level | No gamification system |

If any of these features are added in the future, apply the same card/pill/gradient patterns.

---

## 5. Maintenance Checklist

When modifying the UI:

1. ☐ Does the change use existing CSS variables? (Don't hardcode colors)
2. ☐ Are JS-hooked IDs preserved? (See AI_CONTEXT.md §6)
3. ☐ Is the change responsive at 640px / 1024px / 1440px?
4. ☐ Do hover/focus states exist for new interactive elements?
5. ☐ Is "BookBuddy" used (never "ReadMe") in any new text?
6. ☐ Are these docs updated to reflect the change?

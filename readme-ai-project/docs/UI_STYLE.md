# UI_STYLE.md — BookBuddy Design System

> Practical reference for every design token, component pattern, and responsive rule.  
> Keep this in sync whenever `styles/style.css` changes.  
> **Palette**: indigo `#4a4080` + gold `#bf9b5a`. Not teal.

---

## 1. Design Tokens (CSS Custom Properties)

All tokens live in `:root` at the top of `styles/style.css`.

### 1.1 Colors

#### Primary palette (indigo)
| Token | Value | Usage |
|-------|-------|-------|
| `--c-primary` | `#4a4080` | Primary actions, links, progress bars |
| `--c-primary-hover` | `#3d3570` | Primary hover state |
| `--c-primary-light` | `rgba(74,64,128,.08)` | Light tinted backgrounds, icon containers |
| `--c-primary-dark` | `#2e2860` | Dark primary text on light bg |

#### Accent (gold)
| Token | Value | Usage |
|-------|-------|-------|
| `--c-accent` | `#bf9b5a` | Gradient endpoint, secondary emphasis |
| `--c-accent-hover` | `#a07830` | Accent hover state |
| `--c-accent-light` | `rgba(191,155,90,.10)` | Accent pill backgrounds |

#### Semantic
| Token | Value | Usage |
|-------|-------|-------|
| `--c-danger` | `#ef4444` | Delete actions, error states |
| `--c-danger-hover` | `#dc2626` | Danger hover |
| `--c-success` | `#3db878` | Success states, "Прочетена" badges |

#### Neutrals (warm)
| Token | Value | Usage |
|-------|-------|-------|
| `--c-text` | `#1e1b2e` | Primary body text |
| `--c-text-secondary` | `#6b6580` | Subtitles, descriptions |
| `--c-text-muted` | `#9a9090` | Placeholder, hint text |
| `--c-text-light` | `#c4bdb5` | Input placeholders |
| `--c-bg` | `#f4f2ef` | Body background |
| `--c-surface` | `#ffffff` | Card / modal surfaces |
| `--c-subtle` | `rgba(210,200,185,.20)` | Subtle backgrounds |
| `--c-border` | `#d2c8b9` | Standard borders |
| `--c-border-light` | `rgba(210,200,185,.45)` | Softer borders on cards |

#### Gradients
| Token | Value | Usage |
|-------|-------|-------|
| `--grad-primary` | `linear-gradient(135deg, #4a4080 0%, #6558a6 45%, #bf9b5a 100%)` | Buttons, progress bars, top stripes |
| `--grad-hero` | `linear-gradient(135deg, #4a4080 0%, #6558a6 35%, #bf9b5a 100%)` | Hero card |
| `--grad-text` | `linear-gradient(135deg, #6558a6, #bf9b5a)` | Gradient text effect (e.g. "Следи.") |

### 1.2 Header / Navbar Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--header-bg` | `rgba(255,255,255,.72)` | Frosted-glass navbar background |
| `--header-border` | `rgba(74,64,128,.10)` | Subtle bottom border |
| `--header-shadow` | `0 1px 8px rgba(30,27,46,.06), 0 4px 24px rgba(74,64,128,.04)` | Layered navbar shadow |

### 1.3 Spacing Scale

| Token | Value | px |
|-------|-------|----|
| `--sp-1` | 0.25rem | 4 |
| `--sp-2` | 0.5rem | 8 |
| `--sp-3` | 0.75rem | 12 |
| `--sp-4` | 1rem | 16 |
| `--sp-5` | 1.25rem | 20 |
| `--sp-6` | 1.5rem | 24 |
| `--sp-8` | 2rem | 32 |
| `--sp-10` | 2.5rem | 40 |
| `--sp-12` | 3rem | 48 |
| `--sp-16` | 4rem | 64 |
| `--sp-20` | 5rem | 80 |

### 1.4 Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--r-sm` | 6px | Small elements, inline inputs |
| `--r-md` | 10px | Icon buttons |
| `--r-lg` | 14px | Standard buttons, inputs, feature cards |
| `--r-xl` | 16px | Stat cards, book cards |
| `--r-2xl` | 20px | Auth card, hero card, empty state |
| `--r-full` | 9999px | Pills, pill buttons |

### 1.5 Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--sh-xs` | `0 1px 2px rgba(30,27,46,.04)` | Minimal elevation |
| `--sh-sm` | `0 4px 14px rgba(30,27,46,.05)` | Cards at rest |
| `--sh-md` | `0 6px 16px rgba(30,27,46,.07)` | Dropdowns |
| `--sh-lg` | `0 10px 30px rgba(30,27,46,.08)` | Auth card |
| `--sh-xl` | `0 16px 48px rgba(30,27,46,.10)` | Hero card |
| `--sh-card-hover` | `0 14px 40px rgba(74,64,128,.10)` | Card hover (indigo-tinted) |

### 1.6 Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | All text |
| `--fs-xs` | 0.75rem (12px) | Small labels |
| `--fs-sm` | 0.8125rem (13px) | Secondary text |
| `--fs-base` | 0.9375rem (15px) | Default body |
| `--fs-md` | 1rem (16px) | Slightly larger body |
| `--fs-lg` | 1.125rem (18px) | Card titles |
| `--fs-xl` | 1.25rem (20px) | Section subtitles |
| `--fs-2xl` | 1.5rem (24px) | Section headings |
| `--fs-3xl` | 2rem (32px) | Large headings |
| `--fs-4xl` | 2.75rem (44px) | Hero responsive |
| `--fs-5xl` | 3.25rem (52px) | Hero headline |
| `--fw-normal` | 400 | Body text |
| `--fw-medium` | 500 | Links, subtle labels |
| `--fw-semibold` | 600 | Labels, buttons, card titles |
| `--fw-bold` | 700 | Headings, stat values |
| `--fw-extrabold` | 800 | Hero headline |

### 1.7 Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--container-max` | 1140px | Main content max-width |
| `--container-pad` | 1.25rem | Horizontal page padding |
| `--navbar-h` | 64px | Navbar height |

### 1.8 Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--ease` | `cubic-bezier(.4,0,.2,1)` | Shared easing curve |
| `--t-fast` | `150ms var(--ease)` | Micro-interactions |
| `--t-base` | `250ms var(--ease)` | Standard transitions |
| `--t-slow` | `400ms var(--ease)` | Reveal animations |

---

## 2. Dark Theme

BookBuddy supports three theme modes: **Light**, **Dark**, **System**.

### 2.1 How it works

| Mode | CSS mechanism |
|------|---------------|
| Light | `[data-theme="light"]` on `<html>` — uses `:root` defaults + `color-scheme: light` |
| Dark | `[data-theme="dark"]` on `<html>` — overrides all neutral/shadow/header tokens |
| System | No `data-theme` attribute — `@media (prefers-color-scheme: dark) :root:not([data-theme])` applies dark tokens |

### 2.2 Dark token overrides

These tokens are redefined in the `[data-theme="dark"]` block (and identically in the `@media` fallback):

| Token | Dark value |
|-------|-----------|
| `--c-text` | `#e0dce8` |
| `--c-text-secondary` | `#a09ab0` |
| `--c-text-muted` | `#6b6580` |
| `--c-text-light` | `#504a65` |
| `--c-bg` | `#161220` |
| `--c-surface` | `#221e30` |
| `--c-subtle` | `#302a42` |
| `--c-border` | `#3a3450` |
| `--c-border-light` | `rgba(58,52,80,.55)` |
| `--c-primary-light` | `rgba(74,64,128,.18)` |
| `--c-accent-light` | `rgba(191,155,90,.14)` |
| `--header-bg` | `rgba(22,18,32,.82)` |
| `--header-border` | `rgba(90,78,150,.18)` |
| `--header-shadow` | `0 1px 8px rgba(0,0,0,.28), 0 4px 24px rgba(0,0,0,.18)` |
| `--sh-xs` through `--sh-xl` | Replaced with stronger `rgba(0,0,0,…)` shadows |
| `--sh-card-hover` | `0 14px 40px rgba(74,64,128,.14)` |

### 2.3 Dark component-level overrides

Duplicated for both `[data-theme="dark"]` and `@media` system selectors:

| Selector | Override |
|----------|----------|
| `.blob--1`, `.blob--2` | `opacity: .15` |
| `.blob--3` | `background: #1e1630; opacity: .18` |
| `.pill--reading` | `background: rgba(74,64,128,.18); color: #b0a4d4` |
| `.pill--finished` | `background: rgba(61,184,120,.15); color: #6ee7a0` |
| `.pill--wishlist` | `background: rgba(191,155,90,.15); color: #e0c080` |
| `.stat-card__icon--progress` | `background: rgba(74,64,128,.18); color: #b0a4d4` |
| `.streak-card__icon` | `background: rgba(191,155,90,.15)` |
| `.challenge-card__icon--streak` | `background: rgba(191,155,90,.15)` |
| Top book rank (1st / 2nd / 3rd) | Gold / silver / bronze tinted backgrounds |
| `.modal-overlay` | `background: rgba(0,0,0,.55)` |
| `.navbar.is-open` links/actions | `background: var(--c-surface)` |

---

## 3. Component Patterns

### 3.1 Navbar (`.navbar`)
- Sticky top, `backdrop-filter: blur(14px)`, frosted-glass via `--header-bg`
- Bottom border `--header-border`, shadow `--header-shadow`
- Inner: `display:flex`, brand left, links center, theme `<select>` + CTA right
- Link underline on hover via `::after` pseudo-element with gradient
- Mobile: links/actions hidden, `.navbar__toggle` shown; toggling adds `.is-open` class

### 3.2 Buttons (`.btn`)
| Modifier | Style |
|----------|-------|
| `.btn--primary` | Gradient background, white text, tinted shadow |
| `.btn--outline` | Transparent, border, turns primary on hover |
| `.btn--ghost` | No background, subtle hover |
| `.btn--ghost-danger` | Ghost variant with danger color (used by "Изчисти данните") |
| `.btn--danger` | Red background, white text |
| `.btn--icon` | 36×36px square, centered SVG |
| `.btn--pill` | `border-radius: 9999px` |
| `.btn--lg` | Taller padding, larger font |
| `.btn--sm` | Compact padding |
| `.btn--full` | `width: 100%` |

Hover: `translateY(-1px)` + increased shadow. Active: `translateY(0)`.

### 3.3 Pills / Badges (`.pill`)
| Modifier | Background | Color | Used for |
|----------|-----------|-------|----------|
| `.pill--accent` | accent-light | accent-hover | Hero pill label (sparkle icon) |
| `.pill--primary` | primary-light | primary-dark | General |
| `.pill--reading` | `rgba(74,64,128,.08)` | `#4a4080` | "Чета" status |
| `.pill--finished` | `#e8f5ec` | `#2a9a60` | "Прочетена" status |
| `.pill--wishlist` | `rgba(191,155,90,.10)` | `#a07830` | "За четене" status |

### 3.4 Stat Card (`.stat-card`)
- White surface, `--r-xl` radius, left gradient accent stripe (4px `::before`)
- Icon container: 48×48px rounded square with tinted background
- Variants: default (indigo), `--pages` (gold accent), `--progress` (indigo-tinted)

### 3.5 Book Card (`.book-card`)
- Structure: `.book-card__top` (6px gradient stripe) → `.book-card__body`
- Body contains: `__header` (title + author + status pill), `__progress` (input + bar + pct), `__notes` (with `max-height:110px; overflow-y:auto`), `__footer` (edit + delete icon buttons)
- Cards stretch to equal height via `.books-grid { align-items: stretch }`
- Hover: lift 4px, tinted shadow

### 3.6 Progress Bar (`.progress-bar` + `.progress-fill`)
- Track: 8px height, subtle bg, pill radius
- Fill: gradient, smooth width transition

### 3.7 Goal & Streak Row (`.goal-streak-row`)
- Two side-by-side cards: goal card (`.goal-card`) + streak card (`.streak-card`)
- Goal card contains a `.goal-progress-bar` + `.goal-fill` + percentage text
- Streak card contains a flame icon + streak count

### 3.8 Top Books (`.top-books-section`)
- Heading "Топ 5 най-четени книги"
- List of `.top-book-item` elements, each with `.top-book-item__rank` (1–5), title, author, pages text
- Rank badges: gold (1st), silver (2nd), bronze (3rd), neutral (4th–5th)

### 3.9 Challenges (`.challenges-section`)
- Grid of `.challenge-card` elements
- Each card: icon, title, description, progress bar, progress text
- Icons variant: `--streak` uses gold accent

### 3.10 Activity Feed (`.activity-feed`)
- Heading "Последна активност"
- List of `.activity-item` elements with icon, text, time, and pill status

### 3.11 Modals (`.modal-overlay` + `.modal`)
- Full-screen semi-transparent overlay
- Centered modal card with heading, close button, form fields, action buttons
- Two modals: Log Reading (`#logModal`) and Settings (`#settingsModal`)

### 3.12 Toast (`.toast`)
- Fixed bottom-center notification
- Slides in via CSS transition, auto-dismissed by JS

### 3.13 Auth / Form Card (`.auth-card`)
- Max-width 560px, centered, `--r-2xl` radius, `--sh-lg` shadow
- Top gradient stripe (5px)
- Icon + title + subtitle header, then form fields
- Input with icon (`.input-icon-wrap`) — SVG icon left, input padded

### 3.14 Empty State (`.empty-state`)
- Centered, dashed border, emoji icon, title, subtitle, CTA button
- Spans full grid width via `grid-column: 1 / -1`

### 3.15 Footer (`.footer`)
- Centered copyright text + `.footer__actions` row with two buttons
- "Зареди демо данни" (ghost) + "Изчисти данните" (ghost-danger)
- Top border separator `1px solid var(--c-border-light)`

---

## 4. Responsive Rules

### Mobile (≤ 640px)
- Navbar: links/actions hidden, hamburger toggle shown
- Hero: single column, centered text
- Feature/Stats/Books grids: 1 column
- Goal/streak row: stacks to 1 column
- Form row: single column
- Buttons in hero CTA: full width

### Tablet (641px – 1023px)
- Hero: 2-column grid
- Books: 2-column grid
- Stats/Features: auto-fit (typically 2–3 columns)

### Desktop (≥ 1024px)
- Books: 3-column grid
- Full hero layout

### Wide (≥ 1280px)
- Wider padding adjustments

### Large Desktop (≥ 1440px)
- Container max-width increases to 1200px
- Wider padding

### XL (≥ 1920px)
- Maximum container scale

---

## 5. Accessibility

- `:focus-visible` outline on all interactive elements (2px primary, 2px offset)
- `prefers-reduced-motion: reduce` — disables all transitions/animations
- `prefers-contrast: high` — stronger borders, heavier shadows, 3px focus outlines
- All buttons have descriptive `aria-label`
- Progress bars have `role="progressbar"` + aria attributes
- Min touch target: 42–44px
- Color contrast: text meets WCAG AA against surface backgrounds

---

## 6. Do's & Don'ts

### ✅ Do
- Use the token system — never hardcode hex colors
- Use BEM-ish naming for new classes
- Keep gradients consistent (indigo → gold, 135deg)
- Test at all breakpoints before merging
- Update dark-theme overrides when adding new tinted components

### ❌ Don't
- Add `!important` (exception: prefers-reduced-motion reset)
- Mix old class names (`.btn-primary`) with new (`.btn--primary`)
- Add large icon libraries (use inline SVG)
- Exceed 1 column at ≤ 640px for major grids
- Reference "teal" or `#36A9AE` — the palette is indigo + gold

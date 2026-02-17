# UI_STYLE.md — BookBuddy Design System

> Practical reference for every design token, component pattern, and responsive rule.  
> Keep this in sync whenever `styles/style.css` changes.

---

## 1. Design Tokens (CSS Custom Properties)

### 1.1 Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--c-primary` | `#36A9AE` | Primary actions, links, progress bars |
| `--c-primary-hover` | `#2E9499` | Primary hover |
| `--c-primary-light` | `#e6f7f7` | Light backgrounds, icon containers |
| `--c-primary-dark` | `#1b6e72` | Dark primary text on light bg |
| `--c-accent` | `#3BB6BB` | Gradient endpoint, secondary emphasis |
| `--c-accent-hover` | `#2FA4A9` | Accent hover |
| `--c-accent-light` | `#e0f5f5` | Accent pill backgrounds |
| `--c-danger` | `#ef4444` | Delete actions |
| `--c-danger-hover` | `#dc2626` | Delete hover |
| `--c-success` | `#22c55e` | Success states |

#### Neutrals
| Token | Value | Usage |
|-------|-------|-------|
| `--c-text` | `#0f172a` | Primary body text |
| `--c-text-secondary` | `#475569` | Subtitles, descriptions |
| `--c-text-muted` | `#94a3b8` | Placeholder, hint text |
| `--c-text-light` | `#cbd5e1` | Input placeholders |
| `--c-bg` | `#f8fafc` | Body background |
| `--c-surface` | `#ffffff` | Card/modal surfaces |
| `--c-subtle` | `#f1f5f9` | Subtle backgrounds |
| `--c-border` | `#e2e8f0` | Standard borders |
| `--c-border-light` | `rgba(226,232,240,.55)` | Softer borders on cards |

#### Gradients
| Token | Value | Usage |
|-------|-------|-------|
| `--grad-primary` | `linear-gradient(135deg, #36A9AE 0%, #3BB6BB 100%)` | Buttons, progress bars, top stripes |
| `--grad-hero` | `linear-gradient(135deg, #36A9AE, #3BB6BB 60%, #7dc4c7)` | Hero card |
| `--grad-text` | Same as primary | Gradient text effect |

### 1.2 Spacing Scale

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

### 1.3 Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--r-sm` | 6px | Small elements, inline inputs |
| `--r-md` | 10px | Icon buttons |
| `--r-lg` | 14px | Standard buttons, inputs, feature cards |
| `--r-xl` | 16px | Stat cards, book cards |
| `--r-2xl` | 20px | Auth card, hero card, empty state |
| `--r-full` | 9999px | Pills, pill buttons |

### 1.4 Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--sh-xs` | `0 1px 2px rgba(0,0,0,.04)` | Minimal elevation |
| `--sh-sm` | `0 4px 12px rgba(0,0,0,.05)` | Cards at rest |
| `--sh-md` | `0 6px 16px rgba(0,0,0,.06)` | Dropdowns |
| `--sh-lg` | `0 10px 30px rgba(0,0,0,.06)` | Auth card |
| `--sh-xl` | `0 16px 48px rgba(0,0,0,.08)` | Hero card |
| `--sh-card-hover` | `0 14px 36px rgba(54,169,174,.14)` | Card hover (teal-tinted) |

### 1.5 Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font` | `'Inter', system stack` | All text |
| `--fs-xs` → `--fs-5xl` | 12px → 52px | See full scale in CSS |
| `--fw-normal` | 400 | Body text |
| `--fw-medium` | 500 | Links, subtle labels |
| `--fw-semibold` | 600 | Labels, buttons, card titles |
| `--fw-bold` | 700 | Headings, stat values |
| `--fw-extrabold` | 800 | Hero headline |

---

## 2. Component Patterns

### 2.1 Navbar (`.navbar`)
- Sticky top, `backdrop-filter: blur(14px)`, semi-transparent white
- Inner: `display:flex`, brand left, links center, CTA right
- Link underline on hover via `::after` pseudo-element with gradient
- Mobile: links/actions hidden, `.navbar__toggle` shown; toggling adds `.is-open` class

### 2.2 Buttons (`.btn`)
| Modifier | Style |
|----------|-------|
| `.btn--primary` | Gradient background, white text, tinted shadow |
| `.btn--outline` | Transparent, border, turns primary on hover |
| `.btn--ghost` | No background, subtle hover |
| `.btn--danger` | Red background, white text |
| `.btn--icon` | 36×36px square, centered SVG |
| `.btn--pill` | `border-radius: 9999px` |
| `.btn--lg` | Taller padding, larger font |
| `.btn--sm` | Compact padding |
| `.btn--full` | `width: 100%` |

Hover: `translateY(-1px)` + increased shadow. Active: `translateY(0)`.

### 2.3 Pills / Badges (`.pill`)
| Modifier | Background | Color | Used for |
|----------|-----------|-------|----------|
| `.pill--accent` | teal-50 | teal-600 | Hero pill label (with sparkle icon) |
| `.pill--primary` | teal-light | teal-800 | General |
| `.pill--reading` | blue-100 | blue-700 | "Чета" status |
| `.pill--finished` | green-100 | green-700 | "Прочетена" status |
| `.pill--wishlist` | amber-100 | amber-700 | "За четене" status |

> The hero pill has `align-self:flex-start` so it stays compact (never stretches full width).

### 2.4 Stat Card (`.stat-card`)
- White surface, 16px radius, left gradient accent stripe (4px)
- Icon container: 48×48px rounded square with tinted background
- Variants: default (teal), `--pages` (teal accent), `--progress` (violet)

### 2.5 Book Card (`.book-card`)
- Structure: `.book-card__top` (6px gradient stripe) → `.book-card__body`
- Body contains: `__header` (title + author + status pill), `__progress` (input + bar + pct), optional `__notes`, `__footer` (action icons)
- Hover: lift 4px, tinted shadow
- Delete: icon-only button with danger-hover color

### 2.6 Progress Bar (`.progress-bar` + `.progress-fill`)
- Track: 8px height, subtle bg, pill radius
- Fill: gradient, smooth width transition

### 2.7 Auth / Form Card (`.auth-card`)
- Max-width 560px, centered, 24px radius, large shadow
- Top gradient stripe (5px)
- Icon + title + subtitle header, then form fields

### 2.8 Input with Icon (`.input-icon-wrap`)
- Relative wrapper, SVG icon absolutely positioned left 12px
- Input gets `padding-left: 40px`
- Icon turns primary on `focus-within`

### 2.9 Empty State (`.empty-state`)
- Centered, dashed border, emoji icon, title, subtitle, CTA button
- Spans full grid width via `grid-column: 1 / -1`

---

## 3. Responsive Rules

### Mobile (≤ 640px)
- Navbar: links/actions hidden, hamburger toggle shown
- Hero: single column, centered text
- Feature/Stats/Books grids: 1 column
- Form row: single column
- Buttons in hero CTA: full width

### Tablet (641–1023px)
- Hero: 2-column grid
- Books: 2-column grid
- Stats/Features: auto-fit (typically 2–3 columns)

### Desktop (≥ 1024px)
- Books: 3-column grid
- Full hero layout

### Large Desktop (≥ 1440px)
- Container max-width increases to 1200px
- Wider padding

---

## 4. Accessibility

- `:focus-visible` outline on all interactive elements (2px primary, 2px offset)
- `prefers-reduced-motion: reduce` — disables all transitions/animations
- `prefers-contrast: high` — stronger borders, heavier shadows, 3px focus outlines
- All buttons have descriptive `aria-label`
- Progress bars have `role="progressbar"` + aria attributes
- Min touch target: 42–44px
- Color contrast: text meets WCAG AA against surface backgrounds

---

## 5. Do's & Don'ts

### ✅ Do
- Use the token system — never hardcode hex colors
- Use BEM-ish naming for new classes
- Keep gradients consistent (primary → accent, 135deg)
- Test at all breakpoints before merging

### ❌ Don't
- Add `!important` (exception: prefers-reduced-motion reset)
- Mix old class names (`.btn-primary`) with new (`.btn--primary`)
- Add large icon libraries (use inline SVG)
- Exceed 1 column at ≤ 640px for major grids

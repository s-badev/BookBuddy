# AI_CONTEXT.md — BookBuddy Project Overview

> **Single source of truth** for any human or AI working on this codebase.

---

## 1. What is BookBuddy?

BookBuddy is a **vanilla HTML / CSS / JS** reading tracker that runs entirely in the browser.  
Users add books, update their reading progress page-by-page, take notes, and view aggregate stats.  
Data is stored in **localStorage** (`bookbuddy_books` key).

**No frameworks, no build tools, no backend.**

---

## 2. Pages & Purpose

| File | URL (relative) | Purpose |
|------|----------------|---------|
| `index.html` | `/` | Landing + dashboard — hero section, "Why choose" feature cards, stat cards, book grid |
| `form.html` | `/form.html` | "Add new book" form page (auth-card style) |

Both pages share the same `<nav class="navbar">` and `<footer class="footer">`.  
Both pages load **Inter** via Google Fonts `<link>` in `<head>`.

---

## 3. File Map

```
readme-ai-project/
├── index.html                  # Main page (landing + dashboard)
├── form.html                   # Add-book form page
├── styles/
│   └── style.css               # ALL styles — design tokens + components + responsive
├── src/
│   ├── main.js                 # Index page logic: displayBooks(), createBookCard(), updateStats()
│   ├── form.js                 # Form page logic: submit, char counter, page cap, navbar toggle
│   ├── services/
│   │   └── bookRepo.js         # localStorage CRUD (BookRepo object)
│   └── utils/
│       └── validate.js         # Form validation (Validate object)
└── docs/
    ├── AI_CONTEXT.md           # ← this file
    ├── UI_STYLE.md             # Design tokens & component patterns
    └── UI_REFERENCE.md         # Visual-reference mapping & text replacements
```

---

## 4. Data Model

Stored in `localStorage` under key **`bookbuddy_books`** as a JSON array.

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

---

## 5. Naming Conventions

| Layer | Convention | Examples |
|-------|-----------|----------|
| CSS class (BEM-ish) | `block__element--modifier` | `.book-card__title`, `.btn--primary`, `.stat-card__icon--pages` |
| CSS variable prefixes | `--c-` color, `--sp-` spacing, `--r-` radius, `--sh-` shadow, `--fs-` font-size, `--fw-` font-weight | `--c-primary`, `--sp-6`, `--r-xl` |
| JS IDs (hooked by JS) | camelCase or kebab-case | `booksList`, `bookForm`, `statBooks`, `progress-{id}`, `delete-{id}` |
| JS globals | PascalCase objects | `BookRepo`, `Validate` |

---

## 6. Critical JS-Hooked IDs — DO NOT RENAME

These IDs are referenced in JavaScript. Changing them **will break** the app:

### index.html (read by `main.js`)
| ID | Used for |
|----|----------|
| `#booksList` | Container for dynamically rendered book cards |
| `#statBooks` | Total-books stat value |
| `#statPagesRead` | Pages-read stat value |
| `#statAvgProgress` | Average-progress stat value |
| `#heroPagesRead` | Hero card big number |
| `#progress-{id}` | Per-book page input (generated per book) |
| `#delete-{id}` | Per-book delete button (generated per book) |

### form.html (read by `form.js`)
| ID | Used for |
|----|----------|
| `#bookForm` | The `<form>` element |
| `#title` | Book title input |
| `#author` | Author input |
| `#totalPages` | Total pages input |
| `#currentPage` | Current page input |
| `#notes` | Notes textarea |
| `#charCount` | Character counter display |

### CSS classes used by JS
| Class | Used for |
|-------|----------|
| `.navbar` | Navbar toggle (`.is-open` toggled by JS) |
| `.navbar__toggle` | Hamburger button click target |

---

## 7. CSS Architecture

- **One file**: `styles/style.css`
- **No preprocessor, no Tailwind, no Bootstrap**
- **Section order**: Tokens → Reset → Utilities → Background blobs → Navbar → Buttons → Pills/Badges → Hero → Features → Stats → Books section → Book Card → Empty State → Form/Auth Card → Footer → Responsive → Accessibility → Print

### Breakpoints
| Name | Query | Grid columns |
|------|-------|--------------|
| Mobile | `max-width: 640px` | 1 column |
| Tablet | `641px – 1023px` | 2 columns |
| Desktop | `≥ 1024px` | 3 columns |
| Large | `≥ 1440px` | 3 columns, wider container |

---

## 8. Rules of Engagement

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
- Removing or renaming JS-hooked IDs (Section 6)
- Adding new product features (new pages, new data fields, API calls)

---

## 9. Language & Branding

- **Product name in UI**: BookBuddy (never "ReadMe")
- **UI language**: Bulgarian (headings, labels, buttons, placeholders, alerts)
- **Code comments**: English
- **Primary color**: Teal `#36A9AE` (not sky-blue)
- **Font**: Inter via Google Fonts CDN

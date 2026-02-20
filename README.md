# BookBuddy

BookBuddy е модерно, минималистично уеб приложение за организиране на лична библиотека и проследяване на прогреса при четене. Работи изцяло в браузъра с **Vanilla HTML/CSS/JavaScript** и **localStorage** (без backend, без база данни, без библиотеки).

Проектът е създаден с фокус върху:
- бърза работа
- чист UI
- офлайн използване
- стабилна localStorage архитектура
- лесно надграждане без усложняване

---

## Key Differentiators

| Capability | Description |
|---|---|
| Local-First App | Всички данни се пазят в localStorage (без backend, без login) |
| Reading Progress Tracking | Следене на книги, прогрес, логове и прочетени страници |
| Habit Builder | Седмични цели + streak логика за изграждане на навик |
| Activity Feed | “Последна активност” с dedup защита и cascade delete на orphan logs |
| Clean UX | Модерен интерфейс, theme switcher, responsive layout |
| Demo-Ready | Бутони за demo data / clear data за бърз тест и представяне |

---

## Features

### 📚 Library (Books)
- ✅ Добавяне на книга (заглавие, автор, общо страници, текуща страница, бележки)
- ✅ Редакция на книга
- ✅ Изтриване на книга
- ✅ Прогрес бар + процент
- ✅ Inline update на текуща страница от картата
- ✅ Търсене по заглавие/автор
- ✅ Филтриране
- ✅ Сортиране

### 📝 Reading Logs + Last Activity
- ✅ Логвай четене
- ✅ Последна активност
- ✅ Изтриване на лог
- ✅ Редакция на лог (ако е активирана в текущата UI логика)
- ✅ Логовете се пазят в localStorage
- ✅ Dedup логика:
  - по `id` (при четене)
  - content-based duplicate guard при запис (book + date + pages + note)
- ✅ Cascade delete на логове при изтриване на книга

### 📊 Statistics
- ✅ Брой книги
- ✅ Общо прочетени страници (изчислено от `books.currentPage`)
- ✅ Среден прогрес %
- ✅ Авто-обновяване след add/edit/delete/log
- ✅ Hero stat (прочетени страници)

> Забележка: в текущата версия статистиките се изчисляват основно от `books` state (`currentPage`), а не директно от логовете.

### 🎯 Weekly Goals + Streak
- ✅ Седмична цел (pages/week)
- ✅ Прогрес бар за целта
- ✅ Daily streak (последователни дни с минимум X страници)
- ✅ Настройки (weekly goal + min pages/day) с modal + persist

### 🏆 Top 5 Most-Read Books
- ✅ Топ книги по прочетени страници (нормализирани до `totalPages`)
- ✅ Empty state при липса на данни

### 🔥 Challenges
- ✅ Default seeded challenges:
  - `Седмичен спринт`
  - `Читателски streak`
- ✅ Прогрес + статус
- ✅ Persist в localStorage

### 🎨 Theme System
- ✅ Theme switcher: `System / Light / Dark`
- ✅ Работи на `index.html` и `form.html`
- ✅ Запомня избора в localStorage
- ✅ Поддържа system theme чрез `prefers-color-scheme`
- ✅ Dark mode чрез `data-theme="dark"`

### 🧭 UX Enhancements
- ✅ Feature cards са кликаеми
- ✅ Скрол към секции (`stats / books / activity`)
- ✅ Visual highlight на target секцията
- ✅ Sticky navbar
- ✅ Responsive mobile nav toggle

---

## Architecture Overview

### Application Style
BookBuddy е **localStorage-only** приложение с client-side логика.

- **No backend**
- **No database**
- **No authentication**
- **No external frameworks**

### Core Principles
- **Simple repository pattern** за localStorage (`BookRepo`, `LogRepo`, `SettingsRepo`, `ChallengeRepo`)
- **UI render from state** → компонентите се рендерират от localStorage данни
- **Predictable updates** → add/edit/delete/log triggers UI refresh
- **Theme persistence** → централизирано в `ThemeSwitcher`
- **Safe persistence** → defaults, guards, validation, dedup

---

## Architecture Diagram

BookBuddy follows a local-first, browser-only architecture.

```text
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER (CLIENT)                      │
├──────────────────────────────────────────────────────────────┤
│  index.html                                                  │
│  • Hero / Stats / Goals / Top 5 / Challenges / Library      │
│  • Last Activity / Modals (Log Reading, Goal Settings)      │
│                                                              │
│  form.html                                                   │
│  • Add / Edit Book Form                                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     JAVASCRIPT APPLICATION LAYER             │
├──────────────────────────────────────────────────────────────┤
│  main.js                                                     │
│  • UI rendering                                              │
│  • Events / filters / sorting / modals                       │
│  • Stats / top 5 / challenges / activity updates             │
│                                                              │
│  form.js                                                     │
│  • Add/Edit form logic                                       │
│  • Validation + save flow                                    │
│                                                              │
│  theme.js                                                    │
│  • System / Light / Dark theme handling                      │
│                                                              │
│  validate.js                                                 │
│  • Input validation guards                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      REPOSITORY LAYER (localStorage)         │
├──────────────────────────────────────────────────────────────┤
│  bookRepo.js       → bookbuddy_books                         │
│  logRepo.js        → bookbuddy_logs                          │
│  settingsRepo.js   → bookbuddy_settings                      │
│  challengeRepo.js  → bookbuddy_challenges                    │
│  theme.js          → bookbuddy_theme                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                         DATA PERSISTENCE                     │
├──────────────────────────────────────────────────────────────┤
│  localStorage                                                │
│  • Books                                                     │
│  • Reading Logs                                              │
│  • Goal / Streak Settings                                    │
│  • Challenges                                                │
│  • Theme Preference                                          │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow (Example: Log Reading)

```text
User clicks "Логвай четене"
        │
        ▼
Open Log Modal (main.js)
        │
        ▼
Validate input (pages, date, note)
        │
        ▼
Save log via LogRepo
        │
        ├── Dedup guard
        └── localStorage: bookbuddy_logs
        │
        ▼
Update related book progress (BookRepo)
        │
        ▼
Re-render UI sections
  • Stats
  • Weekly Goal
  • Streak
  • Top 5
  • Last Activity
  • Book Cards
```

### Notes
- `LogRepo` пази reading logs и прилага dedup защита.
- `BookRepo` обновява `currentPage` (capped до `totalPages`).
- UI се ререндерира след всяка промяна, за да останат секциите синхронизирани.

---

## localStorage Keys (Actual)

| Key | Purpose |
|---|---|
| `bookbuddy_books` | Списък с книги |
| `bookbuddy_logs` | Reading logs за Activity Feed / streak / log history |
| `bookbuddy_settings` | Weekly goal + streak settings |
| `bookbuddy_challenges` | Challenges (seeded defaults + progress) |
| `bookbuddy_theme` | Theme preference (`system`, `light`, `dark`) |

---

## Data Model (Simplified)

### Book
```json
{
  "id": 1739980000000,
  "title": "1984",
  "author": "George Orwell",
  "totalPages": 328,
  "currentPage": 120,
  "notes": "Мрачна антиутопия...",
  "createdAt": "2026-02-20T10:00:00.000Z"
}
```

### Reading Log
```json
{
  "id": "1739981111111",
  "bookId": "1739980000000",
  "dateISO": "2026-02-20",
  "pages": 25,
  "note": "Глава 5",
  "createdAt": 1739981111111
}
```

### Settings
```json
{
  "weeklyGoalPages": 100,
  "minPagesForStreakDay": 1
}
```

### Challenge
```json
{
  "id": "weekly_sprint",
  "type": "weekly_pages",
  "title": "Седмичен спринт",
  "description": "Прочети 100 страници тази седмица",
  "target": 100,
  "createdAt": 1739980000000,
  "active": true
}
```

---

## UI / UX Principles

### Visual Style
- **Modern SaaS dashboard** визия
- **Indigo + gold** color system
- Меки градиенти, rounded cards, subtle shadows
- Чист typography scale с `Inter`

### Theming
- `System` → следва OS preference
- `Light` / `Dark` → принудително чрез `data-theme`
- CSS variables за tokens (`--c-primary`, `--c-accent`, `--c-bg`, `--c-surface` и др.)

### Progressive Disclosure
- Основни действия са видими веднага
- Secondary действия са в modals (логване, настройки)
- Empty states показват следваща стъпка

### Feedback & State
- Прогрес барове
- Status pills (`Чета`, `Прочетена`, `За четене`)
- Section highlight при scroll navigation
- Theme persistence между страниците

---

## Responsive Breakpoints

| Size | Width | Layout |
|---|---:|---|
| S (Phone) | `0–600px` | Single column, stacked cards |
| M (Tablet) | `601–1024px` | Two-column sections where possible |
| L (Desktop) | `1025–1440px` | Full dashboard layout |
| XL (Wide) | `1441px+` | Wider container / better whitespace usage |

---

## Project Structure

```bash
BookBuddy/
├── index.html
├── form.html
├── README.md
├── docs/
│   ├── AI_CONTEXT.md
│   ├── UI_REFERENCE.md
│   ├── UI_STYLE.md
│   └── screenshots/
├── styles/
│   └── style.css
└── src/
    ├── main.js
    ├── form.js
    ├── theme.js
    ├── validate.js
    ├── bookRepo.js
    ├── logRepo.js
    ├── settingsRepo.js
    └── challengeRepo.js
```

---

## Стартиране (локално)
1) Клонирай репото:
```bash
git clone https://github.com/s-badev/BookBuddy.git
```

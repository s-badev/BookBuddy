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

### Home / Dashboard
![BookBuddy Dashboard](./docs/screenshots/dashboard.png)

### Library Section
![BookBuddy Library](./docs/screenshots/library.png)

### Last Activity
![BookBuddy Activity](./docs/screenshots/activity.png)

### Add/Edit Book Form
![BookBuddy Form](./docs/screenshots/form.png)

### Goals / Settings Modal
![BookBuddy Goals Modal](./docs/screenshots/goals-modal.png)

### Log Reading Modal
![BookBuddy Log Modal](./docs/screenshots/log-modal.png)

</details>

---

## Features

### 📚 Library (Books)
- ✅ Добавяне на книга (заглавие, автор, общо страници, текуща страница, бележки)
- ✅ Редакция на книга (`form.html?id=...`)
- ✅ Изтриване на книга
- ✅ Прогрес бар + процент (capped до `totalPages`)
- ✅ Inline update на текуща страница от картата
- ✅ Търсене по заглавие/автор (case-insensitive)
- ✅ Филтриране: `All / Reading / Finished / Wishlist`
- ✅ Сортиране: `Updated recently / Progress % / Title A–Z`

### 📝 Reading Logs + Last Activity
- ✅ “Логвай четене” (modal)
- ✅ “Последна активност” (activity feed)
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

## localStorage Keys (Actual)

| Key | Purpose |
|---|---|
| `bookbuddy_books` | Списък с книги |
| `bookbuddy_logs` | Reading logs за Activity Feed / streak / log history |
| `bookbuddy_settings` | Weekly goal + streak settings |
| `bookbuddy_challenges` | Challenges (seeded defaults + progress) |
| `bookbuddy_theme` | Theme preference (`system`, `light`, `dark`) |

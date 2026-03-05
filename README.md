# BookBuddy 📚

BookBuddy е модерно, минималистично уеб приложение за организиране на лична библиотека и проследяване на прогреса при четене. Работи изцяло в браузъра с **Vanilla HTML/CSS/JavaScript** и **localStorage** (**без backend**, **без база данни**, **без регистрации**).

---

## 🌐 Live Demo
**https://bookbuddy-bg.netlify.app/**

> ℹ️ Данните се пазят локално в твоя браузър (localStorage). Ако отвориш в друг браузър/устройство или изчистиш storage-а, започваш отначало.

---

## 📋 Project Description
BookBuddy помага да:
- добавяш и управляваш книги (CRUD)
- следиш прогреса (страници + %)
- логваш четене (reading logs)
- виждаш “Последна активност”
- поддържаш навик с weekly goals + streak
- работиш офлайн, без акаунти и без синхронизация

---

## 🧰 Tech Stack
- **Frontend:** Vanilla HTML / CSS / JavaScript
- **Persistence:** localStorage (local-first)
- **Deployment:** Netlify (static site)

---

## ✅ Key Differentiators

| Capability | Description |
|---|---|
| **Local-First App** | Всички данни се пазят в `localStorage` (без backend, без login) |
| **Reading Progress Tracking** | Прогрес по книга + прогрес бар + % |
| **Habit Builder** | Седмични цели + streak логика за навик |
| **Activity Feed** | “Последна активност” с dedup защита и стабилен render |
| **Clean UX** | Модерен UI, responsive layout, theme switcher |
| **Demo-Ready** | Demo data + clear data за бърз тест и презентация |

---

## ✨ Features

### 📚 Library (Books)
- ✅ Добавяне на книга: заглавие, автор, общо страници, текуща страница, бележки
- ✅ Редакция на книга
- ✅ Изтриване на книга
- ✅ Прогрес бар + процент (никога над `totalPages`)
- ✅ Inline update на текуща страница директно от картата
- ✅ Търсене по заглавие/автор (case-insensitive)
- ✅ Филтър: All / Reading / Finished
- ✅ Сортиране: Updated recently / Progress % / Title A–Z

### 📝 Reading Logs + Last Activity
- ✅ “Логвай четене” (modal)
- ✅ “Последна активност” (activity feed) с изтриване на лог
- ✅ Логовете се пазят в `localStorage` и остават след refresh
- ✅ Dedup логика:
  - dedup по `id` при четене
  - content-based duplicate guard при запис (`book + date + pages + note`)
- ✅ Cascade delete: при изтриване на книга → изтриване на логове за нея (без orphan logs)

### 📊 Statistics
- ✅ Брой книги
- ✅ Общо прочетени страници (изчислено от `books.currentPage`)
- ✅ Среден прогрес %
- ✅ Авто-обновяване след add/edit/delete/log

> Забележка: в текущата версия статистиките се изчисляват основно от `books.currentPage`, а не директно от логовете.

### 🎯 Weekly Goals + Streak
- ✅ Седмична цел (pages/week) + прогрес бар
- ✅ Daily streak (последователни дни с минимум X страници)
- ✅ Настройки (weekly goal + min pages/day) с modal + persist

### 🏆 Top 5 Most-Read Books
- ✅ Топ 5 по прочетени страници (нормализирани до `totalPages`)
- ✅ Empty state при липса на данни

### 🔥 Challenges
- ✅ Seeded challenges:
  - `Седмичен спринт`
  - `Читателски streak`
- ✅ Прогрес + статус (Active / Completed)
- ✅ Persist в localStorage

### 🎨 Theme System
- ✅ Theme switcher: `System / Light / Dark`
- ✅ Работи на `index.html` и `form.html`
- ✅ Запомня избора в `localStorage`
- ✅ System theme чрез `prefers-color-scheme`
- ✅ Dark mode чрез `data-theme="dark"` + CSS variables

### 🧭 UX Enhancements
- ✅ Feature cards са кликаеми → scroll към секции (`stats / books / activity`) + highlight
- ✅ Sticky navbar
- ✅ Responsive mobile nav toggle

---

## 🧩 Problems Solved (важни фиксове)

### 1) Дублиране в “Последна активност”
**Проблем:** записи се визуализираха два пъти  
**Решение:**
- единствен source of truth (`readingLogs`)
- clear контейнер преди render
- dedup логика
- demo data да не се инжектира два пъти

### 2) Празни бележки (UI “дупки”)
**Проблем:** ако няма мнение → UI изглежда “счупен”  
**Решение:** fallback текстове:
- “1984” → “Мрачна антиутопия за властта и контрола над съзнанието.”
- “Стив Джобс” → “История за визия, амбиция и създаване на революционни продукти.”
- други → “Няма добавено мнение.”

### 3) Demo Data (без бъгове)
- “Load demo data” не дублира записи
- зарежда само при нужда
- не чупи логиката на activity feed

---

## 🚦 Quick Smoke Test (≈ 60 сек)
1) Отвори Live Demo: https://bookbuddy-bg.netlify.app/  
2) Натисни **Load demo data** (ако е налично) или добави нова книга.  
3) Обнови `currentPage` (inline update) → провери прогреса.  
4) Логни четене → провери “Последна активност”.  
5) Превключи тема: System → Dark → Light → refresh → да се запази.  
6) Изтрий книга → увери се, че логовете за нея изчезват (cascade).

---

## 🏗️ Architecture Overview

### Application Style
BookBuddy е **localStorage-only** приложение с client-side логика:
- Без backend
- Без база данни
- Без акаунти
- Offline-first

### Core Principles
- **Repository pattern** за `localStorage` (`BookRepo`, `LogRepo`, `SettingsRepo`, `ChallengeRepo`)
- **UI render from state** → рендер от данните
- **Predictable updates** → add/edit/delete/log triggers UI refresh
- **Theme persistence** → централизирано в `ThemeSwitcher`
- **Safe persistence** → defaults, guards, validation, dedup

---

## 🧱 Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER (CLIENT)                      │
├──────────────────────────────────────────────────────────────┤
│  index.html                                                  │
│  • Hero / Stats / Goals / Top 5 / Challenges / Library       │
│  • Last Activity / Modals (Log Reading, Goal Settings)       │
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
│  • UI rendering / events / filters / sorting / modals         │
│  • Stats / top 5 / challenges / activity updates              │
│                                                              │
│  form.js                                                     │
│  • Add/Edit form logic + validation                           │
│                                                              │
│  theme.js                                                    │
│  • System / Light / Dark theme handling                       │
│                                                              │
│  validate.js                                                 │
│  • Input validation guards                                    │
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

---

## 🔁 Data Flow (Example: Log Reading)

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

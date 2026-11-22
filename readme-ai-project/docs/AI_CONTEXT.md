# BookBuddy — Технически контекст и архитектура (`AI_CONTEXT.md`)

Този документ описва реалната архитектура, структурата на файловете, ключовете за съхранение и потоците от данни в текущата версия на **BookBuddy** (`readme-ai-project/`).

---

## 1. Общ преглед и технологичен стек

- **Архитектура**: Многостранично клиентско уеб приложение (2 HTML входни точки: `index.html` и `form.html`), изпълнявано директно в браузъра без bundler (няма Vite/Webpack) и без CSS/JS фреймуърк (няма Bootstrap/React).
- **Модулност**: Скриптовете се зареждат чрез стандартни `<script>` тагове в строго определен ред. Статистическият модул `src/stats.js` експортира функциите си едновременно в `globalThis.JournalStats` (за браузъра) и като ES module `export default` (за unit тестовете в Node.js чрез `tests/stats.test.mjs`).
- **Офлайн поддръжка**: `src/utils/appStorage.js` регистрира Service Worker (`sw.js`, кеш `bookbuddy-v2`), който кешира всички HTML, CSS, JS файлове и `favicon.svg` чрез стратегия network-first с кеш fallback за навигация и cache-first за статични активи.

---

## 2. Слой за данни и изолация на демо режима

### `src/utils/appStorage.js`
- Проверява URL параметъра `?demo=1` (`new URLSearchParams(window.location.search).get('demo') === '1'`).
- Дефинира глобалните константи:
  - `isDemo` (`boolean`)
  - `appStorage` (`sessionStorage` при `isDemo === true`, иначе `localStorage`)
  - `appPage(page)` — помощна функция, която запазва `?demo=1` при навигация между `index.html` и `form.html`.
- При `isDemo === true` показва лентата `#demoNotice` и пренаписва вътрешните връзки към `index.html` и `form.html`, така че демо сесията да остане напълно изолирана от личната библиотека.

### Ключове в `appStorage` (`localStorage` / `sessionStorage`)

| Ключ | Репозиториум / Модул | Описание и схема на записа |
| :--- | :--- | :--- |
| `bookbuddy_books` | `BookRepo` (`src/services/bookRepo.js`) | JSON масив от книги: `{ id: number, title: string, author: string, totalPages: number, currentPage: number, isbn?: string, notes: string, completion?: { logId: string, dateISO: string } \| null, createdAt: string }` |
| `bookbuddy_reading_logs` | `LogRepo` (`src/services/logRepo.js`) | JSON масив от читателски сесии: `{ id: string, bookId: string, dateISO: 'YYYY-MM-DD', pages: number, appliedPages?: number, note: string, createdAt: number }` |
| `bookbuddy_settings` | `SettingsRepo` (`src/services/settingsRepo.js`) | JSON обект с цели: `{ weeklyGoalPages: number (по подразбиране 100), minPagesForStreakDay: number (по подразбиране 1) }` |
| `bookbuddy_challenges` | `ChallengeRepo` (`src/services/challengeRepo.js`) | JSON масив от 2 предизвикателства: `weekly_100` (`type: 'weekly_pages'`, `target: 100`) и `streak_14` (`type: 'streak_days'`, `target: 14`) |
| `bookbuddy_theme` | `ThemeSwitcher` (`src/utils/theme.js`) | Избрана тема: `'light'`, `'dark'` или `'system'` |
| `bookbuddy_demo_initialized` | `initDemoButtons()` (`src/main.js`) | Флаг `'1'` в `sessionStorage`, указващ, че примерните 14 книги и 38 сесии вече са заредени за текущата демо сесия |

---

## 3. Основни модули и отговорности

### `src/main.js`
- Инициализира навигацията, диалозите (`#logModal`, `#detailsModal`, `#settingsModal`), лентата за търсене/филтриране/сортиране, демо бутоните и изобразяването на всички секции чрез `refreshAll()`.
- **Единен източник на истина за напредъка**:
  - Статусът на книга (`getBookStatus(book)`) се изчислява динамично от `currentPage` и `totalPages`:
    - `wishlist` („За четене“): `currentPage <= 0 || !totalPages`
    - `reading` („Чета“): `0 < currentPage < totalPages`
    - `finished` („Прочетена“): `currentPage >= totalPages`
  - Функцията `sessionEffect(book, previous, next)` гарантира, че добавянето, редактирането или изтриването на читателска сесия синхронизира `book.currentPage` и маркера за завършване `book.completion` без надвишаване на `totalPages`.
- **Форматиране на числа**: Всички страници и сборове се форматират чрез `formatNumberBG()` (`new Intl.NumberFormat('bg-BG', { useGrouping: 'always' })`), което гарантира разделител за хиляди с интервал (напр. `4 493`).
- **Тост известия (`showToast`)**: Използва HTML Popover API (`popover="manual"` върху `#toast`), така че известията винаги да влизат най-отгоре в Top Layer на браузъра и да остават видими дори над отворен модален `<dialog>`, без да прекъсват фокуса или затварянето с `Esc`.

### `src/shelf.js`
- Рендерира дървения шкаф (`.bookshelf`) с три отделения (`.shelf-bay`): `reading`, `wishlist`, `finished`.
- Изчислява ширината на всяко гръбче пропорционално на $\sqrt{\text{totalPages}}$ в диапазона `46–76 px`.
- Управлява roving `tabindex` и клавишните стрелки за придвижване между книгите и между рафтовете.
- Управлява диалога за бърз преглед на разгърната книга (`#shelfPreview`).

### `src/stats.js`
- Чисти функции за аналитиката в раздел „Дневник“:
  - `isValidDateISO(dateISO)` и `normalizeValidLogs(logs)`
  - `aggregatePagesByDay(logs)`
  - `calculateCurrentStreak(logs, minPages, todayISO)` и `calculateLongestStreak(logs, minPages, year)`
  - `calculateDailyReadingMetrics(logs, { year, todayISO })`
  - `calculateMonthlyBreakdown(logs, year)` и `findStrongestMonth(logs, year)`
  - `calculateAuthorBreakdown(logs, books, year)` и `findMostReadAuthor(logs, books, year)`
  - `buildYearCalendarMap(logs, year)` (генерира 365/366 дни с нива на интензитет `0..4` и начални колони на 12-те месеца)

### `src/issue.js`
- Генерира секцията „Годишен брой“ (`#issue`) за избраната година: страници от сесии, потвърдено завършени книги, най-дълга серия, най-четен автор, най-силен месец и списък на завършените книги (плюс `<details>` за прочетени книги без потвърдена дата от сесия).

### `src/motion.js`
- Чете CSS токените за време и криви (`--dur-fast`, `--dur-base`, `--dur-slow`, `--ease-out`) директно от `:root`.
- `setKineticText(element, text)`: разделя заглавието на думи и букви с последователен `--i` анимационен индекс; при `prefers-reduced-motion: reduce` или думи над 14 букви поставя чист текст без анимация.
- `setCountUp(element, value, format)`: плавно преброяване при първо появяване във видимата област чрез `IntersectionObserver`, запазвайки крайната ширина на числото (`minWidth`), за да не предизвиква layout shift (CLS).
- `playFinishStamp(host, variant)`: добавя временния печат „Прочетено“ при завършване на книга.

### `src/form.js` и `src/utils/validate.js`
- Управляват `form.html` в режим на добавяне или редактиране (`?id=<bookId>`).
- Валидират задължителните полета, целочислените граници (`0 <= currentPage <= totalPages`, `totalPages >= 1`), дължината на бележката (`<= 300` символа) и контролната сума за ISBN-10 (mod 11) и ISBN-13 (mod 10).

---

## 4. Планирани (нереализирани) функции

Следните функции не съществуват в кода и не трябва да се документират като налични:
- Потребителски профили и сървърна/облачна база данни.
- Google Books API интеграция (използва се единствено статичен URL за корици по ISBN от Open Library).
- Таймер за четене в реално време.

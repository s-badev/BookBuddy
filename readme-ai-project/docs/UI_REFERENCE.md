# BookBuddy — Справочник на екраните и UI компонентите (`UI_REFERENCE.md`)

Този документ описва реалната структура на DOM елементите, секциите и интерактивните компоненти в `index.html` и `form.html`.

---

## 1. Глобална обвивка и навигация (`index.html` и `form.html`)

- **Горна навигация (`header.navbar`)**:
  - `.navbar__brand`: лого с векторна отворена книга (`.navbar__mark`), надпис `BookBuddy` и поднадпис `Читалня` (`.navbar__sub`).
  - `nav.navbar__navigation`: връзки към `#home` („Начало“), `#books` („Библиотека“), `#journal` („Дневник“) и `#issue` (`#issueNavLabel`, „Брой 2026“).Активният раздел получава `aria-current="location"`.
  - `.navbar__actions`: бутон `a.navbar__add` („Добави книга“ → `form.html`) и бутон `#settingsBtn` („Настройки“, отваря `#settingsModal`). На `form.html` в `.navbar__actions` се намира и селекторът за тема `#themeSelect`.
- **Долна мобилна навигация (`nav.bottom-nav`)**:
  - Показва се при ширини `<= 725px` с 4 фиксирани връзки: „Начало“, „Библиотека“, „Дневник“, „Брой“ (`#issueMobileLink`).
- **Демо лента (`#demoNotice`)**:
  - Показва се само при `?demo=1` синхронно при зареждане и съдържа връзка `[data-personal-library]` за преход към личната библиотека.

---

## 2. Начало (`#home.home-content.reading-overview`)

- **Шапка (`.home-kicker`)**:
  - `#readingEyebrow` („В момента четеш“ / „Последно прочетена“ / „Следваща на рафта“ / „Първа страница“) и `#readingColophon` („Читалня нощем · <месец година>“).
- **Основна мрежа (`.home-grid`)**:
  - **Лява колона (`section.home-copy.reading-card`)**:
    - `#readingTitle`: голямо серифно заглавие с кинетично изписване по букви.
    - `#readingAuthor`: автор в курсив (или покана за добавяне на първа книга при празна библиотека).
    - `#readingProgress`: `#readingPages` (`112 от 296 стр.`), `#readingPercent` (`38%`) и `<progress id="readingMeter">`.
    - `.reading-card__actions`: бутон `#logReadingBtn` („Запиши четене“), бутон `#featuredDetailsBtn` („Разгърни книгата →“) и при празна библиотека `#firstBookLink` („Добави първата си книга“).
  - **Дясна колона (`.home-object`)**:
    - `.reading-card__art`: съдържа `#readingCover` (интерактивен 3D том `.volume` върху тъмна сцена `.hero-stage` с `.bookmark`, `.spine`, `.fore-edge`, `.bottom-edge` и `.book-cover`) или `#readingPlaceholder` при празна библиотека.
    - `section#weeklyGoal.goal-type.goal-card`: голямо серифно число `#goalPages` и `#goalTarget` (`/100`), тънка линия `<progress id="goalMeter">`, пояснение `#goalDetail` и ред `.streak` с `#homeStreakValue`.
- **Долен редакционен индекс (`.home-index.editorial-lists`)**:
  - `section#challenges`: списък `#challengesList` с предизвикателствата (`.challenge-item`).
  - `section#topBooks`: номериран списък `ol#topBooksThisWeek` с бутони `.rank-item[data-details-book]` за 5-те най-четени книги.
- **Колофон (`.press-foot`)**:
  - `BookBuddy · Читалня нощем` и `#pressFootDate` (`<месец година> · София`).

---

## 3. Моята библиотека (`section#books.books`)

- **Заглавна част (`.books__header`)**: `#library` („Моята библиотека“) и `#libraryCount` (`14 книги`).
- **Лента с инструменти (`#booksToolbar.books-toolbar`)**:
  - Поле за търсене `#bookSearch`
  - Филтър по статус `#bookFilter` (`all`, `reading`, `finished`, `wishlist`)
  - Сортиране `#bookSort` (`recent`, `progress`, `title`)
- **Дървен шкаф (`#booksList` → `.bookshelf`)**:
  - Три рафта (`.shelf-bay`), всеки с етикет `.shelf-label` и хоризонтален ред `.shelf-row[data-shelf-row]`.
  - Всяка книга е бутон `.shelf-spine#shelf-book-<id>` с ширина `--spine-w`, вертикално заглавие `.shelf-spine__title`, автор `.shelf-spine__author` и лента за напредък `.shelf-spine__progress`.

---

## 4. Дневник и статистическа обсерватория (`section#journal.journal`)

- **Мастхед (`.journal__mast`)**:
  - Кикър `Личен дневник · хроника и аналитика`, заглавие `#journalTitle` („Дневник“), колофон `#journalColophon` и бързи връзки `.journal__links` към четирите части на дневника.
- **Част I · Годишна карта на четенето (`.journal-map-col`)**:
  - Обобщени показатели `dl.stats__grid`: `#statBooks` („Книги“), `#statPagesRead` („Страници по книгите“), `#statAvgProgress` („Среден напредък“), `#statActiveDays` („Активни дни“).
  - Тъмна сцена `#journalYearMap.year-map-stage`: SVG календарна карта `.year-map__svg` по седмици и дни с 5 нива на интензитет (`.day-cell--0` до `.day-cell--4`), легенда `.year-map__legend` и таблица `.visually-hidden` по месеци за екранни четци.
- **Част II · Пръстен на серията (`aside#journalGoalRing.journal-ring-col`)**:
  - Бутон `#editGoalBtn` („Цели“, отваря `#settingsModal`).
  - Концентрична SVG фигура `.goal-ring-figure` (`#journalRingGraphic`) с централен надпис `.goal-ring-center` (`Текуща серия`, `#streakValue.goal-ring-streak`, `поредни дни`) и таблица `#journalRingMeta.goal-ring-ledger`.
- **Част III · Месечен ритъм и Литературен профил (`.journal-analytics`)**:
  - `article.journal-horizon-col`: акценти `#journalRhythmCallouts` (`#statStrongestMonth`, `#statPagesPerSession`, `#statPagesPerDay`) и SVG графика `#journalMonthlyChart` (`.horizon-svg`).
  - `article.journal-authors-col`: акцент `#journalAuthorCallout` (`#statTopAuthor`) и SVG класация `#journalAuthorsChart` (`.authors-svg`).
- **Част IV · Читателски записки (`section#activity.activity`)**:
  - Обобщение `#activitySummary` и списък `#activityFeed.activity__feed` от редакционни записи `article.journal-entry` (`.journal-entry__main`, `.journal-entry__margin`, `.journal-entry__actions`).

---

## 5. Годишен брой (`section#issue.issue`)

- Карта `article.issue__book` със селектор за година `#issueYear`, заглавие `#issueTitle` („Брой 2026“), показатели `#issuePages`, `#issueFinished`, `#issueStreak`, акценти `#issueAuthor`, `#issueMonth` и списък `ol.issue__index` на завършените през годината книги.

---

## 6. Диалози и известия

- **`<dialog id="shelfPreview" class="shelf-preview">`**: отворена двустранна книга от рафта с корица `#shelfPreviewFront`, прогрес, бележки `#shelfPreviewNotes`, последни сесии `#shelfPreviewSessions` и бутони „Запиши четене“ / „За книгата“.
- **`<dialog id="detailsModal" class="modal-dialog modal-dialog--details">`**: пълна информация за книгата, списък с всички сесии и секция `<details class="details-manage">` с форма `#detailsProgressForm` за обновяване на текуща страница и бутон `#detailsDeleteBook` за изтриване на книгата.
- **`<dialog id="logModal" class="modal-dialog">`**: форма `#logForm` за добавяне или редактиране на читателска сесия (`#logBook`, `#logDate`, `#logPages`, `#logNote`).
- **`<dialog id="settingsModal" class="modal-dialog modal-dialog--settings">`**: форма `#settingsForm` за избор на тема (`#themeSelect`), седмична цел (`#settingWeeklyGoal`) и минимум страници за ден от серията (`#settingMinStreak`).
- **`<div id="toast" class="toast" aria-live="polite" popover="manual">`**: плаващо известие в Top Layer на браузъра, което се показва над всички елементи, включително над отворени модални диалози.

---

## 7. Форма за книга (`form.html`)

- Карта `.auth-card` с фиксирана десктоп ширина `475px` (`.form-page__inner`), балансиран поднадпис `.auth-card__subtitle` (`text-wrap: balance`) и форма `#bookForm`:
  - `#title` (Заглавие на книгата, задължително)
  - `#author` (Автор, задължително)
  - `#isbn` (ISBN за корица от Open Library, незадължително)
  - `#totalPages` (Общо страници, задължително, `min="1"`)
  - `#currentPage` (Текуща страница, `min="0"`, автоматично ограничено до `totalPages`)
  - `#notes` (Бележки, до 300 символа, с брояч `#charCount`)

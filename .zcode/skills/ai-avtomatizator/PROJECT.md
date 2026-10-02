# Карта проекта PomidorQA

## Основные файлы

- `CODEX.md` — обязательные правила написания и ревью автотестов.
- `playwright.config.ts` — проекты `unit`, `api`, `e2e`, base URL и артефакты.
- `eslint.config.mjs` — обязательные Playwright ESLint-правила.
- `package.json` — команды тестов и линтера.

## Тестовые слои

- `tests/unit/` — тесты чистых функций без браузерного контекста (`src/pyramid/slots.ts`).
- `tests/api/` — тесты HTTP API на локальном мок-сервере (`src/pyramid/mock-booking-api.ts`).
- `tests/e2e/` — браузерные пользовательские сценарии против стенда `https://aiqa.su`.
- `tests/helpers/` — тестовые данные, API-регистрация, вход и очистка.
- `tests/pages/` — Page Object'ы, локаторы и действия на экранах.

## Существующие строительные блоки

### Helpers

`tests/helpers/user.ts`:

- `TestUser`;
- `RegisteredParticipant`;
- `makeUser(role, runId)`;
- `registerUserViaApi(request, user)`;
- `deleteUserViaApi(request)`;
- `cleanupUsersViaApi(contexts)`;
- `ROUTES` — адреса страниц (`catalog`, `profile`, `slots`, `bookings`, `login`, `register`).

`tests/helpers/dates.ts`:

- `tomorrowDate()`;
- `yesterdayDate()`.

`tests/helpers/arrange.ts`:

- `createHostWithSkillAndSlot(browser, contexts, { role, skillTag, slotTime, slotDate? })` —
  регистрирует хоста через API, добавляет навык и свободный слот через UI,
  дожидается их появления; возвращает `{ host, hostPage, hostProfile, hostBooking }`.

Используй их вместо локальных копий. Добавляй новый helper сюда только для
ответственности пользователя; остальные домены размещай в отдельных
тематических helper-файлах.

### Page Object

`tests/pages/login-page.ts`:

- `LoginPage.open()`;
- `LoginPage.login(email, password)`;
- `LoginPage.errorMessage()`.

`tests/pages/profile-page.ts`:

- `ProfilePage.open()`, `saveProfile()` (ждёт POST);
- заполнение полей: `changeNameAndSave`, `changeTimezoneAndSave`,
  `addTelegramAndSave`, `addBioAndSave`, `fillNameTelegramBioAndSave`;
- навыки: `addSkill`, `addCanHelpSkill`, `addWantToLearnSkill`, `clickAddSkill`,
  `deleteSkill`, `skillChip(tag)`, `canHelpSkills`, `skillChips`;
- поля формы: `profileNameInput`, `profileTelegramInput`, `profileTimezoneSelect`,
  `profileBioInput`, `profileSaveButton`.

`tests/pages/booking-page.ts`:

- навигация: `goToSlots()`, `openCatalog()`, `openBookings()`;
- слоты: `addSlot(date, time)`, `slotCard(time)`, `deleteSlot(time)`,
  `deleteButton(time)`, `slotsCards`;
- каталог: `findPersonBySkill(tag)`, `openPersonCard(name)`, `personCard(name)`,
  `catalogCards`, `catalogEmptyState`;
- календарь и бронь: `calendarDayChip()`, `calendarTimeChip()`,
  `calendarTimeChipAt(time)`, `selectFirstSlot()`, `selectSlotAt(time)`,
  `confirmBooking()`, `bookingConfirmDialog`, `bookingConfirmButton`,
  `bookingConfirmSuccess`, `bookingConfirmError`;
- «Мои встречи»: `bookingCard(name)`, `bookingCardName()`,
  `cancelFirstBooking()`, `cancelBookingWith(name)`, `bookingsCards`,
  `pastBookingCard(name)`, `pastBookingCardName()`, `pastBookingCardStatus()`;
- карточка участника: `personName`, `personBio`, `personTelegram`,
  `personSlotsTimezone`, `personCanHelpSkill(tag)`, `personWantToLearnSkill(tag)`,
  `cancellationTooLateWarning()`.

Для нового экрана создавай отдельный `<feature>-page.ts`.

## Как готовить данные

- Пользователь: `makeUser(role, Date.now())` + `registerUserViaApi`. Через UI
  регистрируйся только если тест проверяет саму регистрацию.
- Хост с навыком и свободным слотом: `createHostWithSkillAndSlot`.
- Cleanup: `test.afterEach` → `cleanupUsersViaApi(contexts)` либо `finally`
  внутри теста; каждый context попадает в массив сразу после создания.
- Тег навыка и видимые данные уникальны на прогон: `Playwright-${Date.now()}`.
  Стенд общий, чужие прогоны идут параллельно.

## Команды

```bash
npm run test:unit
npm run test:api
npm run test:e2e
npm run lint
```

Для быстрого цикла запускай конкретный spec с соответствующим `--project`,
затем полный `npm run lint`.

## Грабли (проверено на живом стенде)

- Клик по карточке сразу после поиска может «уйти в перерисовку» — перед
  `openPersonCard` обязателен `expect(personCard(...)).toBeVisible()`.
- `POST /pomidorqa/profile` отвечает 303 — `saveProfile` ловит это (method + URL).
- Блок «Могу помочь с» не рендерится при нуле навыков — тест «пустой навык»
  ждёт `not.toBeVisible()`.
- `personBio` / `personTelegram` не рендерятся, пока поля не заполнены.
- У полей форм и фильтра каталога есть настоящие label — используй `getByLabel`,
  а не `#id`.

## Важная оговорка

Некоторые учебные или старые spec-файлы содержат локаторы, helpers и assertions
внутри action steps. Они полезны для понимания сценария, но не являются
эталоном структуры. При конфликте всегда применяй актуальный `CODEX.md`.

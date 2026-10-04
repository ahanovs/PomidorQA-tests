# PomidorQA Course Tests

Репозиторий автотестов для [PomidorQA](https://aiqa.su/pomidorqa) — сервиса коротких встреч для QA- и IT-специалистов.

Проект написан на TypeScript и Playwright. В репозитории собраны unit-, API- и E2E-тесты. GitHub Actions гоняет pipeline из пяти джоб (Quality → Unit / API → E2E) при каждом push и pull request, ведёт Summary-страницу запуска и отправляет Telegram-уведомления; отдельный Stability Check охотится на флейки.

## Технологии

- TypeScript
- Playwright
- ESLint
- GitHub Actions

## Установка

### Требования

- Node.js 20 или новее
- npm

### Установить зависимости

```bash
npm ci
```

### Установить Chromium для Playwright

```bash
npx playwright install chromium
```

## Запуск проверок

### Линтер

```bash
npm run lint
```

### Проверка типов

```bash
npm run typecheck
```

### Все тесты

```bash
npm test
```

### Unit-тесты

```bash
npm run test:unit
```

### API-тесты

```bash
npm run test:api
```

### E2E-тесты

```bash
npm run test:e2e
```

### HTML-отчёт Playwright

```bash
npm run report
```

## Покрытие требований

Проект покрывает **30 из 50 требований PomidorQA — 60%**.

| Уровень | Тестов | Что проверяется |
|---|---:|---|
| Unit | 11 | Пересечение временных слотов, формат времени в часовом поясе, минимальная длина пароля |
| API | 8 | Регистрация, ошибки бронирования, успешное бронирование и гонка за слот |
| E2E | 15 | Профиль, навыки, каталог, вход, бронирование, отмена и список встреч |
| **Всего** | **34** | Unit + API + E2E |

## Конфигурация E2E

По умолчанию E2E-тесты запускаются на [https://aiqa.su](https://aiqa.su).

Чтобы использовать локальный стенд, укажи переменную `POMIDORQA_BASE_URL`.

PowerShell:

```powershell
$env:POMIDORQA_BASE_URL = "http://localhost:3000"
npx playwright test --project=e2e
```

## Структура проекта

```text
src/pyramid/       вспомогательный код: чистые функции и локальный mock-сервер
tests/unit/        unit-тесты
tests/api/         API-тесты
tests/e2e/         E2E-тесты
tests/helpers/     подготовка данных и вход пользователей
tests/pages/       Page Object Model: локаторы и действия на экранах
.github/workflows/ CI-workflow GitHub Actions
```

## CI

### Pipeline «Playwright CI»

Джобы идут от дешёвых к дорогим: самый затратный E2E против живого стенда стартует только
после зелёных быстрых проверок.

```text
push / pull_request
        │
        ▼
Quality (ESLint + TypeScript)      ← статика, без браузера
        │
        ├──────────────┬──────────────┐
        ▼              ▼              │
   Unit tests      API tests         │    ← параллельно, без браузера
        │              │            │
        └──────────────┴────────────┤
                                    ▼
                            E2E (Chromium)      ← живой стенд aiqa.su
                                    │
                                    ▼
                          Summary & Notify      ← GitHub Actions Summary + Telegram
```

| Джоба | Что делает | Комментарий |
|---|---|---|
| **Quality (ESLint + TypeScript)** | `npm run lint`, `npm run typecheck` | статический анализ, без браузера |
| **Unit tests** | `npm run test:unit` | чистая логика, без сети |
| **API tests** | `npm run test:api` | мок-сервер стартует внутри спека |
| **E2E (Chromium)** | `npm run test:e2e` | общий стенд; гейт `needs` не пустит её после падения быстрых джоб |
| **Summary & Notify** | `$GITHUB_STEP_SUMMARY` + Telegram Bot API | итоговая страница запуска и уведомление в чат |

Что ещё даёт pipeline:

- **Summary** — у каждого запуска есть страница «Summary»: таблица проверок, ветка, коммит, автор, ссылка на лог.
- **Артефакты** — HTML-отчёт Playwright плюс трейсы, скриншоты и видео падений из `test-results/`; хранятся 14 дней.
- **Кэш браузера** — бинарники Chromium кэшируются между запусками по ключу от `package-lock.json`.
- **Concurrency** — новый пуш в ту же ветку отменяет устаревший прогон, экономя минуты runner'а.
- **Telegram** — итог приходит ботом с кнопкой «Открыть запуск». Пока секреты `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` не заданы в настройках репозитория, шаг уведомления тихо пропускается — CI от этого не краснеет.

### Stability Check

Отдельный workflow **Stability Check** — охота на флейки: каждый E2E-тест прогоняется трижды
(`--repeat-each=3`) **без ретраев** (`--retries=0`). Упал хотя бы в одном прогоне — workflow красный,
спрятать нестабильность за retry невозможно.

- Запуск: вручную (Run workflow во вкладке Actions) и по расписанию — понедельник 06:00 UTC.
- Красный Stability Check = найден флак. По правилам CODEX свой флак чинит автор.

### Обязательные проверки для защиты main

Имена проверок для Branch Protection (Settings → Branches → Require status checks to pass):

- `Quality (ESLint + TypeScript)`
- `Unit tests`
- `API tests`
- `E2E (Chromium)`
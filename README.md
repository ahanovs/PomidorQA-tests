# PomidorQA Course Tests

[![CI](https://github.com/ahanovs/PomidorQA-tests/actions/workflows/playwright.yml/badge.svg)](https://github.com/ahanovs/PomidorQA-tests/actions/workflows/playwright.yml)

Репозиторий автотестов для [PomidorQA](https://aiqa.su/pomidorqa) — сервиса коротких
встреч для QA- и IT-специалистов. Проект закрывает **39 из 50 требований MVP — 78%**:
полная матрица покрытия со статусами и ссылками на тесты —
[docs/coverage-matrix.md](docs/coverage-matrix.md).

Написан на TypeScript и Playwright. В репозитории собраны unit-, API- и E2E-тесты.
GitHub Actions гоняет pipeline из пяти джоб (Quality → Unit / API → E2E) при каждом
push и pull request, ведёт Summary-страницу с метриками прогона и отправляет
Telegram-уведомления; отдельный Stability Check охотится на флейки.

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

### Весь гейт одной командой

Порядок — от дешёвого к дорогому: ошибка типов ловится раньше, чем поднимется браузер.

```bash
npm run gate   # typecheck → lint → unit → api → e2e
```

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

Покрытие считается от спецификации — [requirements.md](requirements.md), 50 функциональных
требований MVP, — а не от числа тестов и не от строк кода: PomidorQA проверяется как
чёрный ящик, и code coverage здесь измерить нечем. У каждого требования в
[матрице](docs/coverage-matrix.md) стоит один из статусов и ссылка на тесты:

| Статус | Требований |
|---|---:|
| `automated` — есть тест, который упадёт, если поведение сломается | 39 |
| `partial` — покрыта наблюдаемая часть, серверная недостижима | 7 |
| `known defect` — продукт нарушает требование, тест помечен `test.fail()` | 1 |
| `not covered` | 1 |
| `out of scope` — состояние через интерфейс недостижимо | 2 |

Известный дефект **KD-3**: поиск каталога фильтрует по навыкам обоих типов, хотя
требование R8.3 ограничивает поиск разделом «могу помочь». Тест написан по требованию,
а не по фактическому поведению, и помечен `test.fail()` — пока дефект жив, прогон
остаётся зелёным, а починка продукта даст сигнал «expected to fail, but passed».

Честная оговорка про пирамиду: unit-уровень проверяет чистые функции этого набора,
а не продукт (исходников PomidorQA нет), API-тесты исполняются на мок-сервере курса.
Поэтому широкое основание пирамиды для внешней автоматизации чёрного ящика недостижимо
в принципе — правила, которые дешевле проверять ниже UI, вынесены на API-уровень.

## Метрики

| Метрика | Значение |
|---|---|
| Тесты | 59: 10 unit / 8 api / 41 e2e |
| Время полного гейта | ~4 мин локально (e2e — самая дорогая часть, 3,6 мин) |
| Flaky rate | 0,0% (прогоны 05–06.10.2026: десятки повторов — все зелёные) |
| API-подготовка данных | 16 из 17 e2e-спеков (единственное исключение — гостевой сценарий) |
| Cleanup | создаваемые аккаунты удаляются каскадом в `finally`/`afterEach` |

Метрики считаются из JSON-отчёта скриптом [scripts/metrics.mjs](scripts/metrics.mjs)
и печатаются в Summary каждого запуска CI.

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
scripts/           метрики прогона (metrics.mjs) и AI-ревьюер
docs/              матрица покрытия и документация AI-ревьюера
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
| **Summary & Notify** | метрики из JSON-отчётов + Telegram Bot API | итоговая страница запуска и уведомление в чат |

Что ещё даёт pipeline:

- **Summary** — у каждого запуска есть страница: таблица проверок, ветка, коммит, автор,
  ссылка на лог и **метрики прогона** — тесты по уровням, статусы, flaky rate, время.
- **Артефакты** — HTML-отчёт Playwright, JSON- и JUnit-отчёты, трейсы, скриншоты и видео
  падений из `test-results/`; хранятся 14 дней.
- **Кэш браузера** — бинарники Chromium кэшируются между запусками по ключу от `package-lock.json`.
- **Concurrency** — новый пуш в ту же ветку отменяет устаревший прогон, экономя минуты runner'а.
- **Telegram** — итог приходит ботом с кнопкой «Открыть запуск». Пока секреты
  `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` не заданы в настройках репозитория, шаг
  уведомления тихо пропускается — CI от этого не краснеет.

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

## Происхождение кода

Стартовая точка — эталонные тесты первого коммита курса (31.07.2026): четыре спека
(`booking-flow`, `login-error`, `booking-api`, unit-`slots`), модули пирамиды `src/pyramid`
и инфраструктура. Что с ними стало — видно по `git diff e454ded..HEAD`:

| Файл из эталона | Что с ним стало |
|---|---|
| `src/pyramid/slots.ts`, `mock-booking-api.ts` | без изменений |
| `tests/unit/slots.spec.ts` | правки ~6 строк из 71 |
| `tests/api/booking-api.spec.ts` | правки ~19 строк из 132 |
| `tests/e2e/booking-flow.spec.ts` | переписан: 160 добавленных / 112 удалённых строк |
| `tests/e2e/login-error.spec.ts` | переписан: 47+/42− |

Написано с нуля в ходе марафона: 13 e2e-спеков, хелперы (`user`, `arrange`, `dates`),
Page Object'ы (`LoginPage`, `ProfilePage`, `BookingPage`, `RegisterPage`), матрица
покрытия, CI на пять джоб, Stability Check, скрипт метрик.

## Роль ИИ

Часть работы сделана с ИИ-агентом (ZCode + skill `ai-avtomatizator`): рефакторинг
эталонных спеков по кодексу, тесты закрытия дыр покрытия (R3.4, R9.2, R10.5,
R4.x, R5.x, R6.4), CI-инфраструктура и скрипт метрик. Весь агентский код проходил
те же гейты, что и ручной: линт, typecheck, десятикратные прогоны на флаки, ревью
по `CODEX.md`. Разбор каждого спорного поведения (например, молчаливое отклонение
пустого имени в профиле) сделан по трейсам и зафиксирован в комментариях тестов.

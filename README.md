# PomidorQA Course Tests

Репозиторий автотестов для [PomidorQA](https://aiqa.su/pomidorqa) — сервиса коротких встреч для QA- и IT-специалистов.

Проект написан на TypeScript и Playwright. В репозитории собраны unit-, API- и E2E-тесты. GitHub Actions запускает ESLint и Playwright-тесты при каждом push и pull request.

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

Workflow **Playwright CI** выполняет:

```bash
npm run lint
npm test
```
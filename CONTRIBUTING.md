# Как вносить изменения

Репозиторий — личный проект портфолио, но процесс в нём командный: ветка → Pull Request →
гейт → ревью. Main защищён required checks — мерж возможен только после зелёного CI.

## 1. Ветка

```bash
git checkout -b <краткое-имя>   # например: coverage/r12-3, ci/metrics
```

## 2. Изменение

- Правила написания и ревью тестов — в [CODEX.md](CODEX.md): где что лежит, степы,
  API-arrange, cleanup в `finally`/`afterEach`.
- Не переписывай чужой код «по пути» — отдельная ветка и отдельный PR.

## 3. Гейт перед пушем

```bash
npm run gate   # typecheck → lint → unit → api → e2e
```

Pre-push git-хук гоняет то же самое без E2E (линт, typecheck, unit, api) автоматически.
Активация хука на новом клоне — один раз:

```bash
git config core.hooksPath .githooks
```

## 4. Pull Request

GitHub подставит шаблон из `.github/pull_request_template.md`. В описании — что изменилось
и почему; если меняется покрытие, укажи ID требований из
[docs/coverage-matrix.md](docs/coverage-matrix.md) и обнови статусы в матрице тем же PR.

CI запускает пять джоб: Quality (ESLint + TypeScript) → Unit / API → E2E (Chromium) →
Summary & Notify. Итог — на вкладке Summary запуска: статусы джоб, метрики прогона
(тесты по уровням, flaky rate, время), артефакты с HTML/JSON/JUnit-отчётами и трейсами падений.

Само-ревью перед отправкой — по чеклисту [REVIEW.md](REVIEW.md).

## История коммитов

`<префикс>: краткое описание` — например: `test: ...`, `ci: ...`, `docs: ...`.

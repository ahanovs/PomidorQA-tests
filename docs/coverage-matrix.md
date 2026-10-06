# Матрица покрытия PomidorQA

Покрытие считается по функциональным требованиям MVP из [`requirements.md`](../requirements.md),
а не по числу файлов и не по строкам кода продукта. Playwright тестирует PomidorQA как чёрный
ящик, поэтому code coverage здесь измерить нечем: исходники приложения в этот репозиторий не входят.

Каждое требование получает один из пяти статусов.

| Статус | Что означает |
|---|---|
| `automated` | есть автотест, который падает, если поведение сломается |
| `partial` | покрыта наблюдаемая часть правила, серверная или скрытая — нет |
| `known defect` | требование не выполняется продуктом; тест написан по требованию и помечен `test.fail()` |
| `not covered` | теста пока нет; в примечании — что именно планируется |
| `out of scope` | состояние недостижимо через интерфейсы продукта, black-box проверить нечем |

Срез: **05.10.2026**, ветка `main`, стенд `https://aiqa.su`.

## Сводка

| Статус | Требований | Доля |
|---|---|---|
| `automated` | 40 | 80% |
| `partial` | 7 | 14% |
| `known defect` | 1 | 2% |
| `not covered` | 0 | — |
| `out of scope` | 2 | 4% |
| **Всего требований MVP** | **50** | 100% |

Основной путь из критериев приёмки (п. 13 требований) покрыт сквозным сценарием
`e2e/booking-flow`: регистрация → профиль и навык → слот → поиск со второго аккаунта →
бронирование → встреча видна обоим. Из пяти негативных критериев приёмки один
`automated` (нельзя отменить позже чем за 2 часа), четыре проверены частично —
на мок-сервере или в UI без серверной части (см. R10.1–R10.4, R7.2).

Это рабочий срез середины аудита: 7 `partial` — серверные части этих правил через
black-box недостижимы, объяснения у каждой строки. Матрица обновляется вместе
с тестами: новый тест + изменение статуса идут одним PR.

## Требования и тесты

### 3. Роли пользователей

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R3.1 | Гость просматривает каталог | `automated` | [`e2e/guest-and-limits`](../tests/e2e/guest-and-limits.spec.ts) |
| R3.2 | Гость открывает страницу участника и видит свободные слоты | `automated` | [`e2e/guest-and-limits`](../tests/e2e/guest-and-limits.spec.ts) |
| R3.3 | Гость не может забронировать звонок | `automated` | [`e2e/guest-and-limits`](../tests/e2e/guest-and-limits.spec.ts) |
| R3.4 | Приватные страницы гостю недоступны | `automated` | [`e2e/guest-access`](../tests/e2e/guest-access.spec.ts) |
| R3.5 | Участник редактирует профиль и навыки | `automated` | [`e2e/profile-edit`](../tests/e2e/profile-edit.spec.ts), [`e2e/profile-flow`](../tests/e2e/profile-flow.spec.ts) |
| R3.6 | Участник добавляет и удаляет свои слоты | `automated` | [`e2e/slots-flow`](../tests/e2e/slots-flow.spec.ts) |
| R3.7 | Участник бронирует слоты других | `automated` | [`e2e/booking-flow`](../tests/e2e/booking-flow.spec.ts) |
| R3.8 | Отменить бронирование может и хост, и гость | `automated` | [`e2e/booking-cancel`](../tests/e2e/booking-cancel.spec.ts), [`e2e/booking-rules`](../tests/e2e/booking-rules.spec.ts) |
| R3.9 | Участник видит список своих встреч | `automated` | [`e2e/booking-flow`](../tests/e2e/booking-flow.spec.ts), [`e2e/booking-cancel`](../tests/e2e/booking-cancel.spec.ts) |

### 4. Регистрация и вход

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R4.1 | Имя, email и пароль обязательны | `automated` | [`e2e/auth-flow`](../tests/e2e/auth-flow.spec.ts) |
| R4.2 | Пароль не короче 8 символов | `automated` | [`e2e/auth-flow`](../tests/e2e/auth-flow.spec.ts), [`unit/slots`](../tests/unit/slots.spec.ts) |
| R4.3 | После регистрации создан профиль: имя из формы, пояс `Europe/Moscow` | `automated` | [`e2e/profile-defaults`](../tests/e2e/profile-defaults.spec.ts) |
| R4.4 | Второй аккаунт на тот же email не создаётся | `automated` | [`e2e/auth-flow`](../tests/e2e/auth-flow.spec.ts) |
| R4.5 | Ошибка входа одинаковая, без уточнения причины | `automated` | [`e2e/login-error`](../tests/e2e/login-error.spec.ts) |
| R4.6 | Успешный вход держит сессию, выход её закрывает | `automated` | [`e2e/auth-flow`](../tests/e2e/auth-flow.spec.ts) |

### 5. Профиль

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R5.1 | Имя — обязательное поле | `automated` | [`e2e/profile-flow`](../tests/e2e/profile-flow.spec.ts) |
| R5.2 | Telegram — необязательный свободный текст | `automated` | [`e2e/profile-flow`](../tests/e2e/profile-flow.spec.ts) |
| R5.3 | Часовой пояс выбирается из списка | `automated` | [`e2e/profile-edit`](../tests/e2e/profile-edit.spec.ts) |
| R5.4 | «О себе» — необязательное описание | `automated` | [`e2e/profile-flow`](../tests/e2e/profile-flow.spec.ts) |
| R5.5 | Время слотов показывается в часовом поясе владельца | `automated` | [`e2e/slot-timezone`](../tests/e2e/slot-timezone.spec.ts), [`unit/slots`](../tests/unit/slots.spec.ts) |
| R5.6 | Профиль виден другим участникам | `automated` | [`e2e/person-card-details`](../tests/e2e/person-card-details.spec.ts) |

### 6. Навыки

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R6.1 | Навык имеет тип «могу помочь» или «хочу разобрать» | `automated` | [`e2e/person-card-details`](../tests/e2e/person-card-details.spec.ts), [`e2e/profile-flow`](../tests/e2e/profile-flow.spec.ts) |
| R6.2 | Название навыка — свободный текст | `automated` | [`e2e/profile-flow`](../tests/e2e/profile-flow.spec.ts) |
| R6.3 | Один и тот же навык одного типа нельзя добавить повторно | `automated` | [`e2e/profile-flow`](../tests/e2e/profile-flow.spec.ts) |
| R6.4 | Тот же навык другого типа — отдельная запись | `automated` | [`e2e/profile-flow`](../tests/e2e/profile-flow.spec.ts) |
| R6.5 | Участник удаляет свой навык в любой момент | `automated` | [`e2e/skill-delete`](../tests/e2e/skill-delete.spec.ts) |
| R6.6 | Пустой навык не добавляется | `automated` | [`e2e/profile-flow`](../tests/e2e/profile-flow.spec.ts) |

### 7. Слоты доступности

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R7.1 | Длительность слота фиксированная — 25 минут | `out of scope` | — |
| R7.2 | Нельзя создать слот в прошлом | `partial` | [`e2e/slots-flow`](../tests/e2e/slots-flow.spec.ts) |
| R7.3 | У слота статус `free` или `booked` | `partial` | [`e2e/slots-flow`](../tests/e2e/slots-flow.spec.ts), [`e2e/guest-and-limits`](../tests/e2e/guest-and-limits.spec.ts) |
| R7.4 | Свой свободный слот можно удалить | `automated` | [`e2e/slots-flow`](../tests/e2e/slots-flow.spec.ts) |
| R7.5 | Забронированный слот удалить нельзя | `partial` | [`e2e/slots-flow`](../tests/e2e/slots-flow.spec.ts) |

- R7.1: `end_time` нигде не выводится в интерфейс, наблюдаемо только начало слота.
  Подпись «25 минут» — текст макета, а не вычисленная длительность. Правило живёт
  на уровне бэкенда — в black-box наборе доказать нечем (как и в эталоне курса).
- R7.2: покрыта клиентская часть — слот на вчерашнюю дату не создаётся
  (`slotCard` не появился). 409 `slot_in_past` ассертится только на мок-сервере;
  серверная проверка продукта через UI недостижима: форма не отправляется раньше.
- R7.3: статусы проверены по последствиям — у забронированного слота исчезает кнопка
  «Удалить», слот бронируется, хозяин пропадает из каталога. Явного отображения
  `free`/`booked` в интерфейсе нет.
- R7.5: покрыто, что у забронированного слота нет кнопки удаления (`toHaveCount(0)`).
  Серверный фильтр по статусу без запроса в обход UI не проверить.

### 8. Каталог участников

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R8.1 | В каталоге только те, у кого есть свободный слот в будущем | `automated` | [`e2e/guest-and-limits`](../tests/e2e/guest-and-limits.spec.ts) |
| R8.2 | Участник не видит себя в собственном каталоге | `automated` | [`e2e/catalog-search`](../tests/e2e/catalog-search.spec.ts), [`e2e/booking-rules`](../tests/e2e/booking-rules.spec.ts) |
| R8.3 | Поиск фильтрует по навыкам из раздела «могу помочь» | **`known defect`** KD-3 | [`e2e/known-defects`](../tests/e2e/known-defects.spec.ts) |
| R8.4 | По неизвестному навыку выдача пустая | `automated` | [`e2e/catalog-search`](../tests/e2e/catalog-search.spec.ts) |

- R8.3: дефект KD-3 подтверждён ручной проверкой стенда 05.10.2026 и автоматизирован:
  [`e2e/known-defects`](../tests/e2e/known-defects.spec.ts) написан по требованию и помечен
  `test.fail()`. Позитивный поиск по «могу помочь» остаётся покрытым
  [`e2e/catalog-search`](../tests/e2e/catalog-search.spec.ts).

### 9. Страница участника

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R9.1 | Видны имя, «о себе», навыки обоих типов и свободные слоты | `automated` | [`e2e/person-card-details`](../tests/e2e/person-card-details.spec.ts), [`e2e/guest-and-limits`](../tests/e2e/guest-and-limits.spec.ts) |
| R9.2 | Забронированные слоты не показываются | `automated` | [`e2e/booking-state`](../tests/e2e/booking-state.spec.ts) |
| R9.3 | Прошедшие слоты не показываются | `out of scope` | — |

- R9.3: продукт не позволяет создать слот в прошлом (R7.2), а ждать, пока слот состарится,
  регрессия не может. Состояние недостижимо без подготовки данных в БД (как и в эталоне курса).

### 10. Бронирование звонка

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R10.1 | Свой слот забронировать нельзя | `partial` | [`e2e/booking-rules`](../tests/e2e/booking-rules.spec.ts), [`api/booking-api`](../tests/api/booking-api.spec.ts) |
| R10.2 | Забронировать можно только свободный слот в будущем | `partial` | [`e2e/booking-flow`](../tests/e2e/booking-flow.spec.ts), [`api/booking-api`](../tests/api/booking-api.spec.ts) |
| R10.3 | После брони слот `booked`, бронирование `confirmed` | `partial` | [`e2e/booking-flow`](../tests/e2e/booking-flow.spec.ts), [`api/booking-api`](../tests/api/booking-api.spec.ts) |
| R10.4 | При гонке подтверждена ровно одна бронь, второй видит ошибку | `partial` | [`api/booking-api`](../tests/api/booking-api.spec.ts), [`e2e/booking-flow`](../tests/e2e/booking-flow.spec.ts) |
| R10.5 | Закрытие окна подтверждения не создаёт бронь | `automated` | [`e2e/booking-state`](../tests/e2e/booking-state.spec.ts) |

- R10.1: в UI свой слот недостижим для брони (себя в каталоге не видно, R8.2), поэтому
  ассертится только отсутствие своей карточки. 409 `cannot_book_own_slot` — на мок-сервере.
- R10.2: «только свободный» покрыто в UI — вторая бронь занятого слота даёт ошибку;
  «начало в будущем» — только 409 `slot_in_past` на моке.
- R10.3: `confirmed` ассертится только на мок-API; в UI — сообщение успеха (`role=status`)
  и последствия занятости слота.
- R10.4: настоящая параллельная гонка — `Promise.all` на моке (ровно один 201);
  в UI бронирования последовательные: один успех, второй видит ошибку.

### 11. Отмена бронирования

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R11.1 | Отменяет любой из двух участников | `automated` | [`e2e/booking-cancel`](../tests/e2e/booking-cancel.spec.ts), [`e2e/booking-rules`](../tests/e2e/booking-rules.spec.ts) |
| R11.2 | Отмена запрещена позднее чем за 2 часа до начала | `automated` | [`e2e/guest-and-limits`](../tests/e2e/guest-and-limits.spec.ts), [`e2e/booking-cancel`](../tests/e2e/booking-cancel.spec.ts) |
| R11.3 | После отмены слот снова свободен и доступен другому | `automated` | [`e2e/booking-rules`](../tests/e2e/booking-rules.spec.ts), [`e2e/booking-cancel`](../tests/e2e/booking-cancel.spec.ts) |

### 12. Мои встречи

| ID | Требование | Статус | Тесты |
|---|---|---|---|
| R12.1 | Показаны брони, где участник хост или гость | `automated` | [`e2e/booking-flow`](../tests/e2e/booking-flow.spec.ts) |
| R12.2 | Два списка: «Ближайшие» и «Прошедшие и отменённые» | `automated` | [`e2e/booking-cancel`](../tests/e2e/booking-cancel.spec.ts), [`e2e/booking-flow`](../tests/e2e/booking-flow.spec.ts) |
| R12.3 | Отменить можно только из «Ближайших» | `automated` | [`e2e/booking-cancel`](../tests/e2e/booking-cancel.spec.ts) |

## Известные дефекты

Тесты на дефекты написаны по требованию, а не по фактическому поведению, и помечены
`test.fail()`. Пока дефект жив, ожидаемый результат — падение, и прогон остаётся зелёным.
Когда продукт починят, Playwright скажет «expected to fail, but passed» — это сигнал
снять пометку. Так дыра не пропадает из отчёта и не превращается в зелёную галочку.

### KD-3 — каталог ищет по навыкам обоих типов

Требование R8.3 ограничивает поиск разделом «могу помочь», фильтр каталога проходит по всем
навыкам участника. Подтверждено ручной проверкой стенда 05.10.2026: участник с навыком
только в «хочу разобрать» находится поиском по этому навыку; контрольный поиск по навыку
«могу помочь» того же участника тоже находит его — то есть выдача не пуста из-за поломки
фильтра. Автотест: [`e2e/known-defects`](../tests/e2e/known-defects.spec.ts).

## План закрытия дыр

Приоритет — по риску для пользователя продукта; уровень — по правилу «требование → риск → уровень».

| Приоритет | Требования | Что добавить | Уровень |
|---|---|---|---|
| 1 | R7.2, R7.5 | Оценить: серверные части недостижимы, статус остаётся `partial` с объяснением | — |

## Уровни проверок

| Уровень | Тестов | Что проверяет |
|---|---|---|
| unit | 10 | чистые функции набора: пересечение слотов, валидация пароля, формат времени |
| api | 8 | бизнес-правила брони и регистрации на мок-сервере `src/pyramid/mock-booking-api.ts` |
| e2e | 41 | пользовательские сценарии в браузере на `aiqa.su` |

Честная оговорка про пирамиду: unit-уровень проверяет **наш собственный** код, а не продукт —
исходников PomidorQA у набора нет. API-тесты исполняются против мок-сервера курса, поэтому
в матрице они дают требованию максимум `partial`: правило подтверждено на модели, а не на
продукте. Широкое основание пирамиды для внешней автоматизации чёрного ящика недостижимо,
это нормально; правила, которые дешевле проверять ниже UI, вынесены на API-уровень.

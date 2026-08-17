# Структура компонентов Strapi под редизайн

Дата: 17.08.2026 | Статус: в работе | Отменяет: —

Схемы лежат здесь, а не в `mgts-backend/src/components/`, намеренно: там 68 мёртвых
дублей вида `<name>/schema.json` (B-11), и добавлять новое в этот беспорядок до его
разбора нельзя. Перенос — спринт **Ф2**, после B-11.

**17 компонентов · 3 типа контента · 28 внутренних ссылок · битых 0.**

---

## Что здесь и зачем

### `meta.stub` — один компонент, на котором держится весь механизм

Вкладывается в каждый компонент и тип контента. Это и есть техническая реализация
§7.0 плана: заглушка живёт в данных, а не в договорённостях.

| Поле | Смысл |
|---|---|
| `status` | `stub` · `draft` · `approved` |
| `owner` | по умолчанию «владелец направления, коммерческий блок» |
| `due` | срок годности заглушки |
| `expectedForm` | **чего ждём**: «% к сроку», «кВт на стойку», «раб. дней» |
| `source` | обязателен при `draft` и `approved` |
| `approvedBy`, `approvedAt` | кто и когда подтвердил |

Правила, которые проверяет `check-stubs.js`:

1. `status: stub` + цифра в значении → **красный**. Настоящее число живёт только
   в `draft` (с `source`) или `approved`.
2. `status: stub` без `expectedForm` → **красный**. Иначе заглушка снова
   превращается в «нужны данные».
3. `status: approved` без `source` / `approvedBy` / `approvedAt` → **красный**.
4. Любой не-`approved` блок в прод-сборке → **сборка падает** со списком адресов.

### `data.metric` — все числа сайта

Заменяет прежний `fact-item`: показатель, единица, тренд и **обязательное поле
`audience`** — `client` или `company`.

🔒 `audience: company` на публичной странице → красный. Это машинная защита
от К-14: «×4 роста выручки» и «+24 % к чеку объекта» — наши метрики, не клиентские,
и на сайте им не место. Один раз я это уже сделал, поймал владелец.

### `client.*` — клиенты, логотипы, отзывы

**Логотип и имя клиента** живут в одном месте — типе контента `api::client`,
с флагами `logoApproved` и `nameUsageApproved`. Заводим **всех известных клиентов**
сразу, с логотипами: на стенде витрина выглядит настоящей, а в прод не уедет
ни один логотип без флага. Разница между «логотип не согласован» и «клиента нет»
для правового отдела принципиальна, а для редизайна — нет.

`client.logo-wall` не хранит клиентов списком: у него `selection: auto|manual`,
сегмент и лимит. Витрина — это **запрос к реестру**, а не копия. Иначе флаг
согласования придётся снимать в трёх местах.

**`client.testimonial-frame` — каркас отзыва, а не выдуманный отзыв.**
Разница в полях: `topic` (о чём просим сказать), `askFor` (готовая формулировка
запроса, которую отдают клиенту), `authorRole`, `lengthHint`, `requestStatus`
(`not_asked` → `asked` → `received` → `approved`) — и **пустой `quote`**.

Так владелец видит не «нужен отзыв», а «попроси главного инженера ГК N сказать
две фразы про срок подключения» — и видно, на какой стадии зависло. Придуманного
текста в поле `quote` при `status: stub` быть не может: это то же правило, что
и с цифрами, только для прозы.

### `case.media-slot` — три носителя и два разных «нет»

`carrier`: `photo` → `model` → `scheme`. Плюс `mediaExpected`:
`true` — съёмка запланирована, кейс в реестре заглушек со сроком;
`false` — фото не будет никогда, это финальное состояние, из реестра исчезает.

---

## Дерево

```
components/
  meta/stub.json                    ← вкладывается везде
  data/metric.json                  ← все числа, с audience
  data/fact-strip.json
  client/logo-pick.json
  client/logo-wall.json             ← витрина = запрос к реестру
  client/testimonial-frame.json     ← каркас отзыва
  case/media-slot.json              ← три носителя
  product/spec-sheet.json
  product/product-pill.json
  home/segment-entry.json
  home/segment-fork.json            ← развилка героя
  home/division-card.json
  home/division-split.json
  home/maturity-level.json
  home/maturity-ladder.json
  map/moscow-map.json               ← параметры вида карты
  nav/menu-link-lite.json
api/
  client/content-types/client/schema.json   ← реестр клиентов
  case/content-types/case/schema.json
  geo/content-types/geo/schema.json         ← геометрия отдельным запросом
```

---

## Перенос в проект (спринт Ф2)

1. Сначала **B-11**: снести 68 дублей `<name>/schema.json`, иначе новые категории
   попадут в тот же беспорядок.
2. Скопировать `components/*` в `mgts-backend/src/components/`,
   `api/*` в `mgts-backend/src/api/`.
3. `npm run strapi ts:generate-types`, перезапуск.
4. Добавить 9 новых компонентов в Dynamic Zone `page.schema.json`
   и ветки в `SectionRenderer` — **не в `PageRenderer`** (ловушка Л-1).
5. 🔒 Тест «DZ = свитч» обязан позеленеть на 40 = 40 и покраснеть
   на подсаженном фиктивном компоненте.

⚠️ В Dynamic Zone идут только «секционные» компоненты: `home.segment-fork`,
`home.division-split`, `home.maturity-ladder`, `client.logo-wall`,
`product.spec-sheet`, `data.fact-strip`, `map.moscow-map`.
Остальные — вложенные, в зону их класть не надо.

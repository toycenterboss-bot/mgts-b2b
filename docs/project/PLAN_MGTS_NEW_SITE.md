# План работ: Новый сайт МГТС

Статусы:
- [ ] не начато
- [~] в работе
- [x] сделано

## 0) Очистка Strapi (перед новым дизайном)
- [ ] Сделать бэкап коллекций Strapi (pages, navigation, footer, product/news)
- [ ] Подготовить скрипт очистки контента через Strapi API
- [ ] Выполнить удаление старого контента (с подтверждением)
- [ ] Проверить чистое состояние CMS

## 1) Валидация и переработка CMS‑моделей (Strapi)
- [x] Сопоставить текущие поля с будущими требованиями (gap analysis)
- [x] Предложить новую схему (Page + Dynamic Zones + компоненты)
- [x] Документировать финальную модель (`docs/project/CMS_TARGET_SCHEMA.md`)
- [ ] Внедрить схемы в Strapi (content-types + components) и сгенерировать типы
- [ ] Создать минимальный seed контента (navigation/footer + 2–3 страницы разных шаблонов)
- [ ] Зафиксировать контракт листингов/пагинации (Strapi `meta.pagination` → UI пагинатор)
  - См. также: `docs/project/STRAPI_RUNBOOK.md` (проверенные подходы: backup/restore/entityService)

## 1A) Пайплайн переноса контента (mapping → import)
- [x] Зафиксировать “какая страница = какие блоки”: `docs/project/PAGE_BLOCK_MAPPING.md`
- [x] Зафиксировать “какая страница = какой источник контента”: `docs/project/PAGE_CONTENT_MAPPING.md`
- [ ] Определить правила трансформации “старый контент → поля секций” (по типам секций)
- [x] Реализовать импорт: Strapi API scripts (создание страниц/постов/документов/локаций)
  - `mgts-backend/scripts/migration/import-pages-v2.js` (entityService) — ✅ выполнено (98 страниц), лог: `.dev/import-pages-v2.log`
- [~] Ручная доводка контента в CMS по страницам с `NEEDS_REVIEW/MISSING_SPEC`
  - В работе: новые страницы `Contact Hub`, `Career`, `AI‑Chat`

## 1B) Контент, который уже есть в Strapi и его нужно учесть
- [~] **News/Category/Tag уже загружены в Strapi** (контент для `TPL_News_List` / `TPL_News_Detail`)
  - Следующий шаг: подключить фронтенд/роутинг так, чтобы `/news` (листинг) и детальные страницы брали данные из `api::news.news`,
    а не из `api::page.page.content`.
  - Уточнение: для новостей **не планируем импорт/seed контента** (он уже в базе); планируем только:
    - контракт API (list/detail + фильтры tag/year/category)
    - фронтенд‑интеграцию (листинг/архив/деталка + модалка/роутер)
    - проверку медиа (featuredImage/gallery) и поведение при отсутствии изображения

## 2) Исследование UX/UI и функциональных требований
- [ ] Сформировать список функциональных требований (FR)
- [ ] Подобрать 10–15 референсов (high‑tech, B2B, молодежный стиль)
- [ ] Сформировать 3–4 дизайн‑направления
- [ ] Описать ключевые пользовательские сценарии

## 2.1) Ролевой аудит (каскадно, с ручной проверкой)
- [x] Подготовить тематические блоки страниц и контексты (SERVICES_CONTEXT, дерево сайта)
- [x] Определить клиента‑путь от главной до услуги и ожидания по изменениям
- [x] Роль 1: Директор по B2B продажам (ручной запуск, проверка результата)
- [x] Сжать выводы Sales в краткий summary для следующей роли
- [x] Роль 2: Профессиональный маркетолог (ручной запуск, проверка результата)
- [x] Сжать выводы Marketing + Sales для следующей роли
- [x] Роль 3: Креативный директор (ручной запуск, проверка результата)
- [x] Сжать выводы Creative для следующей роли
- [x] Роль 4: UI/UX дизайнер (ручной запуск, проверка результата)
- [x] Роль 5: Инфобез (требования и риски, без полного постраничного анализа)
- [x] Роль 6: SEO + LLM‑поиск (HTML/структура, семантика, сниппеты)
- [x] Роль 7: HR (найм и бренд работодателя)
- [x] Сводный отчет по ролям + интеграция в пункты плана (1–7)

## 3) Penpot: структура, шаблоны, библиотека (roadmap)
Источник структуры: `docs/project/PENPOT_STRUCTURE.md`.
Статус: **paused**. Принято решение использовать Stitch как основную дизайн‑среду.

### 3.1) Файлы‑разделы (Files = разделы сайта)
- [x] Создать файлы‑разделы по списку из `PENPOT_STRUCTURE.md` (раздел 1)
- [x] Установить общий префикс `NN_` для порядка (01_Главная, 02_Каталог_услуг, ...)
- [x] Выставить владельца/доступы для команды MGTS

### 3.2) Страницы внутри файлов (Pages = страницы сайта)
- [x] Создать страницы по каждому slug (полный список из `PENPOT_STRUCTURE.md`)
- [x] Добавить в название страниц slug в скобках
- [x] Отметить `[new]` у новых страниц

### 3.3) Шаблоны (MGTS_Templates)
- [x] Создать файл `MGTS_Templates`
- [x] Завести шаблоны: `TPL_Home`, `TPL_Segment_Landing`, `TPL_Service`, `TPL_Scenario`
- [x] Завести шаблоны: `TPL_News_List`, `TPL_News_Detail`, `TPL_Contact_Hub`
- [x] Завести шаблоны: `TPL_Career_List`, `TPL_Career_Detail`
- [x] Завести шаблоны: `TPL_Doc_Page`, `TPL_Form_Page`, `TPL_Search_Results`, `TPL_AI_Chat`

### 3.4) Библиотека компонентов (MGTS_UI_Kit)
- [x] Создать файл `MGTS_UI_Kit` и включить как Library
- [x] Добавить токены: цвета, типографика, 8‑pt grid, брейкпоинты
- [x] Добавить компоненты: Header, Mega‑menu, Footer, Hero, CTA, Cards, Tabs/FAQ, Forms
- [x] Добавить компоненты: Breadcrumbs, Pagination, News list, Contact cards, Logo wall
- [x] Обновлены цвета/типографика под бренд МГТС/МТС
- [x] Загружены шрифты MTS Sans и MTS Text

### 3.5) План дизайна в Penpot + критерии завершения
Цель: закрыть все компоненты/шаблоны и получить готовность к верстке.

#### 3.5.1) Библиотека компонентов — финализация
- [x] Достроить состояния кнопок (hover/active/disabled)
- [x] Достроить состояния меню и навигации (hover/active для всех меню)
- [x] Достроить состояния Tabs/Pagination (hover/active)
- [x] Достроить состояния форм (focus/error/disabled/checked) — проверить покрытие
- [x] Проверить «таблица/списки/карточки/модалки/дропдауны/аккордеоны» на полноту
- [x] Проверить соответствие форм полям из `docs/project/FIELD_COVERAGE.md`

#### 3.5.2) Шаблоны страниц (MGTS_Templates)
- [x] Собрать `TPL_Home` по требованиям ТЗ (герой, сегменты, CTA, доверие, найм)
- [x] Собрать `TPL_Service` (обязательные блоки + CTA + FAQ + похожие услуги)
- [x] Собрать `TPL_Segment_Landing` (сегментный каталог/фильтр)
- [x] Собрать `TPL_Scenario` (сценарий/кейс/процесс)
- [x] Собрать `TPL_News_List` и `TPL_News_Detail`
- [x] Собрать `TPL_Contact_Hub` + формы/контакты
- [x] Собрать `TPL_Career_List` и `TPL_Career_Detail`
- [x] Собрать `TPL_Doc_Page`, `TPL_Form_Page`, `TPL_Search_Results`, `TPL_AI_Chat`

#### 3.5.3) Страницы по дереву сайта
- [x] Разложить все страницы по файлам‑разделам (по `PENPOT_STRUCTURE.md`)
- [x] Для страниц «редизайн» применить соответствующие шаблоны
- [x] Для страниц «new» собрать из шаблонов и компонентов
- [x] Проверить соответствие слугам/дереву из ТЗ

#### 3.5.4) Дизайн‑система и контроль качества
- [ ] Проверить консистентность типографики/цветов/отступов
- [ ] Проверить доступность (контраст/размеры клика)
- [ ] Проверить мобильные версии ключевых шаблонов
- [ ] Собрать UI‑спеки: сетка, отступы, типографика, состояния

#### 3.5.5) Критерии «готово к верстке»
- [ ] Все компоненты и состояния покрыты и доступны в `MGTS_UI_Kit`
- [ ] Все шаблоны из 3.5.2 собраны и соответствуют ТЗ
- [ ] Все страницы из дерева размещены и связаны с шаблонами
- [ ] Формы покрывают все поля из `FIELD_COVERAGE.md`
- [ ] Ключевые сценарии (главная → услуга → заявка) проходят без блокеров

## 3A) Stitch‑first дизайн и экспорт в CMS
Цель: делать дизайн напрямую в Stitch и передавать в CMS через HTML‑блоки без потери качества.

### 3A.1) UI Kit в Stitch (источник правды)
- [~] Собрать UI Kit (цвета, типографика, сетка, радиусы, тени, состояния)
- [x] Создана структура HTML‑блоков в Stitch
- [x] Канонические блоки с `data-stitch-block` атрибутами
- [ ] Зафиксировать токены и размеры из `design/Design UI KIT.html`
- [ ] Проверить все компоненты на соответствие MTS‑шрифтам

### 3A.2) Шаблоны страниц разделов (Stitch)
- [x] Сформировать список шаблонов по дереву сайта
- [x] Сгенерировать шаблоны и сохранить как эталонные HTML‑страницы

### 3A.3) Страницы и тиражирование контента
- [ ] Собирать страницы из готовых HTML‑блоков
- [ ] Контент менять только в пределах блока без изменения структуры

### 3A.4) Передача в CMS
- [ ] Сохранять HTML‑блоки из Stitch в отдельные файлы
- [ ] Подготовить правила резки страницы на CMS‑блоки
- [ ] Перенести блоки в CMS без изменения структуры/стилей
- [ ] Проверить перенос CSS (локальные ассеты, отсутствие внешних зависимостей)
- [ ] Спланировать переписывание CMS‑loader (не наследовать стили/код старого сайта)

### 3A.5) CMS‑loader: динамика и интерактив (модульно)
Цель: канонические обработки + обработки внутри контента + overrides по страницам.

- [x] База loader: реестр модулей, контекст страницы (`data-page`), приоритеты, защита от двойной инициализации
- [x] Каноника: Mega‑menu (open/close + hover/click + ESC/outside + контент по пунктам)
- [x] Каноника: Tabs (data-tabs/data-tab/data-panel + aria + keyboard)
- [x] Каноника: Dropdown/Select
- [x] Каноника: Modal / Document preview
- [x] Каноника: ChoiceGroup (segmented/toggles/pagination state)
- [x] Каноника: Switch/Toggle
- [x] Каноника: Accordion (single-open для `<details>`)
- [x] Каноника: Click-to-open content previews (news cards → News Detail modal placeholder)
- [x] Каноника: Click-to-open content previews (video card → Video material modal placeholder)

Примечание (backlog):
- [x] Карусель стрелки (в `carousel_and_tab_components`) — добавлена обработка кнопок prev/next для горизонтального scroll

Контрольный артефакт:
- [x] Аудит интерактива: `docs/project/CMS_LOADER_AUDIT.md`
- [x] Аудит `data-*` хуков (html_blocks/html_pages) — покрытие каноникой подтверждено (2026-01-27)

### 2.1.1) Схема клиента‑пути (текущее состояние, базовая версия)
- [x] Клиент определяет сегмент (Госзаказчики/Застройщики/Бизнес)
- [x] Открывает главный пункт меню
- [x] Выбирает категорию/услугу в раскрытом меню
- [x] Переходит на страницу услуги
- [x] Изучает услугу и уточняющие страницы
- [x] Оставляет заявку / звонит / отправляет форму

### 2.1.1a) Шкала оценки
- [x] Для каждого критерия просить LLM поставить оценку 1–10
- [x] Фиксировать оценки текущего сайта (baseline)
- [x] Повторить оценку после редизайна и сравнить

### 2.1.1b) Общие критерии (для всех ролей)
- [x] Цель страницы: ясность задачи и ожидаемого действия
- [x] Соответствие сегменту: попадание в боли и контекст аудитории
- [x] Содержательная полнота: достаточно ли данных для решения
- [x] Доказательства: кейсы, цифры, сертификаты, SLA
- [x] Путь клиента: прямота и понятность маршрута к услуге
- [x] CTA и контакты: заметность, доступность, альтернативы

### 2.1.1c) Критерии по ролям

#### Sales (B2B)
- [x] Логика пакетов/линейки услуг
- [x] Видимость коммерческих сценариев (заявка/звонок/встреча)
- [x] Барьеры/возражения и их снятие
- [x] SLA/надежность/операционные гарантии
- [x] Конверсионные точки по пути

#### Маркетинг
- [x] УТП и позиционирование
- [x] Триггеры доверия и социальное доказательство
- [x] Сегментация и месседжи для 3 аудиторий
- [x] История бренда и долгосрочные преимущества
- [x] Консистентность тональности

#### Креативный директор
- [x] Образ high‑tech / инновационности
- [x] Узнаваемость и уникальность визуального кода
- [x] Эмоциональный эффект первого экрана
- [x] Стиль‑консистентность между разделами
- [x] “Молодёжность” без потери B2B‑серьезности

#### UI/UX
- [x] IA/структура навигации
- [x] Скорость нахождения услуги
- [x] Читаемость и визуальная иерархия
- [x] Сценарии на мобильных
- [x] Доступность (контраст, размер текста)

#### Инфобез
- [x] Обработка ПДн и юридические тексты
- [x] Безопасность форм/файлов
- [x] Политики и раскрытие информации
- [x] Риски утечек/соответствие требованиям

#### SEO + LLM‑поиск
- [x] H1‑H3 структура и уникальность
- [x] Микроразметка/FAQ/HowTo
- [x] Внутренняя перелинковка
- [x] Техническая доступность/скорость
- [x] LLM‑friendly контент (четкие ответы)

#### HR
- [x] Видимость “Найма” на главной
- [x] Сценарий поиска вакансий
- [x] EVP/бренд работодателя
- [x] Простота отклика

### 2.1.2) План батчей для LLM (по ролям)

#### 2.1.2a) Список ключевых услуг (baseline, 20 страниц)
- [ ] access_internet
- [ ] telephony
- [ ] mobile_connection
- [ ] virtual_ate
- [ ] video_surveillance_office
- [ ] digital_television
- [ ] computer_help
- [ ] security_alarm
- [ ] structured_cabling_networks
- [ ] local_computing_network
- [ ] external_communication
- [ ] network_operation
- [ ] automated_control_systems
- [ ] automated_system_monitoring_accounting
- [ ] access_control_systems
- [ ] introduction_security_tv_systems
- [ ] connecting_residential
- [ ] connecting_commercial
- [ ] connecting_construction
- [ ] developers_compensation_for_losses

#### Sales (B2B) — каскадный порядок
- [x] Батч 1: Главная + навигация + путь клиента  
  Источники: `HOME_MENU.json`, `COLLECTION_TREE.md`, `home_spec.json`, `SERVICES_CONTEXT.json`
- [x] Батч 2: Услуги — единая линейка (dedupedServices)  
  Источники: `SERVICES_CONTEXT.json` (dedupedServices + segments)
- [x] Батч 3: 20 ключевых услуг (baseline)  
  Источники: `_spec.json` по списку 2.1.2a
- [x] Батч 4: Операторы (отдельная пачка)  
  Источники: operators, operators_all_services, operators_nondiscriminatory_access, operinfo, wca, contact_for_operators
- [x] Батч 5: Партнеры (отдельная пачка)  
  Источники: partners, partner, partners_creating_work_order, partners_ramochnie_dogovori, partners_feedback_form
- [x] Батч 6: Контакты/формы/подключение  
  Источники: slugs: computer_help, contact_details, contact_for_operators, forms_doc, infoformen, partners_feedback_form, single_hotline, speakerphone
- [x] Батч 7: Документы/комплаенс (только влияние на доверие/возражения)  
  Источники: slugs: corporate_documents, documents, mgts_compliance_policies, data_processing

#### Маркетинг — каскадный порядок (с учетом summary Sales)
- [x] Батч 1: Бренд/позиционирование  
  Источники: home_spec.json + about_mgts + mgts_values + general_director_message
- [x] Батч 2: Услуги и сегменты (единая линейка)  
  Источники: `SERVICES_CONTEXT.json` (segments + dedupedServices)
- [x] Батч 3: 20 ключевых услуг (baseline)  
  Источники: `_spec.json` по списку 2.1.2a
- [x] Батч 4: Операторы (отдельная пачка)  
  Источники: operators, operators_all_services, operators_nondiscriminatory_access, operinfo, wca, contact_for_operators
- [x] Батч 5: Партнеры (отдельная пачка)  
  Источники: partners, partner, partners_creating_work_order, partners_ramochnie_dogovori, partners_feedback_form
- [x] Батч 6: Доверие/доказательства/документы  
  Источники: corporate_documents, decisions_meetings_shareholders, stockholder_copies_document, about_registrar
- [x] Батч 7: Контакты/формы/обратная связь  
  Источники: contact_details, partners_feedback_form, single_hotline, speakerphone

#### Креативный директор — каскадный порядок (с учетом summary Sales+Marketing)
- [x] Батч 1: Главная + ключевые бренд‑страницы  
  Источники: home_spec.json, about_mgts, mgts_values
- [x] Батч 2: 10–15 ключевых услуг (визуальная метафора + high‑tech)  
  Источники: `_spec.json` по списку 2.1.2a (выбор 10–15)

#### UI/UX — каскадный порядок (с учетом summary Creative)
- [x] Батч 1: Навигация + дерево сайта  
  Источники: `HOME_MENU.json`, `COLLECTION_TREE.md`
- [x] Батч 2: Путь клиента к услуге  
  Источники: home_spec.json + 10–15 ключевых услуг из списка 2.1.2a
- [x] Батч 3: Формы/контакты  
  Источники: contact_details, partners_feedback_form, forms_doc, single_hotline
- [x] Батч 4: Документы/контентные страницы  
  Источники: corporate_documents, data_processing, mgts_compliance_policies

#### Инфобез (не обязательно постранично)
- [x] Батч 1: Политики/комплаенс/ПДн  
  Источники: data_processing, cookie_processing, mgts_compliance_policies, corporate_documents, documents
- [x] Батч 2: Формы/заявки  
  Источники: forms_doc, partners_feedback_form, contact_details

#### SEO + LLM‑поиск
- [x] Батч 1: Главная + дерево сайта  
  Источники: home_spec.json, `COLLECTION_TREE.md`
- [x] Батч 2: Услуги (структура H1–H3 на 15–20 страницах)  
  Источники: `_spec.json` по списку 2.1.2a (выбор 15–20)
- [x] Батч 3: Документы/политики/FAQ  
  Источники: corporate_documents, data_processing, mgts_compliance_policies, forms_doc

#### HR
- [x] Батч 1: Главная + меню (видимость Найма)  
  Источники: home_spec.json, `HOME_MENU.json`
- [x] Батч 2: Страницы найма (если есть) или заглушки/требования  
  Источники: страницы из меню/дерева, связанные с наймом

### 2.1.3) Единый формат ответа LLM (для всех ролей)
- [x] LLM должен отвечать **строго JSON** по схеме ниже
- [x] Все поля обязательны (если данных нет — пустой массив/строка)

#### JSON‑шаблон
```json
{
  "role": "b2b_sales | marketing | creative | uiux | infosec | seo_llm | hr",
  "scope": "site | block | batch | page",
  "context": {
    "block_name": "",
    "batch_id": "",
    "pages": []
  },
  "scores": {
    "overall": 0,
    "criteria": [
      { "id": "goal_clarity", "score": 0, "notes": "" },
      { "id": "segment_fit", "score": 0, "notes": "" },
      { "id": "content_completeness", "score": 0, "notes": "" },
      { "id": "proof_points", "score": 0, "notes": "" },
      { "id": "journey_clarity", "score": 0, "notes": "" },
      { "id": "cta_access", "score": 0, "notes": "" }
    ],
    "role_criteria": []
  },
  "insights": [],
  "risks": [],
  "requirements": [],
  "quick_wins": [],
  "journey_recommendation": {
    "decision": "keep | improve | replace",
    "rationale": "",
    "proposed_changes": []
  },
  "evidence": [
    { "page": "", "section": "", "quote": "" }
  ]
}
```

#### Правила заполнения
- [x] `scores.criteria` — всегда 6 общих критериев (1–10)
- [x] `scores.role_criteria` — массив `{ id, score, notes }` по роли
- [x] `overall` — средняя оценка (округлить до 1 знака)
- [x] `requirements` и `quick_wins` — в формате action‑items **с тех.параметрами**
- [x] В каждом item должны быть поля: `what`, `why`, `impact`, `effort`, `owner`, `acceptance_criteria`
- [x] `acceptance_criteria` — конкретные метрики/пороговые значения (например, время загрузки, глубина кликов, CTR)
- [x] `evidence` — короткие цитаты/факты из контента

### 2.1.2) Чек‑листы по тематическим блокам

#### A) Услуги и сегменты
- [ ] Проверить SERVICES_CONTEXT.json и список услуг без дублей
- [ ] Зафиксировать перекрытие услуг между сегментами
- [ ] Оценить структуру подачи “единая линейка + 3 сегмента”
- [ ] Проверить CTA и входы в услуги с главной
- [ ] Источники: `mgts-backend/temp/page-analysis-llm/SERVICES_CONTEXT.json`

#### B) Главная + навигация
- [ ] Проверить структуру главного меню и футера
- [ ] Проверить логическую связность карты сайта (tree)
- [ ] Убедиться, что “Найм” виден с главной и в меню
- [ ] Проверить входы к ключевым услугам и сегментам
- [ ] Источники: `mgts-backend/temp/page-analysis-llm/HOME_MENU.json`, `mgts-backend/temp/page-analysis-llm/COLLECTION_TREE.md`

#### C) Документы / раскрытие информации / комплаенс
- [ ] Собрать перечень ключевых документов
- [ ] Проверить доступность и маршруты из меню/футера
- [ ] Зафиксировать обязательные страницы по комплаенсу
- [ ] Источники: соответствующие `_spec.json` + ссылки из боковых меню
- [ ] Список страниц (slug): about_registrar, corporate_documents, data_processing, decisions_meetings_shareholders, documents, infoformen, mgts_compliance_policies, operinfo, principles_corporate_manage, stockholder_copies_document

#### D) Контакты и формы
- [ ] Проверить все формы и сценарии обратной связи
- [ ] Проверить наличие альтернатив (телефон/почта/мессенджеры)
- [ ] Зафиксировать требования к безопасности форм
- [ ] Источники: страницы контактов/форм + `*_spec.json`
- [ ] Список страниц (slug): computer_help, contact_details, contact_for_operators, forms_doc, infoformen, partners_feedback_form, single_hotline, speakerphone

#### E) SEO + LLM‑поиск
- [ ] Проверить H1‑H3 структуру и уникальность заголовков
- [ ] Выделить страницы для FAQ/HowTo и LLM‑сниппетов
- [ ] Проверить внутреннюю перелинковку и хлебные крошки
- [ ] Зафиксировать требования к скорости/доступности
- [ ] Источники: `*_spec.json`, `*_html_for_llm.html`

#### F) Инфобез
- [ ] Перечень страниц с персональными данными
- [ ] Требования к хранению/обработке данных
- [ ] Проверка форм и загрузок файлов
- [ ] Обязательные политики и раскрытие информации
- [ ] Источники: страницы политик/комплаенса + формы
- [ ] Список страниц (slug): data_processing, cookie_processing, mgts_compliance_policies, corporate_documents, documents, forms_doc, partners_feedback_form

#### G) HR / Найм
- [ ] Наличие карьерного раздела и его видимость в меню
- [ ] Сценарии поиска вакансий и отклика
- [ ] Требования к контенту работодателя (EVP)
- [ ] Источники: страницы найма + главная + меню

## 3B) Дизайн‑среда (Stitch‑first)
- [x] Основная среда: Stitch (источник HTML‑блоков)
- [x] Penpot — локальная среда для структуры (paused)
- [ ] Уточнить процесс экспорта/синхронизации Stitch → CMS

## 4) Контент и файлы
- [ ] Аудит собранных файлов и ссылок
- [ ] Повторно скачать все файлы по найденным ссылкам
- [ ] Залить файлы в Strapi Media Library
- [ ] Зафиксировать и внедрить структуру папок в Media Library:
  - Документы: `Documents/<page-slug>/...`
  - Картинки страниц: `Images/<page-slug>/...`
  - Переиспользуемое: `Shared/Images`, `Shared/Icons`, `Shared/Logos`, `Shared/Media`
- [ ] Сформировать отчет по отсутствующим файлам

## 5) Архитектура и дизайн сайта
- [ ] Структура навигации (main + footer + sidebar)
- [ ] Главная: ключевые входы по аудиториям + найм + чат
- [ ] Полная карта сайта: все разделы и страницы (не только ключевые)
- [ ] Разделы: Застройщики / Операторы / Госзаказчики
- [ ] Все остальные разделы и страницы из собранного контента
- [ ] Раздел Найм (видимость на главной и везде)
- [ ] Раздел Документы / Раскрытие информации

## 6) Реализация фронтенда
- [ ] Выбор стека (Next.js + Tailwind и т.п.)
- [ ] Интеграция Strapi (API, типы, рендеринг)
- [ ] Реализация поиска по сайту
- [ ] Встроенный AI‑чат (поиск + ответы + контакты)

### 6A) Шаблонные страницы: ревизия после импорта в Strapi (по порядку)
Статус: проверяем “минимальную жизнеспособность” каждого шаблона и фиксируем отдельный список правок.
- [x] `TPL_Home` (страница: `tpl_home.html?slug=home`)
- [x] `TPL_Segment_Landing` (страницы: `tpl_segment_landing.html?slug=business|developers|government|operators|partners`)
  - Seed: `POST /api/pages/seed-segment-landing?slug=<slug>&force=true`
- [x] `TPL_Service` (страницы: `tpl_service.html?slug=business/access_internet` и др.)
  - Seed: `POST /api/pages/seed-service-sections?slug=<slug>`
- [x] `TPL_Scenario` (страница: `tpl_scenario.html?slug=scenario_demo`)
- [x] `TPL_Doc_Page` (страницы: `tpl_doc_page.html?slug=partners/documents` и др.)
  - Seed: `POST /api/pages/seed-doc-sections?slug=<slug>`
- [x] `TPL_Contact_Hub` (страница: `tpl_contact_hub.html?slug=contact_details`)
  - Seed: `POST /api/pages/seed-contact-hub?slug=<slug>`
- [x] `TPL_News_List` / `TPL_News_Detail` / `tpl_news_archive` (страницы: `tpl_news_list.html?slug=news`, `tpl_news_detail.html?slug=<news-slug>`)
  - API: `GET /api/news/list`, `GET /api/news/slug/:slug`, `GET /api/news/tags`, `GET /api/news/years`
- [x] `TPL_DeepNav` (через `tpl_cms_page.html?slug=about_mgts` и deepNavKey)
  - API: `GET /api/navigation/deep-nav/:key`, `GET /api/pages/by-slug?slug=<slug>`

### 6B) Текущие работы по шаблонам и рендереру
- [~] Завершить интеграцию CMS Loader с новыми компонентами
- [~] Реализовать `TPL_DeepNav` / CMS Page renderer (полная поддержка sidebar‑навигации)
- [~] Доработать `TPL_Service` — тарифы, FAQ, формы
- [~] Реализовать `TPL_Doc_Page` — files-table, pagination, фильтры
- [~] Реализовать `TPL_Contact_Hub` — locations, карта, интерактив
- [~] Перенести page-specific init из `cms-adapter-example.js` в prod адаптер
  - Уже перенесены: `tpl_news_list`, `tpl_news_archive` (подключены к `cms-adapter.js`)
  - Уже перенесены: `tpl_news_detail` (подключен к `cms-adapter.js`)
  - Уже перенесены: `tpl_cms_page` (DeepNav, подключен к `cms-adapter.js`)
  - Уже перенесены: `tpl_doc_page` (подключен к `cms-adapter.js`)
  - Уже перенесены: `tpl_contact_hub` (подключен к `cms-adapter.js`)
  - Уже перенесены: `tpl_home` (подключен к `cms-adapter.js`)
  - Уже перенесены: `tpl_segment_landing` (подключен к `cms-adapter.js`)
  - Уже перенесены: `tpl_scenario` (подключен к `cms-adapter.js`)
  - Уже перенесены: `tpl_service` (подключен к `cms-adapter.js`)

## 7) Тестирование и релиз
- [ ] SEO: мета, sitemap, robots
- [ ] Проверка ссылок и файлов
- [ ] Валидация UI/UX на основных сценариях
- [ ] Финальная выкладка

## 7B) Регресс‑чеклист (короткий)
Полный прогон всех страниц: `docs/project/QA_ALL_PAGES_CHECKLIST.md`.
- [x] `tpl_home` — hero CTA, карточки, новости/теги/пагинация (smoke 200; CTA → `/services` ok; архив новостей → `/news/archive` ok)
- [x] `tpl_news_list` — список, теги, пагинация, роутинг (smoke 200; карточки ведут на `/news/<slug>`)
- [x] `tpl_news_detail` — заголовок/контент/изображение (smoke 200; ручн: ok на `/news/<real-slug>`; slug берется из pathname)
- [x] `tpl_news_archive` — годы/теги/пагинация (smoke 200; ручн: year filter ok; карточки навигируют на `/news/<slug>`)
- [x] `tpl_segment_landing` — hero, карточки услуг/сценариев, CTA (smoke 200; CTA → `/contact` ok)
- [x] `tpl_service` — тарифы/FAQ/форма/доп. блоки (smoke 200; CTA → `/contact` ok; ассеты на вложенных URL ok)
- [x] `tpl_doc_page` — files‑table, фильтры, предпросмотр (smoke 200; фильтр не “залипает” на пустой дефолтной категории; preview modal: PDF embed, DOCX fallback + download)
- [x] `tpl_contact_hub` — категории, карточки, карта (smoke 200, ручн: открытие страницы/рендер ok)
- [x] `tpl_cms_page` — deep‑nav, секции (smoke 200; deep‑nav links ведут на pretty routes `/<slug>/`)
- [x] `tpl_scenario` — hero, FAQ, tabs (smoke 200; tabs реально переключают контент + FAQ раскрывается)
- [x] API smoke: `/api/news/*` + `/api/pages/by-slug` (200)
- [x] Маркеры DOM + подключение `cms-loader.js`/`cms-adapter.js` (ok)

## 7A) Следующие приоритетные задачи
- [ ] Завершить интеграцию CMS Loader с новыми компонентами
- [ ] Наполнить Strapi контентом новых страниц (Contact Hub, Career, AI‑чат)
- [ ] Реализовать `TPL_DeepNav` с полной поддержкой sidebar‑навигации
- [ ] Доработать `TPL_Service` — тарифы, FAQ, формы
- [ ] Реализовать `TPL_Doc_Page` — files‑table, pagination, фильтры
- [ ] Реализовать `TPL_Contact_Hub` — locations, карта, интерактив
- [ ] Начать переход на Next.js (App Router)

## 7C) Следующие шаги (контент, навигация, медиа)
- 2026-01-27 18:39: фиксация статуса перед паузой
- 2026-01-28: QA/фиксы: абсолютные пути `/assets/*` и `/cms_loader/*` во всех `design/html_pages/*.html` (вложенные URL больше не ломают CSS/JS);
  роутинг статического сервера для `/news/*` + адаптер новостей: детальная страница берет slug из pathname; карточки новостей предпочитают навигацию на `/news/<slug>` (вместо пустой модалки).
- 2026-01-28: `tpl_doc_page`: фильтр файлов не “залипает” на пустой дефолтной категории; предпросмотр документов работает (PDF embed, DOCX fallback + download link).
  `tpl_cms_page`: deep‑nav ссылки переведены на pretty routes `/<slug>/` (без `tpl_cms_page.html?slug=...`).
  `tpl_scenario`: tabs из Strapi корректно переключают панель (инициализация switcher для динамически вставленных tabs).
- 2026-01-28: ссылки в header/mega-menu/footer подтягиваются из Strapi (`/api/navigation`, `/api/footer`) в `cms-loader.js`:
  верхнее меню показывает пункты из `Navigation.megaMenus` (services/developers/operators/government/partners),
  мега-меню рендерит секции/ссылки из Strapi, футер рендерит колонки и legal links из Strapi.
- [~] Перенести контент в Strapi по страницам/блокам и проверить отображение  
  Источник: `mgts-backend/data/page-analysis-llm/branches/2026-01-22/*_spec.json`  
  Уже перенесены: `about_mgts`, `mgts_values`, `general_director_message`, `mgts_compliance_policies`, `interaction_with_partners`, `partners_feedback_form`, `single_hotline`, `principles_corporate_manage`, `corporate_documents`, `decisions_meetings_shareholders`, `infoformen`, `about_registrar`, `cookie_processing`, `data_processing`, `forms_doc`, `labor_safety`, `licenses`, `operinfo`, `stockholder_copies_document`, `timing_malfunctions`, `wca` (TPL_DeepNav); `home` (TPL_Home); `news`, `offers` (TPL_News_List); `developers`, `operators`, `government`, `business`, `partners`, `partner`, `developers_all_services`, `operators_all_services`, `government_all_services`, `business_all_services`, `all_services`, `services` (TPL_Segment_Landing); `contact_for_operators`, `partners_creating_work_order` (TPL_Form_Page); `documents`, `partners_ramochnie_dogovori`, `procedure_admission_work`, `purchas`, `realization`, `tariffs`, `bank_details` (TPL_Doc_Page); `contact_details` (TPL_Contact_Hub); `developers_digital_solutions`, `developers_connecting_objects`, `developers_compensation_for_losses`, `connecting_commercial`, `connecting_construction`, `connecting_residential`, `access_internet`, `business_equipment_setup`, `computer_help`, `mobile_connection`, `business_payment_methods`, `security_alarm`, `telephony`, `video_surveillance_office`, `digital_television`, `virtual_ate`, `joining_and_passing_traffic`, `data_transfer`, `operators_nondiscriminatory_access`, `accommodation_at_sites`, `avr_ppr`, `lks_kr`, `pir_smr_mgts`, `government_communications_infrastructure`, `external_communication`, `local_computing_network`, `network_operation`, `structured_cabling_networks`, `government_customized_solutions`, `government_digital_services`, `access_control_systems`, `automated_control_systems`, `automated_system_monitoring_accounting`, `entrance_video_surveillance`, `equipment`, `introduction_security_tv_systems`, `main_and_backup_data_transmission`, `maintenance_interface_device`, `speakerphone`, `video_surveillance_building`, `video_surveillance_maintenance` (TPL_Service)
- [~] Отладить отображение контента на страницах (ok: `about_mgts`, `mgts_values`, `general_director_message`, `developers`, `operators`, `developers_digital_solutions`, `access_internet`, `documents`, `purchas`, `services`)
- [~] Восстановить ссылки в меню/страницах/футере  
  Навигация/футер обновлены по `TECHNICAL_TASK_NEW_SITE.md`, API отдаёт `mainMenuItems`/`megaMenus`/`sections`
- [x] Следующий шаг: перезапуск Strapi и проверка `/api/navigation` и `/api/footer` (populate) — ok (данные и вложенные поля на месте)
- [~] Настроить хлебные крошки  
  Parent relations обновлены из `COLLECTION_TREE.json` (pages-hierarchy.json, 84 items)
- [~] Загрузка главной страницы по умолчанию на локальном сервере  
  `design/index.html` → redirect на `/html_pages/tpl_home.html`
- [~] Загрузить недостающий медиа‑контент и поправить ссылки на него  
  Картинки загружены и привязаны к media‑полям (hero/cards/switcher/carousel/steps); нужен визуальный QA
- [~] Док‑страницы (files‑table) — импорт после загрузки файлов в Media Library  
  Импортированы: `documents`, `partners_ramochnie_dogovori`, `procedure_admission_work`, `purchas`, `realization`, `tariffs`, `bank_details`  
  `purchas_files/*` взяты локально из `purchas_files/`
- [~] Поправить стили, где они не подцепились/работают некорректно  
  Привязка hero background к медиа для `tpl_home`/`tpl_segment_landing`/`tpl_service` добавлена, нужен визуальный QA.
  Временный fallback: в `tpl_service.html` задан inline background-image для `[data-service-hero-bg]`, чтобы не было пустого hero при `page.hero.backgroundImage = null`.
- [~] Проверить работу кнопок/заглушек (для внешних API)  
  Hero CTA для `tpl_service` подключен к `page.hero.ctaButtons` + дефолтные href, требуется проверка кликов
  - `tpl_home`: hero CTA → `/services` (redirect to `tpl_segment_landing.html?slug=services`)
- 2026-02-03: `corporate_documents`, `operinfo`, `wca` — восстановлены `Document Tabs`, списки документов отформатированы под референс; предпросмотр/скачивание разделены (клик по названию → модалка, по иконке → download)
- 2026-02-03: QA 7C аудит `spec.json ↔ Strapi` обновлен (mapping-based) в `docs/project/QA_7C_SPEC_AUDIT.md`; выполнен batch‑импорт страниц из списка — дальше нужна персональная проверка и доработка страниц из отчета

## Текущие заметки
- Приоритет аудитории: **Застройщики** → **Операторы** → **Госзаказчики**
- Раздел **Найм** обязателен на главной и в меню
- Нужны **поиск** и **AI‑чат** на всех страницах
- 2026-01-26: проверено покрытие шаблонов в `design/cms_loader` (рендер + интерактив)

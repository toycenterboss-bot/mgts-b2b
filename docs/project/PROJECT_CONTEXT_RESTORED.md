# Контекст проекта: Новый сайт МГТС (B2B)

**Дата восстановления контекста:** 2026-02-19  
**Источник:** файлы из `docs/project/`

---

## 📋 Краткое резюме проекта

Проект по созданию нового B2B-сайта для МГТС (Московская городская телефонная сеть). Основная цель — модернизация существующего сайта с переходом на современный стек технологий, внедрением CMS (Strapi) и созданием единой дизайн-системы.

**Ключевые характеристики:**
- **Аудитория:** Застройщики → Операторы → Госзаказчики (приоритет)
- **Стиль:** High-tech, молодежный, но B2B-серьезный
- **Технологии:** Strapi CMS, Next.js (планируется), Stitch (дизайн-среда)
- **Статус:** Активная разработка — интеграция Strapi и стабилизация UI, основная миграция контента завершена

---

## 🎯 Основные цели и приоритеты

1. **Создание единого B2B-сайта** с приоритетом на сегменты: Застройщики → Операторы → Госзаказчики
2. **Внедрение CMS (Strapi)** для управления контентом
3. **Редизайн** существующих страниц с сохранением контента
4. **Создание новых страниц:** Contact Hub, Career, AI-чат, каталог услуг
5. **Унификация UX/UI** — единые шаблоны и компоненты
6. **SEO/LLM-оптимизация** — FAQ, микроразметка, семантическая структура

---

## 📁 Структура проекта

### Карта проекта (актуальная)

- **`SiteMGTS/`** — старый фронтенд (legacy HTML) и исходные страницы для миграции
- **`design/`** — дизайн‑система и шаблоны (Stitch), фронтовый CMS loader
  - `design/html_pages/` — канонические HTML‑шаблоны TPL_*
  - `design/cms_loader/` — загрузчик контента + адаптеры + мегаменю
- **`mgts-backend/`** — Strapi CMS (v5), схемы, контент, плагины, скрипты
  - `src/api/` — content types и контроллеры (page/navigation/footer/icon)
  - `src/components/` — компоненты страниц/навигации
  - `src/plugins/icon-picker/` — кастомный выбор иконок
  - `scripts/` — миграции/обновления/проверки контента
- **`docs/`** — документация проекта (план, ТЗ, контракты, аудиты)

### Документация организована по категориям:

- **`docs/cms/`** — типизация контента, интеграция, структура
- **`docs/fixes/`** — исправления структуры HTML, страниц, стилей
- **`docs/installation/`** — установка и настройка окружения
- **`docs/analysis/`** — отчеты и анализы
- **`docs/guides/`** — руководства для редакторов и разработчиков
- **`docs/status/`** — статусы и прогресс проекта
- **`docs/project/`** — основная документация проекта (этот файл здесь)

---

## ✅ Что уже сделано

### 1. Нормализация HTML (100% завершено)
- ✅ 97 файлов нормализовано в `pages-content-normalized/`
- ✅ 97 файлов нормализовано в `pages-content-normalized-split/`
- ✅ **100% маппинг классов** — все классы преобразованы в целевые классы компонентов Strapi
- ✅ Все старые классы заменены на новые классы компонентов
- ✅ Служебные классы удалены
- ✅ SVG элементы корректно обработаны

**Результат:** Все HTML файлы готовы к миграции в Strapi

### 2. Миграция страниц в Strapi (98 страниц)
- ✅ 98 страниц мигрировано в Strapi
- ✅ Parent связи установлены (75 из 75 страниц, 100%)
- ✅ Иерархия страниц восстановлена и отображается в Strapi
- ✅ Breadcrumbs настроены — строятся автоматически из parent иерархии

### 3. CMS Loader и интерактивность
- ✅ CMS Loader обновлен — все компоненты поддерживаются
- ✅ JS инициализация подключена
- ✅ Меню и навигация перестроены — header, footer, sidebar обновлены динамически

**Реализованные канонические модули:**
- Mega-menu (open/close + hover/click + ESC/outside)
- Tabs (data-tabs/data-tab/data-panel + aria + keyboard)
- Dropdown/Select
- Modal / Document preview
- ChoiceGroup (segmented/toggles/pagination state)
- Switch/Toggle
- Accordion (single-open для `<details>`)
- Click-to-open content previews (news cards, video cards)
- Carousel (стрелки prev/next для горизонтального scroll)

### 3.1 Иконки и мега‑меню
- ✅ Реализован кастомный **Icon Picker** для Strapi (поиск + грид + подгрузка)
- ✅ Поля иконок переведены на `customField` (строковые значения)
- ✅ Импорт SVG из Media Library в `api::icon.icon` + очистка заглушек
- ✅ Мега‑меню: подстановка иконок из Strapi по имени (без “текстовых” иконок)

### 4. Дизайн-система (Stitch)
- ✅ Создана структура HTML-блоков в Stitch
- ✅ Определены шаблоны страниц (TPL_*)
- ✅ Созданы канонические блоки с `data-stitch-block` атрибутами
- ✅ Настроен контракт интеграции CMS ↔ HTML (см. `CMS_INTEGRATION_CONTRACT.md`)

**Шаблоны (TPL_*):**
- `TPL_Home` — главная страница
- `TPL_Segment_Landing` — лендинги сегментов
- `TPL_Service` — страницы услуг
- `TPL_Scenario` — сценарии использования
- `TPL_News_List` / `TPL_News_Detail` — новости
- `TPL_Contact_Hub` — контакты
- `TPL_Doc_Page` — документы
- `TPL_DeepNav` — страницы с глубокой навигацией
- `TPL_Form_Page` — формы
- `TPL_Search_Results` — результаты поиска
- `TPL_AI_Chat` — AI-чат

### 5. Ролевой аудит (завершен)
Проведен каскадный аудит по ролям:
- ✅ Sales (B2B) — анализ коммерческих сценариев
- ✅ Marketing — позиционирование и месседжи
- ✅ Creative Director — визуальная концепция
- ✅ UI/UX — навигация и пользовательский опыт
- ✅ Infosec — безопасность и комплаенс
- ✅ SEO/LLM — поисковая оптимизация
- ✅ HR — найм и карьера

**Результат:** Сформированы требования и решения (см. `DECISION_LOG.md`)

### 6. Penpot (локальная среда)
- ✅ Развернута локальная dev-среда Penpot (`https://localhost:3449`)
- ✅ Создана структура файлов/страниц
- ✅ Созданы шаблоны `MGTS_Templates`
- ✅ Создана библиотека компонентов `MGTS_UI_Kit`
- ✅ Загружены шрифты MTS Sans и MTS Text
- ✅ Токены обновлены под брендовые цвета и типографику

**Примечание:** Принято решение использовать Stitch как основную дизайн-среду, Penpot — paused

---

## 🏗️ Архитектура и технологический стек

### Backend/CMS
- **Strapi v5** (самостоятельный хостинг) + SQLite (локально)
- **API:** REST (по умолчанию) + опционально GraphQL
- **База данных:** SQLite для локальной разработки (`mgts-backend/.tmp/data.db`)

### Локальные версии и адреса
- **Strapi:** 5.36.0 (`http://localhost:1337`)
- **Next.js:** 16.1.6 (Turbopack, `http://localhost:3000`)
- **Static:** `python3 dev_server.py 8002` (`http://localhost:8002`)
- **Node.js:** v25.6.1 (локальная среда)

### Frontend (текущее состояние)
- ✅ **Next.js (App Router) + React** — полноценный рендер страниц без `tpl_*.html` и `cms_loader`
- ✅ Header/Mega‑menu/Footer берутся из Strapi и отрисованы React‑компонентами
- ✅ `PageRenderer` рендерит hero + dynamic zones (`sections`) из Strapi; `page.service-order-form` выносится в `FooterContactForm` по наличию в секциях
- ✅ `SectionRenderer` принудительно использует `service-cards` для `TPL_Service` и `TPL_DeepNav`
- ✅ `DocumentTabs` и `SectionTable` поддерживают предпросмотр документов (modal preview)
- ✅ Нормализация ссылок, хлебные крошки и левое меню (active/parent‑state)
- ✅ Новостной раздел `/news` и `/news/:slug` подключен к Strapi
- ✅ Включён переключатель темы, light‑overrides перенесены в `mgts-frontend/src/app/light-theme.css`

### Frontend (планируется)
- Полировка визуального паритета (частные расхождения по CSS)
- Усиление типизации данных Strapi и формы (валидации)
- Подготовка к прод: SSR/ISR, CDN для media, мониторинг ошибок

### Дизайн-среда
- **Stitch** — основная среда для создания HTML-блоков
- **Penpot** — локальная среда (paused, используется для структуры)

### Поиск и AI-чат (планируется)
- **Поиск:** Meilisearch или Typesense
- **AI-чат:** Ollama + open-source модель (Mistral 7B) или Perplexity API (текущий PoC)

---

## 📊 Структура данных в CMS

### Content Types (Strapi)

#### Основные типы:
- **`api::page.page`** — страницы сайта (Dynamic Zones)
- **`api::navigation.navigation`** — главное меню (single type)
- **`api::footer.footer`** — подвал сайта (single type)
- **`api::icon.icon`** — каталог иконок (SVG превью + имя)
- **`api::news.news`** — новости (уже загружены)
- **`api::news-category.news-category`** — категории новостей
- **`api::news-tag.news-tag`** — теги новостей

#### Планируемые типы:
- **`api::service.service`** — услуги (заменит `product`)
- **`api::document.document`** — документы
- **`api::vacancy.vacancy`** — вакансии
- **`api::location.location`** — локации для Contact Hub

### Dynamic Zone компоненты (Page.sections)

Реализованные компоненты:
- ✅ `page.section-text` — текстовые секции
- ✅ `page.section-cards` — карточки
- ✅ `page.section-grid` — сетка
- ✅ `page.section-table` — таблицы
- ✅ `page.tariff-table` — тарифные таблицы
- ✅ `page.service-faq` — FAQ для услуг
- ✅ `page.document-tabs` — вкладки документов
- ✅ `page.history-timeline` — временная линия
- ✅ `page.image-carousel` — карусель изображений
- ✅ `page.image-switcher` — переключатель изображений
- ✅ `page.section-map` — карты (Яндекс.Карты)
- ✅ `page.files-table` — таблица файлов
- ✅ `page.crm-cards` — CRM карточки
- ✅ `page.how-to-connect` — инструкции подключения
- ✅ `page.service-tabs` — вкладки услуг
- ✅ `page.service-order-form` — форма заказа услуги

---

## 🗺️ Структура сайта

### Основные разделы

- `/` — Главная
- `/developers` — Застройщикам (ключевой приоритет)
- `/operators` — Операторам
- `/government` — Госзаказчикам
- `/business` — Бизнесу
- `/partners` — Партнёрам
- `/services` — Каталог услуг (единая линейка + сценарии)
- `/contact` — Контакты (Contact Hub) [new]
- `/career` — Найм/Карьера [new]
- `/documents` — Документы/Комплаенс [new]
- `/about` — О компании
- `/news` — Новости
- `/ai-chat` — AI-чат [new]

### Страницы ключевых услуг (20+ страниц)

Все услуги приведены к единому шаблону `TPL_Service`:
- access_internet, telephony, mobile_connection, virtual_ate
- video_surveillance_office, digital_television, computer_help
- security_alarm, structured_cabling_networks, local_computing_network
- external_communication, network_operation, automated_control_systems
- automated_system_monitoring_accounting, access_control_systems
- introduction_security_tv_systems, connecting_residential
- connecting_commercial, connecting_construction
- developers_compensation_for_losses

**Полное дерево страниц:** см. `site-structure-tree.md` (45+ страниц)

---

## 🎨 Дизайн и UI/UX

### Визуальная концепция
- **Core visual:** "Нервная система мегаполиса"
- **Визуальный язык:** сетевые паттерны, световые трассы, графика данных
- **Тон:** high-tech, молодежный, B2B-серьезный

### Единый шаблон страницы услуги

**Структура секций (фиксированный порядок):**
1. Hero — H1 + ценностное предложение + основной CTA
2. Кому подходит — сегменты/сценарии (3–6 карточек)
3. Возможности/состав услуги — 3–7 карточек или список
4. Сценарии/кейсы применения — 2–4 сценария
5. Пакеты/опции — Start/Optimum/Enterprise (если применимо)
6. SLA/сроки/цены — диапазоны, условия
7. FAQ — 6–10 вопросов
8. Документы/ссылки — регуляторика/оферты
9. Trust-signals — сертификаты/лицензии/цифры/кейсы
10. Финальный CTA — единая форма + обещание SLA ответа

### Требования к CTA
- Основной CTA "Подобрать решение / Оставить заявку" → `/contact`
- Вторичный CTA: "Скачать презентацию / Узнать условия"
- CTA повторяется минимум 2 раза (hero + финал)

---

## 🔧 Интеграция Stitch ↔ CMS

### Принципы интеграции

1. **HTML из Stitch — источник истины** по разметке/классам
2. **CMS хранит только данные + порядок секций** (Dynamic Zones)
3. **Интерактив через `cms-loader.js`** и `data-*` хуки
4. **Единый контракт:** `mgts:open`, `mgts:choiceChange`, `mgts:billingChange`, `mgts:switch`

### Канонические хуки (data-атрибуты)

- `data-modal-open="modalId"` — открыть модалку
- `data-route-open="/path"` — перейти по маршруту
- `data-open-mode="modal|navigate"` — выбор режима
- `data-choice-group` — пагинация / сегментированные переключатели
- `data-billing` — таблица тарифов (billing toggle)
- `data-switcher` — сайдбар/меню → переключение панелей
- `data-loadmore` — load more (список)
- `data-contact-hub` — контакты/карта

### События для CMS

- `mgts:open` (cancelable) — главный хук роутинга/модалок
- `mgts:choiceChange` — смена активного пункта
- `mgts:billingChange` — переключение monthly/yearly
- `mgts:switch` — смена панели

**Документация:** `CMS_INTEGRATION_CONTRACT.md`

---

## 📝 Маппинг страниц → блоки

### Источники правды

- **Routes → Templates → Stitch blocks:** `PAGE_BLOCK_MAPPING.md`
- **Routes → контент → CMS поля:** `PAGE_CONTENT_MAPPING.md`
- **Целевая модель Strapi:** `CMS_TARGET_SCHEMA.md`

### Примеры маппинга

**TPL_Home:**
- `header_and_mega_menu`
- `breadcrumbs`
- `hero_section_and_cta_banner_1`
- `service_and_scenario_cards_1`
- `news_and_documents_list_1`
- `footer_and_contact_form`

**TPL_Service:**
- `header_and_mega_menu`
- `breadcrumbs`
- `hero_section_and_cta_banner_2`
- `pricing_and_specs_table`
- `accordions_and_sidebar_ui_1`
- `footer_and_contact_form`

**Полный список:** см. `PAGE_BLOCK_MAPPING.md`

---

## 🚀 Текущий статус и следующие шаги

### Завершено ✅
- Нормализация HTML (100%)
- Миграция страниц в Strapi (98 страниц)
- Установка parent связей (100%)
- Настройка breadcrumbs
- Обновление CMS Loader
- Создание дизайн-системы в Stitch
- Ролевой аудит и формирование требований
- Аудит интерактивных `data-*` хуков (html_blocks/html_pages) — покрытие каноникой подтверждено
- Чек-лист page-specific init (adapter) для шаблонов — `CMS_INTERACTIONS_AUDIT.md`
- Page-specific init реализован в `cms-adapter-example.js` (требуется перенос в prod адаптер)
- Каркас prod адаптера создан: `design/cms_loader/cms-adapter.js` (подключен для news list/archive)
- Перенос в prod адаптер: `tpl_news_list` и `tpl_news_archive` + подключение на страницах
- Перенос в prod адаптер: `tpl_news_detail` + подключение на странице
- Перенос в prod адаптер: `tpl_cms_page` (DeepNav) + подключение на странице
- Перенос в prod адаптер: `tpl_doc_page` + подключение на странице
- Перенос в prod адаптер: `tpl_contact_hub` + подключение на странице
- Перенос в prod адаптер: `tpl_home` + подключение на странице
- Перенос в prod адаптер: `tpl_segment_landing` + подключение на странице
- Перенос в prod адаптер: `tpl_scenario` + подключение на странице
- Перенос в prod адаптер: `tpl_service` + подключение на странице

### В работе ⏳
- Регресс‑проверка всех шаблонов после обновлений CMS Loader
- Полировка визуала (контраст, иконки, меню, формы) по страницам
- Наполнение Strapi контентом для новых страниц и блоков
- Доработка TPL_DeepNav (активные состояния, иконки, стили)
- Доработка TPL_Service (тарифы + FAQ + формы)
- Сравнение и выравнивание mega‑menu (прозрачность/blur) между React и static
- Восстановление обработки `Section Cards` на странице `/developers_connecting_objects`

### Планируется 📋
- Переход на Next.js (App Router)
- Внедрение поиска (Meilisearch/Typesense)
- Внедрение AI-чата (Ollama/Perplexity)
- SEO оптимизация (микроразметка, sitemap.xml)
- Аналитика (Yandex Metrica + Matomo)
- Baseline security controls

---

## 🔑 Ключевые решения (из DECISION_LOG.md)

### Приоритеты
- **Сегменты:** Застройщики → Операторы → Госзаказчики
- **Core value prop:** "Инфраструктура связи и сервисов с гарантированным SLA под задачи застройщиков, операторов и гос."

### Сценарии (5–7 entry points)
- Подключить объект
- Инфраструктура 360
- Безопасный объект
- Связь/данные
- Видео-наблюдение и доступ
- Эксплуатация сети

### Контакты
- **Единый Contact Hub** (`/contact`) с роутингом по сегменту/задаче
- **SLA:** Ответ в течение 24 часов

### Пакеты услуг
- Start/Optimum/Enterprise для connectivity/video/infrastructure
- Ценообразование: "от …" / "по запросу" для Enterprise

### Визуальная концепция
- **Core visual:** "Нервная система мегаполиса"
- **CTA стандарт:** High-contrast button с subtle glow и micro-motion

### Навигация
- Максимальная глубина: ≤ 2 уровня для коммерческих услуг, 3 уровня для документов

---

## 📚 Важные документы

### Основные документы проекта
- `CONTEXT.md` — основной контекст, API токены
- `TECHNICAL_TASK_NEW_SITE.md` — техническое задание
- `PLAN_MGTS_NEW_SITE.md` — план работ
- `DECISION_LOG.md` — журнал решений
- `IMPLEMENTATION_BACKLOG.md` — бэклог реализации

### Схемы и маппинги
- `CMS_TARGET_SCHEMA.md` — целевая схема Strapi
- `PAGE_BLOCK_MAPPING.md` — маппинг страниц → HTML-блоки
- `PAGE_CONTENT_MAPPING.md` — маппинг страниц → контент CMS
- `CMS_INTEGRATION_CONTRACT.md` — контракт интеграции

### Руководства
- `STRAPI_RUNBOOK.md` — проверенные подходы работы со Strapi
- `CMS_LOADER_AUDIT.md` — аудит интерактивности
- `CMS_INTERACTIONS_AUDIT.md` — аудит взаимодействий

### Структура
- `site-structure-tree.md` — полное дерево всех страниц (45+ страниц)
- `PENPOT_STRUCTURE.md` — структура в Penpot
- `STITCH_TEMPLATE_MAPPING.md` — маппинг шаблонов Stitch

---

## 🛠️ Работа со Strapi

### Базовые команды

**Запуск окружения:**
```bash
./scripts/dev/start_all.sh
```

**Остановка:**
```bash
./scripts/dev/stop_all.sh
```

**URL:**
- Admin: `http://localhost:1337/admin`
- HTML: `http://localhost:8002/html_pages/`

### Бэкапы

**Создание бэкапа:**
```bash
node mgts-backend/scripts/backup-strapi-pages.js
```

**Восстановление:**
```bash
node mgts-backend/scripts/restore-strapi-pages.js
```

### Полный reset (SQLite)

**Сохранить uploads, удалить контент:**
1. Остановить Strapi
2. Удалить `mgts-backend/.tmp/data.db`
3. Запустить Strapi заново

**Удалить только страницы:**
```bash
node mgts-backend/scripts/delete-all-strapi-pages.js --yes
```

### Media Library структура

- **Documents:** `Documents/<page-slug>/...`
- **Images:** `Images/<page-slug>/...`
- **Shared:** `Shared/Images/`, `Shared/Icons/`, `Shared/Logos/`, `Shared/Media/`

---

## 🔐 API токены и доступы

### Strapi API Token
- Хранится в переменной окружения: `STRAPI_API_TOKEN`
- Использование: `export STRAPI_API_TOKEN="<token>"`
- Создается в Strapi Admin → Settings → API Tokens

### Perplexity API Token
- Хранится в переменной окружения: `PERPLEXITY_API_KEY`
- Использование: `export PERPLEXITY_API_KEY="pplx-<key>"`
- Используется для семантического анализа контента

### Penpot (локальная среда)
- URL: `https://localhost:3449`
- Репозиторий: `/Users/andrey_efremov/Downloads/penpot-develop`
- Запуск: `./manage.sh start-devenv` + `./manage.sh run-devenv`

---

## 📈 Метрики и KPI

### MVP KPI (утверждены)
- CTA CTR (click-through rate)
- Form conversion (конверсия форм)
- % qualified leads (процент квалифицированных лидов)

### Аналитика (планируется)
- **Yandex Metrica** + **Matomo** (self-hosted)
- GA4 опционально
- События: CTA-клики, отправка форм, поиск, AI-чат, scroll depth, скачивание файлов

---

## 🔒 Безопасность (baseline controls)

### Транспорт и заголовки
- TLS 1.2+ + HSTS
- Secure cookies, SameSite
- CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Защита приложений
- WAF + rate limits + bot protection
- CSRF + input validation + server-side sanitization
- Ограничения file upload + AV scan + whitelist типов

### Операционные меры
- Централизованные audit-логи
- SAST/DAST + dependency scanning (CI)
- Регламент обновлений и патчей

---

## 📞 Контакты и поддержка

**Документация:**
- Основная папка: `docs/project/`
- Полная документация: `docs/` (220+ файлов)

**Скрипты:**
- Основные: `mgts-backend/scripts/`
- Утилиты: `scripts/utils/`
- Setup: `scripts/setup/`

**Логи:**
- Strapi: `.dev/strapi.log`
- Static server: `.dev/static.log`

---

## 🧩 Обновления за 2026-02-03

- ✅ `general_director_message`: добавлен компонент `page.ceo-feedback` (форма обращения), медиа‑поля `portraitImage`/`video` и подключение к шаблону
- ✅ Исправлен populate медиа для `page.ceo-feedback` в `/api/pages/by-slug`
- ✅ Модалка видео в обращении сделана компактнее (50vh + уменьшенная ширина)
- ✅ `corporate_documents`, `operinfo`, `wca`: повторный импорт табов → `page.document-tabs` восстановлен
- ✅ Списки документов в табах отформатированы под референс (карточки как в `code news docs.html`)
- ✅ Разделено поведение: клик по названию → предпросмотр, клик по иконке → скачивание
- ✅ Фикс модальных окон: делегирование кликов для `data-modal-close` (динамические модалки)
- ✅ Кнопка закрытия в предпросмотре документов сделана контрастной

- ✅ Исправлено отображение `Footer.legalLinks` из Strapi: унифицирована нормализация ссылок по `label` + `href`
- ✅ Исправлены селекторы с `md:` (экранирование Tailwind‑классов)
- ✅ Уплотнены списки ссылок в секциях футера (меньше `gap`, компактный `line-height`)
- ✅ Восстановлены новости: фильтры/пагинация/модалка + корректное размещение блока документов
- ✅ `contact_details`: интерактив карты и фильтры возвращены
- ✅ `about_registrar`: FAQ переведен из `Section Cards` в `Service FAQ`
- ✅ `data_processing`: таблицы загружены в `Section Table` и корректно рендерятся
- ✅ `decisions_meetings_shareholders`: добавлены `Document Tabs` с документами по годам
- ✅ `forms_doc`: загружены двухуровневые табы с файлами
- ✅ `business/equipment_setup`: финальные стили (hero/CTA, ширины, отступы), карточки `Section Cards` как в референсе, иконки и управление колонками (1–4)
- ✅ `computer_help`: slug‑alias `business/equipment_setup/computer_help` → `computer_help`, секции с `isVisible` и настройки отображения/контраста текстовых блоков

---

## 🧩 Обновления за 2026-02-19

- ✅ Кастомный **Icon Picker** в Strapi (поиск + грид + подгрузка)
- ✅ Иконки переведены на `customField` и унифицированы в компонентах
- ✅ Импорт SVG из Media Library в `api::icon.icon`, очистка заглушек
- ✅ Мега‑меню: подстановка иконок из Strapi по имени + cache‑buster loader
- ✅ Исправления контраста и читабельности в светлой теме (меню/CTA/формы)
- ✅ Исправлены populate‑конфиги навигации и отключена телеметрия Strapi

---

## 🧩 Обновления за 2026-02-20

- ✅ Полный переход на React‑компоненты в `mgts-frontend` (без `tpl_*.html` и `cms_loader`)
- ✅ Реализованы все ключевые секции Strapi (text/table/map, service, career, history, CEO form)
- ✅ Header/Mega‑menu/Footer + нормализация ссылок на pretty‑URL
- ✅ Breadcrumbs и левое меню (active + parent state) подключены
- ✅ Светлая тема перенесена в `light-theme.css`, добавлен переключатель темы
- ✅ Исправлен `section-table` для ячеек с несколькими ссылками
- ✅ QA‑скрипт `scripts/qa/check-pages.js` + отчёт `docs/project/NEXTJS_QA_REPORT.md`
- ✅ Полный обход дерева страниц — **100/100** успешных ответов


---

## 🧩 Обновления за 2026-03-03

- ✅ `SectionTable` приведён к статике: светлые/тёмные палитры, header/rows, документ‑карточки + CTA блок
- ✅ `SectionTable` получил модальное предпросмотр + download (как в `DocumentTabs`)
- ✅ `DocumentTabs` для DeepNav: заголовок, таб‑стек, мета‑лейбл `• документ`, дефолтная вкладка `0`
- ✅ `Footer` выровнен под статик: типографика заголовков/ссылок, удаление дубля legal‑ссылок, нормализован gap
- ✅ `TPL_DeepNav`: `service-cards` для `SectionCards`, `font-display` в левом меню
- ✅ `TPL_Service`: добавлены `light-leak` декорации как в статике
- ✅ Маршрут `/partners/all_services` привязан к slug `developers_all_services` (см. `mgts-frontend/src/lib/strapi.ts`)

### Текущий статус визуальной отладки (последний `visual-compare`)
- Отчёт: `docs/project/visual-compare/report.md`
- Топ‑страницы с расхождениями: `/search`, `/contact`, `/career`, `/operators`, `/cookie_processing`, `/developers`
- Дальше в очереди: `mega-menu` (прозрачность/blur), `Section Cards` на `/developers_connecting_objects`

---

## 🎯 Следующие приоритетные задачи

1. **Полировка визуального паритета** (точечные стили/отступы)
2. **Усиление типизации и валидции форм**
3. **Подготовка к прод‑развёртыванию** (SSR/ISR, CDN, мониторинг)

---

**Последнее обновление:** 2026-03-03  
**Версия документа:** 1.3

# Легаси: SiteMGTS и design/ — что это и что из этого живо

## SiteMGTS — статическая копия текущего сайта МГТС

**143 HTML-файла** (`find SiteMGTS -name "*.html" | wc -l`): 12 компонентов в
`components/`, 2 служебных (`page-template.html`, `test-components.html`), `index.html`,
остальные ~129 — контентные страницы.

### Разделы

| Раздел | Страниц | Что внутри |
|---|---|---|
| `business/` | 26 | `internet/{gpon,dedicated,office}`, `telephony/{fixed,ip,vpbx,mobile}`, `security/{video-surveillance,access-control,alarm}`, `cloud/{storage,vps,services}`, `tv/{iptv,office}`, `business_all_services`, `mobile_connection`, `computer_help` |
| `government/` | 19 | видеонаблюдение, СКУД, СКС, АСУ, ЛВС, `government_all_services` |
| `operators/` | 12 | `lks_kr`, `joining_and_passing_traffic`, `data_transfer`, `accommodation_at_sites`, `avr_ppr`, `pir_smr_mgts` |
| `about_mgts/` | 13 | **старая** структура «О компании» |
| `about/` | 12 | **новая** структура того же контента |
| `partners/` | 10 | `tariffs`, `realization`, `purchas`, `documents`, `procedure_admission_work` |
| `developers/` | 8 | `connecting_{residential,construction,commercial}`, `developers_digital_solutions` |
| одиночные | по 1 | `home`, `news`, `offers`, `contacts`, `contact_details`, `bank_details`, `licenses`, `labor_safety`, `operinfo`, `virtual_ate`, `wca`, `forms_doc`, `timing_malfunctions`, `data_processing`, `cookie_processing` |

⚠️ **`about/` и `about_mgts/` — дублирующие ветки одного контента** (старые slug-и vs
новые kebab-case). Признак незавершённой реструктуризации; не перепутать при поиске.

### 🔴 Два разных дерева сайта под одними документами

Это ловушка, на которой легко потерять день:

- Документы **января 2026** оперируют структурой `business/internet/gpon`,
  `business/telephony/vpbx`, `business/cloud/vps`, `about/ethics/general-director-message`
  — **это структура самодельного прототипа**.
- Документы **февраля–марта 2026** оперируют `business/access_internet`,
  `business/digital_television`, `government/digital_services/*`,
  `operators/infrastructure/*`, `general_director_message` — **это реальная структура МГТС**.

Ни один документ января не помечен как относящийся к другому дереву. Читатель,
применивший `docs/guides/development/HTML_TYPIZATION_PLAN.md` («приоритетные страницы:
business/telephony, business/internet, business/security, business/cloud, business/tv»)
к текущему сайту, **не найдёт ни одной из них**.

### CSS и JS легаси-сайта

CSS: `css/style.css` (65 КБ, дизайн-система), `home-page-normalize.css` (29 КБ, только
главная), `service-components.css` (20 КБ, 23 подключения), `css/components/` — 11 модулей.
Внешняя зависимость без фолбэка: **Font Awesome 6.4.0 с `cdnjs.cloudflare.com`,
130 подключений**.

JS: 26 файлов, на каждой странице стандартный набор из 15 скриптов.
Ключевое: `js/api-client.js:5` — `const API_BASE_URL = window.STRAPI_URL || 'http://localhost:1337/api'`.
**Легаси-сайт уже умеет тянуть контент из Strapi** — это переходное звено поколения A→B:
статику превратили в тонкий рендерер над той же CMS до перехода на Next.js.
`cms-loader.js` включает API только на `localhost`/`127.0.0.1`.

Мусор в `js/`: `cms-loader-backup.js` (**418 КБ**), `cms-loader-v2.js`,
`fix-script-paths.js`, `fix-all-script-paths.js`, `add-cms-to-all-pages.js`.

### Компоненты и шаблон

`page-template.html` — пустой каркас: `<div data-component="header">`,
`<main id="main-content">` (заполняется из API), `footer`, `sidebar-about`, индикатор
загрузки, блок ошибки CMS.
`components/` — 12 HTML: `header.html` (11 КБ, mega-menu), `footer.html`,
`sidebar-about.html`, `content-wrapper.html`, `sticky-cta.html` + 7 примеров секций услуг.

Механика: `components-loader.js` подставляет компоненты в `[data-component="…"]`.
Так работает **131 из 143** страниц; **42 страницы содержат жёстко вшитый `<header>`** —
миграция на компоненты не доведена до конца.

### Статус
`.cursorignore` и `.vscode/settings.json` целиком исключают `SiteMGTS/**` из поиска.
Раздел считается **замороженным источником**, не полем для правок.
Фронтом он не используется вообще: `grep` по `mgts-frontend/src` — 0 упоминаний.

## design/ — вот это и есть живой легаси-слой

**112 МБ.** Именно `design/`, а не `SiteMGTS/`, читается рантаймом фронта
(`app/assets/[...path]/route.ts`, `lib/templateBlocks.ts`).

| Путь | Что |
|---|---|
| `design/html_blocks/` | **63 блока** Stitch, каждый — папка с `block.html` + `deps.html`. **Источник истины по вёрстке** |
| `design/html_pages/` | 31 файл — результат `build_html_pages.py`: 14 `tpl_*.html` + готовые страницы + демо + сырые выгрузки Stitch. **Не редактировать руками** — перегенерируются |
| `design/cms_loader/` | 19 файлов, клиентский рантайм поколения B: `loader/{core,components,navigation,mega-menu,top-menu,footer}.js`, `adapter/{core,pages,cms-page,news,sections,service,tariffs,documents,legacy}.js`. Фронтом не используется |
| `design/assets/` | 50 МБ: `css/stitch-tailwind.css` (бандл Tailwind **v3**), шрифты, изображения, логотип |
| `design/tailwind/` | Отдельный мини-проект сборки Tailwind v3. `tailwind.config.cjs:3` — `content: ["../html_blocks/**/*.html"]` — **не включает фронт** (см. B-04) |
| `design/generated_icons/` | 4 SVG-спрайта от Stitch, имена не разобраны |
| `design/svgviewer_selected/` | 194 отобранных SVG-иконки |
| `design/icon_audit.md` | Аудит иконок с готовыми промптами для Stitch на генерацию замен |
| `design/icon_audit_strapi.md` | 218 КБ, то же по фактическим данным Strapi |
| `design/icon_svgviewer_selected*.{json,md}` | **13 пар файлов** — версии подбора иконок: `_nav`, `_nav_v24`, `v24b…v24e`, `_pages_v24`… Применяются `mgts-backend/scripts/apply-svgviewer-icons.py` |
| `design/dev_server.py` | Dev-сервер :8080. Дублирует `scripts/dev/static_server.py` (:8002) |

⚠️ **Две выгрузки Stitch:** `design/stitch_header_and_mega_menu/` (50 папок) и
`design/stitch_header_and_mega_menu 2/` (53 папки). Вторая полнее на 3 блока
(`ai_assistant_landing_page`, `core_ui_components_sheet`, `search_results_layout`) и
`docs/project/STITCH_TRANSFER_PLAN.md` указывает именно её как основную. Первая — мусор.
**Пробел в имени папки** — риск для любого shell-скрипта без кавычек.

## tools/ и tmp/

`tools/penpot/docker-compose.yml` — единственный файл: локальный стек Penpot
(penpot + postgres:15 + redis:7) на :9001, `PENPOT_FLAGS: disable-registration`,
`PENPOT_SECRET_KEY: "change-me-penpot-secret"` (заглушка).
Ветка **paused** — решение в пользу Stitch. Две несогласованные конфигурации:
:9001 в compose, :3449 в `scripts/setup/penpot_dev.sh`.

`tmp/` — один файл 1.4 МБ: `screenrecord/Запись экрана 2026-01-22 в 16.31.22.mov.png`.
Мусор; исключён из `.cursorignore`, но **не из `.gitignore`**, поэтому попал в репозиторий.

⚠️ Не путать с `mgts-backend/temp/` — там 546 МБ значимых артефактов, включая
`services-extraction/pages-hierarchy.json`, который читают и QA, и боевой контроллер.

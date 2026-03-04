# Контекст проекта

## Strapi API Token
API токен для доступа к Strapi API:
```
<REDACTED>
```

**Использование:**
```bash
export STRAPI_API_TOKEN="248ed20567238625e73c43dd552d09cd01965984a8216bf60a11e226a158ae416a08a4c3a3e849e0a3d4cfce46069b2284b6a56ad50c6b206273c4159ea9dbe8a35d26c81fa60089dd3710cbafb59883637ed2b2e611991a69900fab5818d6df8b98ca2101f0ec0a81c383b083579e978b562e0eca037cd3e3f9c3c479ea8251"
```

## Perplexity API Token
API ключ для доступа к Perplexity API (используется для семантического анализа контента):
```
pplx-<REDACTED>
```

**Использование:**
```bash
export PERPLEXITY_API_KEY="pplx-<REDACTED>"
```

## Penpot (локальная среда)
Локальная dev‑среда Penpot развёрнута и используется для структуры и дизайн‑системы MGTS.

**Пути и запуск:**
- Репозиторий: `/Users/andrey_efremov/Downloads/penpot-develop`
- Запуск: `./manage.sh start-devenv` (контейнеры) + `./manage.sh run-devenv` (tmux‑сессия)

**Доступы:**
- Penpot: `https://localhost:3449`
- Caddy HTTP (служебный): `http://localhost:3450`
- MailCatcher (письма подтверждения): `http://localhost:1080`
- логин: <REDACTED>
- пароль: <REDACTED>

**Структура и автоматизация:**
- Созданы файлы/страницы по `PENPOT_STRUCTURE.md`, шаблоны `MGTS_Templates`, библиотека `MGTS_UI_Kit`.
- Скрипты:
  - `scripts/penpot/setup_penpot_structure.py` — структура/шаблоны/placeholder‑ы, подключение library.
  - `scripts/penpot/upload_mts_fonts.py` — загрузка MTS Sans/MTS Text и обновление типографики.
- Загружены шрифты: **MTS Sans** и **MTS Text**.
- Токены обновлены под брендовые цвета и типографику из `SiteMGTS/css/style.css`.

--- МГТС Бизнес

## Структура проекта

- **[Дерево всех страниц сайта](./site-structure-tree.md)** - полная структура всех HTML страниц проекта (45 страниц)

## Структура документации

Вся документация проекта организована в тематические папки в директории `docs/`. 

**Статистика организации:**
- Всего файлов организовано: 220+ файлов
- Последнее обновление: 2026-01-09
- Организация выполнена в 2 этапа:
  1. Первая волна: организация основных файлов документации
  2. Вторая волна: организация оставшихся файлов (97 файлов перемещено)

**Текущий статус проекта:**
- ✅ Нормализация HTML завершена (2026-01-09) - 100% маппинг классов достигнут для всех 97 файлов
- ✅ Миграция страниц в Strapi завершена (2026-01-09) - 98 страниц мигрировано
- ✅ Parent связи установлены (2026-01-09) - 75 из 75 страниц (100%)
- ✅ Иерархия страниц восстановлена и отображается в Strapi
- ✅ Breadcrumbs настроены - строятся автоматически из parent иерархии
- ✅ CMS Loader обновлен - все компоненты поддерживаются, JS инициализация подключена
- ✅ Меню и навигация перестроены - header, footer, sidebar обновлены динамически

**Основные категории:**

### 📚 CMS (Content Management System)
- **`docs/cms/content-types/`** - Типизация контента из Strapi, правила структуры HTML элементов
  - `CMS_CONTENT_TYPES.md` - Полная типизация всех типов контента (35.7 KB)
  - `CONTENT_TYPE_COMPLETE.md` - Статус завершения типизации
  - `CONTENT_TYPE_SUMMARY.md` - Краткое резюме типизации
  - `CONTENT_TYPE_BASIC.md` - Базовая версия контент-типа Page
  - `CONTENT_TYPE_CREATED.md` - Документация создания контент-типа
- **`docs/cms/integration/`** - Интеграция Strapi CMS с фронтендом
  - `CMS_INTEGRATION_PLAN.md` - План интеграции
  - `CMS_INTEGRATION_COMPLETE.md` - Статус завершения интеграции
  - `API_INTEGRATION_COMPLETE.md` - Интеграция API
  - `CMS_CONNECTION_FIX.md` - Исправления подключения
  - `CMS_READINESS_ANALYSIS.md` - Анализ готовности к интеграции CMS
  - `cursor_2_cms.md` - Документация миграции с Cursor на CMS
  - `cursor_site_structure_builder_script.md` - Скрипт построения структуры сайта
- **`docs/cms/grid-types/`** - Типы grid контейнеров и их использование
  - `CMS_GRID_TYPES_USAGE.md` - Использование типов grid
  - `GRID_TYPES_ANALYSIS.md` - Анализ типов grid
  - `GRID_TYPES_CMS_IMPLEMENTATION.md` - Реализация в CMS
- **`docs/cms/structure/`** - Правила структуры контента, иерархия классов
  - `CLASS_HIERARCHY_RULES.md` - Правила иерархии классов
  - `TOP_LEVEL_ELEMENTS_RULES.md` - Правила элементов верхнего уровня
  - `DIV_NORMALIZATION_SUMMARY.md` - Нормализация div элементов

### 🔧 Исправления (Fixes)
- **`docs/fixes/structure/`** - Документация по исправлениям структуры HTML
  - `STRUCTURE_ANALYSIS_REPORT.md` - Отчет по анализу структуры
  - `FIX_SCRIPT_USAGE.md` - Использование скриптов исправления
  - `FIX_APPLICATION_COMPLETE.md` - Статус применения исправлений
  - `COMPONENTS_FIX.md` - Исправления компонентов
  - `CROSS_PLATFORM_FIXES.md` - Исправления кросс-платформенности
  - `PATH_FIXES_SUMMARY.md` - Резюме исправлений путей
  - `PATH_ISSUES_ANALYSIS.md` - Анализ проблем с путями
  - `SIDEBAR_FIX.md` - Исправления сайдбара
  - `STEP_1_FIX.md` - Исправления первого этапа
  - `THIRD_LEVEL_FIX.md` - Исправления третьего уровня
  - `АНАЛИЗ_МЕНЮ.md` - Анализ меню
  - `УНИФИКАЦИЯ_МЕНЮ_ПЛАН.md` - План унификации меню
  - Python скрипты: `add_sidebar_menu.py`, `extract_menu_from_html.py`, `fix_component_loading.py`, `fix_component_scripts.py`, `fix_quotes.py`, `fix_third_level_scripts.py`, `update_about_menu.py`, `update_sidebar_script.py`
- **`docs/fixes/pages/`** - Исправления отдельных страниц
  - `ABOUT_PAGES_FIX.md` - Исправления страниц "О компании"
  - `SEGMENT_PAGES_FIX_*.md` - Исправления страниц сегментов
  - `INTEGRATION_ALL_PAGES_FIX.md` - Интеграция исправлений на всех страницах
- **`docs/fixes/styles/`** - Исправления CSS стилей
  - `SERVICE_CARD_STYLES_FIX.md` - Исправления стилей карточек услуг

### 📦 Установка и настройка
- **`docs/installation/setup/`** - Инструкции по установке и настройке окружения
  - `QUICK_START_MAC.md` - Быстрый старт на macOS
  - `SETUP_NODEJS.md` - Установка Node.js
  - `INSTALLATION_STATUS.md` - Статус установки
  - `SETUP_ENVIRONMENT.md` - Настройка окружения
  - `STRAPI_INSTALL_ALTERNATIVES.md` - Альтернативные способы установки Strapi
  - `STRAPI_PATH_SOLUTIONS.md` - Решения проблем с путями Strapi
  - `STRAPI_SETUP_STATUS.md` - Статус настройки Strapi
  - `STRAPI_FILE_STRUCTURE.md` - Структура файлов Strapi
  - Скрипты запуска: `START_SERVER.bat`, `START_SERVER.sh`
  - PowerShell скрипты: `fix_strapi_setup.ps1`, `install_strapi_manual.ps1`, `move_strapi_to_runs.ps1`, `start_strapi.ps1`
  - Конфигурация: `.strapi-updater.json`
- **`docs/installation/migration/`** - Документация по миграции данных
  - `CMS_MIGRATION_PLAN.md` - План миграции CMS
  - `MIGRATION_INSTRUCTIONS.md` - Инструкции по миграции
  - `MAC_MIGRATION_GUIDE.md` - Руководство по миграции на Mac
- **`docs/installation/troubleshooting/`** - Решение типичных проблем
  - `CHECK_CMS_CONNECTION.md` - Проверка подключения к CMS
  - `CMS_UPDATE_TROUBLESHOOTING.md` - Решение проблем обновления CMS
  - `DEBUG_404.md` - Отладка ошибок 404

### 📊 Анализ и отчеты
- **`docs/analysis/reports/`** - JSON файлы с результатами различных анализов
  - `analysis-results.json` - Результаты анализа структуры всех страниц
  - `about-pages-analysis.json` - Анализ страниц "О компании"
  - `fix-results.json` - Результаты исправлений
  - `segment-pages-analysis.json` - Анализ страниц сегментов
  - `segment-pages-detailed-analysis.json` - Детальный анализ страниц сегментов
  - `*-report.json` - Различные отчеты по анализу

### 📖 Руководства
- **`docs/guides/editor/`** - Руководство для редакторов контента
  - `EDITOR_GUIDE.md` - Полное руководство для редакторов
  - `QUICK_START_EDITOR.md` - Быстрый старт для редакторов
  - `CMS_SETUP_INSTRUCTIONS.md` - Инструкции по настройке CMS
- **`docs/guides/development/`** - Документация для разработчиков
  - `UI_UX_IMPROVEMENT_PLAN.md` - План улучшений UI/UX (61.6 KB)
  - `HTML_FIXING_GUIDE.md` - Руководство по исправлению HTML
  - `HTML_TYPIZATION_PLAN.md` - План типизации HTML
  - `ARCHITECTURE_REFACTORING.md` - Рефакторинг архитектуры
  - `CMS_IMPLEMENTATION_PLAN.md` - План внедрения CMS
  - `CROSS_PLATFORM_ANALYSIS.md` - Анализ кросс-платформенности
  - `CROSS_PLATFORM_FINAL_REPORT.md` - Финальный отчет по кросс-платформенности
  - `MIGRATION_COMPLETE.md` - Завершение миграции
  - `README_COMPONENTS.md` - Документация по компонентам
  - `CREATE_COMPONENTS_MANUAL.md` - Руководство по созданию компонентов
  - `МОДЕРНИЗАЦИЯ_ТЗ.md` - Техническое задание на модернизацию
  - Python скрипты: `migrate_to_components.py`
- **`docs/guides/usage/`** - Инструкции по использованию системы
  - `HOW_TO_CHECK_IMPROVEMENTS.md` - Как проверить улучшения
  - `STRAPI_BACKUP_GUIDE.md` - Руководство по резервному копированию
  - `STRAPI_UPDATE_PAGES_GUIDE.md` - Обновление страниц в Strapi
  - `CACHE_CLEAR_INSTRUCTIONS.md` - Очистка кэша браузера
  - `QUICK_START.md` - Быстрый старт
  - `SETUP.md` - Настройка системы
  - `STEP_1_INSTRUCTIONS.md` - Инструкции первого этапа
  - `STEP_2_INSTRUCTIONS.md` - Инструкции второго этапа
  - `STEP_2_QUICK_START.md` - Быстрый старт второго этапа
  - `STRAPI_QUICK_FIX.md` - Быстрое исправление Strapi
  - `STRAPI_QUICK_START.md` - Быстрый старт Strapi
  - `STRAPI_VERIFICATION.md` - Проверка Strapi
  - `TROUBLESHOOTING.md` - Решение проблем
  - `TROUBLESHOOTING_404.md` - Решение проблем 404
  - `ICONS_CHECK.md` - Проверка иконок
  - `ICONS_INSTRUCTIONS.md` - Инструкции по иконкам
  - `CROSS_PLATFORM_DEEP_CHECK.md` - Глубокая проверка кросс-платформенности
  - `ИНСТРУКЦИЯ_ИЗВЛЕЧЕНИЕ_ПОЛНОГО_КОНТЕНТА.md` - Инструкция по извлечению контента
  - `ИНСТРУКЦИЯ_ПОЛУЧЕНИЕ_КОНТЕНТА.md` - Инструкция по получению контента
  - `КОПИРОВАНИЕ_ШРИФТОВ_МТС.md` - Копирование шрифтов МТС
  - PowerShell скрипты: `check_environment.ps1`, `check_strapi_setup.ps1`, `setup_step1.ps1`

### 📈 Статусы и прогресс
- **`docs/status/progress/`** - Документация о текущем прогрессе проекта
  - `PROGRESS.md` - Общий прогресс (17.3 KB)
  - `PROJECT_STATUS.md` - Статус проекта
  - `CMS_IMPROVEMENT_STATUS.md` - Статус улучшений CMS
- **`docs/status/completed/`** - Завершенные задачи и этапы
  - `PROJECT_COMPLETE_SUMMARY.md` - Резюме завершенного проекта
  - `STEP_*_COMPLETE.md` - Завершенные этапы
  - `IMPORT_COMPLETED.md` - Завершенный импорт
  - `STEP_1_COMPLETED.md` - Завершение первого этапа
  - `STEP_1_STATUS.md` - Статус первого этапа
  - `STEP_2_2_COMPLETE.md` - Завершение этапа 2.2
  - `HOLIDAY_TEST.md` - Тестирование праздничных функций
  - `МОДЕРНИЗАЦИЯ_ЗАВЕРШЕНА.md` - Завершение модернизации
  - `МОДЕРНИЗАЦИЯ_РЕЗЮМЕ.md` - Резюме модернизации
  - `ОБЪЕДИНЕНИЕ_СЕГМЕНТОВ_ЗАВЕРШЕНО.md` - Завершение объединения сегментов
  - `ПРОВЕРКА_МЕНЮ_ЗАВЕРШЕНА.md` - Завершение проверки меню
  - `УНИФИКАЦИЯ_МЕНЮ_ЗАВЕРШЕНА.md` - Завершение унификации меню
  - `ШРИФТЫ_МГТС_ОБНОВЛЕНЫ.md` - Обновление шрифтов МГТС
  - `ШРИФТЫ_МТС_НАСТРОЕНЫ.md` - Настройка шрифтов МТС

### 🎯 Проект
- **`docs/project/`** - Основная документация проекта
  - `CONTEXT.md` (этот файл) - Основной контекст проекта, API токены
  - `site-structure-tree.md` - Структура всех страниц сайта
  - `MENU_TEMPLATE.md` - Шаблон меню
  - `PAGES_LIST.md` - Список страниц
  - Python скрипты: `extract_menu_pages.py`, `site_structure_builder.py`
- **`docs/setup/`** - Настройка внешних сервисов
  - `CLOUDINARY_SETUP.md` - Настройка Cloudinary
  - `LOCAL_STORAGE_SETUP.md` - Настройка локального хранилища

### 📁 Временные файлы
- **`temp/html/`** - Временные HTML файлы (можно удалить после проверки)
- **`temp/txt/`** - Временные текстовые файлы и логи
  - `license.txt` - Лицензионный файл
  - `migration-log.txt` - Лог миграции
  - `strapi.log` - Лог Strapi
- **`temp/images/`** - Временные изображения

### 🔧 Скрипты
- **`scripts/setup/`** - Скрипты для установки и настройки окружения
  - `check_environment.sh/.ps1` - Проверка окружения
  - `start_strapi.sh/.ps1` - Запуск Strapi
  - `install_nodejs.sh` - Установка Node.js
- **`scripts/utils/`** - Вспомогательные скрипты и утилиты
  - `clean-html-from-rtf.js` - Очистка HTML от RTF
  - `update_cursor_excludes_by_date.py` - Авто-обновление исключений Cursor/VSCode по дате
    - Пример: `python3 scripts/utils/update_cursor_excludes_by_date.py --cutoff 2026-01-12`
  - Python скрипты: `copy_mts_fonts.py/.bat/.ps1` - Копирование шрифтов МТС
  - Python скрипты: `extract_about_full.py` - Извлечение полного контента страницы "О компании"
  - Python скрипты: `fetch_about_content.py` - Получение контента страницы "О компании"
  - Python скрипты: `get_about_page.py` - Получение страницы "О компании"
  - Python скрипты: `remove_old_megamenu.py` - Удаление старого мегаменю
  - Python скрипты: `update_nav.py` - Обновление навигации
  - PowerShell скрипты: `update_nav_script.ps1` - Скрипт обновления навигации

### 📝 Скрипты организации документации
- **`docs/analyze-files.js`** - Анализ и категоризация файлов (первая волна)
- **`docs/organize-files.js`** - Автоматическая организация файлов по папкам (первая волна)
- **`docs/analyze-remaining-files.js`** - Анализ оставшихся файлов (вторая волна)
- **`docs/organize-remaining-files.js`** - Организация оставшихся файлов (вторая волна)
- **`docs/FILE_ORGANIZATION_PLAN.md`** - План организации файлов
- **`docs/ORGANIZATION_COMPLETE.md`** - Отчет о завершении организации (первая волна)
- **`docs/REMAINING_FILES_ORGANIZATION_COMPLETE.md`** - Отчет о завершении организации оставшихся файлов (вторая волна)
- **`docs/remaining-files-analysis.json`** - Результаты анализа оставшихся файлов
- **`docs/remaining-files-organization-results.json`** - Детальные результаты перемещения

## Основные компоненты

### Frontend (SiteMGTS/)
- Статические HTML страницы
- JavaScript модули для загрузки контента из CMS
- CSS стили и компоненты

### Backend (mgts-backend/)
- Strapi CMS для управления контентом
- API endpoints для получения данных
- Миграционные скрипты

## Структура данных в CMS

### Content Types
- **Page** - страницы сайта
- **Navigation** - главное меню
- **Footer** - подвал сайта
- **News** - новости
- **Product** - товары/услуги

### Правила типизации контента
Полная документация по типизации контента находится в:
- **`docs/cms/content-types/CMS_CONTENT_TYPES.md`** - Основной документ с полной типизацией (35.7 KB)

Основные типы контента:
- **Hero Content** (`hero-content`) - Заголовки страниц
- **Regular Section** (`section`) - Обычные секции контента
- **Special Sections** - Специальные секции (service-order, service-tariffs, service-faq и др.)
- **Cards** - Карточки (tariff, service, navigation, info)
- **Grid Containers** - Grid контейнеры для организации карточек

### Правила структуры
- **`docs/cms/structure/CLASS_HIERARCHY_RULES.md`** - Правила иерархии классов
- **`docs/cms/structure/TOP_LEVEL_ELEMENTS_RULES.md`** - Правила элементов верхнего уровня

## Скрипты

### Расположение скриптов
- **`mgts-backend/scripts/`** - Основные скрипты для работы с CMS и данными
- **`scripts/setup/`** - Скрипты установки и настройки окружения
- **`scripts/utils/`** - Вспомогательные утилиты

### Основные категории скриптов в `mgts-backend/scripts/`:

#### Анализ
- `analyze-all-pages-structure.js` - Анализ структуры всех страниц
- `analyze-about-pages.js` - Анализ страниц "О компании"
- `analyze-segment-pages.js` - Анализ страниц сегментов
- `analyze-class-hierarchy.js` - Анализ иерархии классов
- `analyze-top-level-elements.js` - Анализ элементов верхнего уровня

#### Исправления
- `fix-all-pages-structure.js` - Автоматическое исправление структуры всех страниц
- `fix-segment-pages.js` - Исправление страниц сегментов
- `fix-about-pages-styles.js` - Исправление стилей страниц "О компании"

#### Нормализация HTML ✅ ЗАВЕРШЕНО
- ✅ `normalize-html-structure.js` - Нормализация HTML структуры (100% маппинг достигнут)
- ✅ `normalize-split-files.js` - Нормализация разделенных секций (100% маппинг достигнут)
- ✅ `split-multi-component-sections.js` - Разделение секций с множественными компонентами
- ✅ `analyze-remaining-non-normalized-classes.js` - Анализ оставшихся классов

**Статус нормализации HTML:**
- ✅ **ЗАВЕРШЕНО** - 2026-01-09
- ✅ 97 файлов нормализовано в `pages-content-normalized/`
- ✅ 97 файлов нормализовано в `pages-content-normalized-split/`
- ✅ **100% маппинг классов** - все классы преобразованы в целевые классы компонентов Strapi
- ✅ Все старые классы заменены на новые классы компонентов
- ✅ Служебные классы удалены
- ✅ SVG элементы корректно обработаны

**Результаты:**
- Все HTML файлы готовы к миграции в Strapi
- Классы соответствуют компонентам Strapi: `hero`, `section-text`, `section-cards`, `service-tariffs`, `service-faq`, `service-order-form`, `section-map`, `files-table`, `crm-cards`, `mobile-app-section`, `history-timeline`

#### Миграция данных
- `migrate-navigation-footer.js` - Миграция меню и футера из HTML в CMS
- `migrate-all-service-pages.js` - Миграция всех страниц услуг
- `migrate-service-page-content.js` - Миграция контента страниц услуг

#### Генерация структуры
- `generate-site-tree.js` - Генерация дерева всех страниц проекта
- `generate-site-tree-v2.js` - Улучшенная версия генератора

#### Резервное копирование
- `backup-strapi-pages.js` - Создание резервных копий страниц Strapi
- `restore-from-backup.js` - Восстановление из резервной копии

#### Утилиты
- `view-page-content.js` - Просмотр контента страницы
- `update-security-page.js` - Обновление конкретной страницы
- `check-top-level-elements.js` - Проверка элементов верхнего уровня

# План организации контекстных файлов

## Анализ текущего состояния

В корне проекта находится большое количество файлов различных типов:
- Документация (MD файлы)
- JSON файлы с результатами анализа
- Скрипты (JS файлы)
- Временные файлы (HTML, TXT)
- Резервные копии

## Предлагаемая структура папок

```
docs/
├── cms/                    # Документация по CMS/Strapi
│   ├── content-types/      # Типизация контента
│   ├── integration/        # Интеграция CMS
│   ├── grid-types/         # Типы grid
│   └── structure/          # Структура контента
├── fixes/                  # Документация по исправлениям
│   ├── structure/          # Исправления структуры
│   ├── pages/              # Исправления страниц
│   └── styles/             # Исправления стилей
├── installation/           # Инструкции по установке
│   ├── setup/              # Настройка окружения
│   ├── migration/          # Миграция
│   └── troubleshooting/   # Решение проблем
├── analysis/               # Результаты анализа
│   ├── structure/          # Анализ структуры
│   ├── pages/              # Анализ страниц
│   └── reports/            # Отчеты
├── guides/                 # Руководства
│   ├── editor/             # Руководство редактора
│   ├── development/        # Руководство разработчика
│   └── usage/              # Руководство пользователя
└── status/                 # Статусы и прогресс
    ├── progress/           # Прогресс работы
    └── completed/          # Завершенные задачи

scripts/                    # Скрипты (уже в mgts-backend/scripts)
├── analysis/               # Скрипты анализа
├── fixes/                  # Скрипты исправлений
├── migration/              # Скрипты миграции
└── utils/                  # Утилиты

backups/                    # Резервные копии (уже есть)
├── strapi-backups/         # Копии Strapi
└── structure-fix/          # Копии при исправлениях

temp/                       # Временные файлы
├── html/                   # Временные HTML файлы
└── txt/                    # Временные текстовые файлы
```

## Категории файлов

### 1. CMS/Strapi документация
- `CMS_CONTENT_TYPES.md` → `docs/cms/content-types/`
- `CMS_INTEGRATION_*.md` → `docs/cms/integration/`
- `CMS_GRID_TYPES_*.md` → `docs/cms/grid-types/`
- `CLASS_HIERARCHY_RULES.md` → `docs/cms/structure/`
- `TOP_LEVEL_ELEMENTS_*.md` → `docs/cms/structure/`

### 2. Документация по исправлениям
- `*_FIX_*.md` → `docs/fixes/`
- `FIX_*.md` → `docs/fixes/structure/`
- `ABOUT_PAGES_FIX.md` → `docs/fixes/pages/`
- `SEGMENT_PAGES_FIX_*.md` → `docs/fixes/pages/`
- `SERVICE_CARD_STYLES_FIX.md` → `docs/fixes/styles/`

### 3. Инструкции по установке
- `*_SETUP_*.md` → `docs/installation/setup/`
- `*_MIGRATION_*.md` → `docs/installation/migration/`
- `*_INSTALL_*.md` → `docs/installation/setup/`
- `*_TROUBLESHOOTING*.md` → `docs/installation/troubleshooting/`

### 4. Результаты анализа
- `*-analysis.json` → `docs/analysis/reports/`
- `*-results.json` → `docs/analysis/reports/`
- `STRUCTURE_ANALYSIS_REPORT.md` → `docs/analysis/reports/`

### 5. Руководства
- `*_GUIDE.md` → `docs/guides/`
- `EDITOR_GUIDE.md` → `docs/guides/editor/`
- `QUICK_START_*.md` → `docs/guides/usage/`

### 6. Статусы и прогресс
- `*_STATUS.md` → `docs/status/progress/`
- `*_COMPLETE*.md` → `docs/status/completed/`
- `PROGRESS.md` → `docs/status/progress/`

### 7. Временные файлы
- `*.html` (временные) → `temp/html/`
- `*.txt` (временные) → `temp/txt/`
- `main_page_*.html` → `temp/html/`

## Приоритеты перемещения

1. **Высокий приоритет:**
   - Документация CMS (основные правила)
   - Результаты анализа (важные данные)
   - Инструкции по установке (для новых разработчиков)

2. **Средний приоритет:**
   - Документация по исправлениям (историческая ценность)
   - Статусы и прогресс (для отслеживания)

3. **Низкий приоритет:**
   - Временные файлы (можно удалить после проверки)
   - Дублирующиеся файлы

## Файлы, которые остаются в корне

- `CONTEXT.md` - основной контекст проекта
- `README.md` - главный README (если есть)
- Конфигурационные файлы проекта
- `.gitignore`, `.env` и т.д.


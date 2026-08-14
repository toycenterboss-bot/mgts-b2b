# Пайплайн контента: легаси HTML → Strapi → Next.js

Восстановлено по коду 2026-08-14. Это самая ценная и самая недокументированная часть
проекта: единой точки входа нет, корневого `README.md` и `Makefile` тоже нет.

## Полная цепочка

```
[0] ИСТОЧНИК
    business.mgts.ru (живой сайт)  +  SiteMGTS/**.html (143 файла, ~129 контентных)
         │
[1] АНАЛИЗ — Puppeteer + Perplexity LLM        (владелец: mgts-backend/scripts)
    analyze-page-interactive.js       — прокликивает табы/аккордеоны, снимает скриншот
    analyze-page-with-llm.js          — Perplexity, режим ANALYSIS_MODE=screenshot|html
                                        ⚠️ 366 КБ в одном файле — крупнейший исходник проекта
    analyze-pages-batch.js            — пачками (план: BATCH_ANALYSIS_PLAN.md, 19×5, 97 страниц)
    → temp/page-analysis-llm/<slug>_spec.json
                              <slug>_tabs_content.json
                              <slug>_extracted_file_links.json
                              <slug>_screenshot.png
         │
[2] СНАПШОТ — версионирование анализа
    scripts/page_analysis/create_snapshot.py
    temp/page-analysis-llm  →  mgts-backend/data/page-analysis-llm/branches/YYYY-MM-DD/
    Фактически существует ОДНА ветка: 2026-01-22 (87 spec-файлов)
         │
[3] МАППИНГ — роут → шаблон → блоки → поля CMS
    scripts/mapping/generate_mgts_mappings.py  (644 строки)
    вход:  docs/project/TECHNICAL_TASK_NEW_SITE.md, STITCH_TEMPLATE_MAPPING.md,
           design/html_pages/*.html (парсит data-stitch-block), <snapshot>/*_spec.json,
           mgts-backend/src/api/*/schema.json
    выход: docs/project/PAGE_BLOCK_MAPPING.md      — роут → упорядоченный список блоков
           docs/project/PAGE_CONTENT_MAPPING.md    — 104 роута, статус OK|NEEDS_REVIEW|MISSING_SPEC
           docs/project/STRAPI_SCHEMA_GAP_ANALYSIS.md
    опционально: scripts/mapping/perplexity_crosscheck.py → PERPLEXITY_CROSSCHECK.md
         │
[4] ВЁРСТКА — параллельная ветка, Stitch
    design/html_blocks/<63 блока>/{block.html, deps.html}
         ↓ scripts/stitch/build_html_pages.py (301 строка)
    design/html_pages/tpl_*.html (14 шаблонов) + _canonical_shell.html
    Сборщик: дедуплицирует <link>/<style>, вырезает лишние <header>/<footer>/breadcrumbs
    из вложенных блоков, чинит ../../assets/ → ../assets/, ставит <body data-page="...">
         │
[5] ИМПОРТ В STRAPI
    mgts-backend/scripts/migration/import-pages-v2.js (330 строк)  ← ключевой скрипт
    читает PAGE_CONTENT_MAPPING.md (берёт ТОЛЬКО строки со статусом OK),
    берёт последний snapshot из data/page-analysis-llm/branches/,
    конвертирует spec.sections → richtext (asParagraphs / linksToHtml / tabToRichtext)
    и создаёт сущности через entityService: page.template + page.hero + page.sections (DZ)
    обёртка: run-import-pages-v2.js · лог: .dev/import-pages-v2.log
         │
[6] РЕНДЕР — Next.js  (детали в topics/frontend-render.md)
         │
[7] QA
    scripts/qa/check-pages.js            — Strapi :1337 ↔ pages-hierarchy.json ↔ Next :3000
    mgts-frontend/scripts/visual-compare.js — попиксельно static :8002 vs React :3000
```

## Кто чем запускается

| Шаг | Файл | Язык |
|---|---|---|
| Анализ | `mgts-backend/scripts/analyze-page-*.js` | Node + Puppeteer + Perplexity |
| Снапшот | `scripts/page_analysis/create_snapshot.py` | Python |
| Маппинг | `scripts/mapping/generate_mgts_mappings.py` | Python |
| Сборка вёрстки | `scripts/stitch/build_html_pages.py` | Python |
| Импорт | `mgts-backend/scripts/migration/import-pages-v2.js` | Node (entityService) |
| Локальный запуск | `scripts/dev/start_all.sh` | Bash (нужен `lsof`) |
| QA | `scripts/qa/check-pages.js` | Node |

## Три параллельных механизма импорта — знать, чтобы не запутаться

1. **bootstrap-импорт** — `mgts-backend/src/index.ts:58-162`, выключен флагом
   `MGTS_BOOTSTRAP_IMPORT=1`, читает `scripts/extract-content/parsed-content.json`. Legacy.
2. **REST + токен** — 106 файлов упоминают `STRAPI_API_TOKEN`, 98 — `STRAPI_URL`.
   Медленнее, ограничен payload, нужен токен.
3. **entityService изнутри Strapi** — `scripts/migration/run-*.js`, 22 однотипных враппера.
   **Рекомендованный способ** по `docs/project/STRAPI_RUNBOOK.md`: токен не нужен,
   быстрее и стабильнее на объёме.

## Хрупкие места пайплайна (проверено)

- **Выбор снапшота лексикографической сортировкой.** `import-pages-v2.js:17-31` и
  `generate_mgts_mappings.py` берут «последний по имени» каталог в `branches/`.
  Сейчас там одна ветка `2026-01-22` — механизм не проверялся на второй.
- **Снапшот отстал от работы.** Единственная ветка датирована январём, а артефакты
  аудита и `temp/` — февралём–мартом 2026.
- **87 spec-файлов против 104 роутов** в `PAGE_CONTENT_MAPPING.md`: часть страниц
  вообще не имеет источника контента (`MISSING_SPEC`), доводка не завершена.
- **QA читает из `temp/`, а не из `data/`.** `scripts/qa/check-pages.js` берёт
  `mgts-backend/temp/services-extraction/pages-hierarchy.json`; при чистке `temp/`
  ловит исключение и молча продолжает с пустой картой — **QA деградирует беззвучно**.
  Тот же файл читает боевой контроллер (`page.ts:196,318`).
- **Обёртки глушат ошибки.** `run-import-pages-v2.js:16-36` подавляет
  `unhandledRejection`/`uncaughtException`, содержащие слово `aborted`, и `:50-61`
  отказывается от `app.destroy()` из-за краха sqlite/knex/tarn. Работает, но
  диагностику реальных сбоев это глушит тоже.
- **Ключ Perplexity подхватывается из документации.**
  `mgts-backend/scripts/analyze-infoformen-accordion.js:146-156` парсит `pplx-…`
  из `docs/project/CONTEXT.md`, если нет env. При этом `perplexity_crosscheck.py:9`
  в докстринге пишет «Keys must NOT be stored in the repository». См. B-01.

## Объём скриптового хозяйства (замер)

`mgts-backend/scripts/` — **329 файлов** (307 `.js`), 4.5 МБ. Подавляющее большинство —
одноразовки: `fix-*`, `check-*`, `add-*`, `apply-*`, плюс паттерн «скрипт + обёртка
`run-<скрипт>.js`», удваивающий счётчик. Дубли-варианты: `-v2`, `-final`, `-simple`,
`-direct`, `-comprehensive` (12 файлов). `analyze-page-semantic.js` (30 523 Б) и
`analyze-page-semantic-structured.js` (30 526 Б) — почти байт-в-байт.

Практический вывод: **прежде чем писать новый скрипт, проверь `ls mgts-backend/scripts | grep`** —
почти наверняка он уже есть в трёх версиях.

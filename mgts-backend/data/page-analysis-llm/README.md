# page-analysis-llm (versioned branches)

Здесь храним “ветки” (snapshots) исходного контента, извлечённого из старого сайта (LLM + парсер файлов/ссылок).

Почему так:
- исходный `mgts-backend/temp/page-analysis-llm` может содержать тяжёлые артефакты (chrome profiles/caches)
- для переноса контента в новую схему Strapi нам нужен **стабильный, лёгкий индекс данных**
- файлы (PDF/DOC/XLS) удалять нельзя — на них ссылаются `*_spec.json` и `*_extracted_file_links.json`

## Рекомендуемая структура

- `mgts-backend/data/page-analysis-llm/branches/<YYYY-MM-DD>/`
  - `*_spec.json`
  - `*_tabs_content.json` (если есть)
  - `*_extracted_file_links.json` (если есть)
  - `*_files/` (скачанные документы)

## Как создать новую “ветку”

```bash
python3 scripts/page_analysis/create_snapshot.py \
  --src mgts-backend/temp/page-analysis-llm \
  --dst mgts-backend/data/page-analysis-llm/branches/2026-01-22
```

Далее указываем, какую ветку использовать пайплайнам:

```bash
export MGTS_PAGE_ANALYSIS_DIR="mgts-backend/data/page-analysis-llm/branches/2026-01-22"
```


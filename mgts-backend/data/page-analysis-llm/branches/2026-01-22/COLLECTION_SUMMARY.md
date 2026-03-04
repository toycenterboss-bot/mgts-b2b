# Итоги сбора данных (2026-01-17)

## Статус
- Собрано spec: 87 из 97
- Исключены (не нужны): все `news_*` (10 страниц)

## Ключевые фиксы
- Чанкинг по H1/карточкам и скриншоты LLM выровнены по масштабу (1920px ширина).
- Для `video_surveillance_office` исправлен порядок/чанки и добавлены debug-скриншоты.
- Для `video_surveillance_building` форма добрана отдельным анализом 5-го H1 чанка и смержена в spec.
- Для `partners_creating_work_order` кликаем все select-поля и сохраняем скриншоты открытых списков.

## Пачки
- Пачка партнеров: `partner`, `partners`, `partners_creating_work_order`, `partners_feedback_form`, `partners_ramochnie_dogovori`
- Финальная пачка (без `news_*`): `tariffs`, `telephony`, `timing_malfunctions`, `video_surveillance_building`, `video_surveillance_maintenance`

## Итоговые файлы
- Все spec лежат в `mgts-backend/temp/page-analysis-llm/*_spec.json`
- Скриншоты LLM в `mgts-backend/temp/page-analysis-llm/*_llm_images/`

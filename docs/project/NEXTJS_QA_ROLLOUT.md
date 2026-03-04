# Next.js QA & Rollout Plan

**Дата:** 2026-02-20  
**Статус:** QA выполнен, результаты зафиксированы.

---

## 1) Паритет‑чеклист (критические страницы)

1. Главная `/` (TPL_Home)
2. Сегмент‑лендинг `/business` (TPL_Segment_Landing)
3. Услуга `/business/access_internet` (TPL_Service)
4. Сценарий `/services/scenario-connecting-object` (TPL_Scenario)
5. DeepNav `/about_mgts` (TPL_DeepNav)
6. Документы `/documents` (TPL_Doc_Page)
7. Контакты `/contact` (TPL_Contact_Hub)
8. Новости `/news` + `/news/:slug`
9. AI‑чат `/ai-chat`
10. Поиск `/search`

## 2) Визуальные проверки

- Заголовки/подзаголовки (hero + h2/h3)
- CTA кнопки и ссылки
- Иконки (Material Symbols + SVG из Strapi)
- Изображения (относительные/абсолютные url)
- Мега‑меню (структура, CTA)
- Футер (секции/юридические ссылки/соцсети)

## 3) Функциональные проверки

- Навигация по меню и ссылкам
- Раскрытие mega‑menu
- Работа табов (document-tabs)
- Фильтры + поиск в files-table
- Переключение image-switcher
- Отображение каруселей

## 4) Регрессии (что нельзя сломать)

- URL‑структура (совпадение со старым сайтом)
- Состав и порядок меню
- Состав и порядок блоков на главной
- Видимость иконок
- Доступность контента из Strapi

---

## 5) Rollout план

1. **Preview окружение** — поднять `mgts-frontend` с `NEXT_PUBLIC_STRAPI_BASE_URL`.
2. **UAT** — визуальная сверка с html‑шаблонами (скриншоты).
3. **Переход на прод**:
   - включить SSR/ISR
   - подключить CDN (для media)
   - настроить кэш‑инвалидацию (по тегам)
4. **Cutover** — переключить трафик на Next.js.
5. **Rollback** — возможность возврата на HTML сборку.

---

## 6) Что требуется выполнить вручную

- Запуск `npm run dev` в `mgts-frontend`
- Прогон скрипта `node scripts/qa/check-pages.js`
- Просмотр отчёта `docs/project/NEXTJS_QA_REPORT.md`

---

## 7) Результаты QA (прогон 2026‑02‑20)

**Среда:** `mgts-frontend` (Next.js) + Strapi `http://localhost:1337`  
**Фронт:** `http://localhost:3000`

### 7.1 Проверка страниц

- Полный прогон 100 страниц из Strapi → **100/100 OK (200)**
- Исправлен кейс `/partners/realization` (таблица с несколькими ссылками в ячейке)
- Legacy‑маршруты `/html_pages/*` и `cms_loader` удалены — вся навигация на React‑страницах

### 7.2 Итог

- Базовый паритет по маршрутам достигнут
- Ошибок 500 и 404 не обнаружено

---

## 8) Полный обход дерева страниц (2026‑02‑20)

- Источник: `Strapi /api/pages` → 100 страниц (уникальные slug)
- Проверка: `node scripts/qa/check-pages.js`
- Результат: **0 ошибок (все 200)**
- Отчёт: `docs/project/NEXTJS_QA_REPORT.md`


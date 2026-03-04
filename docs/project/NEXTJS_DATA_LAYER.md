# Next.js Data Layer & Caching

**Дата:** 2026-02-19  
**Назначение:** стандартизировать работу фронтенда Next.js с Strapi и определить стратегию кеширования.

---

## 1) Базовый клиент Strapi

Файл: `mgts-frontend/src/lib/strapi.ts`

Функции:
- `getNavigation()` — `/api/navigation`
- `getFooter()` — `/api/footer`
- `getPageBySlug(slug)` — `/api/pages/by-slug?slug=…`
- `getIconByName(name)` — `/api/icons?filters[name][$eq]=…&populate=preview`

## 2) Кеширование (ISR / Next cache)

Текущие значения revalidate (сек):
- **navigation:** 300
- **footer:** 300
- **page:** 300
- **news:** 120

Теги (Next cache tags):
- `navigation`, `footer`
- `page:<slug>`
- `icon:<name>`

## 3) Переменные окружения

Используются:
- `NEXT_PUBLIC_STRAPI_BASE_URL`
- `STRAPI_BASE_URL`

По умолчанию: `http://localhost:1337`

## 4) Политика изображений

`next.config.ts` разрешает изображения из:
- `http://localhost:1337/uploads/**`
- `http://127.0.0.1:1337/uploads/**`

## 5) Рекомендации для продакшна

- Для контента с частыми изменениями (новости) использовать меньшее `revalidate` (например 60–120).
- Для навигации и футера достаточно 300–600.
- Для тестирования можно отключать кеш через `cache: "no-store"` в `fetchJson` при необходимости.


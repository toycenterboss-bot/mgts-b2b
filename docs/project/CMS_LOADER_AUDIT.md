# Аудит интерактива для CMS-loader

Источники: `design/html_blocks/**/*.html`, `design/html_pages/**/*.html`

## Найденные интерактивные хуки и их модули
- `data-mega-*` → `canonical:megaMenu`
- `data-tabs`, `data-tab`, `data-panel` → `canonical:tabs`
- `data-dropdown*` → `canonical:dropdown`
- `data-modal*`, `data-route-open` → `canonical:modal` (событие `mgts:open`)
- `data-choice-group`, `data-choice`, `data-choice-prev/next` → `canonical:choiceGroup`
- `data-switch*` → `canonical:switch`
- `data-accordion` → `canonical:accordion`
- `data-carousel*` → `canonical:carousel`
- `data-loadmore*` → `canonical:loadMore`
- `data-billing*` → `canonical:billingToggle`
- `data-switcher*` → `canonical:switcher`
- `data-contact-hub*`, `data-contact-map` → `canonical:contactHubMap`

## Итог по покрытию
- Все найденные `data-*` хуки интерактива в `html_blocks` и `html_pages` покрыты каноническими модулями `cms-loader.js`.

## Не найдено в текущих блоках
- `data-*` хуки для `video` / `audio` отсутствуют.


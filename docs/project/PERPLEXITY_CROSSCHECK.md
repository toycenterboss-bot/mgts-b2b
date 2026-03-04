# Perplexity cross-check (spot check)

Это **опциональная** проверка: Perplexity подсказывает вероятный шаблон по структуре `*_spec.json`.

| Route | Spec | Suggested template | Rationale |
|---|---|---|---|
| `/virtual_ate` | `virtual_ate_spec.json` | `TPL_Service` | {"template": "TPL_Service", "rationale": "Страница содержит hero, преимущества (advantages), карточки (cards), слайдер и CTA-секцию с лид-формой, что идеально соответствует шаблону услуги."} |
| `/partners/creating_work_order` | `partners_creating_work_order_spec.json` | `TPL_Form_Page` | {"template": "TPL_Form_Page", "rationale": "Страница содержит hero с описанием процесса, форму для создания заявки и сайдбар, что соответствует шаблону страницы формы с опросом/заявкой."} |
| `/partners/all_services` | `developers_all_services_spec.json` | `TPL_Segment_Landing` | **TPL_Segment_Landing**  Страница содержит hero, tabs и services-cards, что идеально соответствует шаблону для страницы сегмента/каталога услуг с hero сегмента и карточками.[1][2] |

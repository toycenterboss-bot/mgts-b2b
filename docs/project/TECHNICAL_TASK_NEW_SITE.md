# Техническое задание: Новый сайт МГТС (B2B)

Документ основан на ролевом аудите и решениях из `DECISION_LOG.md`. Цель — описать структуру сайта, состав страниц, требования к контенту, дизайну, аналитике, безопасности, SEO/LLM и CMS.

---

## 1) Цели и приоритеты
- Основная аудитория: **Застройщики → Операторы → Госзаказчики** (приоритет отражается в навигации и главной).
- Сайт должен быть **high‑tech, молодежный, но B2B‑серьезный**.
- Обязателен раздел **Найм сотрудников** (видимость на главной, в меню и футере).
- Обязательны **поиск по сайту** и **AI‑чат** (поиск + помощь + контакты).
- Контентная база: используем материалы, собранные со старого сайта; новый контент добавляем только при отсутствии исходного.

---

## 1.1) Прогресс по реализации (на 2026-02-19)

**Готово:**
- ✅ Strapi CMS интегрирована с шаблонами (cms_loader + adapter)
- ✅ Иконки: кастомный icon‑picker, импорт SVG в `api::icon.icon`, очистка заглушек
- ✅ Мега‑меню и навигация: подстановка иконок из Strapi, исправления поведения
- ✅ Главная: динамические компоненты и рендер из Strapi
- ✅ Полировка светлой темы и контраста (меню/CTA/формы)

**В работе:**
- ⏳ Регресс‑проверка всех шаблонов после обновлений CMS Loader
- ⏳ Наполнение и верификация контента Strapi для новых страниц/блоков
- ⏳ Доводка TPL_DeepNav (активные состояния, иконки, стили)

---

## 2) Структура сайта (дерево страниц)

### 2.1 Основные разделы
- `/` Главная
- `/developers` Застройщикам (ключевой приоритет)
- `/operators` Операторам
- `/government` Госзаказчикам
- `/business` Бизнесу (если сохраняем как сегмент)
- `/partners` Партнёрам
- `/services` Каталог услуг (единая линейка + сценарии)
- `/contact` Контакты (Contact Hub)
- `/career` Найм/Карьера
- `/documents` Документы/Комплаенс
- `/about` О компании

### 2.2 Страницы ключевых услуг (наследование + редизайн)
Сохраняются как отдельные страницы, но приводятся к **единому шаблону услуги**:
- access_internet, telephony, mobile_connection, virtual_ate, video_surveillance_office
- digital_television, computer_help, security_alarm
- structured_cabling_networks, local_computing_network, external_communication
- network_operation, automated_control_systems, automated_system_monitoring_accounting
- access_control_systems, introduction_security_tv_systems
- connecting_residential, connecting_commercial, connecting_construction
- developers_compensation_for_losses

### 2.3 Полное дерево страниц (согласовано с новыми slug)
Источник: `mgts-backend/temp/page-analysis-llm/COLLECTION_TREE.md` + новые страницы `[new]`.
- /
  - / (home)
  - /about_mgts
  - /about_registrar
  - /bank_details
  - /business
    - /business/access_internet
    - /business/digital_television
    - /business/equipment_setup
      - /business/equipment_setup/computer_help
    - /business/mobile_connection
    - /business/payment_methods
    - /business/security_alarm
    - /business/telephony
    - /business/video_surveillance_office
  - /contact_details
  - /contact [new]
  - /cookie_processing
  - /corporate_documents
  - /career [new]
  - /data_processing
  - /decisions_meetings_shareholders
  - /developers
    - /developers/compensation_for_losses
    - /developers/connecting_objects
      - /developers/connecting_objects/connecting_commercial
      - /developers/connecting_objects/connecting_construction
      - /developers/connecting_objects/connecting_residential
    - /developers/digital_solutions
  - /forms_doc
  - /general_director_message
  - /government
    - /government/all_services
    - /government/communications_infrastructure
      - /government/communications_infrastructure/external_communication
      - /government/communications_infrastructure/local_computing_network
      - /government/communications_infrastructure/network_operation
      - /government/communications_infrastructure/structured_cabling_networks
    - /government/customized_solutions
    - /government/digital_services
      - /government/digital_services/access_control_systems
      - /government/digital_services/automated_control_systems
      - /government/digital_services/automated_system_monitoring_accounting
      - /government/digital_services/entrance_video_surveillance
      - /government/digital_services/equipment
      - /government/digital_services/introduction_security_tv_systems
      - /government/digital_services/main_and_backup_data_transmission
      - /government/digital_services/maintenance_interface_device
      - /government/digital_services/speakerphone
      - /government/digital_services/video_surveillance_building
      - /government/digital_services/video_surveillance_maintenance
  - /infoformen
  - /interaction_with_partners
  - /labor_safety
  - /licenses
  - /mgts_compliance_policies
  - /mgts_values
  - /news
  - /offers
  - /operators
    - /operators/all_services
    - /operators/contact_for_operators
    - /operators/data_transfer
    - /operators/infrastructure
      - /operators/infrastructure/accommodation_at_sites
      - /operators/infrastructure/avr_ppr
      - /operators/infrastructure/lks_kr
      - /operators/infrastructure/pir_smr_mgts
    - /operators/joining_and_passing_traffic
    - /operators/nondiscriminatory_access
  - /operinfo
  - /partners
    - /partners/all_services
    - /partners/creating_work_order
    - /partners/documents
    - /partners/procedure_admission_work
    - /partners/purchas
    - /partners/ramochnie_dogovori
    - /partners/realization
    - /partners/tariffs
  - /partners_feedback_form
  - /principles_corporate_manage
  - /single_hotline
  - /stockholder_copies_document
  - /timing_malfunctions
  - /services [new]
    - /services/scenario-connecting-object [new]
    - /services/scenario-infrastructure-360 [new]
    - /services/scenario-safe-object [new]
    - /services/scenario-connectivity-data [new]
    - /services/scenario-video-access [new]
    - /services/scenario-network-ops [new]
  - /ai-chat [new]
  - /virtual_ate
  - /wca

### 2.4 Главное меню (структура)
Источник: `mgts-backend/temp/page-analysis-llm/HOME_MENU.json`
Принцип: порядок сегментов **Застройщики → Операторы → Госзаказчики** (учет п.2).

**Верхние ссылки (header):**
- О компании (отдельное меню, 2 уровня, slug: `/about_mgts`)
  - О МГТС (slug: `/about_mgts`)
  - Ценности (slug: `/mgts_values`)
  - Деловая этика и комплаенс
    - Обращение генерального директора (slug: `/general_director_message`)
    - Комплаенс‑политики МГТС (slug: `/mgts_compliance_policies`)
    - Взаимодействие с партнерами (slug: `/interaction_with_partners`)
    - Обратная связь (бывшая «Помогите нам стать лучше») (slug: `/partners_feedback_form`)
    - Единая горячая линия (slug: `/single_hotline`)
  - Корпоративное управление
    - Принципы корпоративного управления (slug: `/principles_corporate_manage`)
    - Корпоративные документы (slug: `/corporate_documents`)
    - Решения общих собраний акционеров (slug: `/decisions_meetings_shareholders`)
    - Информация для лиц, имеющих право на участие в годовых и внеочередных общих собраниях акционеров ПАО МГТС (slug: `/infoformen`)
    - О регистраторе (slug: `/about_registrar`)
- Новости (slug: `/news`)
- Контакты (Contact Hub, slug: `/contact`) [new]
- Найм / Карьера (slug: `/career`) [new]
- Недискриминационный доступ (slug: `/operators/nondiscriminatory_access`)
- AI‑чат (slug: `/ai-chat`) [new]
- CTA: Подобрать решение (slug: `/contact`) [new]
- Телефон (tel: `+7 495 700-70-70`)

**Размещение header (layout):**
- 2 блока: **левый** — логотип + основные входы; **правый** — инструменты/CTA.
- Логотип/иконка компании обязательны слева (кликабельны, ведут на `/`).
- Левая группа: О компании, Новости, Контакты, Найм/Карьера.
- Правая группа: Недискриминационный доступ, AI‑чат, CTA, Телефон, Поиск (иконка).
- На мобильных: логотип + бургер + CTA/чат (иконка), остальное в меню.

**Мега‑меню по сегментам (в приоритете) + сценарии:**
- Решения / Каталог (единая линейка, slug: `/services`) [new]
  - Сценарии:
    - Подключить объект (slug: `/services/scenario-connecting-object`) [new]
    - Инфраструктура 360 (slug: `/services/scenario-infrastructure-360`) [new]
    - Безопасный объект (slug: `/services/scenario-safe-object`) [new]
    - Связь/данные (slug: `/services/scenario-connectivity-data`) [new]
    - Видео‑наблюдение и доступ (slug: `/services/scenario-video-access`) [new]
    - Эксплуатация сети (slug: `/services/scenario-network-ops`) [new]
  - CTA: Подобрать решение (slug: `/contact`) [new]
- Застройщикам (slug: `/developers`)
  - Инфраструктура (slug: `/developers/connecting_objects`)
    - Подключение объектов (slug: `/developers/connecting_objects`) 
    - Компенсация убытков (slug: `/developers/compensation_for_losses`)
  - Инфраструктурные продукты и решения (slug: `/developers/digital_solutions`)
  - Value‑message: 1 строка с УТП для застройщиков
- Операторам связи (slug: `/operators`)
  - Инфраструктура (slug: `/operators/infrastructure`)
    - Размещение на объектах (slug: `/operators/infrastructure/accommodation_at_sites`)
    - Кабельная канализация (slug: `/operators/infrastructure/lks_kr`)
    - Проектирование и строительство сетей (slug: `/operators/infrastructure/pir_smr_mgts`)
  - Присоединение и пропуск трафика (slug: `/operators/joining_and_passing_traffic`)
  - Передача данных (slug: `/operators/data_transfer`)
  - Value‑message: 1 строка с УТП для операторов
- Госзаказчикам (slug: `/government`)
  - Цифровые сервисы (slug: `/government/digital_services`)
    - Видеонаблюдение:
      - Подъездное (slug: `/government/digital_services/entrance_video_surveillance`)
      - На объектах строительства (slug: `/government/digital_services/video_surveillance_building`)
      - Тех. обслуживание (slug: `/government/digital_services/video_surveillance_maintenance`)
    - Системы оповещения:
      - Оборудование (slug: `/government/digital_services/equipment`)
      - Сопряжение (slug: `/government/digital_services/main_and_backup_data_transmission`)
      - Тех. обслуживание (slug: `/government/digital_services/maintenance_interface_device`)
      - Громкоговорящая связь (slug: `/government/digital_services/speakerphone`)
    - Автоматизированные системы:
      - СКУД (slug: `/government/digital_services/access_control_systems`)
      - АСУ (slug: `/government/digital_services/automated_control_systems`)
      - АСКУЭ (slug: `/government/digital_services/automated_system_monitoring_accounting`)
      - COT (slug: `/government/digital_services/introduction_security_tv_systems`)
  - Инфраструктура связи (slug: `/government/communications_infrastructure`)
    - Наружные сети (slug: `/government/communications_infrastructure/external_communication`)
    - СКС (slug: `/government/communications_infrastructure/structured_cabling_networks`)
    - ЛВС (slug: `/government/communications_infrastructure/local_computing_network`)
    - Эксплуатация сети (slug: `/government/communications_infrastructure/network_operation`)
  - Индивидуальные решения (slug: `/government/customized_solutions`)
  - Value‑message: 1 строка с УТП для госзаказчиков
- Партнерам (slug: `/partners`)
  - Порядок допуска к проведению работ (slug: `/partners/procedure_admission_work`)
  - Реализация ТМЦ (slug: `/partners/realization`)
  - Рамочный договор (slug: `/partners/ramochnie_dogovori`)
  - Документация (slug: `/partners/documents`)
  - Закупки (slug: `/partners/purchas`)
  - Тарифы (slug: `/partners/tariffs`)
  
**Требования к мегаменю (best practices):**
- 2–3 колонки, четкая иерархия: **сегмент → категория → карточка/ссылка**.
- Визуальные карточки для ключевых сценариев (иконка/иллюстрация + 1‑строчный оффер).
- “Быстрые CTA” внутри меню: «Подобрать решение», «Связаться», «Скачать презентацию».
- Ясные заголовки категорий, избегать длинных технических формулировок в первом уровне.
- Стабильный hover‑state, задержка закрытия (≈200–300ms) чтобы не «прыгал» UX.
- Поддержка клавиатуры и доступности (tab‑navigation, aria‑labels).
- На мобильных: мегаменю → аккордеон, максимум 2 уровня раскрытия.


---

## 3) Страницы: что создаём с нуля и что наследуем

### 3.1 Создаём с нуля
1) **Главная `/`**
   - Новый hero с единым B2B‑оффером
   - Блокы сегментов (Застройщики/Операторы/Гос) + CTA
   - Сценарии/кейсы как entry points
   - Trust‑signals (цифры, кейсы, SLA)
   - Блок Найм (teaser + CTA)
   - Поиск + AI‑чат вход

2) **Contact Hub `/contact`**
   - Единая форма заявки (сегмент/задача/география/масштаб/контакты)
   - Маршрутизация по сегментам
   - Альтернативные каналы (телефон, email)

3) **Каталог услуг `/services`**
   - Сценарные подборки
   - Теги сегмента/сценария
   - Единый CTA “Подобрать решение”
   - Сценарии:
     - `/services/scenario-connecting-object`
     - `/services/scenario-infrastructure-360`
     - `/services/scenario-safe-object`
     - `/services/scenario-connectivity-data`
     - `/services/scenario-video-access`
     - `/services/scenario-network-ops`

4) **AI‑чат `/ai-chat`**
   - Лэндинг с описанием сценариев
   - Виджет/CTA на запуск диалога

5) **Операторам (коммерческий лендинг)**
   - Оффер, SLA, пакеты
   - Специализированная форма запроса

6) **Партнёрам (коммерческий лендинг)**
   - Уровни партнёрства
   - Выгоды, модель сотрудничества
   - Единая анкета партнёра

7) **Найм/Карьера `/career`**
   - EVP, вакансии, процесс отбора, форма отклика
   - Видимость с главной и меню

8) **Документы `/documents`**
   - Навигация/фильтры
   - Summary‑карточки (1–2 предложения)
   - FAQ/аннотации

9) **Раскрытие информации `/disclosure`**
   - Раздел для раскрытия (структура 1‑3 уровней)
   - Ссылки на документы/реестры

10) **Пользовательское соглашение `/terms`**
   - Юр.страница (общие условия)

11) **Карта сайта `/sitemap`**
   - HTML‑карта сайта для пользователей
   - `sitemap.xml` для поисковых систем

### 3.2 Наследуем с редизайном
- **Сегменты и услуги (редизайн + унификация шаблонов):**
  - `/business`
    - `/business/access_internet`
    - `/business/digital_television`
    - `/business/equipment_setup`
      - `/business/equipment_setup/computer_help`
    - `/business/mobile_connection`
    - `/business/payment_methods`
    - `/business/security_alarm`
    - `/business/telephony`
    - `/business/video_surveillance_office`
  - `/developers`
    - `/developers/compensation_for_losses`
    - `/developers/connecting_objects`
      - `/developers/connecting_objects/connecting_commercial`
      - `/developers/connecting_objects/connecting_construction`
      - `/developers/connecting_objects/connecting_residential`
    - `/developers/digital_solutions`
  - `/operators`
    - `/operators/all_services`
    - `/operators/contact_for_operators`
    - `/operators/data_transfer`
    - `/operators/infrastructure`
      - `/operators/infrastructure/accommodation_at_sites`
      - `/operators/infrastructure/avr_ppr`
      - `/operators/infrastructure/lks_kr`
      - `/operators/infrastructure/pir_smr_mgts`
    - `/operators/joining_and_passing_traffic`
    - `/operators/nondiscriminatory_access`
  - `/government`
    - `/government/all_services`
    - `/government/communications_infrastructure`
      - `/government/communications_infrastructure/external_communication`
      - `/government/communications_infrastructure/local_computing_network`
      - `/government/communications_infrastructure/network_operation`
      - `/government/communications_infrastructure/structured_cabling_networks`
    - `/government/customized_solutions`
    - `/government/digital_services`
      - `/government/digital_services/access_control_systems`
      - `/government/digital_services/automated_control_systems`
      - `/government/digital_services/automated_system_monitoring_accounting`
      - `/government/digital_services/entrance_video_surveillance`
      - `/government/digital_services/equipment`
      - `/government/digital_services/introduction_security_tv_systems`
      - `/government/digital_services/main_and_backup_data_transmission`
      - `/government/digital_services/maintenance_interface_device`
      - `/government/digital_services/speakerphone`
      - `/government/digital_services/video_surveillance_building`
      - `/government/digital_services/video_surveillance_maintenance`
  - `/partners`
    - `/partners/all_services`
    - `/partners/creating_work_order`
    - `/partners/documents`
    - `/partners/procedure_admission_work`
    - `/partners/purchas`
    - `/partners/ramochnie_dogovori`
    - `/partners/realization`
    - `/partners/tariffs`
- **Страницы компании/PR (редизайн контента и навигации):**
  - `/about_mgts`
  - `/mgts_values`
  - `/general_director_message`
  - `/interaction_with_partners`
  - `/partners_feedback_form`
  - `/single_hotline`
  - `/news`
  - `/offers`
- **Прочие содержательные страницы (редизайн/интеграция):**
  - `/contact_details` (объединить с Contact Hub)
  - `/forms_doc` (интеграция в `/documents`)
  - `/virtual_ate`
  - `/wca`

### 3.3 Наследуем как есть (минимальные правки)
- **Юридические и регуляторные страницы (текст неизменяем):**
  - `/bank_details`
  - `/licenses`
  - `/labor_safety`
  - `/timing_malfunctions`
  - `/cookie_processing`
  - `/data_processing`
  - `/mgts_compliance_policies`
- **Корпоративное управление и раскрытие (минимальные правки, оформление):**
  - `/corporate_documents`
  - `/principles_corporate_manage`
  - `/stockholder_copies_document`
  - `/decisions_meetings_shareholders`
  - `/infoformen`
  - `/about_registrar`
  - `/operinfo`

### 3.4 Требования к редизайну существующих страниц
Цель: привести унаследованные страницы к единому визуальному и UX‑стандарту, сохранив смысл и обязательные юридические формулировки.

**A. Обязательные элементы (для всех унаследованных страниц):**
- Хлебные крошки + корректный H1.
- Единый hero‑блок (название + 1‑2 строки ценностного предложения).
- Стандартизированные CTA (главный + вторичный) с привязкой к `/contact`.
- Блок “Для кого это” (сегменты/сценарии) при наличии услуги.
- FAQ/аккордеоны приводим к единому компоненту.
- Упорядоченный блок документов/файлов с корректными названиями и типами.
- Визуальные карточки/секции приводим к унифицированным паттернам (card/list).

**B. UX‑унификация (компоненты и поведение):**
- Карточки услуг: один формат (иконка/изображение, 1‑2 строки, CTA).
- Таблицы/тарифы: единый стиль, одинаковые заголовки колонок.
- Формы: единый набор полей (имя/компания/телефон/email/комментарий), единые валидации.
- Аккордеоны/FAQ: один уровень вложенности, управляемая длина текста.
- Сайдбар‑навигация (если есть): единый SidebarNav, без дубляжа главного меню.

**C. Контент‑правила (что можно/нельзя менять):**
- Юридические формулировки не переписываем, только структурируем и улучшаем читабельность.
- Для коммерческих страниц допускается сокращение длинных текстов с переносом в “Подробнее”.
- Повторяющиеся блоки/параграфы консолидируем.

**D. Визуальная система и медиаконтент:**
- Единая типографика и сетка, фиксированный ритм секций.
- Иконки и иллюстрации в high‑tech стиле (без разношерстных стоков).
- Фото/видео только при наличии доказательной ценности (кейсы/объекты).

**E. SEO/LLM‑доступность на унаследованных страницах:**
- Семантический H1/H2/H3; единый порядок секций.
- Добавить “короткие ответы” (1‑2 абзаца) для ключевых услуг.
- Микроразметка FAQ/Service там, где есть структурированные блоки.

**F. Проверка качества редизайна (контрольные критерии):**
- Сохранена семантика и все обязательные факты.
- Сокращено время до CTA и формы (≤ 2 прокрутки).
- Консистентный визуальный стиль и навигация.

### 3.5 Требования к новым страницам (общие + частные)
**Общие требования (для всех новых страниц):**
- Единые компоненты: hero, CTA, формы, карточки, FAQ, документы.
- Структура секций: H1 → H2/H3, логический порядок, без дубликатов блоков.
- Единые CTA: основной CTA ведет в `/contact`, вторичный — на релевантный раздел.
- Единые правила форм: поля + валидации + согласия (ПДн/политики).
- SEO/LLM: короткие ответы, микроразметка (FAQ/Service), корректные заголовки.
- Доступность: контраст, фокус‑стейты, aria‑labels, клавиатурная навигация.

**Частные требования (по ключевым новым страницам):**
- `/` (Главная): единый B2B‑оффер, сегменты по приоритету, быстрые сценарии, CTA, найм‑тизер.
- `/contact` (Contact Hub): сегментация заявки, SLA‑обещание, маршрутизация, альтернативные каналы.
- `/services` (Каталог): сценарии, фильтры, теги сегмента/сценария, CTA “Подобрать решение”.
- `/services/scenario-*`: структура «проблема → решение → кейсы → CTA».
- `/ai-chat`: описание сценариев применения, ограничения, CTA на диалог.
- `/career`: EVP, вакансии, процесс, формы, блок “почему МГТС”.
- `/documents`: фильтры, категории, краткие описания, актуальность/дата.
- `/disclosure`: иерархия 1‑3 уровня, ссылки на первоисточники, юридические пометки.
- `/terms`: неизменяемые юридические формулировки, дата обновления.
- `/sitemap`: HTML‑карта + ссылка на `sitemap.xml`.

### 3.6 Подразделы ТЗ по страницам (по slug)
Формат: **[new]** — создаем с нуля; **[redesign]** — берем контент со старого сайта и перерабатываем; **[as-is]** — без изменения текста, только оформление; **[merge]** — контент переносим в указанную страницу.

**Для всех [redesign] (минимальный набор обязательных блоков):**
- Hero + value‑message + CTA
- 1–2 секции “для кого/сценарии”
- Описание услуги/раздела (кратко + “подробнее”)
- FAQ (6–10)
- Trust‑signals (цифры/кейсы/лицензии)
- Финальный CTA + форма

**Общие страницы:**
- `/` — [new] структура из п.3.1/3.5, единый оффер + сегменты + сценарии (source: `mgts-backend/temp/page-analysis-llm/index_spec.json`, `mgts-backend/temp/page-analysis-llm/home_spec.json`).
- `/contact` — [new] Contact Hub, объединяет `/contact_details` (source: `mgts-backend/temp/page-analysis-llm/contact_details_spec.json`).
- `/career` — [new] карьера/найм, EVP + вакансии (source: нет).
- `/services` — [new] каталог услуг + сценарии (source: нет).
- `/services/scenario-connecting-object` — [new] сценарий, структура «проблема → решение → кейсы → CTA» (source: нет).
- `/services/scenario-infrastructure-360` — [new] сценарий, структура «проблема → решение → кейсы → CTA» (source: нет).
- `/services/scenario-safe-object` — [new] сценарий, структура «проблема → решение → кейсы → CTA» (source: нет).
- `/services/scenario-connectivity-data` — [new] сценарий, структура «проблема → решение → кейсы → CTA» (source: нет).
- `/services/scenario-video-access` — [new] сценарий, структура «проблема → решение → кейсы → CTA» (source: нет).
- `/services/scenario-network-ops` — [new] сценарий, структура «проблема → решение → кейсы → CTA» (source: нет).
- `/ai-chat` — [new] описание AI‑чата + CTA (source: нет).
- `/documents` — [new] агрегирует документы, включает контент из `/forms_doc` (source: `mgts-backend/temp/page-analysis-llm/forms_doc_spec.json`, `mgts-backend/temp/page-analysis-llm/documents_spec.json`).
- `/disclosure` — [new] раскрытие информации (иерархия 1–3 уровня) (source: нет).
- `/terms` — [new] юр.страница (общие условия) (source: нет).
- `/sitemap` — [new] HTML‑карта сайта (source: нет).
- `/news` — [redesign] новости (используем существующий контент) (source: `mgts-backend/temp/page-analysis-llm/news_spec.json`).
- `/offers` — [redesign] оферты/спецпредложения (source: `mgts-backend/temp/page-analysis-llm/offers_spec.json`).
- `/contact_details` — [merge] перенос в `/contact` (source: `mgts-backend/temp/page-analysis-llm/contact_details_spec.json`).
- `/forms_doc` — [merge] перенос в `/documents` (source: `mgts-backend/temp/page-analysis-llm/forms_doc_spec.json`).

**Бизнес (redesign, контент со старого сайта):**
- `/business` (source: `mgts-backend/temp/page-analysis-llm/business_spec.json`)
- `/business/access_internet` (source: `mgts-backend/temp/page-analysis-llm/access_internet_spec.json`)
- `/business/digital_television` (source: `mgts-backend/temp/page-analysis-llm/digital_television_spec.json`)
- `/business/equipment_setup` (source: `mgts-backend/temp/page-analysis-llm/business_equipment_setup_spec.json`)
- `/business/equipment_setup/computer_help` (source: `mgts-backend/temp/page-analysis-llm/computer_help_spec.json`)
- `/business/mobile_connection` (source: `mgts-backend/temp/page-analysis-llm/mobile_connection_spec.json`)
- `/business/payment_methods` (source: `mgts-backend/temp/page-analysis-llm/business_payment_methods_spec.json`)
- `/business/security_alarm` (source: `mgts-backend/temp/page-analysis-llm/security_alarm_spec.json`)
- `/business/telephony` (source: `mgts-backend/temp/page-analysis-llm/telephony_spec.json`)
- `/business/video_surveillance_office` (source: `mgts-backend/temp/page-analysis-llm/video_surveillance_office_spec.json`)

**Застройщики (redesign, контент со старого сайта):**
- `/developers` (source: `mgts-backend/temp/page-analysis-llm/developers_spec.json`)
- `/developers/compensation_for_losses` (source: `mgts-backend/temp/page-analysis-llm/developers_compensation_for_losses_spec.json`)
- `/developers/connecting_objects` (source: `mgts-backend/temp/page-analysis-llm/developers_connecting_objects_spec.json`)
- `/developers/connecting_objects/connecting_commercial` (source: `mgts-backend/temp/page-analysis-llm/connecting_commercial_spec.json`)
- `/developers/connecting_objects/connecting_construction` (source: `mgts-backend/temp/page-analysis-llm/connecting_construction_spec.json`)
- `/developers/connecting_objects/connecting_residential` (source: `mgts-backend/temp/page-analysis-llm/connecting_residential_spec.json`)
- `/developers/digital_solutions` (source: `mgts-backend/temp/page-analysis-llm/developers_digital_solutions_spec.json`)

**Операторы (redesign, контент со старого сайта):**
- `/operators` (source: `mgts-backend/temp/page-analysis-llm/operators_spec.json`)
- `/operators/all_services` (source: `mgts-backend/temp/page-analysis-llm/operators_all_services_spec.json`)
- `/operators/contact_for_operators` (source: `mgts-backend/temp/page-analysis-llm/contact_for_operators_spec.json`)
- `/operators/data_transfer` (source: `mgts-backend/temp/page-analysis-llm/data_transfer_spec.json`)
- `/operators/infrastructure` (source: нет)
- `/operators/infrastructure/accommodation_at_sites` (source: `mgts-backend/temp/page-analysis-llm/accommodation_at_sites_spec.json`)
- `/operators/infrastructure/avr_ppr` (source: `mgts-backend/temp/page-analysis-llm/avr_ppr_spec.json`)
- `/operators/infrastructure/lks_kr` (source: `mgts-backend/temp/page-analysis-llm/lks_kr_spec.json`)
- `/operators/infrastructure/pir_smr_mgts` (source: `mgts-backend/temp/page-analysis-llm/pir_smr_mgts_spec.json`)
- `/operators/joining_and_passing_traffic` (source: `mgts-backend/temp/page-analysis-llm/joining_and_passing_traffic_spec.json`)
- `/operators/nondiscriminatory_access` — [as-is] регуляторный текст, только оформление (source: `mgts-backend/temp/page-analysis-llm/operators_nondiscriminatory_access_spec.json`).

**Госзаказчики (redesign, контент со старого сайта):**
- `/government` (source: `mgts-backend/temp/page-analysis-llm/government_spec.json`)
- `/government/all_services` (source: `mgts-backend/temp/page-analysis-llm/government_all_services_spec.json`)
- `/government/communications_infrastructure` (source: `mgts-backend/temp/page-analysis-llm/government_communications_infrastructure_spec.json`)
- `/government/communications_infrastructure/external_communication` (source: `mgts-backend/temp/page-analysis-llm/external_communication_spec.json`)
- `/government/communications_infrastructure/local_computing_network` (source: `mgts-backend/temp/page-analysis-llm/local_computing_network_spec.json`)
- `/government/communications_infrastructure/network_operation` (source: `mgts-backend/temp/page-analysis-llm/network_operation_spec.json`)
- `/government/communications_infrastructure/structured_cabling_networks` (source: `mgts-backend/temp/page-analysis-llm/structured_cabling_networks_spec.json`)
- `/government/customized_solutions` (source: `mgts-backend/temp/page-analysis-llm/government_customized_solutions_spec.json`)
- `/government/digital_services` (source: `mgts-backend/temp/page-analysis-llm/government_digital_services_spec.json`)
- `/government/digital_services/access_control_systems` (source: `mgts-backend/temp/page-analysis-llm/access_control_systems_spec.json`)
- `/government/digital_services/automated_control_systems` (source: `mgts-backend/temp/page-analysis-llm/automated_control_systems_spec.json`)
- `/government/digital_services/automated_system_monitoring_accounting` (source: `mgts-backend/temp/page-analysis-llm/automated_system_monitoring_accounting_spec.json`)
- `/government/digital_services/entrance_video_surveillance` (source: `mgts-backend/temp/page-analysis-llm/entrance_video_surveillance_spec.json`)
- `/government/digital_services/equipment` (source: `mgts-backend/temp/page-analysis-llm/equipment_spec.json`)
- `/government/digital_services/introduction_security_tv_systems` (source: `mgts-backend/temp/page-analysis-llm/introduction_security_tv_systems_spec.json`)
- `/government/digital_services/main_and_backup_data_transmission` (source: `mgts-backend/temp/page-analysis-llm/main_and_backup_data_transmission_spec.json`)
- `/government/digital_services/maintenance_interface_device` (source: `mgts-backend/temp/page-analysis-llm/maintenance_interface_device_spec.json`)
- `/government/digital_services/speakerphone` (source: `mgts-backend/temp/page-analysis-llm/speakerphone_spec.json`)
- `/government/digital_services/video_surveillance_building` (source: `mgts-backend/temp/page-analysis-llm/video_surveillance_building_spec.json`)
- `/government/digital_services/video_surveillance_maintenance` (source: `mgts-backend/temp/page-analysis-llm/video_surveillance_maintenance_spec.json`)

**Партнёры (redesign, контент со старого сайта):**
- `/partners` (source: `mgts-backend/temp/page-analysis-llm/partners_spec.json`)
- `/partners/all_services` (source: нет)
- `/partners/creating_work_order` (source: `mgts-backend/temp/page-analysis-llm/partners_creating_work_order_spec.json`)
- `/partners/documents` (source: нет)
- `/partners/procedure_admission_work` (source: `mgts-backend/temp/page-analysis-llm/procedure_admission_work_spec.json`)
- `/partners/purchas` (source: `mgts-backend/temp/page-analysis-llm/purchas_spec.json`)
- `/partners/ramochnie_dogovori` (source: `mgts-backend/temp/page-analysis-llm/partners_ramochnie_dogovori_spec.json`)
- `/partners/realization` (source: `mgts-backend/temp/page-analysis-llm/realization_spec.json`)
- `/partners/tariffs` (source: `mgts-backend/temp/page-analysis-llm/tariffs_spec.json`)

**О компании / корпоративные (redesign):**
- `/about_mgts` (source: `mgts-backend/temp/page-analysis-llm/about_mgts_spec.json`)
- `/mgts_values` (source: `mgts-backend/temp/page-analysis-llm/mgts_values_spec.json`)
- `/general_director_message` (source: `mgts-backend/temp/page-analysis-llm/general_director_message_spec.json`)
- `/interaction_with_partners` (source: `mgts-backend/temp/page-analysis-llm/interaction_with_partners_spec.json`)
- `/partners_feedback_form` (source: `mgts-backend/temp/page-analysis-llm/partners_feedback_form_spec.json`)
- `/single_hotline` (source: `mgts-backend/temp/page-analysis-llm/single_hotline_spec.json`)

**Корпоративное управление и регуляторика (as‑is, оформление):**
- `/corporate_documents` (source: `mgts-backend/temp/page-analysis-llm/corporate_documents_spec.json`)
- `/principles_corporate_manage` (source: `mgts-backend/temp/page-analysis-llm/principles_corporate_manage_spec.json`)
- `/stockholder_copies_document` (source: `mgts-backend/temp/page-analysis-llm/stockholder_copies_document_spec.json`)
- `/decisions_meetings_shareholders` (source: `mgts-backend/temp/page-analysis-llm/decisions_meetings_shareholders_spec.json`)
- `/infoformen` (source: `mgts-backend/temp/page-analysis-llm/infoformen_spec.json`)
- `/about_registrar` (source: `mgts-backend/temp/page-analysis-llm/about_registrar_spec.json`)
- `/operinfo` (source: `mgts-backend/temp/page-analysis-llm/operinfo_spec.json`)
- `/bank_details` (source: `mgts-backend/temp/page-analysis-llm/bank_details_spec.json`)
- `/licenses` (source: `mgts-backend/temp/page-analysis-llm/licenses_spec.json`)
- `/labor_safety` (source: `mgts-backend/temp/page-analysis-llm/labor_safety_spec.json`)
- `/timing_malfunctions` (source: `mgts-backend/temp/page-analysis-llm/timing_malfunctions_spec.json`)
- `/cookie_processing` (source: `mgts-backend/temp/page-analysis-llm/cookie_processing_spec.json`)
- `/data_processing` (source: `mgts-backend/temp/page-analysis-llm/data_processing_spec.json`)
- `/mgts_compliance_policies` (source: `mgts-backend/temp/page-analysis-llm/mgts_compliance_policies_spec.json`)

**Прочие страницы (redesign):**
- `/virtual_ate` (source: `mgts-backend/temp/page-analysis-llm/virtual_ate_spec.json`)
- `/wca` (source: `mgts-backend/temp/page-analysis-llm/wca_spec.json`)

---

## 4) Единый шаблон страницы услуги
Цель: единый UX‑паттерн для всех услуг, быстрый путь к заявке и предсказуемость структуры.

**Структура секций (фиксированный порядок):**
1) **Hero**: H1 + 1‑2 строки ценностного предложения + основной CTA.
2) **Кому подходит**: сегменты/сценарии, 3–6 карточек.
3) **Возможности/состав услуги**: 3–7 карточек или список.
4) **Сценарии/кейсы применения**: 2–4 сценария, кратко.
5) **Пакеты/опции**: Start/Optimum/Enterprise (если применимо) или “Опции подключения”.
6) **SLA/сроки/цены**: диапазоны, условия, что включено/не включено.
7) **FAQ**: 6–10 вопросов (стоимость, сроки, подключение, поддержка).
8) **Документы/ссылки**: если есть регуляторика/оферты.
9) **Trust‑signals**: сертификаты/лицензии/цифры/кейсы.
10) **Финальный CTA**: единая форма + обещание SLA ответа.

**Требования к CTA:**
- Основной CTA “Подобрать решение / Оставить заявку” → `/contact`.
- Вторичный CTA: “Скачать презентацию / Узнать условия” (если есть файл).
- CTA повторяется минимум 2 раза (hero + финал).

**Требования к компонентам:**
- Карточки: единый размер, 1‑2 строки, не более 2 уровней вложенности.
- Аккордеоны: один уровень, без вложенных списков.
- Таблицы/тарифы: единый стиль, одинаковые заголовки, пояснение “что включено”.
- Формы: обязательные поля + согласие на ПДн.

---

## 5) Дизайн и UI/UX
**Визуальная концепция:**
- Core visual: **“Нервная система мегаполиса”**.
- Визуальный язык: сетевые паттерны, световые трассы, графика данных.
- Тон: high‑tech, молодежный, B2B‑серьезный (без “домашней” стилистики).

**Компоненты и поведение:**
- CTA: единый стиль (контраст, glow, micro‑motion), 2 состояния (primary/secondary).
- Карточки: единая высота, краткий текст, четкая иерархия.
- Иконографика: единый стиль, минимум 2‑3 варианта на раздел.
- Фото/видео: только для кейсов и подтверждения результата.

**Навигация и структура:**
- Навигация: ≤ 2 уровней (документы допускают 3).
- Sticky CTA на ключевых услугах.
- Breadcrumbs на всех внутренних страницах.

**Сайдбары (deep‑nav):**
- Secondary‑navigation при глубине > 2.
- Унифицированный SidebarNav (label, href, slug, kind).
- На мобильных: аккордеон/дропдаун.
- На страницах услуг sidebars не дублируют главную навигацию — только контекст.

### 5.2) Penpot (дизайн‑среда, выполнено)
- Развернута локальная Penpot‑среда и доступна по `https://localhost:3449`.
- Создана структура файлов/страниц, шаблоны `MGTS_Templates`, библиотека `MGTS_UI_Kit`.
- Токены обновлены под брендовые цвета и типографику из `SiteMGTS/css/style.css`.
- Загружены шрифты **MTS Sans** и **MTS Text**, типографические токены используют их.

## 5.1) Футер (структура)
Источник: `mgts-backend/temp/page-analysis-llm/HOME_MENU.json`

**Row links (верхняя строка футера):**
- Контакты (slug: `/contact`) [new]
- Подобрать решение (CTA, slug: `/contact`) [new]
- Найм / Карьера (slug: `/career`) [new]
- О компании (slug: `/about_mgts`)
- Новости (slug: `/news`)
- Документы (slug: `/documents`) [new]
- Раскрытие информации (slug: `/disclosure`) [new]
- Актив‑отель Искра (ahref: "https://www.pansionatiskra.ru/")
- Для дома (ahref: "https://mts.ru/")
- Коммерческая недвижимость (ahref: "https://arenda.mgts.ru/")

**Dropdown‑блоки (мобильная версия):**
- О компании
  - О МГТС (slug: `/about_mgts`)
  - Ценности МГТС (slug: `/mgts_values`)
  - Деловая этика и комплаенс (группа)
    - Обращение гендиректора (slug: `/general_director_message`)
    - Комплаенс‑политики МГТС (slug: `/mgts_compliance_policies`)
    - Взаимодействие с партнерами (slug: `/interaction_with_partners`)
    - Обратная связь (slug: `/partners_feedback_form`)
    - Единая горячая линия (slug: `/single_hotline`)
  - Корпоративное управление (группа)
    - Принципы корпоративного управления (slug: `/principles_corporate_manage`)
    - Корпоративные документы (slug: `/corporate_documents`)
    - Решения общих собраний акционеров (slug: `/decisions_meetings_shareholders`)
    - Информация для акционеров (slug: `/infoformen`)
    - О регистраторе (slug: `/about_registrar`)
- Документы
  - Лицензии и СРО + (slug: `/licenses`)
  - Оферты (slug: `/offers`)
  - Формы типовых документов (slug: `/forms_doc`)
  - Стандарты раскрытия информации (slug: `/operinfo`)
  - Спецоценка условий труда (slug: `/wca`)
  - Предоставление копий документов (slug: `/stockholder_copies_document`)
  - Сроки устранения неисправностей (slug: `/timing_malfunctions`)
  - Политика ПДн (slug: `/data_processing`)
  - Политика cookies (slug: `/cookie_processing`)
  - Политика охраны труда (slug: `/labor_safety`)
- Раскрытие информации
  - Существенные факты (slug: `/essential_facts`) [new]
  - Список аффилированных лиц (slug: `/affiliated_persons`) [new]
  - Отчеты эмитента (slug: `/stocks_reports`) [new]
  - Годовые отчеты/фин. отчетность (slug: `/reports`) [new]
  - Перечень инсайдерской информации (ext)
  - Структура акционерного капитала (ext)
  - Выпуск ценных бумаг (slug: `/emission`) [new]

**Колонки (второй уровень):**
- Застройщикам (slug: `/developers`)
  - Подключение объектов (slug: `/developers/connecting_objects`)
  - Компенсация убытков (slug: `/developers/compensation_for_losses`)
  - Цифровые решения (slug: `/developers/digital_solutions`)
- Операторам связи (slug: `/operators`)
  - Присоединение и пропуск трафика (slug: `/operators/joining_and_passing_traffic`)
  - Передача данных (slug: `/operators/data_transfer`)
  - Инфраструктура (slug: `/operators/infrastructure`)
- Госзаказчикам (slug: `/government`)
  - Инфраструктура связи (slug: `/government/communications_infrastructure`)
  - Цифровые сервисы (slug: `/government/digital_services`)
  - Индивидуальные решения (slug: `/government/customized_solutions`)
- Бизнесу (slug: `/business`)
  - Телефония (slug: `/business/telephony`)
  - Мобильная связь (slug: `/business/mobile_connection`)
  - Виртуальная АТС (slug: `/virtual_ate`)
  - Доступ в интернет (slug: `/business/access_internet`)
  - Телевидение (slug: `/business/digital_television`)
  - Видеонаблюдение (slug: `/business/video_surveillance_office`)
  - Охрана (slug: `/business/security_alarm`)
  - Компьютерная помощь (slug: `/business/equipment_setup/computer_help`)
- Партнерам (slug: `/partners`)
  - Закупки (slug: `/partners/purchas`)
  - Допуск к проведению работ (slug: `/partners/procedure_admission_work`)
  - Реализация ТМЦ (slug: `/partners/realization`)
  - Тарифы (slug: `/partners/tariffs`)
  - Документация (slug: `/partners/documents`)
  - Рамочный договор (slug: `/partners/ramochnie_dogovori`)

- Каталог услуг (slug: `/services`) [new]
  - Сценарии: Подключить объект; Инфраструктура 360; Безопасный объект; Связь/данные; Видео‑наблюдение и доступ; Эксплуатация сети

**Trust/SLA блок (короткий):**
- Ответ на заявку ≤ 24 часа (SLA)
- 24/7 поддержка корпоративных клиентов (если подтверждается)

**Нижняя строка футера (service bar):**
- © МГТС, год (авто‑обновление)
- Политика обработки персональных данных (slug: `/data_processing`)
- Политика cookies (slug: `/cookie_processing`)
- Пользовательское соглашение (slug: `/terms`) [new]
- Карта сайта / Sitemap (slug: `/sitemap`) [new] + `sitemap.xml`
- Иконки соцсетей (если утверждено)


---

## 6) Аналитика
**Базовый стек:**
- **Yandex Metrica + Matomo** (self‑hosted).
- GA4 опционально (если требуется внешняя отчетность).

**События и цели (обязательные):**
- CTA‑клики (hero/section/footer).
- Отправка формы (успех/ошибка).
- Поиск (запрос + результат/нет результата).
- AI‑чат (старт сессии, завершение, click‑to‑contact).
- Scroll depth (25/50/75/100%).
- Скачивание файлов/презентаций.

**Тех. требования:**
- Единый dataLayer.
- UTM‑атрибуция, рефереры, сегментация по ролям.
- Экспорт событий в BI (опционально).

---

## 7) Infosec (baseline)
**Транспорт и заголовки:**
- TLS 1.2+ + HSTS, secure cookies, SameSite.
- CSP, X‑Frame‑Options, X‑Content‑Type‑Options, Referrer‑Policy, Permissions‑Policy.

**Защита приложений:**
- WAF + rate limits + bot protection.
- CSRF + input validation + server‑side sanitization.
- Ограничения file upload + AV scan + whitelist типов.

**Операционные меры:**
- Централизованные audit‑логи.
- SAST/DAST + dependency scanning (CI).
- Регламент обновлений и патчей.

---

## 8) SEO/LLM
**Семантика и структура:**
- Кластеры: connectivity, security, smart‑building, video, infrastructure.
- H1/H2/H3 — иерархия без пропусков.
- ЧПУ‑slug и единый стиль заголовков.

**Контентные блоки:**
- FAQ/Q&A на ключевых услугах (6–10 вопросов).
- Short‑answer blocks (1–2 абзаца) в начале ключевых страниц.
- Уникальные meta‑title/description.

**Микроразметка:**
- Schema.org: FAQPage + Service + BreadcrumbList + Organization.

**Тех. SEO:**
- `sitemap.xml`, `robots.txt`, canonical, hreflang (если нужен).
- Core Web Vitals: LCP/CLS/INP в “зелёной” зоне.

---

## 9) CMS / Strapi
- Все новые страницы должны управляться через Strapi.
- Нужны контент‑типы:
  - Page (Dynamic Zones)
  - Service
  - Package
  - Case
  - Document
  - Partner Tier
  - Career Vacancy

**Текущее состояние и решение по переиспользованию:**
- Уже есть типы: `page`, `product`, `news`, `news-category`, `news-tag`, `navigation` (single), `footer` (single).
- `navigation` и `footer` можно оставить и расширять полями/структурой.
- `news`/`news-category`/`news-tag` можно использовать без пересоздания (нужны поля под новые требования витрины).
- `page` в текущем виде слишком ограничен (нет Dynamic Zones/компонентов), требуется переработка схемы.
- `product` заточен под e‑commerce (цены/sku/остатки) — для услуг лучше создать новый `Service` (либо сильно упростить/перенастроить `product`).
- Итог: **частично переиспользуем существующие типы, ключевые (Page/Service/Document/Case/Career) создаем/переделываем.**

**Решение по типам (что переиспользуем / меняем / оставляем):**
- **Переиспользуем (без пересоздания, только наполнение/легкие правки):**
  - `news`, `news-category`, `news-tag` (добавить поля витрины при необходимости).
  - `navigation` (single) — расширение структуры меню.
  - `footer` (single) — расширение структуры футера.
- **Меняем/пересобираем (рефактор схемы и компонентов):**
  - `page` → переработка под Dynamic Zones и компонентную модель.
  - `product` → заменяем на новый `Service` (старый `product` выводим из использования).
  - Новые: `Service`, `Package`, `Case`, `Document`, `PartnerTier`, `CareerVacancy`.
- **Оставляем без изменений (если уже есть и хватает полей):**
  - Пока нет явных кандидатов; если `news`/`news-category`/`news-tag` уже покрывают витрину — оставляем как есть.

---

## 9.1) Технологический стек (решение)
**Ограничения:**
- Только open‑source в бесплатных версиях.
- Первая версия разворачивается локально на Mac Air M4.

**Frontend:**
- Next.js (App Router) + React + TypeScript.
- UI: Tailwind CSS + Headless UI (или аналог для доступности).
- Формы: React Hook Form + Zod (валидация).

**Backend/CMS:**
- Strapi (самостоятельный хостинг) + PostgreSQL.
- API: REST (по умолчанию) + опционально GraphQL для витрины.

**Поиск и AI‑чат:**
- Поиск: Meilisearch или Typesense (по итогам PoC).
- AI‑чат: локально через Ollama + open‑source модель (например, Mistral 7B), retrieval из Strapi/документов.

**Инфраструктура и DevOps:**
- Локально: Colima/Podman (open‑source) для контейнеров.
- CI/CD: локальные скрипты, при необходимости — self‑hosted CI (Gitea + Drone).
- Hosting: локальный запуск на Mac Air M4; прод — VPS/VM (open‑source стек).
- CDN: опционально позже, в MVP не требуется.

**Наблюдаемость:**
- Логи: Loki/ELK (минимум — structured logs).
- Мониторинг: Prometheus + Grafana (или облачный аналог).

**Проверка соответствия ограничениям:**
- Все ключевые компоненты — open‑source.
- Компоненты, требующие облака/платной инфраструктуры, исключены из MVP.

---

## 9.2) AI‑чат (архитектура и интеграция)
**Цель:** чат максимально “заточен” на контент сайта и отвечает на основе актуальных данных Strapi/документов.

**PoC‑подход (допущение):**
- Используем **Perplexity API** для первой версии, передавая релевантный контекст.
- В будущем можем заменить LLM‑провайдера на локальную open‑source модель без изменения RAG‑контура.

**RAG‑контур (обязательно):**
- Источник контента: Strapi + документы/файлы (PDF/DOCX).
- Индексация: извлечение текста, нормализация, разбиение на чанки, хранение в поисковом индексе.
- Retrieval: подбор 5–10 релевантных фрагментов на запрос.
- Контекст запроса: summary сессии + найденные фрагменты + ключевые системные правила.

**Контекст и качество:**
- Храним историю диалога с периодическим сжатием (summary).
- Запрещаем “галлюцинации”: отвечать только из предоставленного контекста.
- В ответе: ссылки на источники (slug/URL).

**Тех. требования:**
- Ограничение токенов и размер контекста (резюмирование при переполнении).
- Логи запросов/ответов для обучения и улучшения базы.
- Фильтрация PII и защита от утечек.

---

## 10) Итоги ролевых требований (интеграция)
- Sales: единый CTA + пакеты + сценарии
- Marketing: сегментные УТП + trust‑signals
- Creative: high‑tech стиль, core visual
- UI/UX: упрощённая навигация, Contact Hub
- Infosec: compliance‑тексты + baseline controls
- SEO/LLM: FAQ + microdata
- HR: карьерный раздел + постоянная видимость

---

## 11) Сводка: что делаем в MVP
- Главная, сегменты, услуги, Contact Hub, Documents, Career
- Пакеты + CTA + FAQ
- Аналитика (Metrica + Matomo)
- AI‑чат + поиск
- Baseline security controls

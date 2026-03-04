## Penpot: структура проекта MGTS

Формат принятия: **Files = разделы сайта**, **Pages = страницы сайта**. Язык — русский. Имена страниц включают slug для быстрого сопоставления с ТЗ.

### 1) Файлы (разделы) и страницы

**01_Главная**
- Главная (`/`)

**02_Каталог_услуг**
- Каталог услуг (`/services`) [new]
- Сценарий: Подключить объект (`/services/scenario-connecting-object`) [new]
- Сценарий: Инфраструктура 360 (`/services/scenario-infrastructure-360`) [new]
- Сценарий: Безопасный объект (`/services/scenario-safe-object`) [new]
- Сценарий: Связь/данные (`/services/scenario-connectivity-data`) [new]
- Сценарий: Видео‑доступ (`/services/scenario-video-access`) [new]
- Сценарий: Эксплуатация сети (`/services/scenario-network-ops`) [new]

**03_Застройщикам**
- Застройщикам (`/developers`)
- Подключение объектов (`/developers/connecting_objects`)
- Подключение коммерческих объектов (`/developers/connecting_objects/connecting_commercial`)
- Подключение строящихся объектов (`/developers/connecting_objects/connecting_construction`)
- Подключение жилых объектов (`/developers/connecting_objects/connecting_residential`)
- Компенсация убытков (`/developers/compensation_for_losses`)
- Цифровые решения (`/developers/digital_solutions`)

**04_Операторам**
- Операторам (`/operators`)
- Все услуги (`/operators/all_services`)
- Контакт для операторов (`/operators/contact_for_operators`)
- Передача данных (`/operators/data_transfer`)
- Виртуальная АТС (`/virtual_ate`)
- Присоединение и пропуск трафика (`/operators/joining_and_passing_traffic`)
- Недискриминационный доступ (`/operators/nondiscriminatory_access`)
- Инфраструктура (`/operators/infrastructure`)
- Размещение на объектах (`/operators/infrastructure/accommodation_at_sites`)
- АВР/ППР (`/operators/infrastructure/avr_ppr`)
- ЛКС/КР (`/operators/infrastructure/lks_kr`)
- ПИР/СМР МГТС (`/operators/infrastructure/pir_smr_mgts`)

**05_Госзаказчикам**
- Госзаказчикам (`/government`)
- Все услуги (`/government/all_services`)
- Цифровые сервисы (`/government/digital_services`)
- Видеонаблюдение: подъездное (`/government/digital_services/entrance_video_surveillance`)
- Видеонаблюдение: на объектах строительства (`/government/digital_services/video_surveillance_building`)
- Видеонаблюдение: тех. обслуживание (`/government/digital_services/video_surveillance_maintenance`)
- Системы оповещения: оборудование (`/government/digital_services/equipment`)
- Системы оповещения: сопряжение (`/government/digital_services/main_and_backup_data_transmission`)
- Системы оповещения: тех. обслуживание (`/government/digital_services/maintenance_interface_device`)
- Системы оповещения: громкоговорящая связь (`/government/digital_services/speakerphone`)
- Автоматизированные системы: СКУД (`/government/digital_services/access_control_systems`)
- Автоматизированные системы: АСУ (`/government/digital_services/automated_control_systems`)
- Автоматизированные системы: АСКУЭ (`/government/digital_services/automated_system_monitoring_accounting`)
- Автоматизированные системы: COT (`/government/digital_services/introduction_security_tv_systems`)
- Инфраструктура связи (`/government/communications_infrastructure`)
- Наружные сети (`/government/communications_infrastructure/external_communication`)
- СКС (`/government/communications_infrastructure/structured_cabling_networks`)
- ЛВС (`/government/communications_infrastructure/local_computing_network`)
- Эксплуатация сети (`/government/communications_infrastructure/network_operation`)
- Индивидуальные решения (`/government/customized_solutions`)

**06_Бизнес**
- Бизнесу (`/business`)
- Доступ в интернет (`/business/access_internet`)
- Цифровое ТВ (`/business/digital_television`)
- Настройка оборудования (`/business/equipment_setup`)
- Компьютерная помощь (`/business/equipment_setup/computer_help`)
- Мобильная связь (`/business/mobile_connection`)
- Способы оплаты (`/business/payment_methods`)
- Охранная сигнализация (`/business/security_alarm`)
- Телефония (`/business/telephony`)
- Видеонаблюдение в офисе (`/business/video_surveillance_office`)

**07_Партнерам**
- Партнерам (`/partners`)
- Все услуги (`/partners/all_services`)
- Создание наряда (`/partners/creating_work_order`)
- Документы (`/partners/documents`)
- Порядок допуска к работам (`/partners/procedure_admission_work`)
- Закупки (`/partners/purchas`)
- Рамочные договоры (`/partners/ramochnie_dogovori`)
- Реализация (`/partners/realization`)
- Тарифы (`/partners/tariffs`)
- Обратная связь (форма) (`/partners_feedback_form`)

**08_Новости_и_акции**
- Новости (`/news`)
- Акции (`/offers`)

**09_О_компании**
- О МГТС (`/about_mgts`)
- Ценности (`/mgts_values`)
- Обращение гендиректора (`/general_director_message`)
- Комплаенс‑политики (`/mgts_compliance_policies`)
- Взаимодействие с партнерами (`/interaction_with_partners`)
- Единая горячая линия (`/single_hotline`)
- Корпоративное управление (`/principles_corporate_manage`)
- Корпоративные документы (`/corporate_documents`)
- Решения собраний акционеров (`/decisions_meetings_shareholders`)
- Информация для участия в собраниях (`/infoformen`)
- О регистраторе (`/about_registrar`)
- Банковские реквизиты (`/bank_details`)
- Копии документов акционерам (`/stockholder_copies_document`)
- Лицензии (`/licenses`)
- Охрана труда (`/labor_safety`)
- Сроки устранения неисправностей (`/timing_malfunctions`)
- WCA (`/wca`)

**10_Документы_и_правила**
- Документы (`/documents`) [new]
- Раскрытие информации (`/disclosure`) [new]
- Пользовательское соглашение (`/terms`) [new]
- Обработка данных (`/data_processing`)
- Обработка cookies (`/cookie_processing`)
- Формы и документы (`/forms_doc`)
- Оперативная информация (`/operinfo`)
- Информация для мужчин (`/infoformen`) (если нужно дублировать в этом разделе)

**11_Контакты**
- Контакт‑хаб (`/contact`) [new]
- Контактные данные (`/contact_details`)

**12_Карьера**
- Карьера (`/career`) [new]

**13_AI_и_поиск**
- AI‑чат (`/ai-chat`) [new]
- Поиск (служебная страница результатов) (`/search`) [new]
- Карта сайта (`/sitemap`) [new]

### 2) Шаблоны страниц (в отдельном файле `MGTS_Templates`)

- `TPL_Home` — главная.
- `TPL_Segment_Landing` — сегментные разделы (Застройщики/Операторы/Госзаказчики/Бизнес/Партнеры).
- `TPL_Service` — единый шаблон услуги (под ключевые услуги).
- `TPL_Scenario` — сценарии каталога услуг.
- `TPL_News_List` и `TPL_News_Detail`.
- `TPL_Contact_Hub` — контакты/обращения/CTA.
- `TPL_Career_List` и `TPL_Career_Detail`.
- `TPL_Doc_Page` — документы/политики/корпоративные страницы.
- `TPL_Form_Page` — формы/заявки/обратная связь.
- `TPL_Search_Results` — результаты поиска.
- `TPL_AI_Chat` — оболочка AI‑чата (если нужна отдельная страница).

### 3) Библиотека компонентов (файл `MGTS_UI_Kit`, подключить как Library)

**Базовые токены**
- Цвета: primary, secondary, neutral, success, warning, error.
- Типографика: H1‑H6, body, caption, link, button.
- Отступы/сетка/брейкпоинты: 8‑pt grid.

**Компоненты (с вариантами)**
- Header (desktop/mobile), Mega‑menu, Search.
- Footer (desktop/mobile).
- Hero (image/video/gradient).
- CTA‑блоки, Buttons, Links.
- Cards (service, scenario, case, news).
- Tabs / Accordion / FAQ.
- Breadcrumbs, Pagination.
- Forms: input, select, textarea, checkbox, radio, file, inline validation.
- Pricing/plan (если потребуется), KPI‑metrics.
- Logo wall / Partners.
- Case studies block.
- News list, date tags.
- Contact form + contact cards + map placeholder.

### 4) Связка с ТЗ

Все страницы и slugs соответствуют разделу `2.3` в `TECHNICAL_TASK_NEW_SITE.md`.
Если в процессе окажутся лишние/дубли — фиксировать в структуре и синхронизировать с ТЗ.

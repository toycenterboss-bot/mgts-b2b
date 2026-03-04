# План пакетного анализа страниц с LLM

**Дата создания:** 2026-01-12

## 📊 Общая статистика

- **Всего страниц в иерархии:** 97
- **Уже проанализировано:** 2 (home, corporate_documents)
- **Осталось проанализировать:** 95
- **Размер пачки:** 5 страниц
- **Всего пачек:** 19

## 📦 План пачек

### Пачка 1 (страницы 1-5)
- [ ] about_mgts
- [ ] about_registrar
- [ ] access_control_systems
- [ ] access_internet
- [ ] accommodation_at_sites

**Команда запуска:** `node scripts/analyze-pages-batch.js 1`

---

### Пачка 2 (страницы 6-10)
- [ ] all_services
- [ ] automated_control_systems
- [ ] automated_system_monitoring_accounting
- [ ] avr_ppr
- [ ] bank_details

**Команда запуска:** `node scripts/analyze-pages-batch.js 2`

---

### Пачка 3 (страницы 11-15)
- [ ] business
- [ ] business_all_services
- [ ] business_equipment_setup
- [ ] business_payment_methods
- [ ] computer_help

**Команда запуска:** `node scripts/analyze-pages-batch.js 3`

---

### Пачка 4 (страницы 16-20)
- [ ] connecting_commercial
- [ ] connecting_construction
- [ ] connecting_residential
- [ ] contact_details
- [ ] contacts

**Команда запуска:** `node scripts/analyze-pages-batch.js 4`

---

### Пачка 5 (страницы 21-25)
- [ ] corporate_documents ✅ (уже проанализировано)
- [ ] data_processing
- [ ] decisions_meetings_shareholders
- [ ] developers
- [ ] digital_television

**Команда запуска:** `node scripts/analyze-pages-batch.js 5`

---

### Пачка 6 (страницы 26-30)
- [ ] forms_doc
- [ ] general_director_message
- [ ] government
- [ ] home ✅ (уже проанализировано)
- [ ] infoformen

**Команда запуска:** `node scripts/analyze-pages-batch.js 6`

---

### Пачка 7 (страницы 31-35)
- [ ] infrastructure
- [ ] interaction_with_partners
- [ ] internet
- [ ] joining_and_passing_traffic
- [ ] labor_safety

**Команда запуска:** `node scripts/analyze-pages-batch.js 7`

---

### Пачка 8 (страницы 36-40)
- [ ] licenses
- [ ] mgts_compliance_policies
- [ ] mgts_values
- [ ] mobile_connection
- [ ] news

**Команда запуска:** `node scripts/analyze-pages-batch.js 8`

---

### Пачка 9 (страницы 41-45)
- [ ] nondiscriminatory_access
- [ ] offers
- [ ] operinfo
- [ ] operators
- [ ] partner

**Команда запуска:** `node scripts/analyze-pages-batch.js 9`

---

### Пачка 10 (страницы 46-50)
- [ ] partners
- [ ] partners_feedback_form
- [ ] principles_corporate_manage
- [ ] ramochnie_dogovori
- [ ] security

**Команда запуска:** `node scripts/analyze-pages-batch.js 10`

---

### Пачка 11 (страницы 51-55)
- [ ] security_alarm
- [ ] single_hotline
- [ ] stockholder_copies_document
- [ ] tariffs
- [ ] telephony

**Команда запуска:** `node scripts/analyze-pages-batch.js 11`

---

### Пачка 12 (страницы 56-60)
- [ ] timing_malfunctions
- [ ] tv
- [ ] virtual_ate
- [ ] video_surveillance_office
- [ ] wca

**Команда запуска:** `node scripts/analyze-pages-batch.js 12`

---

### Пачка 13 (страницы 61-65)
- [ ] *(будут определены автоматически)*

**Команда запуска:** `node scripts/analyze-pages-batch.js 13`

---

### Пачка 14 (страницы 66-70)
- [ ] *(будут определены автоматически)*

**Команда запуска:** `node scripts/analyze-pages-batch.js 14`

---

### Пачка 15 (страницы 71-75)
- [ ] *(будут определены автоматически)*

**Команда запуска:** `node scripts/analyze-pages-batch.js 15`

---

### Пачка 16 (страницы 76-80)
- [ ] *(будут определены автоматически)*

**Команда запуска:** `node scripts/analyze-pages-batch.js 16`

---

### Пачка 17 (страницы 81-85)
- [ ] *(будут определены автоматически)*

**Команда запуска:** `node scripts/analyze-pages-batch.js 17`

---

### Пачка 18 (страницы 86-90)
- [ ] *(будут определены автоматически)*

**Команда запуска:** `node scripts/analyze-pages-batch.js 18`

---

### Пачка 19 (страницы 91-95)
- [ ] *(будут определены автоматически)*

**Команда запуска:** `node scripts/analyze-pages-batch.js 19`

---

## 📝 Инструкции

1. Запустите пачку командой: `node scripts/analyze-pages-batch.js <номер_пачки>`
2. Дождитесь завершения анализа всех страниц в пачке
3. Проверьте результаты в выводе скрипта
4. Отметьте завершенные страницы в этом файле (замените `[ ]` на `[x]`)
5. Запустите следующую пачку

## 🔍 Проверка результатов

После завершения каждой пачки скрипт автоматически выводит:
- Количество секций для каждой страницы
- Количество табов и fileLinks (если есть)
- Статистику успешных/неуспешных анализов

## 📁 Результаты сохраняются в:
`mgts-backend/temp/page-analysis-llm/<slug>_spec.json`

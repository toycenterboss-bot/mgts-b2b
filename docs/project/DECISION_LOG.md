# Decision Log — MGTS New Site

This log captures decisions required before development, based on role analyses.
If data is missing in the legacy site, a placeholder implementation is proposed.

---

## 1) Core Value Proposition (B2B Sales/Marketing)
- **Decision**: Approve a single B2B value‑prop line for main hero + segment pages.
- **Why**: Required to standardize hero, CTA, and segment messaging.
- **Owner**: Marketing + Sales.
- **Status**: Pending.
- **Placeholder if missing**:
  - Option A: “Цифровая инфраструктура и связи для устойчивого роста бизнеса и города.”
  - Option B: “Инфраструктура связи и сервисов с гарантированным SLA под задачи застройщиков, операторов и гос.”
- **Answer**: Use Option B as baseline, then refine per segment.

## 2) Segment Priority Order (UI/UX + Sales)
- **Decision**: Confirm display order: Developers → Operators → Government.
- **Why**: Affects navigation order and homepage blocks.
- **Owner**: Product + Sales.
- **Status**: Pending.
- **Placeholder if missing**: Apply Developers → Operators → Government as default.
- **Answer**: Developers → Operators → Government.

## 3) Top Customer Scenarios (Sales/Marketing)
- **Decision**: Approve 5–7 “scenario‑first” entry points for the catalog.
- **Why**: Replaces technical grouping in menu/catalog.
- **Owner**: Sales + Marketing.
- **Status**: Pending.
- **Placeholder if missing**:
  - “Подключить объект”
  - “Инфраструктура 360”
  - “Безопасный объект”
  - “Связь и передача данных”
  - “Видео‑наблюдение и доступ”
  - “Сервисная эксплуатация сети”
- **Answer**: Подключить объект; Инфраструктура 360; Безопасный объект; Связь/данные; Видео‑наблюдение и доступ; Эксплуатация сети.

## 4) Unified Lead Form (Sales/UI/UX)
- **Decision**: Finalize required fields and SLA for response.
- **Why**: Single CTA and standard qualification flow.
- **Owner**: Sales + CX.
- **Status**: Pending.
- **Placeholder if missing**:
  - Fields: segment, задача, локация, масштаб (объекты/м²), контакты.
  - SLA: “Ответ в течение 24 часов”.
- **Answer**: Fields: segment, задача, локация, масштаб, контакты. SLA: ответ ≤ 24 часа.

## 5) Service Packages (Sales)
- **Decision**: Which services get “Start/Optimum/Enterprise” packages.
- **Why**: Needed for pricing layout and CTA.
- **Owner**: Sales.
- **Status**: Pending.
- **Placeholder if missing**:
  - Apply packages to: connectivity, video surveillance, infrastructure.
  - Use “от …” pricing and “по запросу” for Enterprise.
- **Answer**: Apply to connectivity/video/infrastructure first; Start/Optimum/Enterprise with “от … / по запросу”.

## 6) Operators Offer (Sales/Marketing)
- **Decision**: Define operator‑specific offer & standard request fields.
- **Why**: Dedicated landing and form.
- **Owner**: Sales.
- **Status**: Pending.
- **Placeholder if missing**:
  - Offer focus: SLA, transit capacity, geo coverage.
  - Fields: type of connection, geography, traffic volume.
- **Answer**: Offer focus: SLA, transit capacity, geo coverage. Form fields: type, geography, traffic volume.

## 7) Partners Tiers (Sales/Marketing)
- **Decision**: Define partnership levels and benefits.
- **Why**: Partner landing and CTA logic.
- **Owner**: Sales + Partner team.
- **Status**: Pending.
- **Placeholder if missing**:
  - Levels: базовый / сертифицированный / стратегический.
  - Benefits: скидки, приоритетные SLA, co‑marketing.
- **Answer**: Base / Certified / Strategic with clear benefits and thresholds.

## 8) Trust Signals & Proof Points (Marketing)
- **Decision**: Which cases, metrics, certifications can be published.
- **Why**: Required for credibility blocks.
- **Owner**: Marketing + Legal.
- **Status**: Pending.
- **Placeholder if missing**:
  - Use template blocks with “НДА‑кейс” + anonymized metrics.
- **Answer**: Use NDA‑cases + anonymized metrics; publish certifications where allowed.

## 9) Core Visual Direction (Creative)
- **Decision**: Approve primary visual metaphor.
- **Why**: Drives design system and motion.
- **Owner**: Creative Director.
- **Status**: Pending.
- **Placeholder if missing**:
  - Option A: “Нервная система мегаполиса” (data lines, pulses).
  - Option B: “Цифровая инфраструктура города” (grid, nodes, light paths).
- **Answer**: Approve “Нервная система мегаполиса” as the core visual.

## 10) CTA Visual Standard (Creative/UI/UX)
- **Decision**: Define CTA visual pattern (contrast, motion, placement).
- **Why**: Consistent conversion.
- **Owner**: Design Lead.
- **Status**: Pending.
- **Placeholder if missing**:
  - Primary CTA: solid high‑contrast button with subtle glow and hover micro‑motion.
- **Answer**: High‑contrast primary button with subtle glow and micro‑motion; consistent placement.

## 11) Navigation Depth Rule (UI/UX)
- **Decision**: Confirm max depth (≤2) for key services.
- **Why**: IA simplification.
- **Owner**: UX Lead.
- **Status**: Pending.
- **Placeholder if missing**: Enforce 2 levels for top services, 3 for documents.
- **Answer**: ≤ 2 levels for commercial services; 3 levels allowed for documents.

## 12) Contact Hub (UI/UX)
- **Decision**: Single Contact Hub or segmented contact pages?
- **Why**: Impacts sitemap and CTA routing.
- **Owner**: Product + CX.
- **Status**: Pending.
- **Placeholder if missing**:
  - Implement Contact Hub with router by segment + task.
- **Answer**: Single Contact Hub with routing by segment/task; keep segment contacts as secondary.

## 13) Documents UX (UI/UX)
- **Decision**: Required filters and summary cards for documents.
- **Why**: Improves usability and trust.
- **Owner**: UX Lead.
- **Status**: Pending.
- **Placeholder if missing**:
  - Filters: type, date, segment.
  - Summary cards: 1–2 sentences + “why it matters”.
- **Answer**: Filters: type/date/segment; summary cards 1–2 sentences + “why it matters”.

## 14) Security Messaging (Infosec)
- **Decision**: Mandatory form‑level security statements & links.
- **Why**: Compliance and trust.
- **Owner**: Infosec + Legal.
- **Status**: Pending.
- **Placeholder if missing**:
  - “Данные защищены, обрабатываются согласно Политике ПДн” + link.
- **Answer**: Standard PII statement + policy link near each form; baseline controls as listed.

## 15) SEO/LLM Clusters (SEO/LLM)
- **Decision**: Priority semantic clusters and landing pages.
- **Why**: Roadmap for content and IA.
- **Owner**: SEO Lead.
- **Status**: Pending.
- **Placeholder if missing**:
  - Clusters: connectivity, security, smart building, video, infrastructure.
- **Answer**: Connectivity, security, smart‑building, video, infrastructure (priority by Sales).

## 16) FAQ / LLM Snippets (SEO/LLM)
- **Decision**: Required FAQ questions per key service.
- **Why**: Search and LLM visibility.
- **Owner**: SEO Lead.
- **Status**: Pending.
- **Placeholder if missing**:
  - Q: стоимость? сроки? подключение? SLA? поддержка?
- **Answer**: FAQ set: cost, сроки, подключение, SLA, поддержка, интеграции.

## 17) Careers Section Scope (HR)
- **Decision**: Minimum MVP pages for hiring.
- **Why**: Must be visible across site.
- **Owner**: HR.
- **Status**: Pending.
- **Placeholder if missing**:
  - Pages: EVP, вакансии, процесс отбора, форма отклика.
- **Answer**: MVP: EVP, вакансии, процесс отбора, форма отклика.

## 18) Hiring CTA Placement (HR/UI/UX)
- **Decision**: Where “Hiring” appears in header/menu/home.
- **Why**: Visibility on every page.
- **Owner**: HR + UX.
- **Status**: Pending.
- **Placeholder if missing**:
  - Header item + hero teaser + footer link.

---
- **Answer**: Header + hero teaser + footer link (global).

## Additional Questions to Resolve Before Development

### Cross‑Role
- Are `business/government/developers` real landing pages or new pages to be created?
  - **Answer**: Segment pages: keep dedicated landing pages for business/government/developers, but unify on a single B2B template with segment‑specific UTP + scenarios + CTA.
- Who owns the lead qualification logic (required fields, routing, SLA) and final approval?
  - **Answer**: Lead qualification: owner = Sales + CX; use a single universal form with routing by segment/task and SLA response ≤ 24h.
- Which KPIs are mandatory and approved for use in acceptance criteria?
  - **Answer**: KPIs: keep MVP KPIs only (CTA CTR, form conversion, % qualified leads) and approve target values with Marketing/Sales.
- What data sources are available for cases/metrics/certifications, and can we use anonymized placeholders?
  - **Answer**: Trust sources: if real cases/metrics missing, publish anonymized NDA‑cases with ranges (SLA, coverage, сроки).
- What legal/compliance constraints apply to publishing SLA, pricing ranges, and metrics?
  - **Answer**: Legal constraints: publish ranges only; avoid exact pricing and confidential client names.


### B2B Sales
- Which top scenarios per segment are approved as primary catalog entry points?
  - **Answer**: Scenarios: approve 5–7 primary scenarios (подключение объекта, инфраструктура 360, безопасность, связь/данные, эксплуатация).
- Which services must have package tiers and are price ranges allowed to be published?
  - **Answer**: Packages: apply to connectivity/video/infrastructure first; Start/Optimum/Enterprise with “от … / по запросу”.
- Operator form: confirm required fields and formats (traffic volume units, geography format).
  - **Answer**: Operator form: required fields = connection type, geography (region/city/address), traffic volume (Gbps), сроки.
- Partner tiers: confirm level names, benefits, and qualification thresholds.
  - **Answer**: Partner tiers: Base/Certified/Strategic with clear thresholds (volume, geography, certification).


### Marketing
- Final segment value‑messages per segment (3–5 key claims) — who signs off?
  - **Answer**: Segment messages: define 3–5 key claims per segment; Marketing signs off.
- Is the brand one‑pager a standalone page or a hero block?
  - **Answer**: One‑pager: use a hero block on home + separate page for sales enablement.
- If real cases are missing, can we publish anonymized “NDA cases” with metrics?
  - **Answer**: Cases: NDA‑cases are allowed as placeholders with anonymized metrics.
- What is the approved partner offer copy and positioning?
  - **Answer**: Partner offer: single landing with benefits/tiers/CTA; remove process‑only emphasis.
- Analytics stack: do we need Yandex Metrica / Matomo / other tools for usage analytics?
  - **Answer**: Analytics stack: **Yandex Metrica + Matomo** recommended (events, funnels, heatmaps); GA4 optional if needed.


### Creative
- Which core visual metaphor is approved, and is 3D/motion allowed in production?
  - **Answer**: Core visual: choose one metaphor (recommended: “Нервная система мегаполиса”).
- Are there brand constraints on “youth/high‑tech” intensity for B2B/government audiences?
  - **Answer**: High‑tech tone: modern but restrained for B2B/government; avoid aggressive neon.
- Can AI‑generated visuals be used in production or only as mockups?
  - **Answer**: AI visuals: allowed for concept, production only after approval/legal check.
- What is the final CTA visual standard (contrast, placement, motion)?
  - **Answer**: CTA standard: high‑contrast button with micro‑motion and consistent placement.


### UI/UX
- Can we enforce max depth ≤ 2 for key services without losing compliance/document sections?
  - **Answer**: Navigation depth: ≤ 2 levels for commercial services; 3 levels allowed for documents.
- Is a single Contact Hub approved, or do we keep separate segment contact pages?
  - **Answer**: Contact Hub: single hub + segment‑specific contacts as secondary entry points.
- What fields are mandatory in unified forms and which are optional?
  - **Answer**: Unified forms: mandatory fields = segment, task, geography, scale, contacts; others optional.
- Do we have document metadata in Strapi to power filters (type, date, segment)?
  - **Answer**: Documents: require Strapi metadata (type/date/segment) to enable filters.


### Infosec
- Mandatory security statements for forms: exact wording and placement?
  - **Answer**: Form security text: standard PII statement near each form + policy link.
- Which security requirements are mandatory (TLS policies, CSP, WAF, rate limits, audit logs, etc.)?
  - **Answer**: Baseline controls: TLS 1.2+, HSTS, secure cookies, CSP, XFO/XCTO/Referrer/Permissions, WAF + rate limits, CSRF + input validation, file upload restrictions + AV scan, centralized audit logs, регулярные SAST/DAST.
- Which policy documents are canonical and where are they hosted?
  - **Answer**: Canonical policies: host in Strapi and link from every form/footer.
- Do forms require explicit consent checkboxes (PДн, cookies) on all pages?
  - **Answer**: Consents: explicit checkboxes for PII and cookies on all forms.
- If requirements are not finalized, confirm we can ship with the baseline controls:
  - **Answer**: Yes — ship with the baseline controls listed above, then tighten per Infosec review.


### SEO/LLM
- Approved semantic clusters and priority landing pages.
  - **Answer**: Clusters: connectivity, security, smart‑building, video, infrastructure (priority order by Sales).
- Required FAQ questions per key service (cost, срок, подключение, SLA, поддержка, etc.).
  - **Answer**: FAQ: cost, сроки, подключение, SLA, поддержка, интеграции (mandatory per key service).
- Required Schema.org types beyond FAQPage/Service (BreadcrumbList, Organization, etc.).
  - **Answer**: Schema: FAQPage + Service + BreadcrumbList + Organization as baseline.
- Do we need dedicated “short answer” blocks for LLM search on key pages?
  - **Answer**: Short answers: add 1–2 paragraph “short answer” blocks on key pages.


### HR
- Where will vacancies live: Strapi or external ATS integration?
  - **Answer**: Vacancies: prefer Strapi as source; ATS integration optional later.
- Is EVP content available, or do we ship with placeholder copy?
  - **Answer**: EVP: if no content, ship placeholder EVP block with measurable improvements later.
- Where must “Hiring” be visible (header, hero, footer, global banner)?
  - **Answer**: Hiring visibility: header + hero teaser + footer link globally.


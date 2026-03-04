/* Example CMS adapter for MGTS Stitch HTML.
 *
 * Purpose:
 * - Show how a CMS can hook into the canonical loader without changing HTML structure.
 * - Demonstrate overriding default open behavior (modal vs navigation).
 *
 * How it works:
 * - Listen for `mgts:open` (cancelable).
 * - If the CMS has a router, call preventDefault() and route to `detail.url`.
 * - Otherwise, let the loader open the modal, but inject demo content into it.
 */

(function () {
  "use strict";

  /** Mode switch for local testing:
   * - default: modal (inject demo content)
   * - add `?cmsMode=navigate` to test router override (preventDefault + navigation log)
   */
  const CMS_MODE = new URLSearchParams(window.location.search).get("cmsMode") || "modal";
  const HAS_ROUTER = CMS_MODE === "navigate";
  const qsStrapi = new URLSearchParams(window.location.search).get("strapi");
  const inferredHost = window.location.hostname || "localhost";
  const inferredProtocol = window.location.protocol === "file:" ? "http:" : window.location.protocol;
  const inferredBase = `${inferredProtocol}//${inferredHost}:1337`;
  const STRAPI_BASE =
    (qsStrapi && qsStrapi.trim()) ||
    (inferredBase.startsWith("http://") || inferredBase.startsWith("https://") ? inferredBase : "http://localhost:1337");

  const PAGE = document.body && document.body.getAttribute("data-page");
  // eslint-disable-next-line no-console
  console.log("[CMS_ADAPTER] init", { page: PAGE, strapiBase: STRAPI_BASE, mode: CMS_MODE });

  /** Example router implementation. Replace with your CMS router. */
  function cmsNavigate(url) {
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] navigate:", url);
    // In a real CMS this would call the router. For local demo we don't actually navigate.
  }

  function slugFromUrlPath(url) {
    try {
      const u = new URL(url, window.location.origin);
      const parts = u.pathname.split("/").filter(Boolean);
      return parts.length ? parts[parts.length - 1] : "";
    } catch {
      return "";
    }
  }

  /** Demo content provider (replace with CMS API fetch). */
  function getDemoContent(detail) {
    const { contentType, contentId } = detail || {};
    if (contentType === "news") {
      return {
        title: `Новость (${contentId || "unknown"})`,
        body: "Демо-контент новости. В CMS здесь будет реальный текст/изображения/дата.",
      };
    }
    if (contentType === "video") {
      return {
        title: `Видео (${contentId || "unknown"})`,
        body: "Демо-контент видео. В CMS здесь будет реальный URL видео или embed-плеер.",
      };
    }
    return null;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return await res.json();
  }

  async function tryFetchContent(detail) {
    const { contentType, contentId } = detail || {};
    if (!contentType || !contentId) return null;

    if (contentType === "news") {
      // Strapi: GET /api/news/slug/:slug
      const url = `${STRAPI_BASE}/api/news/slug/${encodeURIComponent(String(contentId))}`;
      const json = await fetchJson(url);
      const item = json && json.data ? json.data : null;
      if (!item) return null;
      return {
        title: item.title || `Новость (${contentId})`,
        bodyHtml: item.content || "",
        bodyText: item.shortDescription || "",
        featuredImageUrl: resolveMediaUrl(item.featuredImage),
      };
    }

    return null;
  }

  async function renderNewsDetailPage() {
    const sp = new URLSearchParams(window.location.search);
    const slug = (sp.get("slug") || "").trim();
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/news/slug/${encodeURIComponent(slug)}`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_news_detail: fetch", url);
    const json = await fetchJson(url);
    const item = json && json.data ? json.data : null;
    if (!item) return;

    const titleEl = document.querySelector("[data-cms-title]");
    if (titleEl) titleEl.textContent = item.title || slug;

    const catEl = document.querySelector("[data-news-meta-category]");
    if (catEl) catEl.textContent = item.category?.name || "Новости";

    const dateEl = document.querySelector("[data-news-meta-date]");
    if (dateEl) dateEl.textContent = formatDateRu(item.publishDate);

    const bodyEl = document.querySelector("[data-cms-body]");
    if (bodyEl) bodyEl.innerHTML = item.content || "";

    const mediaWrap = document.querySelector("[data-cms-media]");
    const imgEl = document.querySelector("[data-cms-image]");
    const imgUrl = resolveMediaUrl(item.featuredImage);
    if (mediaWrap && imgEl) {
      if (imgUrl) {
        const abs = imgUrl.startsWith("http") ? imgUrl : `${STRAPI_BASE}${imgUrl}`;
        imgEl.setAttribute("src", abs);
        mediaWrap.classList.remove("hidden");
      } else {
        mediaWrap.classList.add("hidden");
        imgEl.removeAttribute("src");
      }
    }
  }

  function fillTariffTable(tableEl, section) {
    if (!tableEl) return;
    const cols = Array.isArray(section?.columns) ? section.columns : [];
    const rows = Array.isArray(section?.rows) ? section.rows : [];

    // Reset table fully (keep element + classes for styling).
    clearNode(tableEl);

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    trh.className = "bg-slate-50 dark:bg-slate-900/50";
    for (const col of cols) {
      const th = document.createElement("th");
      th.className =
        "p-6 text-left text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800";
      th.textContent = String(col?.name || col?.key || "");
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    tableEl.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.className = "row-hover transition-colors";
      for (const col of cols) {
        const td = document.createElement("td");
        td.className = "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm";
        const key = col?.key;
        td.textContent = key ? String(r?.[key] ?? "") : "";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tableEl.appendChild(tbody);
  }

  function buildFaqDetailsItem(question, answerHtml, { open = false } = {}) {
    const details = document.createElement("details");
    details.className =
      "service-faq__item group bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden transition-all shadow-sm";
    if (open) details.open = true;

    const summary = document.createElement("summary");
    summary.className = "flex items-center justify-between p-5 cursor-pointer list-none";

    const q = document.createElement("span");
    q.className = "service-faq__question font-semibold text-slate-900 dark:text-white";
    q.textContent = String(question || "");

    const icon = document.createElement("span");
    icon.className =
      "material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform duration-300";
    icon.textContent = "expand_more";

    summary.appendChild(q);
    summary.appendChild(icon);
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "service-faq__answer px-5 pb-5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed";
    body.innerHTML = String(answerHtml || "");
    details.appendChild(body);

    return details;
  }

  async function renderTplServicePage() {
    const sp = new URLSearchParams(window.location.search);
    const slug = (sp.get("slug") || "").trim();
    if (!slug) return;

    // Use query-based endpoint so slugs containing "/" (e.g. business/access_internet) work.
    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_service: fetch", url);
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;
    const sections = Array.isArray(page.sections) ? page.sections : [];

    // Hero
    const heroTitleEl = document.querySelector("[data-cms-hero-title]");
    if (heroTitleEl && page.hero?.title) heroTitleEl.textContent = String(page.hero.title);
    const heroSubEl = document.querySelector("[data-cms-hero-subtitle]");
    if (heroSubEl) {
      const sub = (page.hero?.subtitle || "").trim();
      if (sub) {
        heroSubEl.textContent = sub;
        heroSubEl.classList.remove("hidden");
      } else {
        heroSubEl.classList.add("hidden");
      }
    }

    // Tariff table
    const tariff = sections.find((s) => s?.__component === "page.tariff-table");
    const tariffTitleEl = document.querySelector("[data-cms-tariff-title]");
    if (tariffTitleEl && tariff?.title) tariffTitleEl.textContent = String(tariff.title);
    const tariffDescEl = document.querySelector("[data-cms-tariff-desc]");
    if (tariffDescEl) {
      const d = (tariff?.description || "").trim();
      if (d) {
        tariffDescEl.textContent = d;
        tariffDescEl.classList.remove("hidden");
      } else {
        tariffDescEl.classList.add("hidden");
      }
    }
    const tariffTableEl = document.querySelector("[data-cms-tariff-table]");
    if (tariff && tariffTableEl) fillTariffTable(tariffTableEl, tariff);
    // Hide billing toggle for now (our `page.tariff-table` schema is not billing-aware yet)
    const billingToggle = document.querySelector('[data-stitch-block="pricing_and_specs_table"] [data-billing]');
    if (billingToggle) billingToggle.classList.add("hidden");

    // FAQ
    const faq = sections.find((s) => s?.__component === "page.service-faq");
    const faqTitleEl = document.querySelector("[data-cms-faq-title]");
    if (faqTitleEl && faq?.title) faqTitleEl.textContent = String(faq.title);
    const faqItemsEl = document.querySelector("[data-cms-faq-items]");
    if (faqItemsEl && faq && Array.isArray(faq.items)) {
      clearNode(faqItemsEl);
      faq.items.filter(Boolean).forEach((it, idx) => {
        faqItemsEl.appendChild(buildFaqDetailsItem(it.question, it.answer, { open: idx === 0 }));
      });
      // Ensure canonical accordion behavior (single open) still works.
      faqItemsEl.setAttribute("data-accordion", "");
      faqItemsEl.setAttribute("data-accordion-multiple", "false");
    }

    // Order form section text
    const order = sections.find((s) => s?.__component === "page.service-order-form");
    const orderTitleEl = document.querySelector("[data-cms-order-title]");
    if (orderTitleEl && order?.title) orderTitleEl.textContent = String(order.title);
    const orderSubEl = document.querySelector("[data-cms-order-subtitle]");
    if (orderSubEl) {
      const sub = (order?.subtitle || "").trim();
      if (sub) {
        orderSubEl.textContent = sub;
        orderSubEl.classList.remove("hidden");
      } else {
        orderSubEl.classList.add("hidden");
      }
    }
    const orderFormEl = document.querySelector("[data-cms-order-form]");
    if (orderFormEl) {
      if (order?.formAction) orderFormEl.setAttribute("action", String(order.formAction));
      if (order?.formMethod) orderFormEl.setAttribute("method", String(order.formMethod));
    }

    const applySwitchState = (btn, on) => {
      if (!btn) return;
      const thumb = btn.querySelector("[data-switch-thumb]");
      const parse = (s) => String(s || "").split(" ").map((x) => x.trim()).filter(Boolean);
      const toggle = (node, classes, enabled) => {
        if (!node) return;
        parse(classes).forEach((c) => node.classList.toggle(c, enabled));
      };
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      toggle(btn, btn.getAttribute("data-switch-on-class"), on);
      toggle(btn, btn.getAttribute("data-switch-off-class"), !on);
      toggle(thumb, btn.getAttribute("data-switch-thumb-on-class"), on);
      toggle(thumb, btn.getAttribute("data-switch-thumb-off-class"), !on);
    };

    const bindButtonHref = (btn, href) => {
      if (!btn) return;
      const safeHref = String(href || "").trim();
      if (!safeHref) return;
      btn.setAttribute("data-service-consult-href", safeHref);
      btn.addEventListener("click", () => {
        try {
          window.location.assign(safeHref);
        } catch {
          // ignore
        }
      });
    };

    // Consultation card
    const consult = sections.find((s) => s?.__component === "page.service-consultation-card");
    const consultSection = document.querySelector('[data-stitch-block="service_consultation_card"]');
    if (consultSection) {
      if (!consult) {
        consultSection.classList.add("hidden");
      } else {
        consultSection.classList.remove("hidden");
        setText(document.querySelector("[data-service-consult-title]"), consult.title || "");
        setText(document.querySelector("[data-service-consult-subtitle]"), consult.subtitle || "");
        const btn = document.querySelector("[data-service-consult-button]");
        if (btn && consult.buttonText) btn.textContent = String(consult.buttonText);
        bindButtonHref(btn, consult.buttonHref || "");
      }
    }

    // Customization panel
    const customization = sections.find((s) => s?.__component === "page.service-customization-panel");
    const customizationSection = document.querySelector('[data-stitch-block="service_customization_panel"]');
    if (customizationSection) {
      if (!customization) {
        customizationSection.classList.add("hidden");
      } else {
        customizationSection.classList.remove("hidden");
        setText(document.querySelector("[data-service-customization-title]"), customization.title || "");
        setText(
          document.querySelector("[data-service-customization-dropdown-label]"),
          customization.dropdownLabel || ""
        );

        const dropdown = customizationSection.querySelector("[data-dropdown]");
        const dropdownTrigger = dropdown ? dropdown.querySelector("[data-dropdown-trigger]") : null;
        const dropdownLabel = dropdownTrigger ? dropdownTrigger.querySelector("[data-dropdown-label]") : null;
        const dropdownMenu = dropdown ? dropdown.querySelector("[data-dropdown-menu]") : null;
        const optionsHost = customizationSection.querySelector("[data-service-customization-options]");
        if (optionsHost) {
          const optionsRaw = Array.isArray(customization.dropdownOptions) ? customization.dropdownOptions : [];
          const options = optionsRaw
            .map((opt) => {
              if (!opt) return null;
              if (typeof opt === "string") {
                return { label: opt, value: slugifyId(opt) };
              }
              const label = String(opt.label || opt.title || opt.name || opt.text || "").trim();
              const value = String(opt.value || opt.key || slugifyId(label) || "").trim();
              if (!label) return null;
              return { label, value };
            })
            .filter(Boolean);

          const templateBtn = optionsHost.querySelector("[data-service-customization-option]");
          const templateClass = templateBtn ? templateBtn.className : "w-full text-left px-4 py-2 text-sm";
          clearNode(optionsHost);
          options.forEach((opt, idx) => {
            const li = document.createElement("li");
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = templateClass;
            btn.setAttribute("data-dropdown-option", "");
            btn.setAttribute("data-service-customization-option", "");
            btn.setAttribute("data-value", opt.value || "");
            btn.setAttribute("data-label", opt.label || "");
            btn.textContent = opt.label || "";
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              if (dropdownLabel && opt.label) dropdownLabel.textContent = opt.label;
              if (dropdownMenu) dropdownMenu.classList.add("hidden");
              if (dropdownTrigger) dropdownTrigger.setAttribute("aria-expanded", "false");
            });
            li.appendChild(btn);
            optionsHost.appendChild(li);
            if (idx === 0 && dropdownLabel && opt.label) dropdownLabel.textContent = opt.label;
          });
        }

        const togglesHost = customizationSection.querySelector("[data-service-customization-toggles]");
        if (togglesHost) {
          const toggles = Array.isArray(customization.toggles) ? customization.toggles : [];
          const rows = Array.from(togglesHost.querySelectorAll("[data-service-customization-toggle]"));
          const template = rows[0] || null;
          rows.slice(1).forEach((row) => row.remove());
          if (template && toggles.length > 0) {
            toggles.forEach((t, idx) => {
              const row = idx === 0 ? template : template.cloneNode(true);
              const labelEl = row.querySelector("[data-service-customization-toggle-label]");
              if (labelEl) labelEl.textContent = String(t?.label || `Опция ${idx + 1}`);
              const btn = row.querySelector("[data-switch]");
              applySwitchState(btn, Boolean(t?.enabled));
              if (idx > 0) togglesHost.appendChild(row);
            });
          }
        }

        const applyBtn = customizationSection.querySelector("[data-service-customization-apply]");
        if (applyBtn && customization.applyText) applyBtn.textContent = String(customization.applyText);
      }
    }

    // Stats card
    const stats = sections.find((s) => s?.__component === "page.service-stats-card");
    const statsSection = document.querySelector('[data-stitch-block="service_stats_card"]');
    if (statsSection) {
      if (!stats) {
        statsSection.classList.add("hidden");
      } else {
        statsSection.classList.remove("hidden");
        setText(document.querySelector("[data-service-stats-title]"), stats.title || "");
        setText(document.querySelector("[data-service-stats-label]"), stats.statLabel || "");
        setText(document.querySelector("[data-service-stats-value]"), stats.statValue || "");

        const barsHost = statsSection.querySelector("[data-service-stats-bars]");
        if (barsHost) {
          const bars = Array.isArray(stats.bars) ? stats.bars : [];
          const template = barsHost.querySelector("[data-service-stats-bar]");
          clearNode(barsHost);
          if (template) {
            bars.forEach((b) => {
              const v = Number(b);
              const pct = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
              const bar = template.cloneNode(true);
              bar.style.height = `${pct}%`;
              barsHost.appendChild(bar);
            });
          }
        }
      }
    }

    // Additional dynamic sections (between hero and tariff table).
    const sectionsHost = document.querySelector("[data-service-sections]");
    if (sectionsHost) {
      clearNode(sectionsHost);
      let added = 0;

      for (const s of sections) {
        if (!s || !s.__component) continue;
        if (
          s.__component === "page.tariff-table" ||
          s.__component === "page.service-faq" ||
          s.__component === "page.service-order-form" ||
          s.__component === "page.service-consultation-card" ||
          s.__component === "page.service-customization-panel" ||
          s.__component === "page.service-stats-card"
        ) {
          continue;
        }

        let node = null;
        if (s.__component === "page.section-text") {
          node = renderSectionText(s);
        } else if (s.__component === "page.section-cards") {
          node = renderCardGrid(s.title || "", s.cards || []);
        } else if (s.__component === "page.section-grid") {
          node = renderCardGrid(s.title || "", s.items || []);
        } else if (s.__component === "page.section-table") {
          node = renderSectionTable(s);
        } else if (s.__component === "page.files-table") {
          node = renderFilesTable(s);
        } else if (s.__component === "page.document-tabs") {
          node = renderDocumentTabs(s);
        } else if (s.__component === "page.image-carousel") {
          node = renderImageCarousel(s);
        } else if (s.__component === "page.image-switcher") {
          node = renderImageSwitcher(s);
        } else if (s.__component === "page.history-timeline") {
          node = renderHistoryTimeline(s);
        } else if (s.__component === "page.crm-cards") {
          node = renderCrmCards(s);
        } else if (s.__component === "page.how-to-connect") {
          node = renderHowToConnect(s);
        } else if (s.__component === "page.section-map") {
          node = renderSectionMap(s);
        } else if (s.__component === "page.service-tabs") {
          node = renderServiceTabs(s);
        }

        if (node) {
          sectionsHost.appendChild(node);
          added += 1;
        }
      }

      const wrap = sectionsHost.closest("section");
      if (wrap) wrap.classList.toggle("hidden", added === 0);
    }
  }

  async function renderTplHomePage() {
    const sp = new URLSearchParams(window.location.search);
    const slug = (sp.get("slug") || "home").trim();

    // Load page model (hero + sections)
    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_home: fetch", url);
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;

    // Hero
    if (page && page.hero) {
      const badgeEl = document.querySelector("[data-home-hero-badge]");
      if (badgeEl && page.hero?.title) {
        // Keep the dot; just replace the text node part if any.
        const text = badgeEl.childNodes && badgeEl.childNodes.length ? badgeEl.childNodes[badgeEl.childNodes.length - 1] : null;
        if (text && text.nodeType === 3) text.nodeValue = ` ${String(page.hero.title).trim()}`;
      }

      const titleEl = document.querySelector("[data-home-hero-title]");
      if (titleEl && page.hero?.title) titleEl.innerHTML = String(page.hero.title);

      const subEl = document.querySelector("[data-home-hero-subtitle]");
      if (subEl) setText(subEl, page.hero?.subtitle || "");

      const primaryBtn = document.querySelector("[data-home-hero-cta-primary]");
      const secondaryBtn = document.querySelector("[data-home-hero-cta-secondary]");
      const ctas = Array.isArray(page.hero?.ctaButtons) ? page.hero.ctaButtons : [];
      const primary = ctas.find((b) => b?.style === "primary") || ctas[0] || null;
      const secondary = ctas.find((b) => b?.style === "secondary" || b?.style === "outline") || ctas[1] || null;
      if (primaryBtn && primary?.text) {
        const label = primaryBtn.childNodes && primaryBtn.childNodes.length ? primaryBtn.childNodes[0] : null;
        if (label && label.nodeType === 3) label.nodeValue = String(primary.text);
        else primaryBtn.textContent = String(primary.text);
        if (primary?.href) primaryBtn.setAttribute("data-home-cta-href", String(primary.href));
      }
      if (secondaryBtn && secondary?.text) {
        secondaryBtn.textContent = String(secondary.text);
        if (secondary?.href) secondaryBtn.setAttribute("data-home-cta-href", String(secondary.href));
      }
    }

    // Services promo (first section-cards)
    if (page && Array.isArray(page.sections)) {
      const cardsSection = page.sections.find((s) => s && s.__component === "page.section-cards") || null;
      if (cardsSection) {
        const titleEl = document.querySelector("[data-home-services-title]");
        if (titleEl && cardsSection.title) setText(titleEl, cardsSection.title);

        const cards = Array.isArray(cardsSection.cards) ? cardsSection.cards : [];
        const slots = Array.from(document.querySelectorAll("[data-home-service-card]"));
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i];
          const c = cards[i] || null;
          if (!c) {
            slot.classList.add("opacity-40");
            continue;
          }
          slot.classList.remove("opacity-40");
          setText(slot.querySelector("[data-home-service-title]"), c.title || "");
          setText(slot.querySelector("[data-home-service-desc]"), c.description || "");
          // Optional CTA label (static in template is ok)
        }
      }
    }

    // News + tags + pagination: reuse the same logic as `tpl_news_list`
    // (tpl_home contains the same block markup `news_and_documents_list_2`).
    readStateFromUrl();
    setActiveTag(NEWS_STATE.tag);
    loadNewsPage(NEWS_STATE.page || 1).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_home: loadNewsPage failed:", err);
    });
    void loadTags();
    bindTags();
    bindNewsPagination();

    // Bind hero CTA buttons to navigation (optional).
    const bindBtn = (btn) => {
      if (!btn) return;
      btn.addEventListener("click", () => {
        const href = (btn.getAttribute("data-home-cta-href") || "").trim();
        if (!href) return;
        try {
          window.location.assign(href);
        } catch {
          // ignore
        }
      });
    };
    bindBtn(document.querySelector("[data-home-hero-cta-primary]"));
    bindBtn(document.querySelector("[data-home-hero-cta-secondary]"));
  }

  async function renderTplSegmentLandingPage() {
    const sp = new URLSearchParams(window.location.search);
    const slug = (sp.get("slug") || "developers").trim();

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_segment_landing: fetch", url);
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    // Hero (developers_industry_hero)
    if (page.hero) {
      const badgeEl = document.querySelector("[data-seg-hero-badge]");
      if (badgeEl) {
        // keep icon; replace trailing text if possible
        const last = badgeEl.childNodes && badgeEl.childNodes.length ? badgeEl.childNodes[badgeEl.childNodes.length - 1] : null;
        const label = String(page.hero.title || page.title || slug).replace(/<br\/?>/gi, " ").replace(/<[^>]*>/g, "").trim();
        if (last && last.nodeType === 3) last.nodeValue = ` ${label}`;
      }

      const titleEl = document.querySelector("[data-seg-hero-title]");
      if (titleEl) titleEl.innerHTML = String(page.hero.title || page.title || "");

      const subEl = document.querySelector("[data-seg-hero-subtitle]");
      if (subEl) setText(subEl, page.hero.subtitle || "");

      const ctas = Array.isArray(page.hero.ctaButtons) ? page.hero.ctaButtons : [];
      const primary = ctas.find((b) => b?.style === "primary") || ctas[0] || null;
      const secondary = ctas.find((b) => b?.style === "secondary" || b?.style === "outline") || ctas[1] || null;

      const b1 = document.querySelector("[data-seg-hero-cta-primary]");
      if (b1 && primary?.text) {
        const span = b1.querySelector("span");
        if (span) span.textContent = String(primary.text);
        else b1.textContent = String(primary.text);
        if (primary.href) b1.setAttribute("data-seg-cta-href", String(primary.href));
      }
      const b2 = document.querySelector("[data-seg-hero-cta-secondary]");
      if (b2 && secondary?.text) {
        const span = b2.querySelector("span");
        if (span) span.textContent = String(secondary.text);
        else b2.textContent = String(secondary.text);
        if (secondary.href) b2.setAttribute("data-seg-cta-href", String(secondary.href));
      }
    }

    // Catalog hero (service_and_scenario_cards_2 header)
    const catTitle = document.querySelector("[data-seg-catalog-title]");
    if (catTitle) catTitle.innerHTML = String(page.hero?.title || page.title || "");
    const catSub = document.querySelector("[data-seg-catalog-subtitle]");
    if (catSub) setText(catSub, page.hero?.subtitle || "");

    // Services/scenarios from sections (use up to 2 section-cards blocks)
    const sections = Array.isArray(page.sections) ? page.sections : [];
    const cardSections = sections.filter((s) => s && s.__component === "page.section-cards");
    const servicesSection = cardSections[0] || null;
    const scenariosSection = cardSections[1] || null;

    if (servicesSection) {
      const t = document.querySelector("[data-seg-services-title]");
      if (t && servicesSection.title) setText(t, servicesSection.title);

      const cards = Array.isArray(servicesSection.cards) ? servicesSection.cards : [];
      const slots = Array.from(document.querySelectorAll("[data-seg-service-card]"));
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const c = cards[i] || null;
        if (!c) {
          slot.classList.add("opacity-40");
          continue;
        }
        slot.classList.remove("opacity-40");
        setText(slot.querySelector("[data-seg-service-title]"), c.title || "");
        setText(slot.querySelector("[data-seg-service-desc]"), c.description || "");
        if (c.link) slot.setAttribute("data-seg-link", String(c.link));
      }
    }

    if (scenariosSection) {
      const t = document.querySelector("[data-seg-scenarios-title]");
      if (t && scenariosSection.title) setText(t, scenariosSection.title);

      const cards = Array.isArray(scenariosSection.cards) ? scenariosSection.cards : [];
      const slots = Array.from(document.querySelectorAll("[data-seg-scenario-card]"));
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const c = cards[i] || null;
        if (!c) {
          slot.classList.add("opacity-40");
          continue;
        }
        slot.classList.remove("opacity-40");
        setText(slot.querySelector("[data-seg-scenario-title]"), c.title || "");
        setText(slot.querySelector("[data-seg-scenario-desc]"), c.description || "");
        if (c.link) slot.setAttribute("data-seg-link", String(c.link));
      }
    }

    // Simple navigation for CTA buttons and cards (optional).
    const nav = (href) => {
      const u = String(href || "").trim();
      if (!u) return;
      try {
        window.location.assign(u);
      } catch {
        // ignore
      }
    };
    document.addEventListener("click", (e) => {
      const t = e.target && e.target.closest ? e.target.closest("[data-seg-cta-href],[data-seg-link]") : null;
      if (!t) return;
      const href = t.getAttribute("data-seg-cta-href") || t.getAttribute("data-seg-link") || "";
      if (!href) return;
      e.preventDefault();
      nav(href);
    });
  }

  async function renderTplScenarioPage() {
    const sp = new URLSearchParams(window.location.search);
    const slug = (sp.get("slug") || "scenario_demo").trim();
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_scenario: fetch", url);
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    // Hero area (connectivity_hero_variant)
    // We reuse the same anchors as tpl_service where possible.
    const heroTitleEl = document.querySelector("[data-cms-hero-title]");
    if (heroTitleEl && page.hero?.title) heroTitleEl.innerHTML = String(page.hero.title);
    const heroSubEl = document.querySelector("[data-cms-hero-subtitle]");
    if (heroSubEl) setText(heroSubEl, page.hero?.subtitle || "");

    // Sections: render supported DZ components into stable placeholders.
    const sections = Array.isArray(page.sections) ? page.sections : [];
    const faqPanel =
      document.querySelector("[data-scenario-faq]") ||
      document.querySelector('[data-stitch-block="accordions_and_sidebar_ui_2"] [data-switch-panel][data-switch-key="faq"]');
    if (faqPanel) {
      // Replace "Аккордеоны и FAQ" block with CMS-driven FAQ if present, otherwise keep.
      const faqSection = sections.find((s) => s && s.__component === "page.service-faq") || null;
      if (faqSection) {
        const host = faqPanel.querySelector("[data-accordion]") || faqPanel;
        if (host) {
          clearNode(host);
          const items = Array.isArray(faqSection.items) ? faqSection.items.filter(Boolean) : [];
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            host.appendChild(buildFaqDetailsItem(it.question, it.answer, { open: i === 0 }));
          }
        }
        // Title
        const h = faqPanel.querySelector("h2") || faqPanel.querySelector("h3.text-2xl.font-bold") || null;
        if (h && faqSection.title) setText(h, faqSection.title);
      }

    }

    // Scenario panels (service-tabs) render into a dedicated host to avoid mixing with FAQ/customization.
    const tabsHost = document.querySelector("[data-scenario-tabs-host]");
    if (tabsHost) {
      const tabsSection = sections.find((s) => s && s.__component === "page.service-tabs") || null;
      clearNode(tabsHost);
      if (tabsSection) {
        const tabsEl = renderServiceTabs(tabsSection);
        if (tabsEl) tabsHost.appendChild(tabsEl);
      }
    }
  }

  async function renderTplDocPage() {
    const sp = new URLSearchParams(window.location.search);
    const slug = (sp.get("slug") || "").trim();
    if (!slug) return;

    // Use query-based endpoint so slugs containing "/" work.
    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_doc_page: fetch", url);
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    const block = document.querySelector('[data-stitch-block="news_and_documents_list_1"]') || document;

    // Update header copy if markers exist
    const titleEl = block.querySelector("[data-doc-title]");
    if (titleEl) titleEl.textContent = String(page.title || "Документы");
    const subEl = block.querySelector("[data-doc-subtitle]");
    if (subEl) {
      const d = String(page.hero?.subtitle || "").trim();
      if (d) {
        subEl.textContent = d;
        subEl.classList.remove("hidden");
      } else {
        subEl.classList.add("hidden");
      }
    }

    // Remove news column + top tabs (doc page should be documents-centric)
    const news = block.querySelector("[data-doc-news]");
    if (news) news.remove();
    const topTabs = block.querySelector("[data-doc-top-tabs]");
    if (topTabs) topTabs.remove();

    // Remove news modal if present (it is irrelevant on doc pages)
    const newsModal = document.getElementById("mgts-news-detail-modal");
    if (newsModal) newsModal.remove();

    const host = block.querySelector("[data-doc-host]");
    if (!host) return;

    // Expand documents column to full width after removing the news column.
    // IMPORTANT: We can't rely on Tailwind classes added dynamically, because they may not exist
    // in the prebuilt `stitch-tailwind.css` (Tailwind only generates classes present at build time).
    // Use an inline grid override instead.
    host.classList.remove("lg:col-span-5", "lg:col-span-6", "lg:col-span-7");
    host.style.gridColumn = "1 / -1";
    host.style.minWidth = "0";

    // Keep the "Документация" header row if possible, but clear the list content below it.
    // The simplest is to clear everything and re-render; but we keep the first header row when we can.
    const headerRow = host.querySelector(":scope > .flex.items-center.justify-between") || null;
    const docsTitleEl = host.querySelector("[data-doc-docs-title]");
    if (docsTitleEl) docsTitleEl.textContent = "Документы";

    // Clear host
    clearNode(host);
    if (headerRow) host.appendChild(headerRow);

    // Render document sections in this template.
    const sections = Array.isArray(page.sections) ? page.sections : [];
    let docItemsCount = 0;
    let renderedDocBlocks = 0;
    for (const s of sections) {
      if (!s || !s.__component) continue;
      if (s.__component === "page.document-tabs") {
        const node = renderDocumentTabs(s);
        if (node) {
          host.appendChild(node);
          renderedDocBlocks += 1;
        }
      } else if (s.__component === "page.files-table") {
        const node = renderFilesTable(s);
        if (node) {
          host.appendChild(node);
          renderedDocBlocks += 1;
        }
        if (Array.isArray(s.files)) docItemsCount += s.files.filter(Boolean).length;
      }
    }

    // Fallback: if the page doesn't have document-specific structured blocks yet (common after raw HTML import),
    // render basic content blocks so the page isn't empty.
    if (renderedDocBlocks === 0) {
      for (const s of sections) {
        if (!s || !s.__component) continue;
        if (s.__component === "page.section-text") {
          host.appendChild(renderSectionText(s));
        } else if (s.__component === "page.section-cards") {
          const node = renderCardGrid(s.title || "", s.cards || []);
          if (node) host.appendChild(node);
        } else if (s.__component === "page.section-grid") {
          const node = renderCardGrid(s.title || "", s.items || []);
          if (node) host.appendChild(node);
        } else if (s.__component === "page.section-table") {
          const node = renderSectionTable(s);
          if (node) host.appendChild(node);
        } else if (s.__component === "page.section-map") {
          const node = renderSectionMap(s);
          if (node) host.appendChild(node);
        }
      }
    }

    const countEl = host.querySelector("[data-doc-docs-count]");
    if (countEl) {
      if (docItemsCount > 0) countEl.textContent = `Найдено: ${docItemsCount} файлов`;
      else countEl.textContent = "";
    }

    // Client-side filtering for file list (search + type).
    initDocFilesFilter(host);
  }

  function safeParseJsonArray(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === "string") {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  function slugifyId(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]+/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function setContactMarker(el, m, { defaultCategory = "offices" } = {}) {
    if (!el || !m) return;
    const id = String(m.id || m.slug || slugifyId(m.title || m.name || "") || "");
    const cat = String(m.category || m.type || defaultCategory || "");
    if (id) el.setAttribute("data-contact-id", id);
    if (cat) el.setAttribute("data-contact-category", cat);

    if (m.lat != null) el.setAttribute("data-lat", String(m.lat));
    if (m.lng != null) el.setAttribute("data-lng", String(m.lng));

    // Tooltip label (if present)
    const tip = el.querySelector("div.absolute.-top-12") || el.querySelector("div.bg-primary,div.bg-cyan-500");
    if (tip) tip.textContent = String(m.label || m.title || m.name || "").toUpperCase();
  }

  function setContactItem(el, m, { defaultCategory = "offices" } = {}) {
    if (!el || !m) return;
    const id = String(m.id || m.slug || slugifyId(m.title || m.name || "") || "");
    const cat = String(m.category || m.type || defaultCategory || "");
    if (id) el.setAttribute("data-contact-id", id);
    if (cat) el.setAttribute("data-contact-category", cat);

    if (m.lat != null) el.setAttribute("data-lat", String(m.lat));
    if (m.lng != null) el.setAttribute("data-lng", String(m.lng));

    const titleEl = el.querySelector("h4");
    if (titleEl) titleEl.textContent = String(m.title || m.name || "Локация");
    const addrEl = el.querySelector("p");
    if (addrEl) addrEl.textContent = String(m.address || m.description || "");

    // Badge (optional)
    const badge = el.querySelector("span.text-\\[10px\\]") || el.querySelector("span.bg-green-500\\/20,span.bg-primary\\/20");
    if (badge) {
      if (cat === "network") {
        badge.textContent = String(m.badge || "Узел связи");
        badge.classList.remove("bg-green-500/20", "text-green-400");
        badge.classList.add("bg-primary/20", "text-primary");
      } else {
        badge.textContent = String(m.badge || "Открыто");
        badge.classList.remove("bg-primary/20", "text-primary");
        badge.classList.add("bg-green-500/20", "text-green-400");
      }
    }
  }

  async function renderTplContactHubPage() {
    const sp = new URLSearchParams(window.location.search);
    const slug = (sp.get("slug") || "").trim();
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_contact_hub: fetch", url);
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    const hub = document.querySelector("[data-contact-hub]");
    if (!hub) return;

    // Title/subtitle (best-effort: based on current Stitch block structure)
    const headingWrap = hub.querySelector(".mb-4") || hub;
    const h1 = headingWrap.querySelector("h1");
    if (h1) h1.textContent = String(page.title || "Контакты");
    const subtitle = String(page.hero?.subtitle || "").trim();
    if (subtitle) {
      const p = headingWrap.querySelector("p");
      if (p) p.textContent = subtitle;
    }

    // Optional: use Hero background image for the stylized map background (if provided).
    const mapBgEl = hub.querySelector("[data-contact-map]");
    const heroBg = resolveMediaUrl(page.hero?.backgroundImage);
    if (mapBgEl && heroBg) {
      const abs = heroBg.startsWith("http") ? heroBg : `${STRAPI_BASE}${heroBg}`;
      mapBgEl.style.backgroundImage = `url("${abs}")`;
    }

    // Use first section-map as data source for markers (for now).
    const sections = Array.isArray(page.sections) ? page.sections : [];
    const mapSection = sections.find((s) => s && s.__component === "page.section-map") || null;
    const markersData = safeParseJsonArray(mapSection?.markers);
    if (!markersData.length) return;

    // Update existing DOM markers/items (we keep positions from the template).
    const markerEls = Array.from(hub.querySelectorAll("[data-contact-marker]"));
    const itemEls = Array.from(hub.querySelectorAll("[data-contact-item]"));

    for (let i = 0; i < markerEls.length; i++) {
      const m = markersData[i] || null;
      if (!m) {
        markerEls[i].classList.add("hidden");
        continue;
      }
      markerEls[i].classList.remove("hidden");
      setContactMarker(markerEls[i], m);
    }

    // Ensure we have enough cards (clone first as template), but keep layout intact.
    const itemHost = itemEls[0] ? itemEls[0].parentElement : null;
    if (itemHost && itemEls[0]) {
      const desired = Math.max(1, markersData.length);
      while (itemHost.querySelectorAll("[data-contact-item]").length < desired) {
        const clone = itemEls[0].cloneNode(true);
        itemHost.appendChild(clone);
      }
      // Re-query after cloning
      const all = Array.from(itemHost.querySelectorAll("[data-contact-item]"));
      // Remove extras
      while (all.length > desired) {
        const last = all.pop();
        if (last && last.parentNode) last.parentNode.removeChild(last);
      }
      // Update
      all.forEach((el, idx) => setContactItem(el, markersData[idx]));
    } else {
      // If we can't clone, update existing ones only
      for (let i = 0; i < itemEls.length; i++) {
        const m = markersData[i] || null;
        if (!m) {
          itemEls[i].classList.add("hidden");
          continue;
        }
        itemEls[i].classList.remove("hidden");
        setContactItem(itemEls[i], m);
      }
    }
  }

  function clearNode(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function renderSectionText(section) {
    const wrap = document.createElement("section");
    wrap.className = "rounded-2xl border border-white/10 bg-white/5 p-6";
    const title = section?.title ? String(section.title) : "";
    const content = section?.content ? String(section.content) : "";
    if (title) {
      const h = document.createElement("h2");
      h.className = "text-xl font-black tracking-tight mb-4";
      h.textContent = title;
      wrap.appendChild(h);
    }
    const body = document.createElement("div");
    body.className = "prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary";
    body.innerHTML = content || "";
    wrap.appendChild(body);
    return wrap;
  }

  function resolveAnyMediaUrl(media) {
    const u = resolveMediaUrl(media);
    if (!u) return null;
    return u.startsWith("http") ? u : `${STRAPI_BASE}${u}`;
  }

  function renderCardGrid(title, cards) {
    const list = Array.isArray(cards) ? cards.filter(Boolean) : [];
    if (!title && list.length === 0) return null;

    const wrap = document.createElement("section");
    wrap.className = "rounded-2xl border border-white/10 bg-white/5 p-6";

    if (title) {
      const h = document.createElement("h2");
      h.className = "text-xl font-black tracking-tight mb-4";
      h.textContent = title;
      wrap.appendChild(h);
    }

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4";

    for (const c of list) {
      const a = document.createElement(c.link ? "a" : "div");
      a.className =
        "block rounded-2xl border border-white/10 bg-black/20 hover:bg-black/10 transition-colors p-5";
      if (c.link) a.setAttribute("href", c.link);

      const imgUrl = resolveAnyMediaUrl(c.image);
      if (imgUrl) {
        const imgWrap = document.createElement("div");
        imgWrap.className = "mb-4 h-36 rounded-xl overflow-hidden bg-white/5 border border-white/10";
        const img = document.createElement("img");
        img.className = "h-full w-full object-cover";
        img.alt = "";
        img.src = imgUrl;
        imgWrap.appendChild(img);
        a.appendChild(imgWrap);
      }

      const h3 = document.createElement("h3");
      h3.className = "text-base font-black tracking-tight";
      h3.textContent = c.title || "Card";
      a.appendChild(h3);

      if (c.description) {
        const p = document.createElement("p");
        p.className = "mt-2 text-sm text-white/60 leading-relaxed";
        p.textContent = c.description;
        a.appendChild(p);
      }

      grid.appendChild(a);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  function hrefToSlug(href) {
    // Convert imported html hrefs like `data_processing/index.html` to slug `data_processing`
    const s = String(href || "").trim();
    if (!s) return "";
    const cleaned = s
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\//, "")
      .replace(/#.*$/, "")
      .replace(/\?.*$/, "")
      .replace(/index\.html$/i, "")
      .replace(/\.html$/i, "")
      .replace(/\/$/, "");
    return cleaned;
  }

  function renderUnknownSection(section) {
    const wrap = document.createElement("section");
    wrap.className = "rounded-2xl border border-white/10 bg-white/5 p-6";
    const p = document.createElement("p");
    p.className = "text-white/60 text-sm mb-3";
    p.textContent = `Неподдерживаемая секция: ${section?.__component || "unknown"}`;
    wrap.appendChild(p);
    const pre = document.createElement("pre");
    pre.className = "text-xs text-white/50 overflow-auto";
    try {
      pre.textContent = JSON.stringify(section, null, 2);
    } catch {
      pre.textContent = String(section);
    }
    wrap.appendChild(pre);
    return wrap;
  }

  function renderTariffTable(section) {
    const columns = Array.isArray(section?.columns) ? section.columns : [];
    const rows = Array.isArray(section?.rows) ? section.rows : [];
    if (!columns.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "tariff-table rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "tariff-table__title text-xl font-black tracking-tight mb-3";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }
    if (section?.description) {
      const p = document.createElement("p");
      p.className = "text-sm text-white/60 mb-6";
      p.textContent = String(section.description);
      wrap.appendChild(p);
    }

    const tableWrap = document.createElement("div");
    tableWrap.className = "tariff-table__table overflow-auto rounded-xl border border-white/10";

    const table = document.createElement("table");
    table.className = "min-w-full text-sm";

    const thead = document.createElement("thead");
    thead.className = "bg-black/30";
    const trh = document.createElement("tr");
    for (const c of columns) {
      const th = document.createElement("th");
      th.className = "px-4 py-3 text-left font-black text-white/70 whitespace-nowrap";
      th.textContent = String(c?.name || c?.key || "");
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.className = "border-t border-white/10";
      for (const c of columns) {
        const td = document.createElement("td");
        td.className = "px-4 py-3 text-white/80 align-top";
        const key = c?.key;
        const v = key ? (r ? r[key] : "") : "";
        td.textContent = v == null ? "" : String(v);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    return wrap;
  }

  function isTableLike(v) {
    return !!v && typeof v === "object";
  }

  function normalizeTableData(tableData) {
    // Supported shapes:
    // 1) { columns:[{name,key}], rows:[{...}] }
    // 2) { headers:[...], rows:[[...]] }
    // 3) [{...}, {...}] (array of objects)
    // 4) [[...], [...]] (array of arrays)
    if (!tableData) return { columns: [], rows: [] };

    if (isTableLike(tableData) && Array.isArray(tableData.columns) && Array.isArray(tableData.rows)) {
      const columns = tableData.columns.map((c) => ({
        name: String(c?.name ?? c?.key ?? ""),
        key: String(c?.key ?? c?.name ?? ""),
      }));
      const rows = tableData.rows;
      return { columns, rows };
    }

    if (isTableLike(tableData) && Array.isArray(tableData.headers) && Array.isArray(tableData.rows)) {
      const headers = tableData.headers.map((h) => String(h ?? ""));
      const columns = headers.map((h, idx) => ({ name: h, key: String(idx) }));
      const rows = (tableData.rows || []).map((r) => {
        if (!Array.isArray(r)) return {};
        const obj = {};
        r.forEach((v, idx) => {
          obj[String(idx)] = v;
        });
        return obj;
      });
      return { columns, rows };
    }

    if (Array.isArray(tableData)) {
      if (tableData.length === 0) return { columns: [], rows: [] };

      if (Array.isArray(tableData[0])) {
        // First row as headers
        const headers = tableData[0].map((h) => String(h ?? ""));
        const columns = headers.map((h, idx) => ({ name: h, key: String(idx) }));
        const rows = tableData.slice(1).map((r) => {
          const obj = {};
          (Array.isArray(r) ? r : []).forEach((v, idx) => {
            obj[String(idx)] = v;
          });
          return obj;
        });
        return { columns, rows };
      }

      if (isTableLike(tableData[0])) {
        // Array of objects; columns inferred from keys (stable order: keys of first row)
        const keys = Object.keys(tableData[0] || {});
        const columns = keys.map((k) => ({ name: k, key: k }));
        return { columns, rows: tableData };
      }
    }

    // Fallback
    return { columns: [], rows: [] };
  }

  function renderSectionTable(section) {
    const td = section?.tableData;
    const { columns, rows } = normalizeTableData(td);
    if (!columns.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "section-table rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "section-table__title text-xl font-black tracking-tight mb-4";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }

    const tableWrap = document.createElement("div");
    tableWrap.className = "section-table__table overflow-auto rounded-xl border border-white/10";

    const table = document.createElement("table");
    table.className = "min-w-full text-sm";

    const thead = document.createElement("thead");
    thead.className = "bg-black/30";
    const trh = document.createElement("tr");
    for (const c of columns) {
      const th = document.createElement("th");
      th.className = "px-4 py-3 text-left font-black text-white/70 whitespace-nowrap";
      th.textContent = String(c?.name || c?.key || "");
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const r of Array.isArray(rows) ? rows : []) {
      const tr = document.createElement("tr");
      tr.className = "border-t border-white/10";
      for (const c of columns) {
        const tdEl = document.createElement("td");
        tdEl.className = "px-4 py-3 text-white/80 align-top";
        const key = c?.key;
        const v = key ? (r ? r[key] : "") : "";
        tdEl.textContent = v == null ? "" : String(v);
        tr.appendChild(tdEl);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    return wrap;
  }

  function renderServiceFaq(section) {
    const items = Array.isArray(section?.items) ? section.items : [];
    if (!items.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "service-faq rounded-2xl border border-white/10 bg-white/5 p-6";

    const h = document.createElement("h2");
    h.className = "service-faq__title text-xl font-black tracking-tight mb-4";
    h.textContent = String(section?.title || "Часто задаваемые вопросы");
    wrap.appendChild(h);

    const host = document.createElement("div");
    host.className = "service-faq__items flex flex-col gap-3";
    host.setAttribute("data-accordion", "");
    host.setAttribute("data-accordion-multiple", "false");

    for (const it of items) {
      const details = document.createElement("details");
      details.className = "service-faq__item group rounded-xl border border-white/10 bg-black/20 overflow-hidden";
      const summary = document.createElement("summary");
      summary.className = "flex items-center justify-between gap-4 p-5 cursor-pointer list-none";
      const q = document.createElement("span");
      q.className = "service-faq__question font-bold text-white";
      q.textContent = String(it?.question || "");
      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined text-white/60 group-open:rotate-180 transition-transform duration-300";
      icon.textContent = "expand_more";
      summary.appendChild(q);
      summary.appendChild(icon);
      details.appendChild(summary);

      const ans = document.createElement("div");
      ans.className =
        "service-faq__answer px-5 pb-6 text-white/70 text-sm leading-relaxed border-t border-white/10 mt-1 pt-4";
      ans.innerHTML = String(it?.answer || "");
      details.appendChild(ans);

      host.appendChild(details);
    }

    wrap.appendChild(host);
    return wrap;
  }

  function renderServiceOrderForm(section) {
    const wrap = document.createElement("section");
    wrap.className = "service-order-form rounded-2xl border border-white/10 bg-white/5 p-6";

    const h = document.createElement("h2");
    h.className = "service-order-form__title text-xl font-black tracking-tight";
    h.textContent = String(section?.title || "Заказать услугу");
    wrap.appendChild(h);

    if (section?.subtitle) {
      const p = document.createElement("p");
      p.className = "mt-2 text-sm text-white/60";
      p.textContent = String(section.subtitle);
      wrap.appendChild(p);
    }

    const form = document.createElement("form");
    form.className = "service-order-form__form mt-6 grid grid-cols-1 md:grid-cols-2 gap-4";
    form.setAttribute("action", String(section?.formAction || "#"));
    form.setAttribute("method", String(section?.formMethod || "POST"));
    form.setAttribute("data-form-type", String(section?.formType || "general-request"));

    const field = (label, name, type = "text") => {
      const w = document.createElement("label");
      w.className = "service-order-form__field-wrapper flex flex-col gap-2";
      const l = document.createElement("span");
      l.className = "service-order-form__label text-xs font-black uppercase tracking-widest text-white/50";
      l.textContent = label;
      const i = document.createElement("input");
      i.className =
        "service-order-form__input h-11 rounded-xl bg-black/20 border border-white/10 px-4 text-sm outline-none focus:border-primary/60";
      i.type = type;
      i.name = name;
      w.appendChild(l);
      w.appendChild(i);
      return w;
    };

    form.appendChild(field("Имя", "name"));
    form.appendChild(field("Телефон", "phone", "tel"));
    form.appendChild(field("Email", "email", "email"));

    const msgWrap = document.createElement("label");
    msgWrap.className = "flex flex-col gap-2 md:col-span-2";
    const ml = document.createElement("span");
    ml.className = "text-xs font-black uppercase tracking-widest text-white/50";
    ml.textContent = "Комментарий";
    const ta = document.createElement("textarea");
    ta.className = "min-h-[110px] rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary/60";
    ta.name = "message";
    msgWrap.appendChild(ml);
    msgWrap.appendChild(ta);
    form.appendChild(msgWrap);

    const btn = document.createElement("button");
    btn.type = "submit";
    btn.className =
      "service-order-form__button md:col-span-2 h-11 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all";
    btn.textContent = "Отправить";
    form.appendChild(btn);

    wrap.appendChild(form);
    return wrap;
  }

  function fileTypeIcon(ft) {
    const t = String(ft || "").toLowerCase();
    if (t === "pdf") return "picture_as_pdf";
    if (t === "doc" || t === "docx") return "description";
    if (t === "xls" || t === "xlsx") return "grid_on";
    if (t === "zip") return "folder_zip";
    return "attach_file";
  }

  function humanFileType(ft) {
    const t = String(ft || "").toLowerCase();
    if (!t) return "Все типы";
    if (t === "pdf") return "PDF";
    if (t === "doc") return "DOC";
    if (t === "docx") return "DOCX";
    if (t === "xls") return "XLS";
    if (t === "xlsx") return "XLSX";
    if (t === "zip") return "ZIP";
    if (t === "other") return "Другие";
    return t.toUpperCase();
  }

  function ensureDocPreviewModal() {
    const id = "mgts-doc-preview-modal";
    const existing = document.getElementById(id);
    if (existing) return existing;

    const modal = document.createElement("div");
    modal.id = id;
    modal.className = "fixed inset-0 z-50 hidden";
    modal.setAttribute("data-modal", "");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="absolute inset-0" data-modal-overlay style="background: rgba(0,0,0,0.72); backdrop-filter: blur(6px);"></div>
      <div class="relative mx-auto flex h-full w-full max-w-[1100px] items-center justify-center p-6">
        <div class="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl" style="max-height: 90vh; display: flex; flex-direction: column;" role="dialog" aria-modal="true" aria-label="Документ" data-modal-dialog>
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4 gap-4">
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-widest text-primary font-bold">Документ</p>
              <p class="text-base font-black tracking-tight text-white truncate" data-doc-preview-title>Предпросмотр документа</p>
            </div>
            <button class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 transition-colors" type="button" data-modal-close aria-label="Закрыть">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="p-6 space-y-4" style="overflow: auto; flex: 1 1 auto; min-height: 0;">
            <div class="rounded-xl bg-black/20 border border-white/10 overflow-hidden" style="height: 70vh; min-height: 320px;">
              <div class="w-full h-full" style="position: relative;">
                <embed class="w-full h-full hidden" data-doc-preview-embed type="application/pdf" src="about:blank" />
                <iframe class="w-full h-full hidden" data-doc-preview-iframe title="Document preview" src="about:blank"></iframe>
                <img class="w-full h-full object-contain hidden" data-doc-preview-image alt="" />
                <div class="hidden" data-doc-preview-fallback style="position:absolute; inset:0; align-items:center; justify-content:center; padding:24px;">
                  <div style="max-width:520px; width:100%; border:1px solid rgba(255,255,255,0.10); background:rgba(0,0,0,0.25); border-radius:16px; padding:18px;">
                    <div style="display:flex; gap:14px; align-items:flex-start;">
                      <div style="width:44px; height:44px; border-radius:12px; background:rgba(5,102,199,0.14); display:flex; align-items:center; justify-content:center; flex:0 0 auto;">
                        <span class="material-symbols-outlined" style="color:#6aa9ff;">description</span>
                      </div>
                      <div style="min-width:0;">
                        <div style="font-weight:900; color:rgba(255,255,255,0.92); line-height:1.25;" data-doc-preview-fallback-title>Предпросмотр недоступен</div>
                        <div style="margin-top:6px; color:rgba(255,255,255,0.65); font-size:13px; line-height:1.5;">
                          Этот тип файла пока нельзя открыть в браузере. Вы можете скачать документ по кнопке ниже.
                        </div>
                        <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                          <span style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.70); font-size:11px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase;" data-doc-preview-ext>FILE</span>
                          <span style="color:rgba(255,255,255,0.55); font-size:12px;" data-doc-preview-filename></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-end gap-3">
              <a class="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all" data-doc-preview-download href="#" target="_blank" rel="noreferrer">
                <span class="material-symbols-outlined text-[18px]">download</span>
                Скачать
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  function renderFilesTable(section) {
    const files = Array.isArray(section?.files) ? section.files.filter(Boolean) : [];
    if (!files.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "files-table rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "files-table__title text-xl font-black tracking-tight mb-4";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }

    const container = document.createElement("div");
    container.className = "files-table__container grid grid-cols-1 gap-3";

    for (const f of files.sort((a, b) => (a?.order || 0) - (b?.order || 0))) {
      const url = resolveAnyMediaUrl(f.file);
      const a = document.createElement("a");
      a.className =
        "files-table__item flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/10 transition-colors p-4";
      // IMPORTANT: keep href harmless so missing handlers don't trigger file download.
      // The actual URL is stored in `data-route-open` (consumed by the modal/router layer).
      a.href = "#";
      // Open in document preview modal (canonical modal module).
      a.setAttribute("data-modal-open", "mgts-doc-preview-modal");
      a.setAttribute("data-open-mode", "modal");
      a.setAttribute("data-content-type", "file");
      a.setAttribute("data-content-id", String(f.name || "Документ"));
      if (url) a.setAttribute("data-route-open", url);
      // For client-side filters (search/type)
      a.setAttribute("data-doc-file-item", "");
      a.setAttribute("data-file-name", String(f.name || "").toLowerCase());
      a.setAttribute("data-file-type", String(f.fileType || "").toLowerCase());
      a.setAttribute("data-file-category", String(f.categoryKey || "").toLowerCase());

      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined text-white/70 mt-0.5";
      icon.textContent = fileTypeIcon(f.fileType);

      const body = document.createElement("div");
      body.className = "min-w-0 flex-1";

      const name = document.createElement("div");
      name.className = "font-bold text-white/90 leading-snug truncate";
      name.textContent = String(f.name || "Файл");

      const meta = document.createElement("div");
      meta.className = "mt-1 text-xs text-white/55 flex flex-wrap gap-x-3 gap-y-1";
      if (f.size) {
        const s = document.createElement("span");
        s.textContent = String(f.size);
        meta.appendChild(s);
      }
      if (f.fileType) {
        const t = document.createElement("span");
        t.textContent = String(f.fileType).toUpperCase();
        meta.appendChild(t);
      }

      if (f.description) {
        const d = document.createElement("div");
        d.className = "mt-2 text-sm text-white/65 leading-relaxed";
        d.textContent = String(f.description);
        body.appendChild(d);
      }

      body.appendChild(name);
      body.appendChild(meta);

      a.appendChild(icon);
      a.appendChild(body);
      container.appendChild(a);
    }

    wrap.appendChild(container);
    return wrap;
  }

  function initDocFilesFilter(root) {
    if (!root || !(root instanceof HTMLElement)) return;
    if (root.querySelector("[data-doc-files-filter]")) return;

    const allItems = Array.from(root.querySelectorAll("[data-doc-file-item]")).filter((x) => x instanceof HTMLElement);
    if (allItems.length === 0) return;

    const headerRow = root.querySelector(":scope > .flex.items-center.justify-between");
    const insertAfter = headerRow && headerRow.parentElement === root ? headerRow : null;

    const types = Array.from(
      new Set(
        allItems
          .map((el) => (el.getAttribute("data-file-type") || "").trim().toLowerCase())
          .filter(Boolean)
      )
    ).sort();

    const filterBar = document.createElement("div");
    filterBar.setAttribute("data-doc-files-filter", "");
    filterBar.style.display = "flex";
    filterBar.style.flexWrap = "wrap";
    filterBar.style.gap = "10px";
    filterBar.style.alignItems = "center";
    filterBar.style.margin = "10px 0 18px";

    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Поиск по названию файла…";
    input.setAttribute("aria-label", "Поиск по названию файла");
    input.style.flex = "1 1 280px";
    input.style.minWidth = "240px";
    input.style.height = "44px";
    input.style.borderRadius = "12px";
    input.style.border = "1px solid rgba(255,255,255,0.10)";
    input.style.background = "rgba(0,0,0,0.20)";
    input.style.color = "rgba(255,255,255,0.92)";
    input.style.padding = "0 14px";
    input.style.outline = "none";

    const select = document.createElement("select");
    select.setAttribute("aria-label", "Фильтр по типу файла");
    select.style.flex = "0 0 auto";
    select.style.height = "44px";
    select.style.borderRadius = "12px";
    select.style.border = "1px solid rgba(255,255,255,0.10)";
    select.style.background = "rgba(0,0,0,0.20)";
    select.style.color = "rgba(255,255,255,0.92)";
    select.style.padding = "0 12px";
    select.style.outline = "none";

    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Все типы";
    select.appendChild(optAll);
    types.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = humanFileType(t);
      select.appendChild(opt);
    });

    const empty = document.createElement("div");
    empty.setAttribute("data-doc-files-empty", "");
    empty.style.display = "none";
    empty.style.marginTop = "12px";
    empty.style.padding = "14px";
    empty.style.borderRadius = "12px";
    empty.style.border = "1px solid rgba(255,255,255,0.10)";
    empty.style.background = "rgba(0,0,0,0.20)";
    empty.style.color = "rgba(255,255,255,0.70)";
    empty.style.fontSize = "14px";
    empty.textContent = "Ничего не найдено по заданным фильтрам.";

    filterBar.appendChild(input);
    filterBar.appendChild(select);

    if (insertAfter) insertAfter.insertAdjacentElement("afterend", filterBar);
    else root.insertAdjacentElement("afterbegin", filterBar);

    filterBar.insertAdjacentElement("afterend", empty);

    const countEl = root.querySelector("[data-doc-docs-count]");
    /** @type {string} */
    let currentCategoryKey = "";

    const apply = () => {
      const q = String(input.value || "").trim().toLowerCase();
      const ft = String(select.value || "").trim().toLowerCase();
      const cat = String(currentCategoryKey || "").trim().toLowerCase();

      let visible = 0;
      allItems.forEach((el) => {
        const name = (el.getAttribute("data-file-name") || "").toLowerCase();
        const type = (el.getAttribute("data-file-type") || "").toLowerCase();
        const cat2 = (el.getAttribute("data-file-category") || "").toLowerCase();
        const okName = !q || name.includes(q);
        const okType = !ft || type === ft;
        const okCat = !cat || cat2 === cat;
        const show = okName && okType && okCat;
        el.classList.toggle("hidden", !show);
        if (show) visible += 1;
      });

      empty.style.display = visible === 0 ? "block" : "none";
      if (countEl) countEl.textContent = `Найдено: ${visible} файлов`;
    };

    let tmr = 0;
    input.addEventListener("input", () => {
      window.clearTimeout(tmr);
      tmr = window.setTimeout(apply, 120);
    });
    select.addEventListener("change", apply);
    apply();

    // Bind category tabs from `page.document-tabs` (if present).
    root.addEventListener("mgts:docTabChange", (e) => {
      const ev = /** @type {CustomEvent} */ (e);
      const key = ev && ev.detail ? String(ev.detail.key || "") : "";
      currentCategoryKey = key;
      apply();
    });

    // Initial category from active tab (if any)
    const activeTab = root.querySelector('[data-doc-category-key][aria-pressed="true"]');
    if (activeTab) {
      currentCategoryKey = String(activeTab.getAttribute("data-doc-category-key") || "");
      apply();
    }
  }

  function renderDocumentTabs(section) {
    const tabs = Array.isArray(section?.tabs) ? section.tabs.filter(Boolean) : [];
    if (!tabs.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "document-tabs rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "document-tabs__title text-xl font-black tracking-tight mb-4";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }

    const tabsRow = document.createElement("div");
    tabsRow.className = "document-tabs__tabs flex flex-wrap gap-2 mb-4";

    const content = document.createElement("div");
    content.className = "document-tabs__tab-content";

    const sorted = tabs.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    const def = Number.isFinite(section?.defaultTab) ? Number(section.defaultTab) : 0;
    let active = Math.min(sorted.length - 1, Math.max(0, def));

    const renderActive = () => {
      clearNode(content);
      const t = sorted[active];
      if (!t) return;
      // NOTE: `content` is richtext HTML in Strapi. For now we render it as-is.
      // Later we can parse placeholders to embed structured blocks (files-table, etc).
      const body = document.createElement("div");
      body.className = "prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary";
      body.innerHTML = String(t.content || "");
      content.appendChild(body);
    };

    const keyOf = (t) => String(t?.filterKey ?? "").trim();

    sorted.forEach((t, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      const key = keyOf(t);
      b.setAttribute("data-doc-category-key", key);
      b.className =
        "document-tabs__tab-button px-4 py-2 rounded-lg text-sm font-black transition-colors border " +
        (idx === active
          ? "bg-primary/20 border-primary/40 text-white"
          : "bg-black/20 border-white/10 text-white/70 hover:bg-black/10");
      b.textContent = String(t.name || `Tab ${idx + 1}`);
      b.setAttribute("aria-pressed", idx === active ? "true" : "false");
      b.addEventListener("click", () => {
        active = idx;
        // update classes
        [...tabsRow.querySelectorAll("button")].forEach((bb, j) => {
          if (j === active) {
            bb.classList.add("bg-primary/20", "border-primary/40", "text-white");
            bb.classList.remove("bg-black/20", "border-white/10", "text-white/70");
            bb.setAttribute("aria-pressed", "true");
          } else {
            bb.classList.remove("bg-primary/20", "border-primary/40", "text-white");
            bb.classList.add("bg-black/20", "border-white/10", "text-white/70");
            bb.setAttribute("aria-pressed", "false");
          }
        });
        renderActive();
        // Notify listeners (e.g. doc page file list) about category change.
        b.dispatchEvent(
          new CustomEvent("mgts:docTabChange", {
            bubbles: true,
            detail: { key },
          })
        );
      });
      tabsRow.appendChild(b);
    });

    wrap.appendChild(tabsRow);
    wrap.appendChild(content);
    renderActive();
    // Fire initial category event after initial render (so filters can sync).
    window.setTimeout(() => {
      const btn = tabsRow.querySelector('[data-doc-category-key][aria-pressed="true"]');
      if (!btn) return;
      const key = String(btn.getAttribute("data-doc-category-key") || "");
      btn.dispatchEvent(new CustomEvent("mgts:docTabChange", { bubbles: true, detail: { key } }));
    }, 0);
    return wrap;
  }

  function renderImageCarousel(section) {
    const items = Array.isArray(section?.items) ? section.items.filter(Boolean) : [];
    if (!items.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "image-carousel rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "image-carousel__title text-xl font-black tracking-tight mb-4";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }

    const root = document.createElement("div");
    root.className = "image-carousel__container";
    root.setAttribute("data-carousel", "");

    // Track
    const track = document.createElement("div");
    track.className = "flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2";
    track.setAttribute("data-carousel-track", "");

    const sorted = items.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    for (const it of sorted) {
      const card = document.createElement("div");
      card.className =
        "image-carousel__item min-w-[280px] md:min-w-[360px] snap-start rounded-2xl border border-white/10 bg-black/20 overflow-hidden";

      const imgUrl = resolveAnyMediaUrl(it.image);
      if (imgUrl) {
        const img = document.createElement("img");
        img.alt = "";
        img.src = imgUrl;
        img.className = "h-44 w-full object-cover";
        card.appendChild(img);
      }

      const body = document.createElement("div");
      body.className = "p-4";

      const t = document.createElement("div");
      t.className = "font-black text-white/90";
      t.textContent = String(it.title || "");
      body.appendChild(t);

      if (it.description) {
        const d = document.createElement("div");
        d.className = "mt-2 text-sm text-white/65 leading-relaxed";
        d.textContent = String(it.description);
        body.appendChild(d);
      }

      card.appendChild(body);
      track.appendChild(card);
    }

    // Nav (canonical carousel will bind if present)
    if (section?.showNavigation !== false) {
      const nav = document.createElement("div");
      nav.className = "mt-4 flex items-center justify-between gap-3";

      const prev = document.createElement("button");
      prev.type = "button";
      prev.className =
        "inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-white/10 bg-black/20 text-white/70 hover:bg-black/10 transition-colors";
      prev.setAttribute("data-carousel-prev", "");
      prev.innerHTML = '<span class="material-symbols-outlined">chevron_left</span><span class="text-sm font-black">Назад</span>';

      const next = document.createElement("button");
      next.type = "button";
      next.className =
        "inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-white/10 bg-black/20 text-white/70 hover:bg-black/10 transition-colors";
      next.setAttribute("data-carousel-next", "");
      next.innerHTML = '<span class="text-sm font-black">Вперёд</span><span class="material-symbols-outlined">chevron_right</span>';

      const counter = document.createElement("div");
      counter.className = "text-xs text-white/50 font-black";
      counter.setAttribute("data-carousel-counter", "");

      nav.appendChild(prev);
      nav.appendChild(counter);
      nav.appendChild(next);
      root.appendChild(nav);
    }

    root.appendChild(track);
    wrap.appendChild(root);
    return wrap;
  }

  function renderImageSwitcher(section) {
    const items = Array.isArray(section?.items) ? section.items.filter(Boolean) : [];
    if (!items.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "image-switcher rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "image-switcher__title text-xl font-black tracking-tight mb-4";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }

    const root = document.createElement("div");
    root.className = "image-switcher__container grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6";
    root.setAttribute("data-switcher", "");

    const sorted = items.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    const defIdx = Number.isFinite(section?.defaultImage) ? Number(section.defaultImage) : 0;
    const def = sorted[Math.min(sorted.length - 1, Math.max(0, defIdx))];
    if (def) root.setAttribute("data-switcher-default", String(def.order ?? def.title ?? "0"));

    const keys = (it) => String(it.order ?? it.title ?? "");

    // Triggers
    const nav = document.createElement("div");
    nav.className = "flex flex-col gap-2";

    for (const it of sorted) {
      const key = keys(it);
      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "flex items-center gap-3 px-4 py-3 rounded-xl border bg-black/20 border-white/10 text-left transition-colors";
      b.setAttribute("data-switch-trigger", "");
      b.setAttribute("data-switch-key", key);
      b.setAttribute("data-switch-active-classes", "bg-primary/20 border-primary/40 text-white");
      b.setAttribute("data-switch-inactive-classes", "bg-black/20 border-white/10 text-white/75 hover:bg-black/10");

      if (it.svgIcon) {
        const icon = document.createElement("span");
        icon.className = "shrink-0 w-8 h-8 text-white/80";
        icon.innerHTML = String(it.svgIcon);
        b.appendChild(icon);
      } else {
        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined text-white/70";
        icon.textContent = "image";
        b.appendChild(icon);
      }

      const label = document.createElement("div");
      label.className = "min-w-0";
      const t = document.createElement("div");
      t.className = "font-black truncate";
      t.textContent = String(it.title || "");
      label.appendChild(t);
      if (it.description) {
        const d = document.createElement("div");
        d.className = "mt-1 text-xs text-white/55 line-clamp-2";
        d.textContent = String(it.description);
        label.appendChild(d);
      }
      b.appendChild(label);
      nav.appendChild(b);
    }

    // Panels
    const panels = document.createElement("div");
    panels.className = "relative";

    for (const it of sorted) {
      const key = keys(it);
      const panel = document.createElement("div");
      panel.className =
        "image-switcher__item rounded-2xl border border-white/10 bg-black/20 overflow-hidden";
      panel.setAttribute("data-switch-panel", "");
      panel.setAttribute("data-switch-key", key);

      const imgUrl = resolveAnyMediaUrl(it.image);
      if (imgUrl) {
        const img = document.createElement("img");
        img.alt = "";
        img.src = imgUrl;
        img.className = "w-full h-[320px] md:h-[420px] object-cover";
        panel.appendChild(img);
      }

      const body = document.createElement("div");
      body.className = "p-5";
      const t = document.createElement("div");
      t.className = "font-black text-white/90";
      t.textContent = String(it.title || "");
      body.appendChild(t);
      if (it.description) {
        const d = document.createElement("div");
        d.className = "mt-2 text-sm text-white/65 leading-relaxed";
        d.textContent = String(it.description);
        body.appendChild(d);
      }
      panel.appendChild(body);

      panels.appendChild(panel);
    }

    root.appendChild(nav);
    root.appendChild(panels);
    wrap.appendChild(root);
    return wrap;
  }

  function renderHistoryTimeline(section) {
    const periods = Array.isArray(section?.periods) ? section.periods.filter(Boolean) : [];
    if (!periods.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "history-timeline rounded-2xl border border-white/10 bg-white/5 p-6";

    const title = String(section?.title || "").trim();
    if (title) {
      const h = document.createElement("h2");
      h.className = "history-timeline__title text-xl font-black tracking-tight mb-4";
      h.textContent = title;
      wrap.appendChild(h);
    }

    const sorted = periods.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    const defIdx = Number.isFinite(section?.defaultPeriod) ? Number(section.defaultPeriod) : 0;
    let active = Math.min(sorted.length - 1, Math.max(0, defIdx));

    const tabsRow = document.createElement("div");
    tabsRow.className = "history-timeline__tabs flex flex-wrap gap-2 mb-5";

    const periodHost = document.createElement("div");
    periodHost.className = "history-timeline__period";

    const renderActive = () => {
      clearNode(periodHost);
      const p = sorted[active];
      if (!p) return;

      const grid = document.createElement("div");
      grid.className = "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start";

      const left = document.createElement("div");
      const label = document.createElement("div");
      label.className = "text-xs font-black uppercase tracking-widest text-white/55";
      label.textContent = String(p.period || "");
      left.appendChild(label);

      if (p.title) {
        const h = document.createElement("h3");
        h.className = "history-timeline__period-title text-2xl font-black tracking-tight mt-2";
        h.textContent = String(p.title);
        left.appendChild(h);
      }

      const content = document.createElement("div");
      content.className =
        "history-timeline__period-content prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary mt-4";
      content.innerHTML = String(p.content || "");
      left.appendChild(content);

      const right = document.createElement("div");
      const imgUrl = resolveAnyMediaUrl(p.image);
      if (imgUrl) {
        const imgWrap = document.createElement("div");
        imgWrap.className = "rounded-2xl border border-white/10 bg-black/20 overflow-hidden";
        const img = document.createElement("img");
        img.className = "history-timeline__image w-full h-[260px] md:h-[320px] object-cover";
        img.alt = "";
        img.src = imgUrl;
        imgWrap.appendChild(img);
        right.appendChild(imgWrap);
        if (p.imageDescription) {
          const cap = document.createElement("div");
          cap.className = "mt-3 text-sm text-white/60 leading-relaxed";
          cap.textContent = String(p.imageDescription);
          right.appendChild(cap);
        }
      }

      grid.appendChild(left);
      grid.appendChild(right);
      periodHost.appendChild(grid);
    };

    sorted.forEach((p, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "history-timeline__tab-button px-4 py-2 rounded-lg text-sm font-black transition-colors border " +
        (idx === active
          ? "bg-primary/20 border-primary/40 text-white"
          : "bg-black/20 border-white/10 text-white/70 hover:bg-black/10");
      b.textContent = String(p.period || `Период ${idx + 1}`);
      b.addEventListener("click", () => {
        active = idx;
        [...tabsRow.querySelectorAll("button")].forEach((bb, j) => {
          if (j === active) {
            bb.classList.add("bg-primary/20", "border-primary/40", "text-white");
            bb.classList.remove("bg-black/20", "border-white/10", "text-white/70");
          } else {
            bb.classList.remove("bg-primary/20", "border-primary/40", "text-white");
            bb.classList.add("bg-black/20", "border-white/10", "text-white/70");
          }
        });
        renderActive();
      });
      tabsRow.appendChild(b);
    });

    wrap.appendChild(tabsRow);
    wrap.appendChild(periodHost);
    renderActive();
    return wrap;
  }

  function renderCrmCards(section) {
    const cards = Array.isArray(section?.cards) ? section.cards.filter(Boolean) : [];
    if (!cards.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "crm-cards rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "crm-cards__title text-xl font-black tracking-tight mb-2";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }
    if (section?.description) {
      const p = document.createElement("p");
      p.className = "text-sm text-white/60 mb-5";
      p.textContent = String(section.description);
      wrap.appendChild(p);
    }

    const grid = document.createElement("div");
    grid.className = "crm-cards__container grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";

    const sorted = cards.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    for (const c of sorted) {
      const a = document.createElement(c.link ? "a" : "div");
      a.className =
        "crm-cards__card flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 hover:bg-black/10 transition-colors p-4 min-h-[84px]";
      if (c.link) {
        a.setAttribute("href", String(c.link));
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noreferrer");
      }

      const imgUrl = resolveAnyMediaUrl(c.image);
      if (imgUrl) {
        const img = document.createElement("img");
        img.className = "crm-cards__card-image max-h-10 max-w-full object-contain";
        img.alt = String(c.title || "");
        img.src = imgUrl;
        a.appendChild(img);
      } else {
        const t = document.createElement("span");
        t.className = "font-black text-white/80 text-sm text-center";
        t.textContent = String(c.title || "CRM");
        a.appendChild(t);
      }

      grid.appendChild(a);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  function renderHowToConnect(section) {
    const title = String(section?.title || "").trim();
    const steps = Array.isArray(section?.steps) ? section.steps.filter(Boolean) : [];
    const desc = String(section?.description || "").trim();
    const contentHtml = String(section?.content || "").trim();
    if (!title && steps.length === 0 && !desc && !contentHtml) return null;

    const wrap = document.createElement("section");
    wrap.className = "how-to-connect rounded-2xl border border-white/10 bg-white/5 p-6";

    if (title) {
      const h = document.createElement("h2");
      h.className = "how-to-connect__title text-xl font-black tracking-tight mb-2";
      h.textContent = title;
      wrap.appendChild(h);
    }
    if (desc) {
      const p = document.createElement("p");
      p.className = "text-sm text-white/60 mb-5";
      p.textContent = desc;
      wrap.appendChild(p);
    }

    if (steps.length) {
      const list = document.createElement("div");
      list.className = "how-to-connect__steps grid grid-cols-1 md:grid-cols-2 gap-4";

      const sorted = steps.sort((a, b) => (a?.stepNumber || 0) - (b?.stepNumber || 0));
      for (const s of sorted) {
        const card = document.createElement("div");
        card.className = "how-to-connect__step rounded-2xl border border-white/10 bg-black/20 p-5";

        const head = document.createElement("div");
        head.className = "flex items-start gap-4";

        const badge = document.createElement("div");
        badge.className =
          "shrink-0 w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center font-black";
        badge.textContent = String(s.stepNumber ?? "");

        const text = document.createElement("div");
        text.className = "min-w-0";

        const st = document.createElement("div");
        st.className = "font-black text-white/90";
        st.textContent = String(s.title || "");
        text.appendChild(st);

        if (s.description) {
          const sd = document.createElement("div");
          sd.className = "mt-2 text-sm text-white/65 leading-relaxed";
          sd.textContent = String(s.description);
          text.appendChild(sd);
        }

        head.appendChild(badge);
        head.appendChild(text);
        card.appendChild(head);

        const imgUrl = resolveAnyMediaUrl(s.image);
        if (imgUrl) {
          const img = document.createElement("img");
          img.alt = "";
          img.src = imgUrl;
          img.className = "mt-4 w-full h-40 object-cover rounded-xl border border-white/10";
          card.appendChild(img);
        }

        if (s.content) {
          const body = document.createElement("div");
          body.className = "mt-4 prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary";
          body.innerHTML = String(s.content);
          card.appendChild(body);
        }

        list.appendChild(card);
      }

      wrap.appendChild(list);
    }

    if (contentHtml) {
      const body = document.createElement("div");
      body.className = "mt-6 prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary";
      body.innerHTML = contentHtml;
      wrap.appendChild(body);
    }

    return wrap;
  }

  function renderSectionMap(section) {
    const title = String(section?.title || "").trim();
    const desc = String(section?.description || "").trim();
    const markers = Array.isArray(section?.markers) ? section.markers.filter(Boolean) : [];

    // We allow empty markers (map can still render centered), but not an entirely empty section.
    if (!title && !desc && markers.length === 0) return null;

    const wrap = document.createElement("section");
    wrap.className = "section-map rounded-2xl border border-white/10 bg-white/5 p-6";
    wrap.setAttribute("data-section-map", "");
    wrap.setAttribute("data-map-provider", String(section?.mapType || "yandex"));
    if (Number.isFinite(section?.centerLat)) wrap.setAttribute("data-map-center-lat", String(section.centerLat));
    if (Number.isFinite(section?.centerLng)) wrap.setAttribute("data-map-center-lng", String(section.centerLng));
    if (Number.isFinite(section?.zoom)) wrap.setAttribute("data-map-zoom", String(section.zoom));

    if (title) {
      const h = document.createElement("h2");
      h.className = "section-map__title text-xl font-black tracking-tight mb-2";
      h.textContent = title;
      wrap.appendChild(h);
    }
    if (desc) {
      const p = document.createElement("p");
      p.className = "text-sm text-white/60 mb-5";
      p.textContent = desc;
      wrap.appendChild(p);
    }

    const container = document.createElement("div");
    container.className = "section-map__container grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6";

    const objects = document.createElement("div");
    objects.className = "section-map__objects";

    const list = document.createElement("div");
    list.className = "section-map__objects-list flex flex-col gap-2";

    markers.forEach((m, idx) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className =
        "section-map__object-item text-left rounded-xl border border-white/10 bg-black/20 hover:bg-black/10 transition-colors p-4";
      item.setAttribute("data-map-marker", "");
      item.setAttribute("data-map-marker-idx", String(idx));
      if (m.lat != null) item.setAttribute("data-lat", String(m.lat));
      if (m.lng != null) item.setAttribute("data-lng", String(m.lng));

      const t = document.createElement("div");
      t.className = "font-black text-white/90";
      t.textContent = String(m.title || `Точка ${idx + 1}`);
      item.appendChild(t);

      if (m.description) {
        const d = document.createElement("div");
        d.className = "mt-2 text-sm text-white/65 leading-relaxed";
        d.textContent = String(m.description);
        item.appendChild(d);
      }

      list.appendChild(item);
    });

    if (markers.length === 0) {
      const empty = document.createElement("div");
      empty.className = "text-sm text-white/50 border border-white/10 bg-black/20 rounded-xl p-4";
      empty.textContent = "Нет маркеров для отображения.";
      list.appendChild(empty);
    }

    objects.appendChild(list);

    const mapWrap = document.createElement("div");
    mapWrap.className = "section-map__map-wrapper rounded-2xl border border-white/10 bg-black/20 overflow-hidden min-h-[320px]";
    mapWrap.setAttribute("data-section-map-canvas", "");

    const markerJson = document.createElement("script");
    markerJson.type = "application/json";
    markerJson.setAttribute("data-section-map-markers", "");
    try {
      markerJson.textContent = JSON.stringify(markers);
    } catch {
      markerJson.textContent = "[]";
    }

    container.appendChild(objects);
    container.appendChild(mapWrap);
    wrap.appendChild(container);
    wrap.appendChild(markerJson);
    return wrap;
  }

  function renderServiceTabs(section) {
    const tabs = Array.isArray(section?.tabs) ? section.tabs.filter(Boolean) : [];
    if (!tabs.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "service-tabs rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "service-tabs__title text-xl font-black tracking-tight mb-4";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }

    const root = document.createElement("div");
    root.className = "service-tabs__container";
    root.setAttribute("data-switcher", "");

    const sorted = tabs.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    const defIdx = Number.isFinite(section?.defaultTab) ? Number(section.defaultTab) : 0;
    const active = Math.min(sorted.length - 1, Math.max(0, defIdx));

    // Use stable switch keys: prefer numeric order, fallback to name.
    const keyOf = (t) => String(t?.order ?? t?.name ?? "");
    const defKey = keyOf(sorted[active]);
    if (defKey) root.setAttribute("data-switcher-default", defKey);

    const tabsRow = document.createElement("div");
    tabsRow.className = "service-tabs__tabs flex flex-wrap gap-2 mb-4";

    const content = document.createElement("div");
    content.className = "service-tabs__tab-content";

    sorted.forEach((t, idx) => {
      const k = keyOf(t);

      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "service-tabs__tab-button px-4 py-2 rounded-lg text-sm font-black transition-colors border bg-black/20 border-white/10 text-white/75";
      b.textContent = String(t.name || `Tab ${idx + 1}`);
      b.setAttribute("data-switch-trigger", "");
      b.setAttribute("data-switch-key", k);
      b.setAttribute("data-switch-active-classes", "bg-primary/20 border-primary/40 text-white");
      b.setAttribute("data-switch-inactive-classes", "bg-black/20 border-white/10 text-white/75 hover:bg-black/10");
      tabsRow.appendChild(b);

      const panel = document.createElement("div");
      panel.className = "service-tabs__panel";
      panel.setAttribute("data-switch-panel", "");
      panel.setAttribute("data-switch-key", k);

      const body = document.createElement("div");
      body.className = "prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary";
      body.innerHTML = String(t.content || "");
      panel.appendChild(body);
      content.appendChild(panel);
    });

    root.appendChild(tabsRow);
    root.appendChild(content);
    wrap.appendChild(root);
    return wrap;
  }

  async function renderCmsPage() {
    const root = document.querySelector("[data-cms-page]");
    if (!root) return;

    const sp = new URLSearchParams(window.location.search);
    const slug = (sp.get("slug") || "").trim();
    if (!slug) return;

    // Use query-based endpoint so slugs containing "/" work consistently across templates.
    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_cms_page: fetch", url);
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    const titleEl = root.querySelector("[data-cms-title]");
    if (titleEl) titleEl.textContent = page.title || slug;

    const subEl = root.querySelector("[data-cms-subtitle]");
    if (subEl) {
      const subtitle = page.hero?.subtitle ? String(page.hero.subtitle) : "";
      subEl.textContent = subtitle;
      subEl.classList.toggle("hidden", !subtitle);
    }

    const demo = root.querySelector("[data-cms-demo]");
    if (demo) demo.remove();

    const sectionsHost = root.querySelector("[data-cms-sections]");
    if (sectionsHost) {
      clearNode(sectionsHost);
      const sections = Array.isArray(page.sections) ? page.sections : [];
      for (const s of sections) {
        if (s && s.__component === "page.section-text") {
          sectionsHost.appendChild(renderSectionText(s));
        } else if (s && s.__component === "page.section-cards") {
          const node = renderCardGrid(s.title || "", s.cards || []);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.section-grid") {
          const node = renderCardGrid(s.title || "", s.items || []);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.section-table") {
          const node = renderSectionTable(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.tariff-table") {
          const node = renderTariffTable(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.service-faq") {
          const node = renderServiceFaq(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.files-table") {
          const node = renderFilesTable(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.document-tabs") {
          const node = renderDocumentTabs(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.image-carousel") {
          const node = renderImageCarousel(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.image-switcher") {
          const node = renderImageSwitcher(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.history-timeline") {
          const node = renderHistoryTimeline(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.crm-cards") {
          const node = renderCrmCards(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.how-to-connect") {
          const node = renderHowToConnect(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.section-map") {
          const node = renderSectionMap(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.service-tabs") {
          const node = renderServiceTabs(s);
          if (node) sectionsHost.appendChild(node);
        } else if (s && s.__component === "page.service-order-form") {
          const node = renderServiceOrderForm(s);
          if (node) sectionsHost.appendChild(node);
        } else {
          sectionsHost.appendChild(renderUnknownSection(s));
        }
      }
    }

    // DeepNav rendering for TPL_DeepNav pages
    const sidebar = root.querySelector("[data-deepnav-sidebar]");
    const contentWrap =
      root.querySelector("[data-cms-content]") ||
      (sidebar && sidebar.parentElement ? sidebar.parentElement.querySelector(":scope > div") : null);

    const showSidebar = (on) => {
      if (!sidebar) return;
      sidebar.classList.toggle("hidden", !on);
      // When sidebar is hidden, content should take full width.
      if (contentWrap && contentWrap instanceof HTMLElement) {
        if (on) {
          contentWrap.style.gridColumn = "";
        } else {
          contentWrap.style.gridColumn = "1 / -1";
          contentWrap.style.minWidth = "0";
        }
      }
    };

    if (page.template === "TPL_DeepNav" && page.deepNavKey && sidebar) {
      const navUrl = `${STRAPI_BASE}/api/navigation/deep-nav/${encodeURIComponent(String(page.deepNavKey))}`;
      // eslint-disable-next-line no-console
      console.log("[CMS_ADAPTER] deepnav: fetch", navUrl);
      const navJson = await fetchJson(navUrl);
      const tree = navJson && navJson.data ? navJson.data : null;
      if (tree) {
        showSidebar(true);
        const t = sidebar.querySelector("[data-deepnav-title]");
        if (t) t.textContent = tree.title || "Раздел";
        const nav = sidebar.querySelector("[data-deepnav-nav]");
        if (nav) {
          clearNode(nav);
          const items = Array.isArray(tree.items) ? tree.items : [];
          const makeLink = ({ label, href, active, indent = 0 }) => {
            const a = document.createElement("a");
            a.textContent = label || "Link";
            a.href = href || "#";
            a.style.display = "block";
            a.style.padding = "8px 10px";
            a.style.borderRadius = "10px";
            a.style.marginLeft = indent ? `${indent}px` : "0";
            a.style.textDecoration = "none";
            a.style.color = active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)";
            a.style.border = active ? "1px solid rgba(5,102,199,0.45)" : "1px solid transparent";
            a.style.background = active ? "rgba(5,102,199,0.12)" : "transparent";
            a.style.fontWeight = active ? "800" : "600";
            a.style.transition = "background 120ms ease, color 120ms ease, border-color 120ms ease";
            a.addEventListener("mouseenter", () => {
              if (!active) a.style.background = "rgba(255,255,255,0.06)";
            });
            a.addEventListener("mouseleave", () => {
              if (!active) a.style.background = "transparent";
            });
            return a;
          };
          const makeGroupTitle = (label, { indent = 0 } = {}) => {
            const d = document.createElement("div");
            d.textContent = label || "Group";
            d.style.marginTop = "14px";
            d.style.marginLeft = indent ? `${indent}px` : "0";
            d.style.padding = "0 4px";
            d.style.fontSize = "10px";
            d.style.fontWeight = "800";
            d.style.letterSpacing = "0.25em";
            d.style.textTransform = "uppercase";
            d.style.color = "rgba(255,255,255,0.35)";
            return d;
          };

          for (const it of items) {
            if (!it) continue;
            if (it.kind === "link") {
              const slug2 = hrefToSlug(it.href);
              const isActive = slug2 && slug2 === slug;
              const href = slug2 ? `tpl_cms_page.html?slug=${encodeURIComponent(slug2)}` : (it.href || "#");
              nav.appendChild(makeLink({ label: it.label, href, active: !!isActive }));
            } else if (it.kind === "group") {
              nav.appendChild(makeGroupTitle(it.label));
              const children = Array.isArray(it.children) ? it.children : [];
              for (const ch of children) {
                const slug2 = hrefToSlug(ch.href);
                const isActive = slug2 && slug2 === slug;
                const href = slug2 ? `tpl_cms_page.html?slug=${encodeURIComponent(slug2)}` : (ch.href || "#");
                nav.appendChild(makeLink({ label: ch.label, href, active: !!isActive, indent: 8 }));
              }
            }
          }
        }
      } else {
        showSidebar(false);
      }
    } else if (sidebar) {
      showSidebar(false);
    }
  }

  function formatDateRu(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).toUpperCase();
    } catch {
      return String(iso);
    }
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text == null ? "" : String(text);
  }

  function setBgImage(card, url) {
    if (!card || !url) return;
    const bg = card.querySelector("[style*='background-image']");
    if (bg) bg.style.backgroundImage = `url(\"${url}\")`;
  }

  function resolveMediaUrl(media) {
    if (!media) return null;
    // db.query populate may return raw object with url/formats
    if (media.url) {
      const fmts = media.formats || {};
      return (
        (fmts.small && fmts.small.url) ||
        (fmts.thumbnail && fmts.thumbnail.url) ||
        (fmts.medium && fmts.medium.url) ||
        media.url
      );
    }
    // REST-style `{ data: { attributes: { url, formats }}}`
    const attrs = media?.data?.attributes || media?.attributes || null;
    if (attrs && attrs.url) {
      const fmts = attrs.formats || {};
      return (
        (fmts.small && fmts.small.url) ||
        (fmts.thumbnail && fmts.thumbnail.url) ||
        (fmts.medium && fmts.medium.url) ||
        attrs.url
      );
    }
    return null;
  }

  function hashString(s) {
    const str = String(s || "");
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function pickPlaceholderImage(key) {
    const placeholders = [
      "../assets/images/external/60b54c10dd84.png",
      "../assets/images/external/6eeb437dfc85.png",
      "../assets/images/external/59b1b16623f4.png",
      "../assets/images/external/413d7cf56d06.png",
      "../assets/images/external/973b1984fe94.png",
      "../assets/images/external/7b093df37a55.png",
      "../assets/images/external/9d0c9d727d11.png",
      "../assets/images/external/6e59fc96a5c8.png",
      "../assets/images/external/8f18f563d6b2.png",
      "../assets/images/external/374bebdb3554.png",
    ];
    const idx = placeholders.length ? hashString(key) % placeholders.length : 0;
    return placeholders[idx] || null;
  }

  const NEWS_STATE = {
    tag: "",
    year: "",
    page: 1,
    pageSize: PAGE === "tpl_news_archive" ? 12 : 3,
  };

  function findNewsCardsHost() {
    // Specific to tpl_news_list: the first list grid of cards
    const section = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    if (!section) return null;
    return section.querySelector("[data-news-cards]") || section.querySelector(".news-card-3d")?.closest(".grid") || null;
  }

  function findNewsPaginationRoot() {
    const section = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    if (!section) return null;
    return section.querySelector("[data-news-pagination-root]");
  }

  function buildPageModel(page, pageCount) {
    const p = Math.max(1, page || 1);
    const last = Math.max(1, pageCount || 1);
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

    const out = [1];
    const add = (v) => {
      if (out[out.length - 1] !== v) out.push(v);
    };
    if (p > 3) add(0); // ellipsis
    add(Math.max(2, p - 1));
    add(p);
    add(Math.min(last - 1, p + 1));
    if (p < last - 2) add(0); // ellipsis
    add(last);

    const seen = new Set();
    return out
      .filter((x) => (x === 0 ? true : x >= 1 && x <= last))
      .filter((x) => {
        const key = String(x);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function renderNewsPagination(pagination) {
    const root = findNewsPaginationRoot();
    if (!root || !pagination) return;

    const prevBtn = root.querySelector("[data-news-prev]");
    const nextBtn = root.querySelector("[data-news-next]");
    const pagesHost = root.querySelector("[data-news-pages]");
    const summary = root.querySelector("[data-news-summary]");
    if (!pagesHost) return;

    const { page, pageCount, total, pageSize } = pagination;
    pagesHost.innerHTML = "";

    const model = buildPageModel(page, pageCount);
    for (const v of model) {
      if (v === 0) {
        const span = document.createElement("span");
        span.className = "flex size-10 items-center justify-center text-white/40 text-sm";
        span.textContent = "...";
        pagesHost.appendChild(span);
        continue;
      }
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = String(v);
      b.setAttribute("data-news-page", String(v));
      const isActive = v === page;
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
      b.className = isActive
        ? "flex size-10 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20"
        : "flex size-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 font-bold text-sm transition-colors";
      pagesHost.appendChild(b);
    }

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= pageCount;

    if (summary) {
      const from = total ? (page - 1) * pageSize + 1 : 0;
      const to = total ? Math.min(total, page * pageSize) : 0;
      setText(summary, total ? `Показано ${from}-${to} из ${total} новостей` : "Нет новостей");
    }
  }

  function updateNewsCard(card, item) {
    if (!card || !item) return;
    const slug = item.slug;
    if (slug) {
      card.setAttribute("data-content-type", "news");
      card.setAttribute("data-content-id", slug);
      card.setAttribute("data-route-open", `/news/${slug}`);
    }

    // Category + date
    const categoryEl = card.querySelector("[data-news-category]") || card.querySelector("span.category-tag-glow");
    setText(categoryEl, item.category?.name || "Новости");

    const dateEl =
      card.querySelector("[data-news-date]") ||
      card.querySelector("span.text-slate-500.text-\\[11px\\].font-bold");
    setText(dateEl, formatDateRu(item.publishDate));

    // Title + excerpt
    const titleEl = card.querySelector("[data-news-title]") || card.querySelector("h4");
    setText(titleEl, item.title);

    const pEl = card.querySelector("[data-news-excerpt]") || card.querySelector("p.text-slate-400");
    setText(pEl, item.shortDescription || "");

    // Image
    // Strapi media might be returned as null; keep placeholder if absent.
    // If present, prefer featuredImage.url (varies by Strapi shape).
    const imgUrl = resolveMediaUrl(item.featuredImage);
    const url = imgUrl || pickPlaceholderImage(item.category?.slug || item.slug || item.title);
    if (url) {
      const abs = url.startsWith("http") ? url : url.startsWith("/") ? `${STRAPI_BASE}${url}` : url;
      setBgImage(card, abs);
    }
  }

  function findNewsTagsRoot() {
    const section = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    if (!section) return null;
    return section.querySelector("[data-news-tags]");
  }

  function findNewsYearsRoot() {
    const section = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    if (!section) return null;
    return section.querySelector("[data-news-years]");
  }

  function readStateFromUrl() {
    const sp = new URLSearchParams(window.location.search);
    NEWS_STATE.tag = (sp.get("tag") || "").trim();
    NEWS_STATE.year = (sp.get("year") || "").trim();
    const p = sp.get("page") ? parseInt(String(sp.get("page")), 10) : 1;
    NEWS_STATE.page = Number.isFinite(p) && p && p > 0 ? p : 1;
  }

  function writeStateToUrl() {
    try {
      const url = new URL(window.location.href);
      const sp = url.searchParams;
      if (NEWS_STATE.tag) sp.set("tag", NEWS_STATE.tag);
      else sp.delete("tag");
      if (NEWS_STATE.year) sp.set("year", NEWS_STATE.year);
      else sp.delete("year");
      if (NEWS_STATE.page && NEWS_STATE.page !== 1) sp.set("page", String(NEWS_STATE.page));
      else sp.delete("page");
      url.search = sp.toString();
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  }

  function setActiveTag(slug) {
    NEWS_STATE.tag = slug || "";
    const root = findNewsTagsRoot();
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll("[data-news-tag]"));
    for (const b of buttons) {
      const s = (b.getAttribute("data-news-tag-slug") || "").trim();
      const active = s === (NEWS_STATE.tag || "");
      if (active) {
        b.classList.add("bg-primary", "text-white", "shadow-lg", "shadow-primary/20");
        b.classList.remove("text-slate-400");
      } else {
        b.classList.remove("bg-primary", "text-white", "shadow-lg", "shadow-primary/20");
        b.classList.add("text-slate-400");
      }
    }
  }

  function setActiveYear(year) {
    NEWS_STATE.year = year || "";
    const root = findNewsYearsRoot();
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll("[data-news-year]"));
    for (const b of buttons) {
      const v = (b.getAttribute("data-news-year-value") || "").trim();
      const active = v === (NEWS_STATE.year || "");
      if (active) {
        b.classList.add("bg-primary", "text-white");
        b.classList.remove("bg-white/5", "text-white/80");
      } else {
        b.classList.remove("bg-primary", "text-white");
        b.classList.add("bg-white/5", "text-white/80");
      }
    }
  }

  async function loadTags() {
    const root = findNewsTagsRoot();
    if (!root) return;
    const url = `${STRAPI_BASE}/api/news/tags`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] news tags: fetch", url);
    const json = await fetchJson(url);
    const items = (json && json.data) || [];

    // Render: All + tags
    const baseBtnCls =
      "px-8 py-3 text-sm font-bold rounded-xl hover:text-white hover:bg-white/5 transition-all";
    const makeBtn = (label, slug) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = baseBtnCls;
      b.setAttribute("data-news-tag", "");
      b.setAttribute("data-news-tag-slug", slug || "");
      b.textContent = label;
      return b;
    };

    root.innerHTML = "";
    root.appendChild(makeBtn("Все материалы", ""));
    for (const t of items) {
      if (!t || !t.slug) continue;
      root.appendChild(makeBtn(t.name || t.slug, t.slug));
    }

    setActiveTag(NEWS_STATE.tag);
  }

  async function loadYears() {
    const root = findNewsYearsRoot();
    if (!root) return;
    root.classList.remove("hidden");

    const url = `${STRAPI_BASE}/api/news/years`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] news years: fetch", url);
    const json = await fetchJson(url);
    const items = (json && json.data) || [];

    const host = root.querySelector("div");
    if (!host) return;
    host.innerHTML = "";

    const makeBtn = (label, year) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "px-4 py-2 text-xs font-black rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all";
      b.setAttribute("data-news-year", "");
      b.setAttribute("data-news-year-value", year || "");
      b.textContent = label;
      return b;
    };

    host.appendChild(makeBtn("Все годы", ""));
    for (const it of items) {
      const y = it && (it.year || it?.attributes?.year);
      if (!y) continue;
      host.appendChild(makeBtn(String(y), String(y)));
    }

    setActiveYear(NEWS_STATE.year);
  }

  function bindTags() {
    const root = findNewsTagsRoot();
    if (!root) return;
    root.addEventListener("click", (e) => {
      const b = e.target && e.target.closest ? e.target.closest("[data-news-tag]") : null;
      if (!b) return;
      const slug = (b.getAttribute("data-news-tag-slug") || "").trim();
      setActiveTag(slug);
      NEWS_STATE.page = 1;
      writeStateToUrl();
      loadNewsPage(1).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[CMS_ADAPTER] tpl_news_list: loadNewsPage failed:", err);
      });
    });
  }

  function bindYears() {
    const root = findNewsYearsRoot();
    if (!root) return;
    root.addEventListener("click", (e) => {
      const b = e.target && e.target.closest ? e.target.closest("[data-news-year]") : null;
      if (!b) return;
      const year = (b.getAttribute("data-news-year-value") || "").trim();
      setActiveYear(year);
      NEWS_STATE.page = 1;
      writeStateToUrl();
      loadNewsPage(1).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[CMS_ADAPTER] tpl_news_archive: loadNewsPage failed:", err);
      });
    });
  }

  function ensureNewsCards(host, count) {
    if (!host) return [];
    const existing = Array.from(host.querySelectorAll(".news-card-3d"));
    if (existing.length === 0) return [];

    const template = existing[0].cloneNode(true);

    // If count is 0, keep one placeholder (dimmed) so layout doesn't collapse.
    const desired = Math.max(1, count || 0);

    // Add clones
    while (existing.length < desired) {
      const c = template.cloneNode(true);
      host.appendChild(c);
      existing.push(c);
    }

    // Remove extras
    while (existing.length > desired) {
      const last = existing.pop();
      if (last && last.parentNode) last.parentNode.removeChild(last);
    }

    return existing;
  }

  async function loadNewsPage(page) {
    const host = findNewsCardsHost();
    if (!host) {
      // eslint-disable-next-line no-console
      console.warn("[CMS_ADAPTER] tpl_news_list: cards host not found");
      return;
    }

    NEWS_STATE.page = page || 1;
    writeStateToUrl();
    const tag = NEWS_STATE.tag ? `&tag=${encodeURIComponent(NEWS_STATE.tag)}` : "";
    const year = NEWS_STATE.year ? `&year=${encodeURIComponent(NEWS_STATE.year)}` : "";
    const url = `${STRAPI_BASE}/api/news/list?page=${encodeURIComponent(String(NEWS_STATE.page || 1))}&pageSize=${encodeURIComponent(String(NEWS_STATE.pageSize))}${tag}${year}`;
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_news_list: fetch", url);

    const json = await fetchJson(url);
    const items = (json && json.data) || [];
    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] tpl_news_list: fetched items", items.length);

    const wantDynamic = PAGE === "tpl_news_archive";
    const cards = wantDynamic ? ensureNewsCards(host, items.length) : Array.from(host.querySelectorAll(".news-card-3d"));

    for (let i = 0; i < cards.length; i++) {
      const item = items[i] || null;
      if (item) {
        updateNewsCard(cards[i], item);
        cards[i].classList.remove("opacity-40");
      } else {
        // keep placeholder if needed
        cards[i].classList.add("opacity-40");
      }
    }

    const pagination = (json && json.meta && json.meta.pagination) || null;
    if (pagination) {
      // Preferred: pagination under the news block
      renderNewsPagination(pagination);
    }

    // Back-compat: also update the legacy pagination demo block (if present)
    const pag = document.querySelector('[data-stitch-block="pagination_and_display_controls"]');
    const summary = pag && pag.querySelector("p.text-slate-500.text-xs");
    if (summary && pagination) {
      const from = (pagination.page - 1) * pagination.pageSize + 1;
      const to = Math.min(pagination.total, pagination.page * pagination.pageSize);
      setText(summary, `Показано ${from}-${to} из ${pagination.total} новостей`);
    }
  }

  function bindNewsPagination() {
    const root = findNewsPaginationRoot();
    if (!root) return;

    root.addEventListener("click", (e) => {
      const t =
        e.target && e.target.closest
          ? e.target.closest("[data-news-page],[data-news-prev],[data-news-next]")
          : null;
      if (!t) return;

      const active = root.querySelector('[data-news-page][aria-pressed="true"]');
      const current = active ? parseInt(active.getAttribute("data-news-page") || "1", 10) || 1 : 1;

      let nextPage = current;
      if (t.hasAttribute("data-news-page")) {
        nextPage = parseInt(t.getAttribute("data-news-page") || "1", 10) || 1;
      } else if (t.hasAttribute("data-news-prev")) {
        nextPage = Math.max(1, current - 1);
      } else if (t.hasAttribute("data-news-next")) {
        nextPage = current + 1;
      }

      loadNewsPage(nextPage).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[CMS_ADAPTER] tpl_news_list: loadNewsPage failed:", err);
      });
    });
  }

  function bindPagination() {
    const pag = document.querySelector('[data-stitch-block="pagination_and_display_controls"]');
    if (!pag) return;
    const group = pag.querySelector("[data-choice-group]");
    if (!group) return;

    // Delegate clicks on page numbers to loadNewsPage
    group.addEventListener("click", (e) => {
      const a = e.target && e.target.closest && e.target.closest("[data-choice]");
      if (!a) return;
      e.preventDefault();
      const page = parseInt(a.textContent || "1", 10) || 1;
      loadNewsPage(page).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[CMS_ADAPTER] tpl_news_list: loadNewsPage failed:", err);
      });
    });
  }

  /** Inject demo content into the currently opened modal container. */
  async function injectModalContent(detail) {
    if (!detail || !detail.modalId) return;
    if (detail.modalId === "mgts-doc-preview-modal") ensureDocPreviewModal();
    const modal = document.getElementById(detail.modalId);
    if (!modal) return;

    // Document preview (no API call): URL comes from data-route-open, title from data-content-id.
    if (detail.contentType === "file" && detail.modalId === "mgts-doc-preview-modal") {
      const title = String(detail.contentId || "Документ");
      const url = String(detail.url || "");

      const titleEl = modal.querySelector("[data-doc-preview-title]");
      if (titleEl) titleEl.textContent = title;

      const embed = modal.querySelector("[data-doc-preview-embed]");
      const iframe = modal.querySelector("[data-doc-preview-iframe]");
      const img = modal.querySelector("[data-doc-preview-image]");
      const fallback = modal.querySelector("[data-doc-preview-fallback]");
      const fallbackTitle = modal.querySelector("[data-doc-preview-fallback-title]");
      const extEl = modal.querySelector("[data-doc-preview-ext]");
      const fileNameEl = modal.querySelector("[data-doc-preview-filename]");
      const dl = modal.querySelector("[data-doc-preview-download]");
      if (dl && url) dl.setAttribute("href", url);

      const lower = url.toLowerCase();
      const extMatch = lower.match(/\.([a-z0-9]{2,6})(?:$|\?|\#)/i);
      const ext = (extMatch && extMatch[1] ? extMatch[1] : "").toUpperCase();
      if (extEl) extEl.textContent = ext || "FILE";
      if (fileNameEl) fileNameEl.textContent = title;
      if (fallbackTitle) fallbackTitle.textContent = "Предпросмотр недоступен";

      const isPdf = /\.pdf($|\?|\#)/i.test(lower);
      const isImage = /\.(png|jpe?g|webp|gif|svg)($|\?|\#)/i.test(lower);

      // Reset visibility
      const hide = (node) => {
        if (!node || !node.classList) return;
        node.classList.add("hidden");
        // Some nodes rely on inline styles for layout; force-hide to avoid "overlay always visible".
        if (node.hasAttribute && node.hasAttribute("data-doc-preview-fallback")) {
          node.style.display = "none";
        }
      };
      const show = (node) => {
        if (!node || !node.classList) return;
        node.classList.remove("hidden");
        if (node.hasAttribute && node.hasAttribute("data-doc-preview-fallback")) {
          node.style.display = "flex";
        }
      };
      hide(embed);
      hide(iframe);
      hide(img);
      hide(fallback);

      if (!url) {
        if (fallbackTitle) fallbackTitle.textContent = "Файл недоступен";
        show(fallback);
        return;
      }

      if (isPdf) {
        // Prefer <embed> for PDFs (more reliable in many browsers), fallback to iframe.
        const pdfUrl = url.includes("#") ? url : `${url}#toolbar=0&navpanes=0`;
        if (embed && embed instanceof HTMLEmbedElement) {
          embed.src = pdfUrl;
          show(embed);
        } else if (iframe && iframe instanceof HTMLIFrameElement) {
          iframe.src = pdfUrl;
          show(iframe);
        } else {
          show(fallback);
        }
        return;
      }

      if (isImage) {
        if (img && img instanceof HTMLImageElement) {
          img.src = url;
          img.alt = title;
          show(img);
        } else {
          show(fallback);
        }
        return;
      }

      // Unsupported office formats for now (docx/xlsx/etc)
      show(fallback);
      return;
    }

    let content = null;
    try {
      content = await tryFetchContent(detail);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[CMS_ADAPTER] fetch failed, falling back to demo:", err);
    }

    if (!content) content = getDemoContent(detail);
    if (!content) return;

    const h2 = modal.querySelector("[data-cms-title]") || modal.querySelector("h2");
    if (h2) h2.textContent = content.title;

    // Prefer explicit markers; fallback only for older templates.
    const bodyHost =
      modal.querySelector("[data-cms-body]") ||
      modal.querySelector("[data-modal-dialog] p") ||
      null;
    if (!bodyHost) return;

    if (content.bodyHtml) {
      bodyHost.innerHTML = content.bodyHtml;
    } else if (content.bodyText) {
      bodyHost.textContent = content.bodyText;
    } else if (content.body) {
      bodyHost.textContent = content.body;
    }

    // Optional image preview in modal (if template provides it)
    const imgEl = modal.querySelector("[data-cms-image]");
    const mediaWrap = modal.querySelector("[data-cms-media]");
    const imgUrl = content.featuredImageUrl || null;
    if (imgEl && mediaWrap) {
      if (imgUrl) {
        const abs = imgUrl.startsWith("http") ? imgUrl : `${STRAPI_BASE}${imgUrl}`;
        imgEl.src = abs;
        imgEl.classList.remove("hidden");
        mediaWrap.classList.remove("hidden");
      } else {
        imgEl.removeAttribute("src");
        imgEl.classList.add("hidden");
        mediaWrap.classList.add("hidden");
      }
    }
  }

  document.addEventListener("mgts:open", (e) => {
    const ev = /** @type {CustomEvent} */ (e);
    const detail = ev.detail || {};

    // eslint-disable-next-line no-console
    console.log("[CMS_ADAPTER] mgts:open", detail);

    if (HAS_ROUTER && detail.url) {
      ev.preventDefault();
      // Demo router: map /news/:slug to tpl_news_detail.html?slug=:slug
      if (detail.contentType === "news") {
        const slug = detail.contentId || slugFromUrlPath(detail.url);
        const target = `tpl_news_detail.html?slug=${encodeURIComponent(String(slug || ""))}`;
        cmsNavigate(target);
        try {
          window.location.assign(target);
        } catch {
          // ignore
        }
        return;
      }
      cmsNavigate(detail.url);
      return;
    }

    // Let canonical loader open modal, then inject demo content.
    if (detail.openMode === "modal" && detail.modalId) {
      window.setTimeout(() => {
        void injectModalContent(detail);
      }, 0);
    }
  });

  // Page bootstrap (example)
  if (PAGE === "tpl_news_list") {
    readStateFromUrl();
    setActiveTag(NEWS_STATE.tag);
    loadNewsPage(NEWS_STATE.page || 1).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_news_list bootstrap failed:", err);
    });
    void loadTags();
    bindTags();
    bindNewsPagination();
    bindPagination();
  }

  if (PAGE === "tpl_news_archive") {
    readStateFromUrl();
    // Archive: only news feed, more items per page, hide documents section.
    const docs = document.querySelector('[data-stitch-block="news_and_documents_list_2"] [data-news-documents]');
    if (docs) docs.remove();
    const archiveLink = document.querySelector('[data-stitch-block="news_and_documents_list_2"] [data-news-archive-link]');
    if (archiveLink) archiveLink.remove();
    setActiveTag(NEWS_STATE.tag);
    setActiveYear(NEWS_STATE.year);
    loadNewsPage(NEWS_STATE.page || 1).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_news_archive bootstrap failed:", err);
    });
    void loadTags();
    bindTags();
    void loadYears();
    bindYears();
    bindNewsPagination();
  }

  if (PAGE === "tpl_news_detail") {
    renderNewsDetailPage().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_news_detail failed:", err);
    });
  }

  if (PAGE === "tpl_cms_page") {
    renderCmsPage().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_cms_page failed:", err);
    });
  }

  if (PAGE === "tpl_service") {
    renderTplServicePage().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_service failed:", err);
    });
  }

  if (PAGE === "tpl_doc_page") {
    // Ensure document preview modal exists before any files-table links are clicked.
    ensureDocPreviewModal();
    renderTplDocPage().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_doc_page failed:", err);
    });
  }

  if (PAGE === "tpl_contact_hub") {
    renderTplContactHubPage().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_contact_hub failed:", err);
    });
  }

  if (PAGE === "tpl_home") {
    renderTplHomePage().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_home failed:", err);
    });
  }

  if (PAGE === "tpl_segment_landing") {
    renderTplSegmentLandingPage().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_segment_landing failed:", err);
    });
  }

  if (PAGE === "tpl_scenario") {
    renderTplScenarioPage().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[CMS_ADAPTER] tpl_scenario failed:", err);
    });
  }
})();


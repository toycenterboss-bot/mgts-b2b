(function () {
  "use strict";

  const core = window.MGTS_CMS_ADAPTER_CORE || {};
  const news = window.MGTS_CMS_ADAPTER_NEWS || {};

  const {
    PAGE,
    STRAPI_BASE,
    getSlugFromQueryOrPath,
    safeRun,
    fetchJson,
    setText,
    applyHeroBackground,
    resolveMediaUrl,
    resolveAnyMediaUrl,
    fillTariffTable,
    clearNode,
    renderSectionText,
    renderCardGrid,
    renderSectionTable,
    renderSectionMap,
    renderTariffTable,
    renderImageCarousel,
    renderImageSwitcher,
    renderHistoryTimeline,
    renderCrmCards,
    renderHowToConnect,
    renderServiceOrderForm,
    renderServiceFaq,
    renderServiceTabs,
    initSwitchers,
    buildFaqDetailsItem,
    renderCmsPage,
    ensureDocPreviewModal,
    bindDocPreviewClicks,
    renderDocumentTabs,
    renderFilesTable,
    initDocFilesFilter,
    setContactMarker,
    setContactItem,
    safeParseJsonArray,
    hrefToSlug,
    toPrettyRoute,
    initSidebar,
  } = core;

  const runNewsInit = (label, fn) => {
    let attempts = 0;
    const tryRun = () => {
      const api = window.MGTS_CMS_ADAPTER_NEWS;
      if (api) {
        fn(api);
        return;
      }
      attempts += 1;
      if (attempts < 20) {
        window.setTimeout(tryRun, 100);
      } else {
        console.warn(`[CMS_ADAPTER] ${label}: news module not ready`);
      }
    };
    tryRun();
  };
  const isSectionVisible = (section) => section?.isVisible !== false;
  const appendSectionNode = (host, node, section) => {
    if (!host || !node) return;
    const hasBg = !!resolveAnyMediaUrl(section?.backgroundImage);
    if (section?.isVisible === false && !hasBg && node.childNodes && node.childNodes.length) {
      const frag = document.createDocumentFragment();
      while (node.firstChild) frag.appendChild(node.firstChild);
      host.appendChild(frag);
      return;
    }
    host.appendChild(node);
  };
  async function renderTplContactHubPage() {
    let slug = getSlugFromQueryOrPath("");
    if (slug === "contact") slug = "contact_details";
    if (!slug) return;

    const fetchPageBySlug = async (slugValue) => {
      const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slugValue)}`;
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) return null;
      const json = await res.json();
      return json && json.data ? json.data : null;
    };

    let page = await fetchPageBySlug(slug);
    if (!page && slug.includes("/")) {
      const fallbackSlug = slug.split("/").filter(Boolean).pop() || "";
      if (fallbackSlug) {
        page = await fetchPageBySlug(fallbackSlug);
        slug = fallbackSlug;
      }
    }
    if (!page) return;

    const hub = document.querySelector("[data-contact-hub]");
    if (!hub) return;

    const headingWrap = hub.querySelector(".mb-4") || hub;
    const h1 = headingWrap.querySelector("h1");
    if (h1) h1.textContent = String(page.title || "Контакты");
    const subtitle = String(page.hero?.subtitle || "").trim();
    if (subtitle) {
      const p = headingWrap.querySelector("p");
      if (p) p.textContent = subtitle;
    }

    const mapBgEl = hub.querySelector("[data-contact-map]");
    const heroBg = resolveMediaUrl(page.hero?.backgroundImage);
    if (mapBgEl && heroBg) {
      const abs = heroBg.startsWith("http") ? heroBg : `${STRAPI_BASE}${heroBg}`;
      mapBgEl.style.backgroundImage = `url("${abs}")`;
    }

    const sections = Array.isArray(page.sections) ? page.sections : [];
    const mapSection = sections.find((s) => s && s.__component === "page.section-map") || null;
    const markersData = safeParseJsonArray(mapSection?.markers);
    if (!markersData.length) return;

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

    const itemHost = itemEls[0] ? itemEls[0].parentElement : null;
    if (itemHost && itemEls[0]) {
      const desired = Math.max(1, markersData.length);
      while (itemHost.querySelectorAll("[data-contact-item]").length < desired) {
        const clone = itemEls[0].cloneNode(true);
        itemHost.appendChild(clone);
      }
      const all = Array.from(itemHost.querySelectorAll("[data-contact-item]"));
      while (all.length > desired) {
        const last = all.pop();
        if (last && last.parentNode) last.parentNode.removeChild(last);
      }
      all.forEach((el, idx) => setContactItem(el, markersData[idx]));
    } else {
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

  async function renderPageCeoFeedback() {
    const slug = getSlugFromQueryOrPath("general_director_message");
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    const block = document.querySelector('[data-stitch-block="ceo_address_and_feedback_page"]') || document;

    const h1 = block.querySelector("h1");
    if (h1) h1.textContent = String(page.title || "Обращение генерального директора");

    const textWrap =
      block.querySelector(".space-y-6.text-lg") ||
      block.querySelector(".space-y-6") ||
      null;
    if (textWrap && Array.isArray(page.sections)) {
      const html = page.sections
        .filter((s) => s && s.__component === "page.section-text" && s.content)
        .map((s) => String(s.content))
        .join("\n");
      if (html) textWrap.innerHTML = html;
    }
  }

  async function renderTplDocPage() {
    const slug = getSlugFromQueryOrPath("");
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    const bindButtonHref = (btn, href) => {
      if (!btn || !href) return;
      const safeHref = String(href).trim();
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

    const orderSection = Array.isArray(page.sections)
      ? page.sections.find((s) => s?.__component === "page.service-order-form")
      : null;
    const footerOrder = document.querySelector('[data-stitch-block="footer_and_contact_form"]');
    const orderSectionEl = footerOrder ? footerOrder.querySelector("[data-order-form-section]") : null;
    if (orderSectionEl) {
      if (!orderSection || orderSection?.isVisible === false) {
        orderSectionEl.classList.add("hidden");
      } else {
        orderSectionEl.classList.remove("hidden");
        const badge = orderSectionEl.querySelector("[data-cms-order-badge]");
        if (badge && orderSection.badgeText) badge.textContent = String(orderSection.badgeText);
        const title = orderSectionEl.querySelector("[data-cms-order-title]");
        if (title && orderSection.title) title.innerHTML = String(orderSection.title);
        const subtitle = orderSectionEl.querySelector("[data-cms-order-subtitle]");
        if (subtitle) {
          const sub = (orderSection.subtitle || "").trim();
          if (sub) subtitle.textContent = sub;
        }
        const phoneLabel = orderSectionEl.querySelector("[data-cms-order-support-phone-label]");
        if (phoneLabel && orderSection.supportPhoneLabel) {
          phoneLabel.textContent = String(orderSection.supportPhoneLabel);
        }
        const phoneValue = orderSectionEl.querySelector("[data-cms-order-support-phone-value]");
        if (phoneValue && orderSection.supportPhoneValue) {
          phoneValue.textContent = String(orderSection.supportPhoneValue);
        }
        const emailLabel = orderSectionEl.querySelector("[data-cms-order-support-email-label]");
        if (emailLabel && orderSection.supportEmailLabel) {
          emailLabel.textContent = String(orderSection.supportEmailLabel);
        }
        const emailValue = orderSectionEl.querySelector("[data-cms-order-support-email-value]");
        if (emailValue && orderSection.supportEmailValue) {
          emailValue.textContent = String(orderSection.supportEmailValue);
        }
        const form = orderSectionEl.querySelector("[data-cms-order-form]");
        if (form) {
          if (orderSection.formAction) form.setAttribute("action", String(orderSection.formAction));
          if (orderSection.formMethod) form.setAttribute("method", String(orderSection.formMethod));
        }
        const submit = form ? form.querySelector("button[type='submit'] span") : null;
        if (submit && orderSection.buttonText) submit.textContent = String(orderSection.buttonText);
        const disclaimer = orderSectionEl.querySelector("[data-cms-order-disclaimer]");
        if (disclaimer && orderSection.disclaimerHtml) {
          disclaimer.innerHTML = String(orderSection.disclaimerHtml);
        }
      }
    }

    const consult = Array.isArray(page.sections)
      ? page.sections.find((s) => s?.__component === "page.service-consultation-card")
      : null;
    const consultSection = document.querySelector('[data-stitch-block="service_consultation_card"]');
    if (consultSection) {
      if (!consult || consult.isVisible === false) {
        consultSection.classList.add("hidden");
      } else {
        consultSection.classList.remove("hidden");
        setText(document.querySelector("[data-service-consult-title]"), consult.title || "");
        setText(document.querySelector("[data-service-consult-subtitle]"), consult.subtitle || "");
        const btn = document.querySelector("[data-service-consult-button]");
        if (btn) {
          const label = consult.buttonText ? String(consult.buttonText) : "";
          btn.innerHTML = `
            <svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3 8.5 12 13.5 21 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${label}</span>
          `;
        }
        bindButtonHref(btn, consult.buttonHref || "");
      }
    }

    const block = document.querySelector('[data-stitch-block="news_and_documents_list_1"]') || document;

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

    const news = block.querySelector("[data-doc-news]");
    if (news) news.remove();
    const topTabs = block.querySelector("[data-doc-top-tabs]");
    if (topTabs) topTabs.remove();

    const newsModal = document.getElementById("mgts-news-detail-modal");
    if (newsModal) newsModal.remove();

    const host = block.querySelector("[data-doc-host]");
    if (!host) return;
    host.classList.add("space-y-6");

    const sections = Array.isArray(page.sections) ? page.sections : [];
    clearNode(host);
    let added = 0;
    for (const s of sections) {
      if (!s || !s.__component) continue;
      if (s.__component === "page.service-order-form" || s.__component === "page.service-consultation-card") {
        continue;
      }
      let node = null;
        if (s.__component === "page.section-text") {
        node = renderSectionText(s);
        } else if (s.__component === "page.section-cards") {
        node = renderCardGrid(s.title || "", s.cards || [], { columns: s.columns, subtitle: s.subtitle });
        } else if (s.__component === "page.section-table") {
        node = renderSectionTable(s);
      } else if (s.__component === "page.files-table") {
        node = renderFilesTable(s);
      } else if (s.__component === "page.document-tabs") {
        node = renderDocumentTabs(s);
      } else if (s.__component === "page.how-to-connect") {
        node = renderHowToConnect(s);
        } else if (s.__component === "page.section-map") {
        node = renderSectionMap(s);
      }
      if (node) {
        appendSectionNode(host, node, s);
        added += 1;
      }
    }
    if (added > 0) {
      initDocFilesFilter(host);
      if (core.ensureDocPreviewModal) core.ensureDocPreviewModal();
      if (core.bindDocPreviewClicks) core.bindDocPreviewClicks();
    }

    await initSidebar(page, block);
  }

  async function renderTplHomePage() {
    const sp = new URLSearchParams(window.location.search);
    const slug = (sp.get("slug") || "home").trim();

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    const resolveIconName = (icon) => {
      if (!icon) return "";
      if (typeof icon === "string") return icon.trim();
      if (typeof icon === "number") return "";
      if (typeof icon === "object") {
        const name =
          icon.name ||
          icon.key ||
          icon.iconName ||
          icon.iconSymbol ||
          (icon.attributes && (icon.attributes.name || icon.attributes.key)) ||
          (icon.data &&
            (icon.data.name ||
              icon.data.key ||
              (icon.data.attributes && (icon.data.attributes.name || icon.data.attributes.key)))) ||
          "";
        return typeof name === "string" ? name.trim() : "";
      }
      return "";
    };
    const applyIconText = (el, iconValue, fallback) => {
      if (!el) return;
      const resolved = resolveIconName(iconValue);
      if (!resolved) {
        if (fallback) {
          const current = String(el.textContent || "").trim();
          if (!current) el.textContent = fallback;
        }
        return;
      }
      const isCustom =
        typeof core?.isCustomIconName === "function" ? core.isCustomIconName(resolved) : false;
      if (isCustom && typeof core?.ensureIconPreviewByName === "function") {
        el.textContent = fallback || "image";
        core
          .ensureIconPreviewByName(resolved)
          .then((url) => {
            if (!url || !el.parentElement) return;
            const img = document.createElement("img");
            if (typeof core?.assignImageSourceWithFallback === "function") {
              core.assignImageSourceWithFallback(img, url);
            } else {
              img.src = url;
            }
            img.alt = resolved || "";
            img.className = "w-6 h-6 object-contain";
            img.loading = "lazy";
            img.decoding = "async";
            el.replaceWith(img);
          })
          .catch(() => {});
        return;
      }
      el.textContent = resolved;
    };

    if (page && page.hero) {
      applyHeroBackground(document.querySelector("[data-home-hero-bg]"), page.hero?.backgroundImage);
      const badgeEl = document.querySelector("[data-home-hero-badge]");
      if (badgeEl && page.hero?.title) {
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

    if (page && Array.isArray(page.sections)) {
      const sections = page.sections.filter(Boolean);
      const pickSection = (name) => sections.find((s) => s && s.__component === name) || null;
      const isTruthy = (val) => String(val || "").trim() !== "";
      const setButtonHref = (btn, href) => {
        if (!btn) return;
        const link = String(href || "").trim();
        if (link) {
          btn.dataset.homeLink = link;
          btn.addEventListener("click", () => {
            try {
              window.location.assign(link);
            } catch {
              // ignore
            }
          });
        }
      };
      const renderCooperation = (data) => {
        const wrap = document.querySelector("[data-home-cooperation]");
        if (!wrap) return;
        if (!data || data.isVisible === false) {
          wrap.classList.add("hidden");
          return;
        }
        wrap.classList.remove("hidden");
        setText(wrap.querySelector("[data-home-coop-title]"), data.title || "");
        setText(wrap.querySelector("[data-home-coop-desc]"), data.description || data.subtitle || "");
        const btn = wrap.querySelector("[data-home-coop-button]");
        if (btn) {
          const textEl = btn.querySelector("[data-home-coop-button-text]");
          if (textEl) setText(textEl, data.buttonText || "");
          else setText(btn, data.buttonText || "");
          const iconEl = btn.querySelector("[data-home-coop-button-icon]");
          applyIconText(iconEl, data.buttonIcon, "bolt");
          setButtonHref(btn, data.buttonHref || "");
        }
        const perksWrap = wrap.querySelector("[data-home-coop-perks]");
        if (perksWrap) {
          const items = Array.isArray(data.perks) ? data.perks.filter(Boolean) : [];
          const template = perksWrap.querySelector("[data-home-coop-perk]");
          if (template) {
            const base = template.cloneNode(true);
            clearNode(perksWrap);
            if (!items.length) {
              perksWrap.appendChild(base);
            } else {
              items.forEach((p) => {
                const node = base.cloneNode(true);
                setText(node.querySelector("[data-home-coop-perk-text]"), p.label || "");
                const icon = node.querySelector("[data-home-coop-perk-icon]");
                applyIconText(icon, p.icon, "check_circle");
                perksWrap.appendChild(node);
              });
            }
          }
        }
      };
      const applyTone = (node, tone) => {
        if (!node) return;
        const isPrimary = String(tone || "").toLowerCase() === "primary";
        const tag = node.querySelector("[data-home-industry-card-tag]");
        if (tag) {
          tag.classList.toggle("text-primary", isPrimary);
          tag.classList.toggle("text-accent", !isPrimary);
        }
        const iconWrap = node.querySelector("[data-home-industry-card-icon-wrap]");
        if (iconWrap) {
          iconWrap.classList.remove("bg-primary/10", "border-primary/20", "text-primary");
          iconWrap.classList.remove("bg-accent/10", "border-accent/20", "text-accent");
          if (isPrimary) {
            iconWrap.classList.add("bg-primary/10", "border-primary/20", "text-primary");
          } else {
            iconWrap.classList.add("bg-accent/10", "border-accent/20", "text-accent");
          }
        }
        node.classList.remove("border-primary/20", "border-accent/20");
        node.classList.add(isPrimary ? "border-primary/20" : "border-accent/20");
      };
      const renderIndustry = (data) => {
        const wrap = document.querySelector("[data-home-industry]");
        if (!wrap) return;
        if (!data || data.isVisible === false) {
          wrap.classList.add("hidden");
          return;
        }
        wrap.classList.remove("hidden");
        setText(wrap.querySelector("[data-home-industry-title]"), data.title || "");
        const grid = wrap.querySelector("[data-home-industry-grid]");
        if (!grid) return;
        const items = Array.isArray(data.items) ? data.items.filter(Boolean) : [];
        const template = grid.querySelector("[data-home-industry-card]");
        if (template) {
          const base = template.cloneNode(true);
          clearNode(grid);
          if (!items.length) {
            grid.appendChild(base);
          } else {
            items.forEach((item) => {
              const node = base.cloneNode(true);
              setText(node.querySelector("[data-home-industry-card-tag]"), item.tag || "");
              setText(node.querySelector("[data-home-industry-card-title]"), item.title || "");
              setText(node.querySelector("[data-home-industry-card-desc]"), item.description || "");
              const btn = node.querySelector("[data-home-industry-card-button]");
              if (btn) {
                setText(btn, item.buttonText || "");
                setButtonHref(btn, item.buttonHref || "");
              }
              const icon = node.querySelector("[data-home-industry-card-icon]");
              applyIconText(icon, item.icon, "");
              applyTone(node, item.tagTone || "");
              grid.appendChild(node);
            });
          }
        }
      };
      const renderPrivateZone = (data) => {
        const wrap = document.querySelector("[data-home-private-zone]");
        if (!wrap) return;
        if (!data || data.isVisible === false) {
          wrap.classList.add("hidden");
          return;
        }
        wrap.classList.remove("hidden");
        setText(wrap.querySelector("[data-home-private-title]"), data.title || "");
        setText(wrap.querySelector("[data-home-private-desc]"), data.description || "");
        const icon = wrap.querySelector("[data-home-private-icon]");
        applyIconText(icon, data.icon, "lock_open");
        const btn = wrap.querySelector("[data-home-private-button]");
        if (btn) {
          setText(btn, data.buttonText || "");
          setButtonHref(btn, data.buttonHref || "");
        }
      };

      renderCooperation(pickSection("page.home-cooperation-cta"));
      renderIndustry(pickSection("page.home-industry-scenarios"));
      renderPrivateZone(pickSection("page.home-private-zone"));

      const extraSections = sections.filter(
        (s) =>
          ![
            "page.home-cooperation-cta",
            "page.home-industry-scenarios",
            "page.home-private-zone",
          ].includes(s.__component)
      );
      const cardsSection = extraSections.find((s) => s && s.__component === "page.section-cards") || null;
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
        }
      }

      const extraHost = document.querySelector("[data-home-extra-sections]");
      if (extraHost) {
        clearNode(extraHost);
        let added = 0;
        for (const s of extraSections) {
          if (!s || s.isVisible === false) continue;
          if (s === cardsSection) continue;
          let node = null;
          if (s.__component === "page.section-cards") {
            node = renderCardGrid(s.title || "", s.cards || [], { columns: s.columns, subtitle: s.subtitle });
          } else if (s.__component === "page.section-text") {
            node = renderSectionText(s);
          }
          if (node) {
            node.classList.add("mb-10");
            extraHost.appendChild(node);
            added += 1;
          }
        }
        extraHost.classList.toggle("hidden", added === 0);
      }
    }

    const newsBlock = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    const showNewsBlock = page && page.showNewsBlock === true;
    if (newsBlock) {
      newsBlock.classList.toggle("hidden", !showNewsBlock);
      const docs = newsBlock.querySelector("[data-news-documents]");
      if (docs) docs.remove();
    }
    if (newsBlock && showNewsBlock) {
      runNewsInit("tpl_home news", (newsApi) => {
        const {
          NEWS_STATE,
          readStateFromUrl,
          setActiveTag,
          loadNewsPage,
          loadTags,
          bindTags,
          bindNewsPagination,
          ensureNewsDocsLayout,
        } = newsApi;
        readStateFromUrl();
        if (ensureNewsDocsLayout) ensureNewsDocsLayout();
        setActiveTag(NEWS_STATE.tag);
        loadNewsPage(NEWS_STATE.page || 1).catch((err) => {
          console.error("[CMS_ADAPTER] tpl_home: loadNewsPage failed:", err);
        });
        void loadTags();
        bindTags();
        bindNewsPagination();
      });
    }

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
    const slug = getSlugFromQueryOrPath("developers");

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    if (page.hero) {
      applyHeroBackground(document.querySelector("[data-seg-hero-bg]"), page.hero?.backgroundImage);
      const badgeEl = document.querySelector("[data-seg-hero-badge]");
      if (badgeEl) {
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

      const hideBtn = (btn) => {
        if (!btn) return;
        btn.classList.add("hidden");
        btn.removeAttribute("data-seg-cta-href");
      };
      const applyBtn = (btn, data) => {
        if (!btn) return;
        if (!data || !data.text) {
          hideBtn(btn);
          return;
        }
        const span = btn.querySelector("span");
        if (span) span.textContent = String(data.text);
        else btn.textContent = String(data.text);
        if (data.href) btn.setAttribute("data-seg-cta-href", String(data.href));
        else btn.removeAttribute("data-seg-cta-href");
        btn.classList.remove("hidden");
      };
      applyBtn(document.querySelector("[data-seg-hero-cta-primary]"), primary);
      applyBtn(document.querySelector("[data-seg-hero-cta-secondary]"), secondary);

      const slaWrap = document.querySelector("[data-seg-hero-sla]");
      if (slaWrap) {
        const items = Array.isArray(page.hero.slaItems) ? page.hero.slaItems.filter(Boolean) : [];
        if (!items.length) {
          slaWrap.classList.add("hidden");
        } else {
          slaWrap.classList.remove("hidden");
          const template = slaWrap.querySelector("[data-seg-hero-sla-item]");
          if (template) {
            const base = template.cloneNode(true);
            clearNode(slaWrap);
            for (const item of items) {
              const node = base.cloneNode(true);
              setText(node.querySelector("[data-seg-hero-sla-value]"), item.value || "");
              setText(node.querySelector("[data-seg-hero-sla-label]"), item.label || "");
              slaWrap.appendChild(node);
            }
          }
        }
      }
    }

    const catTitle = document.querySelector("[data-seg-catalog-title]");
    if (catTitle) catTitle.innerHTML = String(page.hero?.title || page.title || "");
    const catSub = document.querySelector("[data-seg-catalog-subtitle]");
    if (catSub) setText(catSub, page.hero?.subtitle || "");

    const sections = Array.isArray(page.sections) ? page.sections : [];
    const cardSections = sections.filter((s) => s && s.__component === "page.section-cards");
    const servicesSection = cardSections[0] || null;
    const scenariosSection = cardSections[1] || null;

    const servicesGrid = document.querySelector("[data-seg-services-grid]");
    const servicesSectionEl = servicesGrid ? servicesGrid.closest("section") : null;
    const servicesMain = servicesGrid ? servicesGrid.closest("main") : null;
    if (servicesSection) {
      const t = document.querySelector("[data-seg-services-title]");
      if (t && servicesSection.title) setText(t, servicesSection.title);
    }
    const servicesCards = Array.isArray(servicesSection?.cards) ? servicesSection.cards.filter(Boolean) : [];
    let serviceCardTemplate = null;
    if (servicesGrid) {
      const hostSection = servicesGrid.closest("section");
      const template = servicesGrid.querySelector("[data-seg-service-card]");
      const base = template ? template.cloneNode(true) : null;
      serviceCardTemplate = base;
      clearNode(servicesGrid);

      if (!servicesCards.length) {
        if (hostSection) hostSection.classList.add("hidden");
      } else {
        if (hostSection) hostSection.classList.remove("hidden");
        const tagSet = [];
        const normalizeTags = (raw) =>
          String(raw || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        for (const c of servicesCards) {
          if (!base) break;
          const node = base.cloneNode(true);
          setText(node.querySelector("[data-seg-service-title]"), c.title || "");
          setText(node.querySelector("[data-seg-service-desc]"), c.description || "");
          if (c.link) node.setAttribute("data-seg-link", String(c.link));
          else node.removeAttribute("data-seg-link");

          const tags = normalizeTags(c.tag);
          node.setAttribute("data-seg-tags", tags.join(","));
          for (const tag of tags) {
            if (!tagSet.includes(tag)) tagSet.push(tag);
          }
          servicesGrid.appendChild(node);
        }

        const tabsHost = document.querySelector("[data-seg-filter-tabs]");
        if (tabsHost) {
          clearNode(tabsHost);
          const buildTab = (label, tagValue, active) => {
            const btn = document.createElement("button");
            btn.setAttribute("data-seg-filter-tag", tagValue);
            btn.className = "px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap";
            if (active) {
              btn.classList.add("bg-primary", "text-white");
            } else {
              btn.classList.add("text-[#9aabbc]", "hover:text-white");
            }
            btn.textContent = label;
            return btn;
          };

          const tags = tagSet.slice();
          const hasTags = tags.length > 0;
          const allBtn = buildTab("Все услуги", "all", true);
          tabsHost.appendChild(allBtn);
          for (const tag of tags) {
            tabsHost.appendChild(buildTab(tag, tag, false));
          }
          if (!hasTags) {
            tabsHost.classList.add("hidden");
          } else {
            tabsHost.classList.remove("hidden");
          }

          let activeTag = "all";
          const searchInput = document.querySelector("[data-seg-search]");
          const applyFilters = () => {
            const q = String(searchInput?.value || "").trim().toLowerCase();
            const cards = Array.from(servicesGrid.querySelectorAll("[data-seg-service-card]"));
            for (const card of cards) {
              const title = (card.querySelector("[data-seg-service-title]")?.textContent || "").toLowerCase();
              const desc = (card.querySelector("[data-seg-service-desc]")?.textContent || "").toLowerCase();
              const tagsRaw = card.getAttribute("data-seg-tags") || "";
              const tags = tagsRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              const matchesTag = activeTag === "all" || tags.includes(activeTag);
              const matchesQuery =
                !q || title.includes(q) || desc.includes(q) || tags.some((t) => t.toLowerCase().includes(q));
              if (matchesTag && matchesQuery) card.classList.remove("hidden");
              else card.classList.add("hidden");
            }
          };

          tabsHost.addEventListener("click", (e) => {
            const btn = e.target && e.target.closest ? e.target.closest("[data-seg-filter-tag]") : null;
            if (!btn) return;
            activeTag = btn.getAttribute("data-seg-filter-tag") || "all";
            const buttons = Array.from(tabsHost.querySelectorAll("[data-seg-filter-tag]"));
            for (const b of buttons) {
              const isActive = b === btn;
              b.classList.toggle("bg-primary", isActive);
              b.classList.toggle("text-white", isActive);
              b.classList.toggle("text-[#9aabbc]", !isActive);
              b.classList.toggle("hover:text-white", !isActive);
            }
            applyFilters();
          });

          if (searchInput) {
            searchInput.addEventListener("input", () => applyFilters());
          }
          applyFilters();
        }
      }
    }

    const scenariosGrid = document.querySelector("[data-seg-scenarios-grid]");
    const scenariosSectionEl = scenariosGrid ? scenariosGrid.closest("section") : null;
    if (scenariosSection) {
      const t = document.querySelector("[data-seg-scenarios-title]");
      if (t && scenariosSection.title) setText(t, scenariosSection.title);
    }
    const scenarioCards = Array.isArray(scenariosSection?.cards) ? scenariosSection.cards.filter(Boolean) : [];
    if (scenariosGrid) {
      const hostSection = scenariosGrid.closest("section");
      const template = scenariosGrid.querySelector("[data-seg-scenario-card]");
      const base = template ? template.cloneNode(true) : null;
      clearNode(scenariosGrid);

      if (!scenarioCards.length) {
        if (hostSection) hostSection.classList.add("hidden");
      } else {
        if (hostSection) hostSection.classList.remove("hidden");
        for (const c of scenarioCards) {
          if (!base) break;
          const node = base.cloneNode(true);
          setText(node.querySelector("[data-seg-scenario-title]"), c.title || "");
          setText(node.querySelector("[data-seg-scenario-desc]"), c.description || "");
          if (c.link) node.setAttribute("data-seg-link", String(c.link));
          else node.removeAttribute("data-seg-link");
          scenariosGrid.appendChild(node);
        }
      }
    }

    const cardGridClasses =
      servicesGrid?.className ||
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6";
    const renderExtraCardSection = (section) => {
      if (!servicesMain || !serviceCardTemplate || !section) return;
      const cards = Array.isArray(section.cards) ? section.cards.filter(Boolean) : [];
      if (!cards.length) return;
      const wrapper = document.createElement("section");
      wrapper.className = "mb-16";
      const header = document.createElement("div");
      header.className = "flex items-center justify-between mb-8";
      const title = document.createElement("h2");
      title.className = "text-white text-2xl font-bold tracking-tight";
      title.textContent = String(section.title || "");
      header.appendChild(title);
      wrapper.appendChild(header);
      const grid = document.createElement("div");
      grid.className = cardGridClasses;
      for (const c of cards) {
        const node = serviceCardTemplate.cloneNode(true);
        setText(node.querySelector("[data-seg-service-title]"), c.title || "");
        setText(node.querySelector("[data-seg-service-desc]"), c.description || "");
        if (c.link) node.setAttribute("data-seg-link", String(c.link));
        else node.removeAttribute("data-seg-link");
        grid.appendChild(node);
      }
      wrapper.appendChild(grid);
      if (scenariosSectionEl && scenariosSectionEl.parentElement === servicesMain) {
        scenariosSectionEl.insertAdjacentElement("afterend", wrapper);
      } else if (servicesSectionEl && servicesSectionEl.parentElement === servicesMain) {
        servicesSectionEl.insertAdjacentElement("afterend", wrapper);
      } else {
        servicesMain.appendChild(wrapper);
      }
    };
    const renderExtraTextSection = (section) => {
      if (!servicesMain || !section) return;
      const node = renderSectionText(section);
      if (!node) return;
      node.classList.add("mb-16");
      if (scenariosSectionEl && scenariosSectionEl.parentElement === servicesMain) {
        scenariosSectionEl.insertAdjacentElement("afterend", node);
      } else if (servicesSectionEl && servicesSectionEl.parentElement === servicesMain) {
        servicesSectionEl.insertAdjacentElement("afterend", node);
      } else {
        servicesMain.appendChild(node);
      }
    };

    let cardSectionIdx = 0;
    sections.forEach((section) => {
      if (!section || !section.__component) return;
      if (section.__component === "page.section-cards") {
        cardSectionIdx += 1;
        if (cardSectionIdx <= 2) return;
        renderExtraCardSection(section);
        return;
      }
      if (section.__component === "page.section-text") {
        renderExtraTextSection(section);
      }
    });

    const consult = sections.find((s) => s?.__component === "page.service-consultation-card");
    const ctaSection =
      document.querySelector('[data-stitch-block="service_cta_banner"]') ||
      document.querySelector("[data-seg-cta-banner]");
    if (ctaSection) {
      if (!consult || consult.isVisible === false) {
        ctaSection.classList.add("hidden");
      } else {
        ctaSection.classList.remove("hidden");
        setText(ctaSection.querySelector("[data-service-cta-title]"), consult.title || "");
        setText(ctaSection.querySelector("[data-service-cta-subtitle]"), consult.subtitle || "");
        const ctaBtn = ctaSection.querySelector("[data-service-cta-button]");
        const ctaBtnText = ctaSection.querySelector("[data-service-cta-button-text]");
        if (ctaBtnText && consult.buttonText) ctaBtnText.textContent = String(consult.buttonText);
        if (ctaBtn && consult.buttonHref) {
          ctaBtn.setAttribute("data-service-cta-href", String(consult.buttonHref));
          ctaBtn.addEventListener("click", () => {
            const href = (ctaBtn.getAttribute("data-service-cta-href") || "").trim();
            if (!href) return;
            try {
              window.location.assign(href);
            } catch {
              // ignore
            }
          });
        }
        const secondaryBtn = ctaSection.querySelector("[data-service-cta-secondary]");
        if (secondaryBtn) {
          secondaryBtn.classList.add("hidden");
        }
      }
    }

    const order = sections.find((s) => s?.__component === "page.service-order-form");
    const orderSection = document.querySelector("[data-seg-order-section]");
    if (orderSection) {
      if (!order || order.isVisible !== true) {
        orderSection.classList.add("hidden");
      } else {
        orderSection.classList.remove("hidden");
        const orderTitleEl = orderSection.querySelector("[data-cms-order-title]");
        if (orderTitleEl && order?.title) orderTitleEl.textContent = String(order.title);
        const orderSubEl = orderSection.querySelector("[data-cms-order-subtitle]");
        if (orderSubEl) {
          const sub = (order?.subtitle || "").trim();
          if (sub) {
            orderSubEl.textContent = sub;
            orderSubEl.classList.remove("hidden");
          } else {
            orderSubEl.classList.add("hidden");
          }
        }
        const orderFormEl = orderSection.querySelector("[data-cms-order-form]");
        if (orderFormEl) {
          if (order?.formAction) orderFormEl.setAttribute("action", String(order.formAction));
          if (order?.formMethod) orderFormEl.setAttribute("method", String(order.formMethod));
        }
      }
    }

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

  async function renderTplFormPage() {
    const slug = getSlugFromQueryOrPath("");
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    const titleEl = document.querySelector("[data-form-hero-title]");
    if (titleEl) titleEl.innerHTML = String(page.hero?.title || page.title || "");
    const subEl = document.querySelector("[data-form-hero-subtitle]");
    if (subEl) setText(subEl, page.hero?.subtitle || "");

    const formSection = Array.isArray(page.sections)
      ? page.sections.find((s) => s?.__component === "page.form-section")
      : null;
    const formPanel = document.querySelector("[data-form-panel]");
    if (formPanel && formSection) {
      clearNode(formPanel);
      if (formSection.title) {
        const h = document.createElement("h2");
        h.className = "text-white text-xl md:text-2xl font-bold tracking-tight";
        h.textContent = String(formSection.title);
        formPanel.appendChild(h);
      }
      if (formSection.subtitle) {
        const p = document.createElement("p");
        p.className = "text-white/70 text-sm md:text-base";
        p.textContent = String(formSection.subtitle);
        formPanel.appendChild(p);
      }

      const form = document.createElement("form");
      form.className = "flex flex-col gap-6";
      const fields = Array.isArray(formSection.elements) ? formSection.elements.filter(Boolean) : [];
      for (const field of fields) {
        const wrap = document.createElement("div");
        wrap.className = "form-field-wrapper flex flex-col gap-2";
        wrap.dataset.required = field.optional ? "false" : "true";
        const label = document.createElement("label");
        label.className = "text-sm font-medium text-gray-300";
        label.textContent = String(field.label || "");
        if (field.optional) {
          const opt = document.createElement("span");
          opt.className = "text-xs text-gray-500 ml-2";
          opt.textContent = "необязательно";
          label.appendChild(opt);
        }
        if (field.label) wrap.appendChild(label);

        let inputEl = null;
        if (field.type === "select") {
          const placeholder = field.placeholder ? String(field.placeholder) : "Выберите из списка...";
          const options = Array.isArray(field.options) ? field.options : [];

          const dropdown = document.createElement("div");
          dropdown.className = "relative";
          dropdown.dataset.dropdown = "true";
          dropdown.dataset.value = "";

          const button = document.createElement("button");
          button.type = "button";
          button.className =
            "w-full flex items-center justify-between h-12 px-4 rounded-lg border border-slate-300 dark:border-[#3a4755] bg-slate-50 dark:bg-[#111418] text-slate-500 dark:text-[#9babbb] text-sm transition-all";

          const labelSpan = document.createElement("span");
          labelSpan.textContent = placeholder;
          const icon = document.createElement("span");
          icon.className = "material-symbols-outlined";
          icon.textContent = "expand_more";

          button.appendChild(labelSpan);
          button.appendChild(icon);

          const menu = document.createElement("div");
          menu.className =
            "absolute z-10 w-full mt-0 bg-white dark:bg-[#1b2127] border border-primary border-t-0 rounded-b-lg shadow-xl overflow-hidden hidden";

          const list = document.createElement("div");
          list.className = "p-1 space-y-0.5";

          const setOpen = (open) => {
            menu.classList.toggle("hidden", !open);
            button.classList.toggle("border-primary", open);
            button.classList.toggle("bg-primary/5", open);
            button.classList.toggle("text-slate-900", open);
            button.classList.toggle("dark:text-white", open);
            icon.classList.toggle("rotate-180", open);
          };

          let selectedValue = "";
          const pickIcon = (value) => {
            const v = String(value || "").toLowerCase();
            if (v.includes("исправ")) return "check_circle";
            if (v.includes("неисправ") || v.includes("дефект")) return "error";
            if (v.includes("да")) return "check_circle";
            if (v.includes("нет")) return "block";
            if (v.includes("срочно")) return "priority_high";
            return "lan";
          };
          const optionNodes = [];

          for (const optValue of options) {
            const opt = document.createElement("div");
            opt.className =
              "flex items-center gap-3 px-3 py-2 text-sm text-slate-600 dark:text-[#9babbb] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer";
            const optIcon = document.createElement("span");
            optIcon.className = "material-symbols-outlined text-lg";
            optIcon.textContent = pickIcon(optValue);
            const optText = document.createElement("span");
            optText.textContent = String(optValue);
            const optCheck = document.createElement("span");
            optCheck.className = "material-symbols-outlined text-sm ml-auto hidden";
            optCheck.textContent = "check";
            opt.appendChild(optIcon);
            opt.appendChild(optText);
            opt.appendChild(optCheck);
            opt.addEventListener("click", (e) => {
              e.preventDefault();
              selectedValue = String(optValue);
              dropdown.dataset.value = selectedValue;
              labelSpan.textContent = selectedValue;
              labelSpan.classList.remove("text-slate-500", "dark:text-[#9babbb]");
              labelSpan.classList.add("text-slate-900", "dark:text-white");
              optionNodes.forEach((node) => {
                const check = node.querySelector(".material-symbols-outlined.text-sm");
                const isSelected = node === opt;
                if (check) check.classList.toggle("hidden", !isSelected);
                node.classList.toggle("text-white", isSelected);
                node.classList.toggle("bg-primary", isSelected);
                node.classList.toggle("rounded-md", isSelected);
                node.classList.toggle("shadow-lg", isSelected);
                node.classList.toggle("shadow-primary/20", isSelected);
              });
              setOpen(false);
              const error = wrap.querySelector(".text-red-400");
              button.classList.remove("border-red-500");
              if (error) error.classList.add("hidden");
            });
            list.appendChild(opt);
            optionNodes.push(opt);
          }

          menu.appendChild(list);
          dropdown.appendChild(button);
          dropdown.appendChild(menu);

          button.addEventListener("click", (e) => {
            e.preventDefault();
            const isOpen = !menu.classList.contains("hidden");
            setOpen(!isOpen);
          });
          document.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target)) setOpen(false);
          });

          inputEl = dropdown;
        } else if (field.type === "textarea") {
          const textarea = document.createElement("textarea");
          textarea.className =
            "w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all";
          if (field.placeholder) textarea.placeholder = String(field.placeholder);
          textarea.rows = 4;
          const fallbackLimit = 300;
          const limit =
            typeof field.maxLength === "number" && field.maxLength > 0
              ? field.maxLength
              : fallbackLimit;
          textarea.maxLength = limit;
          inputEl = textarea;
          const counter = document.createElement("div");
          counter.className = "text-xs text-gray-500 text-right";
          const updateCounter = () => {
            const remaining = Math.max(0, limit - textarea.value.length);
            counter.textContent = `Осталось: ${remaining}`;
          };
          textarea.addEventListener("input", updateCounter);
          updateCounter();
          wrap.appendChild(counter);
          textarea.addEventListener("input", () => {
            const error = wrap.querySelector(".text-red-400");
            textarea.classList.remove("border-red-500");
            if (error) error.classList.add("hidden");
          });
        } else if (field.type === "file") {
          const fileWrap = document.createElement("label");
          fileWrap.className =
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-6 text-white/60 cursor-pointer hover:border-primary/60 hover:text-white transition-all";
          const title = document.createElement("div");
          title.className = "text-sm font-medium text-white";
          title.textContent = String(field.text || field.placeholder || "Выберите файлы");
          const hint = document.createElement("div");
          hint.className = "text-xs text-white/40";
          hint.textContent = String(field.description || "");
          const input = document.createElement("input");
          input.type = "file";
          if (field.accept) input.accept = String(field.accept);
          input.className = "hidden";
          fileWrap.appendChild(title);
          if (field.description) fileWrap.appendChild(hint);
          fileWrap.appendChild(input);
          inputEl = fileWrap;
        } else {
          const input = document.createElement("input");
          input.className =
            "w-full bg-white/5 border border-white/10 rounded-lg h-14 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all";
          input.type = field.type === "input" ? "text" : "text";
          if (field.placeholder) input.placeholder = String(field.placeholder);
          const fallbackLimit = 300;
          const limit =
            typeof field.maxLength === "number" && field.maxLength > 0
              ? field.maxLength
              : fallbackLimit;
          input.maxLength = limit;
          if (String(field.label || "").toLowerCase().includes("телефон")) {
            input.placeholder = "+7 (___) ___-__-__";
            input.inputMode = "tel";
            input.addEventListener("input", () => {
              const digits = input.value.replace(/\D/g, "").replace(/^7/, "");
              const parts = [
                digits.slice(0, 3),
                digits.slice(3, 6),
                digits.slice(6, 8),
                digits.slice(8, 10),
              ];
              let formatted = "+7";
              if (parts[0]) formatted += ` (${parts[0]}`;
              if (parts[0] && parts[0].length === 3) formatted += ")";
              if (parts[1]) formatted += ` ${parts[1]}`;
              if (parts[2]) formatted += `-${parts[2]}`;
              if (parts[3]) formatted += `-${parts[3]}`;
              input.value = formatted;
            });
          }
          inputEl = input;
          const counter = document.createElement("div");
          counter.className = "text-xs text-gray-500 text-right";
          const updateCounter = () => {
            const remaining = Math.max(0, limit - input.value.length);
            counter.textContent = `Осталось: ${remaining}`;
          };
          input.addEventListener("input", updateCounter);
          updateCounter();
          wrap.appendChild(counter);
          input.addEventListener("input", () => {
            const error = wrap.querySelector(".text-red-400");
            input.classList.remove("border-red-500");
            if (error) error.classList.add("hidden");
          });
        }

        const error = document.createElement("div");
        error.className = "text-xs text-red-400 hidden";
        error.textContent = "Пожалуйста, заполните поле";
        wrap.appendChild(error);

        if (inputEl) wrap.appendChild(inputEl);
        if (field.description && field.type !== "file") {
          const desc = document.createElement("div");
          desc.className = "text-xs text-gray-500";
          desc.textContent = String(field.description);
          wrap.appendChild(desc);
        }
        form.appendChild(wrap);
      }

      const footer = document.createElement("div");
      footer.className =
        "flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/10";
      if (formSection.disclaimerHtml) {
        const disc = document.createElement("p");
        disc.className = "text-white/40 text-xs max-w-sm text-center md:text-left";
        disc.innerHTML = String(formSection.disclaimerHtml);
        footer.appendChild(disc);
      }
      const submit = document.createElement("button");
      submit.type = "submit";
      submit.className =
        "glow-button w-full md:w-auto flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-10 bg-primary text-white text-lg font-bold transition-all hover:scale-[1.02] active:scale-95";
      submit.textContent = String(formSection.submitText || "Отправить");
      footer.appendChild(submit);
      form.appendChild(footer);
      formPanel.appendChild(form);

      form.addEventListener("submit", (e) => {
        let hasError = false;
        const isSuspicious = (value) => {
          const v = String(value || "").toLowerCase();
          return (
            /<\s*script|<\/\s*script|javascript:|onerror=|onload=/.test(v) ||
            /\b(system|assistant|user)\s*:/.test(v) ||
            /```|<\s*\/?\s*(html|body|iframe)\b/.test(v) ||
            /\b(drop|delete|truncate|insert|update)\b\s+\b(table|from|into)\b/.test(v) ||
            /(?:\bshutdown\b|\bexec\b|\bsubprocess\b)/.test(v)
          );
        };
        const isPhoneValid = (value) => {
          const digits = String(value || "").replace(/\D/g, "").replace(/^7/, "");
          if (digits.length !== 10) return false;
          if (/^(\d)\1{9}$/.test(digits)) return false;
          return true;
        };
        const wrappers = Array.from(form.querySelectorAll(".form-field-wrapper"));
        wrappers.forEach((wrap) => {
          const required = wrap.getAttribute("data-required") === "true";
          const input = wrap.querySelector("input, textarea");
          const dropdown = wrap.querySelector("[data-dropdown]");
          const error = wrap.querySelector(".text-red-400");
          let filled = false;
          if (dropdown) {
            filled = !!dropdown.dataset.value;
          } else if (input) {
            filled = !!input.value.trim();
          }
          if (required && !filled) {
            hasError = true;
            if (input) {
              input.classList.remove("border-white/10");
              input.classList.add("border-red-500", "focus:border-red-500");
            }
            if (dropdown) {
              const btn = dropdown.querySelector("button");
              if (btn) {
                btn.classList.remove("border-slate-300", "dark:border-[#3a4755]");
                btn.classList.add("border-red-500", "focus:border-red-500");
              }
            }
            if (error) error.classList.remove("hidden");
            return;
          }
          if (input && filled) {
            const isPhone = String(input.placeholder || "").includes("+7") ||
              String(input.value || "").startsWith("+7");
            if (isPhone && !isPhoneValid(input.value)) {
              hasError = true;
              input.classList.remove("border-white/10");
              input.classList.add("border-red-500", "focus:border-red-500");
              if (error) {
                error.textContent = "Некорректный номер";
                error.classList.remove("hidden");
              }
              return;
            }
            if (isSuspicious(input.value)) {
              hasError = true;
              input.classList.remove("border-white/10");
              input.classList.add("border-red-500", "focus:border-red-500");
              if (error) {
                error.textContent = "Недопустимый ввод";
                error.classList.remove("hidden");
              }
            } else if (error) {
              error.textContent = "Пожалуйста, заполните поле";
              error.classList.add("hidden");
              input.classList.remove("border-red-500", "focus:border-red-500");
              input.classList.add("border-white/10");
            }
          } else {
            if (input) {
              input.classList.remove("border-red-500", "focus:border-red-500");
              input.classList.add("border-white/10");
            }
            if (dropdown) {
              const btn = dropdown.querySelector("button");
              if (btn) {
                btn.classList.remove("border-red-500", "focus:border-red-500");
                btn.classList.add("border-slate-300", "dark:border-[#3a4755]");
              }
            }
            if (error) error.classList.add("hidden");
          }
        });
        if (hasError) {
          e.preventDefault();
        }
      });
    }

    const orderSection = Array.isArray(page.sections)
      ? page.sections.find((s) => s?.__component === "page.service-order-form")
      : null;
    const footerOrder = document.querySelector('[data-stitch-block="footer_and_contact_form"]');
    const orderSectionEl = footerOrder ? footerOrder.querySelector("[data-order-form-section]") : null;
    if (orderSectionEl) {
      if (!orderSection) {
        orderSectionEl.classList.add("hidden");
      } else {
        orderSectionEl.classList.remove("hidden");
        const title = orderSectionEl.querySelector("[data-cms-order-title]");
        if (title && orderSection.title) title.innerHTML = String(orderSection.title);
        const subtitle = orderSectionEl.querySelector("[data-cms-order-subtitle]");
        if (subtitle) {
          const sub = (orderSection.subtitle || "").trim();
          if (sub) subtitle.textContent = sub;
        }
        const form = orderSectionEl.querySelector("[data-cms-order-form]");
        if (form) {
          if (orderSection.formAction) form.setAttribute("action", String(orderSection.formAction));
          if (orderSection.formMethod) form.setAttribute("method", String(orderSection.formMethod));
        }
        const submit = form ? form.querySelector("button[type='submit'] span") : null;
        if (submit && orderSection.buttonText) submit.textContent = String(orderSection.buttonText);
      }
    }

    await initSidebar(page);
  }

  async function renderTplScenarioPage() {
    const slug = getSlugFromQueryOrPath("scenario_demo");
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;

    const heroTitleEl = document.querySelector("[data-cms-hero-title]");
    if (heroTitleEl && page.hero?.title) heroTitleEl.innerHTML = String(page.hero.title);
    const heroSubEl = document.querySelector("[data-cms-hero-subtitle]");
    if (heroSubEl) setText(heroSubEl, page.hero?.subtitle || "");

    const sections = Array.isArray(page.sections) ? page.sections : [];
    const faqPanel =
      document.querySelector("[data-scenario-faq]") ||
      document.querySelector('[data-stitch-block="accordions_and_sidebar_ui_2"] [data-switch-panel][data-switch-key="faq"]');
    if (faqPanel) {
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
        const h = faqPanel.querySelector("h2") || faqPanel.querySelector("h3.text-2xl.font-bold") || null;
        if (h && faqSection.title) setText(h, faqSection.title);
      }
    }

    const tabsHost = document.querySelector("[data-scenario-tabs-host]");
    if (tabsHost) {
      const tabsSection = sections.find((s) => s && s.__component === "page.service-tabs") || null;
      clearNode(tabsHost);
      if (tabsSection) {
        const tabsEl = renderServiceTabs(tabsSection);
        if (tabsEl) {
          tabsHost.appendChild(tabsEl);
          initSwitchers(tabsHost);
        }
      }
    }
  }

  async function renderTplServicePage() {
    let slug = getSlugFromQueryOrPath("");
    const sp = new URLSearchParams(window.location.search);
    if (!sp.get("slug")) {
      const rawPath = (window.location.pathname || "").trim();
      if (rawPath && !rawPath.includes("/html_pages/") && !rawPath.endsWith(".html")) {
        slug = rawPath.replace(/\/+$/, "").replace(/^\/+/, "");
      }
    }
    const slugAliases = {
      "business/equipment_setup/computer_help": "computer_help",
      "business/security_alarm": "security_alarm",
    };
    if (slugAliases[slug]) {
      slug = slugAliases[slug];
    }
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page) return;
    const sections = Array.isArray(page.sections) ? page.sections : [];

    const heroTitleEl = document.querySelector("[data-cms-hero-title]");
    if (heroTitleEl && page.hero?.title) heroTitleEl.innerHTML = String(page.hero.title);
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

    applyHeroBackground(document.querySelector("[data-service-hero-bg]"), page.hero?.backgroundImage);

    const servicePrimaryBtn = document.querySelector("[data-service-hero-cta-primary]");
    const serviceSecondaryBtn = document.querySelector("[data-service-hero-cta-secondary]");
    if (page.hero?.ctaButtons && (servicePrimaryBtn || serviceSecondaryBtn)) {
      const ctas = Array.isArray(page.hero?.ctaButtons) ? page.hero.ctaButtons : [];
      const primary = ctas.find((b) => b?.style === "primary") || ctas[0] || null;
      const secondary = ctas.find((b) => b?.style === "secondary" || b?.style === "outline") || ctas[1] || null;
      if (servicePrimaryBtn && primary?.text) {
        const label = servicePrimaryBtn.querySelector("span");
        if (label) label.textContent = String(primary.text);
        else servicePrimaryBtn.textContent = String(primary.text);
        if (primary?.href) servicePrimaryBtn.setAttribute("data-service-cta-href", String(primary.href));
      }
      if (serviceSecondaryBtn && secondary?.text) {
        const label = serviceSecondaryBtn.querySelector("span");
        if (label) label.textContent = String(secondary.text);
        else serviceSecondaryBtn.textContent = String(secondary.text);
        if (secondary?.href) serviceSecondaryBtn.setAttribute("data-service-cta-href", String(secondary.href));
      }
    }

    const tariffTables = sections.filter((s) => s?.__component === "page.tariff-table");
    const tariff = tariffTables[0] || null;
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
    const tariffRoot = document.querySelector("[data-cms-tariff-root]");
    if (tariffRoot) {
      tariffRoot.classList.toggle("hidden", !tariff);
      const tariffMain = tariffRoot.querySelector("main");
      if (tariffMain) {
        tariffMain.className = "flex flex-1 justify-center py-10";
      }
      const tariffLayout = tariffRoot.querySelector(".layout-content-container");
      if (tariffLayout) {
        tariffLayout.className = "flex flex-col w-full";
      }
    }
    const billingToggle = document.querySelector('[data-stitch-block="pricing_and_specs_table"] [data-billing]');
    if (billingToggle) billingToggle.classList.add("hidden");

    const faq = sections.find((s) => s?.__component === "page.service-faq");
    const faqTitleEl = document.querySelector("[data-cms-faq-title]");
    if (faqTitleEl && faq?.title) {
      faqTitleEl.textContent = String(faq.title);
      faqTitleEl.className = "text-2xl font-bold flex items-center gap-3 mb-6 text-white service-faq__title";
    }
    const faqItemsEl = document.querySelector("[data-cms-faq-items]");
    if (faqItemsEl && faq && Array.isArray(faq.items)) {
      clearNode(faqItemsEl);
      faq.items.filter(Boolean).forEach((it, idx) => {
        faqItemsEl.appendChild(buildFaqDetailsItem(it.question, it.answer, { open: idx === 0 }));
      });
      faqItemsEl.setAttribute("data-accordion", "");
      faqItemsEl.setAttribute("data-accordion-multiple", "false");
    }
    const faqRoot = document.querySelector("[data-cms-faq-root]");
    if (faqRoot) faqRoot.classList.toggle("hidden", !faq);

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
    const orderRoot = orderFormEl ? orderFormEl.closest("section") : null;
    if (orderRoot) orderRoot.classList.toggle("hidden", !order || order.isVisible !== true);
    const contentHost = document.querySelector("[data-service-sections]");
    if (orderRoot && order && order.isVisible === true && contentHost) {
      const lastContentSection = Array.from(contentHost.children)
        .filter((el) => el instanceof HTMLElement)
        .filter((el) => !el.classList.contains("hidden"))
        .slice(-1)[0];
      if (lastContentSection && lastContentSection.classList.contains("section-table")) {
        orderRoot.classList.remove("py-24");
        orderRoot.classList.add("py-12");
      }
    }
    const badgeEl = document.querySelector("[data-cms-order-badge]");
    if (badgeEl && order?.badgeText) badgeEl.textContent = String(order.badgeText);
    const phoneLabelEl = document.querySelector("[data-cms-order-phone-label]");
    if (phoneLabelEl && order?.supportPhoneLabel) phoneLabelEl.textContent = String(order.supportPhoneLabel);
    const phoneValueEl = document.querySelector("[data-cms-order-phone-value]");
    if (phoneValueEl && order?.supportPhoneValue) phoneValueEl.textContent = String(order.supportPhoneValue);
    const emailLabelEl = document.querySelector("[data-cms-order-email-label]");
    if (emailLabelEl && order?.supportEmailLabel) emailLabelEl.textContent = String(order.supportEmailLabel);
    const emailValueEl = document.querySelector("[data-cms-order-email-value]");
    if (emailValueEl && order?.supportEmailValue) emailValueEl.textContent = String(order.supportEmailValue);
    const buttonTextEl = document.querySelector("[data-cms-order-button-text]");
    if (buttonTextEl && order?.buttonText) buttonTextEl.textContent = String(order.buttonText);
    const disclaimerEl = document.querySelector("[data-cms-order-disclaimer]");
    if (disclaimerEl && order?.disclaimerHtml) disclaimerEl.innerHTML = String(order.disclaimerHtml);

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

    const bindServiceHeroBtn = (btn) => {
      if (!btn) return;
      btn.addEventListener("click", () => {
        const href = (btn.getAttribute("data-service-cta-href") || "").trim();
        if (!href) return;
        try {
          window.location.assign(href);
        } catch {
          // ignore
        }
      });
    };
    bindServiceHeroBtn(servicePrimaryBtn);
    bindServiceHeroBtn(serviceSecondaryBtn);

    const ctaBanner = sections.find((s) => s?.__component === "page.service-cta-banner");
    const ctaSection = document.querySelector('[data-stitch-block="service_cta_banner"]');
    if (ctaSection) {
      if (!ctaBanner || ctaBanner.isVisible !== true) {
        ctaSection.classList.add("hidden");
      } else {
        ctaSection.classList.remove("hidden");
        setText(document.querySelector("[data-service-cta-title]"), ctaBanner.title || "");
        setText(document.querySelector("[data-service-cta-subtitle]"), ctaBanner.subtitle || "");
        setText(document.querySelector("[data-service-cta-note]"), ctaBanner.note || "");
        const icon = document.querySelector("[data-service-cta-icon]");
        if (icon && ctaBanner.icon) icon.textContent = String(ctaBanner.icon);
        const ctaBtn = document.querySelector("[data-service-cta-button]");
        const ctaBtnText = document.querySelector("[data-service-cta-button-text]");
        if (ctaBtnText && ctaBanner.buttonText) ctaBtnText.textContent = String(ctaBanner.buttonText);
        if (ctaBtn && ctaBanner.buttonHref) {
          ctaBtn.setAttribute("data-service-cta-href", String(ctaBanner.buttonHref));
          bindServiceHeroBtn(ctaBtn);
        }
      }
    }

    const consult = sections.find((s) => s?.__component === "page.service-consultation-card");
    const consultSection = document.querySelector('[data-stitch-block="service_consultation_card"]');
    if (consultSection) {
      if (!consult || consult.isVisible === false) {
        consultSection.classList.add("hidden");
      } else {
        consultSection.classList.remove("hidden");
        setText(document.querySelector("[data-service-consult-title]"), consult.title || "");
        setText(document.querySelector("[data-service-consult-subtitle]"), consult.subtitle || "");
        const btn = document.querySelector("[data-service-consult-button]");
        if (btn) {
          const label = consult.buttonText ? String(consult.buttonText) : "";
          btn.innerHTML = `
            <svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3 8.5 12 13.5 21 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${label}</span>
          `;
        }
        bindButtonHref(btn, consult.buttonHref || "");
      }
    }

    const customization = sections.find((s) => s?.__component === "page.service-customization-panel");
    const customizationSection = document.querySelector('[data-stitch-block="service_customization_panel"]');
    if (customizationSection) {
      if (!customization || customization.isVisible === false) {
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

    const stats = sections.find((s) => s?.__component === "page.service-stats-card");
    const statsSection = document.querySelector('[data-stitch-block="service_stats_card"]');
    if (statsSection) {
      if (!stats || stats.isVisible === false) {
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

    const orderedExtras = sections.filter((s) =>
      s &&
      [
        "page.service-consultation-card",
        "page.service-customization-panel",
        "page.service-stats-card",
      ].includes(s.__component)
    );
    const extraSections = [consultSection, customizationSection, statsSection].filter(
      (el) => el && el.parentElement
    );
    if (orderedExtras.length && extraSections.length) {
      const parent = extraSections[0].parentElement;
      const anchor = extraSections[0];
      const placeholder = document.createElement("div");
      parent.insertBefore(placeholder, anchor);
      extraSections.forEach((el) => parent.removeChild(el));
      let cursor = placeholder;
      orderedExtras.forEach((s) => {
        if (
          s.__component === "page.service-consultation-card" &&
          consultSection &&
          !consultSection.classList.contains("hidden")
        ) {
          parent.insertBefore(consultSection, cursor.nextSibling);
          cursor = consultSection;
        }
        if (
          s.__component === "page.service-customization-panel" &&
          customizationSection &&
          !customizationSection.classList.contains("hidden")
        ) {
          parent.insertBefore(customizationSection, cursor.nextSibling);
          cursor = customizationSection;
        }
        if (
          s.__component === "page.service-stats-card" &&
          statsSection &&
          !statsSection.classList.contains("hidden")
        ) {
          parent.insertBefore(statsSection, cursor.nextSibling);
          cursor = statsSection;
        }
      });
      placeholder.remove();
    }

    const sectionsHost = document.querySelector("[data-service-sections]");
    if (sectionsHost) {
      clearNode(sectionsHost);
      let added = 0;

      for (const s of sections) {
        if (!s || !s.__component) continue;
        if (
          s.__component === "page.service-order-form" ||
          s.__component === "page.service-cta-banner" ||
          s.__component === "page.service-consultation-card" ||
          s.__component === "page.service-customization-panel" ||
          s.__component === "page.service-stats-card"
        ) {
          continue;
        }

        let node = null;
        if (s.__component === "page.section-text") {
          node = renderSectionText(s);
          if (node) {
            node.className = "rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6";
            const body = node.querySelector(".prose");
            if (body) {
              body.className =
                "prose max-w-none text-lg md:text-xl text-slate-800 dark:text-white prose-p:leading-relaxed prose-a:text-primary";
              console.log("[tpl_service] section-text styles applied");
            }
          }
        } else if (s.__component === "page.section-cards") {
          node = renderCardGrid(s.title || "", s.cards || [], {
            variant: page?.template === "TPL_Service" ? "service-cards" : "default",
            columns: s.columns,
            subtitle: s.subtitle,
          });
        } else if (s.__component === "page.section-grid") {
          node = renderCardGrid(s.title || "", s.items || []);
        } else if (s.__component === "page.section-table") {
          node = renderSectionTable(s);
        } else if (s.__component === "page.tariff-table") {
          if (tariff && s === tariff) {
            node = tariffRoot || null;
          } else {
            node = renderTariffTable(s);
          }
        } else if (s.__component === "page.service-faq") {
          node = faqRoot || renderServiceFaq(s);
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
          appendSectionNode(sectionsHost, node, s);
          if (s.__component === "page.service-tabs") {
            initSwitchers(node);
          }
          added += 1;
        }
        const sectionsHostSection = sectionsHost.closest("section");
        if (sectionsHostSection) {
          const excluded = new Set([
            "page.tariff-table",
            "page.service-faq",
            "page.service-order-form",
            "page.service-cta-banner",
            "page.service-consultation-card",
            "page.service-customization-panel",
            "page.service-stats-card",
          ]);
          const firstDynamicIndex = sections.findIndex(
            (s) => s?.__component && !excluded.has(s.__component)
          );
          const consultIndex = sections.findIndex(
            (s) => s?.__component === "page.service-consultation-card"
          );
          if (
            consultIndex >= 0 &&
            firstDynamicIndex >= 0 &&
            consultIndex < firstDynamicIndex &&
            consultSection &&
            consultSection.parentElement
          ) {
            sectionsHostSection.parentElement.insertBefore(consultSection, sectionsHostSection);
          }
        }
      }

      const wrap = sectionsHost.closest("section");
      if (wrap) wrap.classList.toggle("hidden", added === 0);
    }

    document.dispatchEvent(new CustomEvent("mgts:content-updated"));
  }

  function initTplNewsList() {
    runNewsInit("tpl_news_list", (newsApi) => {
      const {
        NEWS_STATE,
        readStateFromUrl,
        setActiveTag,
        loadNewsPage,
        loadTags,
        bindTags,
        bindNewsPagination,
        bindPagination,
        ensureNewsDocsLayout,
        renderNewsPageSections,
      } = newsApi;
    readStateFromUrl();
      if (ensureNewsDocsLayout) ensureNewsDocsLayout();
      if (renderNewsPageSections) {
        renderNewsPageSections().catch((err) => {
          console.error("[CMS_ADAPTER] tpl_news_list: render sections failed:", err);
        });
      }
    setActiveTag(NEWS_STATE.tag);
    loadNewsPage(NEWS_STATE.page || 1).catch((err) => {
      console.error("[CMS_ADAPTER] tpl_news_list: loadNewsPage failed:", err);
    });
    void loadTags();
    bindTags();
    bindNewsPagination();
    bindPagination();
    });
  }

  function initTplNewsArchive() {
    runNewsInit("tpl_news_archive", (newsApi) => {
      const {
        NEWS_STATE,
        readStateFromUrl,
        setActiveTag,
        setActiveYear,
        loadNewsPage,
        loadTags,
        loadYears,
        bindTags,
        bindYears,
        bindNewsPagination,
      } = newsApi;
    readStateFromUrl();
    const docs = document.querySelector('[data-stitch-block="news_and_documents_list_2"] [data-news-documents]');
    if (docs) docs.remove();
    const archiveLink = document.querySelector('[data-stitch-block="news_and_documents_list_2"] [data-news-archive-link]');
    if (archiveLink) archiveLink.remove();

    setActiveTag(NEWS_STATE.tag);
    setActiveYear(NEWS_STATE.year);
    loadNewsPage(NEWS_STATE.page || 1).catch((err) => {
      console.error("[CMS_ADAPTER] tpl_news_archive: loadNewsPage failed:", err);
    });
    void loadTags();
    bindTags();
    void loadYears();
    bindYears();
    bindNewsPagination();
    });
  }

  function initTplNewsDetail() {
    runNewsInit("tpl_news_detail", (newsApi) => {
      newsApi.renderNewsDetailPage().catch((err) => {
      console.error("[CMS_ADAPTER] tpl_news_detail failed:", err);
      });
    });
  }
  function initTplCmsPage() {
    renderCmsPage().catch((err) => {
      console.error("[CMS_ADAPTER] tpl_cms_page failed:", err);
    });
  }
  function initTplService() {
    renderTplServicePage().catch((err) => {
      console.error("[CMS_ADAPTER] tpl_service failed:", err);
    });
  }
  function initTplDocPage() {
    ensureDocPreviewModal();
    renderTplDocPage().catch((err) => {
      console.error("[CMS_ADAPTER] tpl_doc_page failed:", err);
    });
  }
  function initTplContactHub() {
    renderTplContactHubPage().catch((err) => {
      console.error("[CMS_ADAPTER] tpl_contact_hub failed:", err);
    });
  }
  function initPageCeoFeedback() {
    renderPageCeoFeedback().catch((err) => {
      console.error("[CMS_ADAPTER] page_ceo_feedback failed:", err);
    });
  }
  function initTplHome() {
    renderTplHomePage().catch((err) => {
      console.error("[CMS_ADAPTER] tpl_home failed:", err);
    });
  }
  function initTplSegmentLanding() {
    renderTplSegmentLandingPage().catch((err) => {
      console.error("[CMS_ADAPTER] tpl_segment_landing failed:", err);
    });
  }
  function initTplScenario() {
    renderTplScenarioPage().catch((err) => {
      console.error("[CMS_ADAPTER] tpl_scenario failed:", err);
    });
  }
  function initTplFormPage() {
    renderTplFormPage().catch((err) => {
      console.error("[CMS_ADAPTER] tpl_form_page failed:", err);
    });
  }

  const pageInitByName = {
    tpl_news_list: initTplNewsList,
    tpl_news_archive: initTplNewsArchive,
    tpl_news_detail: initTplNewsDetail,
    tpl_cms_page: initTplCmsPage,
    tpl_deepnav: initTplCmsPage,
    tpl_service: initTplService,
    tpl_doc_page: initTplDocPage,
    tpl_contact_hub: initTplContactHub,
    tpl_home: initTplHome,
    tpl_segment_landing: initTplSegmentLanding,
    tpl_scenario: initTplScenario,
    tpl_form_page: initTplFormPage,
    page_ceo_feedback: initPageCeoFeedback,
  };

  const init = pageInitByName[PAGE];
  if (init) safeRun(`init ${PAGE}`, init);
})();

(function () {
  "use strict";

  const core = window.MGTS_CMS_ADAPTER_CORE || {};
  const {
    PAGE,
    STRAPI_BASE,
    getSlugFromQueryOrPath,
    fetchJson,
    formatDateRu,
    setText,
    setBgImage,
    resolveMediaUrl,
    hrefToSlug,
    toPrettyRoute,
    pickPlaceholderImage,
    clearNode,
    renderSectionText,
    renderCardGrid,
  } = core;
  const NEWS_STATE = {
    tag: "",
    year: "",
    page: 1,
    pageSize: PAGE === "tpl_news_archive" ? 12 : 3,
  };

  function hideNewsTemplatePlaceholders() {
    const isNewsPage = PAGE === "tpl_news_list" || PAGE === "tpl_news_archive" || PAGE === "tpl_news_detail";
    if (!isNewsPage) return;
    const mediaSection = document.querySelector('[data-stitch-block="pagination_and_display_controls"]');
    if (mediaSection) mediaSection.remove();
    const footerBlock = document.querySelector('[data-stitch-block="footer_and_contact_form"]');
    if (footerBlock) {
      const form = footerBlock.querySelector("[data-cms-order-form]");
      const formSection = form ? form.closest("section") : null;
      if (formSection) {
        formSection.remove();
      } else if (form) {
        form.remove();
      }
    }
  }

  function findNewsCardsHost() {
    const section = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    if (!section) return null;
    return section.querySelector("[data-news-cards]") || section.querySelector(".news-card-3d")?.closest(".grid") || null;
  }

  function findNewsPaginationRoot() {
    const section = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    if (!section) return null;
    return section.querySelector("[data-news-pagination-root]");
  }

  function ensureNewsDocsLayout() {
    const section = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    if (!section) return;
    const docs = section.querySelector("[data-news-documents]");
    const cards = section.querySelector("[data-news-cards]");
    if (!docs || !cards) return;
    const grid = docs.closest(".grid");
    if (!grid) return;
    grid.classList.add("lg:grid-cols-[2fr_1fr]", "items-start");
    if (grid.lastElementChild !== docs) grid.appendChild(docs);
  }

  async function renderNewsPageSections() {
    const section = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    if (!section) return;
    const docs = section.querySelector("[data-news-documents]");
    if (!docs) return;

    const slug = getSlugFromQueryOrPath("news");
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    const json = await fetchJson(url);
    const page = json && json.data ? json.data : null;
    if (!page || !Array.isArray(page.sections)) return;

    clearNode(docs);
    docs.classList.add("space-y-6");
    let added = 0;
    for (const s of page.sections) {
      if (!s || s.isVisible === false) continue;
      if (s.__component === "page.section-text") {
        const node = renderSectionText(s);
        if (node) {
          docs.appendChild(node);
          added += 1;
        }
      } else if (s.__component === "page.section-cards") {
        const node = renderCardGrid(s.title || "", s.cards || [], { columns: s.columns });
        if (node) {
          docs.appendChild(node);
          added += 1;
        }
      }
    }
    docs.classList.toggle("hidden", added === 0);
  }

  function buildPageModel(page, pageCount) {
    const p = Math.max(1, page || 1);
    const last = Math.max(1, pageCount || 1);
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

    const out = [1];
    const add = (v) => {
      if (out[out.length - 1] !== v) out.push(v);
    };
    if (p > 3) add(0);
    add(Math.max(2, p - 1));
    add(p);
    add(Math.min(last - 1, p + 1));
    if (p < last - 2) add(0);
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

    const categoryEl = card.querySelector("[data-news-category]") || card.querySelector("span.category-tag-glow");
    setText(categoryEl, item.category?.name || "Новости");

    const dateEl = card.querySelector("[data-news-date]") || card.querySelector("span.text-slate-500.text-\\[11px\\].font-bold");
    setText(dateEl, formatDateRu(item.publishDate));

    const titleEl = card.querySelector("[data-news-title]") || card.querySelector("h4");
    setText(titleEl, item.title);

    const pEl = card.querySelector("[data-news-excerpt]") || card.querySelector("p.text-slate-400");
    setText(pEl, item.shortDescription || "");

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
    const json = await fetchJson(url);
    const items = (json && json.data) || [];

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
        console.error("[CMS_ADAPTER] tpl_news_archive: loadNewsPage failed:", err);
      });
    });
  }

  function ensureNewsCards(host, count) {
    if (!host) return [];
    const existing = Array.from(host.querySelectorAll(".news-card-3d"));
    if (existing.length === 0) return [];

    const template = existing[0].cloneNode(true);
    const desired = Math.max(1, count || 0);

    while (existing.length < desired) {
      const c = template.cloneNode(true);
      host.appendChild(c);
      existing.push(c);
    }

    while (existing.length > desired) {
      const last = existing.pop();
      if (last && last.parentNode) last.parentNode.removeChild(last);
    }

    return existing;
  }

  async function loadNewsPage(page) {
    const host = findNewsCardsHost();
    if (!host) {
      console.warn("[CMS_ADAPTER] tpl_news_list: cards host not found");
      return;
    }

    NEWS_STATE.page = page || 1;
    writeStateToUrl();
    const tag = NEWS_STATE.tag ? `&tag=${encodeURIComponent(NEWS_STATE.tag)}` : "";
    const year = NEWS_STATE.year ? `&year=${encodeURIComponent(NEWS_STATE.year)}` : "";
    const url = `${STRAPI_BASE}/api/news/list?page=${encodeURIComponent(String(NEWS_STATE.page || 1))}&pageSize=${encodeURIComponent(String(NEWS_STATE.pageSize))}${tag}${year}`;

    const json = await fetchJson(url);
    const items = (json && json.data) || [];

    const wantDynamic = PAGE === "tpl_news_archive";
    const cards = wantDynamic ? ensureNewsCards(host, items.length) : Array.from(host.querySelectorAll(".news-card-3d"));

    for (let i = 0; i < cards.length; i++) {
      const item = items[i] || null;
      if (item) {
        updateNewsCard(cards[i], item);
        cards[i].classList.remove("opacity-40");
      } else {
        cards[i].classList.add("opacity-40");
      }
    }

    const pagination = (json && json.meta && json.meta.pagination) || null;
    if (pagination) {
      renderNewsPagination(pagination);
    }

    const pag = document.querySelector('[data-stitch-block="pagination_and_display_controls"]');
    const summary = pag && pag.querySelector("p.text-slate-500.text-xs");
    if (summary && pagination) {
      const from = (pagination.page - 1) * pagination.pageSize + 1;
      const to = Math.min(pagination.total, pagination.page * pagination.pageSize);
      setText(summary, `Показано ${from}-${to} из ${pagination.total} новостей`);
    }
  }

  async function renderNewsDetailPage() {
    const slug = getSlugFromQueryOrPath("");
    if (!slug) return;

    const url = `${STRAPI_BASE}/api/news/slug/${encodeURIComponent(slug)}`;
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

  async function injectModalContent(detail) {
    if (!detail || !detail.modalId) return;
    if (detail.contentType !== "news") return;
    const modal = document.getElementById(detail.modalId);
    if (!modal) return;

    const slug = String(detail.contentId || "").trim() || "";
    const urlSlug = detail.url ? String(detail.url).split("/").filter(Boolean).slice(-1)[0] : "";
    const targetSlug = slug || urlSlug;
    if (!targetSlug) return;

    const url = `${STRAPI_BASE}/api/news/slug/${encodeURIComponent(targetSlug)}`;
    const json = await fetchJson(url);
    const item = json && json.data ? json.data : null;
    if (!item) return;

    const titleEl = modal.querySelector("[data-cms-title]");
    if (titleEl) titleEl.textContent = item.title || targetSlug;

    const bodyEl = modal.querySelector("[data-cms-body]");
    if (bodyEl) bodyEl.innerHTML = item.content || "";

    const mediaWrap = modal.querySelector("[data-cms-media]");
    const imgEl = modal.querySelector("[data-cms-image]");
    const imgUrl = resolveMediaUrl(item.featuredImage);
    if (mediaWrap && imgEl) {
      if (imgUrl) {
        const abs = imgUrl.startsWith("http") ? imgUrl : `${STRAPI_BASE}${imgUrl}`;
        imgEl.setAttribute("src", abs);
        imgEl.classList.remove("hidden");
        mediaWrap.classList.remove("hidden");
      } else {
        imgEl.classList.add("hidden");
        imgEl.removeAttribute("src");
        mediaWrap.classList.add("hidden");
      }
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
        console.error("[CMS_ADAPTER] tpl_news_list: loadNewsPage failed:", err);
      });
    });
  }

  function bindPagination() {
    const pag = document.querySelector('[data-stitch-block="pagination_and_display_controls"]');
    if (!pag) return;
    const group = pag.querySelector("[data-choice-group]");
    if (!group) return;

    group.addEventListener("click", (e) => {
      const a = e.target && e.target.closest && e.target.closest("[data-choice]");
      if (!a) return;
      e.preventDefault();
      const page = parseInt(a.textContent || "1", 10) || 1;
      loadNewsPage(page).catch((err) => {
        console.error("[CMS_ADAPTER] tpl_news_list: loadNewsPage failed:", err);
      });
    });
  }

  // Allow CMS adapter to override how content opens (modal vs dedicated page).
  // If a dedicated route exists, prefer navigation to avoid "empty modal" UX.
  document.addEventListener("mgts:open", (e) => {
    try {
      const detail = (e && e.detail) || null;
      if (!detail) return;
      if (detail.contentType === "news") {
        if (detail.openMode === "modal" || detail.modalId) {
          void injectModalContent(detail);
        } else if (detail.url) {
          e.preventDefault();
          window.location.assign(detail.url);
        }
      }
    } catch (_err) {
      // non-blocking
    }
  });

  const runHideNewsPlaceholders = () => hideNewsTemplatePlaceholders();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runHideNewsPlaceholders);
  } else {
    runHideNewsPlaceholders();
  }
  setTimeout(runHideNewsPlaceholders, 0);


  window.MGTS_CMS_ADAPTER_NEWS = {
    NEWS_STATE,
    ensureNewsDocsLayout,
    renderNewsPageSections,
    findNewsCardsHost,
    findNewsPaginationRoot,
    buildPageModel,
    renderNewsPagination,
    updateNewsCard,
    findNewsTagsRoot,
    findNewsYearsRoot,
    readStateFromUrl,
    writeStateToUrl,
    setActiveTag,
    setActiveYear,
    loadTags,
    loadYears,
    bindTags,
    bindYears,
    ensureNewsCards,
    loadNewsPage,
    renderNewsDetailPage,
    bindNewsPagination,
    bindPagination,
  };
})();

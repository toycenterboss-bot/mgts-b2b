(function () {
  "use strict";

  function getPageName() {
    const body = document.body;
    const fromData = body && body.dataset ? body.dataset.page : "";
    if (fromData) return fromData;
    return (document.title || "").trim();
  }

  const PAGE = getPageName();
  const qsStrapi = new URLSearchParams(window.location.search).get("strapi");
  const inferredHost = window.location.hostname || "localhost";
  const inferredProtocol = window.location.protocol === "file:" ? "http:" : window.location.protocol;
  const inferredBase = `${inferredProtocol}//${inferredHost}:1337`;
  const STRAPI_BASE =
    (qsStrapi && qsStrapi.trim()) ||
    (inferredBase.startsWith("http://") || inferredBase.startsWith("https://") ? inferredBase : "http://localhost:1337");

  const ICON_PREVIEW_CACHE = new Map();
  const ICON_PREVIEW_INFLIGHT = new Map();

  function deriveSlugFromPrettyPath() {
    const raw = (window.location.pathname || "").trim();
    if (!raw) return "";
    const p = raw.replace(/\/+$/, "") || "/";
    // When browsing /html_pages/*.html, slug must come from query-string (or defaults).
    if (p.includes("/html_pages/") || p.endsWith(".html")) return "";
    const parts = p.split("/").filter(Boolean);
    if (!parts.length) return "";
    return String(parts[parts.length - 1] || "").trim();
  }


  function getSlugFromQueryOrPath(defaultSlug) {
    const sp = new URLSearchParams(window.location.search);
    const fromQuery = (sp.get("slug") || "").trim();
    if (fromQuery) return fromQuery;
    const fromPath = deriveSlugFromPrettyPath();
    if (fromPath) return fromPath;
    return (defaultSlug || "").trim();
  }


  function safeRun(label, fn) {
    try {
      fn();
    } catch (e) {
      // Non-blocking; keep the page usable.
      console.error(`[CMS_ADAPTER] ${label} failed`, e);
    }
  }


  async function fetchJson(url) {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return await res.json();
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
    if (media.url) {
      const fmts = media.formats || {};
      return (
        (fmts.small && fmts.small.url) ||
        (fmts.thumbnail && fmts.thumbnail.url) ||
        (fmts.medium && fmts.medium.url) ||
        media.url
      );
    }
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


  function applyHeroBackground(el, media) {
    if (!el || !media) return;
    const url = resolveMediaUrl(media);
    if (!url) return;
    const abs = url.startsWith("http") ? url : `${STRAPI_BASE}${url}`;
    el.style.backgroundImage = `url("${abs}")`;
  }


  function clearNode(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }


  function resolveAnyMediaUrl(media) {
    const u = resolveMediaUrl(media);
    if (!u) return null;
    return u.startsWith("http") ? u : `${STRAPI_BASE}${u}`;
  }

  function normalizeIconKey(name) {
    return String(name || "").trim();
  }

  function isCustomIconName(name) {
    const n = String(name || "").toLowerCase();
    if (!n) return false;
    return (
      n.includes("svgviewer_") ||
      n.startsWith("inline_svg_") ||
      n.startsWith("nav_") ||
      n.startsWith("norm_") ||
      n.startsWith("mgts_") ||
      n.startsWith("media_")
    );
  }

  async function fetchIconPreviewByName(name) {
    const key = normalizeIconKey(name);
    if (!key) return null;
    if (ICON_PREVIEW_CACHE.has(key)) return ICON_PREVIEW_CACHE.get(key);
    if (ICON_PREVIEW_INFLIGHT.has(key)) return ICON_PREVIEW_INFLIGHT.get(key);
    const url = `${STRAPI_BASE}/api/icons?filters[name][$eq]=${encodeURIComponent(
      key
    )}&populate=preview`;
    const req = fetchJson(url)
      .then((json) => {
        const item = Array.isArray(json?.data) ? json.data[0] : null;
        const preview = item?.preview || item?.attributes?.preview || null;
        const abs = resolveAnyMediaUrl(preview);
        ICON_PREVIEW_CACHE.set(key, abs || null);
        return abs || null;
      })
      .catch(() => {
        ICON_PREVIEW_CACHE.set(key, null);
        return null;
      })
      .finally(() => {
        ICON_PREVIEW_INFLIGHT.delete(key);
      });
    ICON_PREVIEW_INFLIGHT.set(key, req);
    return req;
  }

  function ensureIconPreviewByName(name) {
    return fetchIconPreviewByName(name);
  }

  function assignImageSourceWithFallback(img, url) {
    if (!img || !url) return;
    const candidates = [];
    const push = (val) => {
      if (val && !candidates.includes(val)) candidates.push(val);
    };
    push(url);
    const tryBase = (base) => {
      try {
        const u = new URL(url);
        push(`${base}${u.pathname}${u.search}`);
      } catch {
        if (url.startsWith("/")) push(`${base}${url}`);
      }
    };
    ["http://localhost:1337", "http://127.0.0.1:1337"].forEach(tryBase);
    let idx = 0;
    img.onerror = () => {
      idx += 1;
      if (idx < candidates.length) {
        img.src = candidates[idx];
      } else {
        img.onerror = null;
      }
    };
    img.src = candidates[0];
  }


  function resolveIconMediaUrl(icon) {
    if (!icon) return null;
    if (typeof icon === "string") {
      const key = normalizeIconKey(icon);
      if (!key) return null;
      if (ICON_PREVIEW_CACHE.has(key)) return ICON_PREVIEW_CACHE.get(key);
      if (isCustomIconName(key)) {
        fetchIconPreviewByName(key);
      }
      return null;
    }
    const preview =
      icon.preview ||
      icon.previewImage ||
      (icon.data && icon.data.attributes && icon.data.attributes.preview) ||
      (icon.attributes && icon.attributes.preview) ||
      (icon.data && icon.data.preview) ||
      null;
    if (!preview) return null;
    return resolveAnyMediaUrl(preview);
  }


  function hrefToSlug(href) {
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


  function toPrettyRoute(slug) {
    const s = String(slug || "")
      .trim()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
    if (!s) return "/";
    // Encode segments, but keep "/" separators intact.
    const parts = s.split("/").filter(Boolean);
    const encoded = parts.map((p) => encodeURIComponent(p));
    return `/${encoded.join("/")}/`;
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


  function slugifyId(text) {
    if (!text) return "";
    return String(text)
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }


  function normalizeSlug(value) {
    return String(value || "").trim().replace(/^\/+|\/+$/g, "");
  }


  function slugVariants(value) {
    const s = normalizeSlug(value);
    if (!s) return [];
    const base = s.split("/").filter(Boolean).pop() || s;
    const underscored = s.replace(/\//g, "_");
    const slashed = s.replace(/_/g, "/");
    const baseUnderscored = base.replace(/\//g, "_");
    return [s, base, underscored, slashed, baseUnderscored].filter(Boolean);
  }


  function extractSlug(rawHref) {
    if (!rawHref) return "";
    try {
      const u = new URL(rawHref, window.location.origin);
      const qsSlug = (u.searchParams.get("slug") || "").trim();
      if (qsSlug) return qsSlug;
      return hrefToSlug(u.pathname || "");
      } catch {
      return hrefToSlug(rawHref);
    }
  }


  function pickSidebarIcon(label) {
    const t = String(label || "").toLowerCase();
    if (t.includes("документ")) return "description";
    if (t.includes("контакт") || t.includes("связ")) return "call";
    if (t.includes("обрат") || t.includes("опрос")) return "chat";
    if (t.includes("комплаен") || t.includes("этик")) return "verified_user";
    if (t.includes("услуг") || t.includes("сервис")) return "hub";
    if (t.includes("новост")) return "newspaper";
    if (t.includes("истор")) return "history";
    return "lan";
  }

  function resolveSidebarIconName(icon) {
    if (!icon) return "";
    if (typeof icon === "string") return icon.trim();
    if (typeof icon === "object") {
      const name =
        icon.name ||
        icon.key ||
        icon.iconName ||
        icon.iconSymbol ||
        (icon.data &&
          (icon.data.name ||
            icon.data.key ||
            (icon.data.attributes && (icon.data.attributes.name || icon.data.attributes.key)))) ||
        "";
      return typeof name === "string" ? name.trim() : "";
    }
    return "";
  }

  function makeSidebarLink({ label, href, active, indent = 0, icon }) {
      const a = document.createElement("a");
    a.href = href || "#";
      a.className =
      "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-display";
    a.classList.add(
      "text-slate-700",
      "dark:text-slate-300",
      "hover:bg-slate-100",
      "dark:hover:bg-[#27303a]"
    );
    if (indent) a.classList.add("pl-6");
    if (active) {
      a.classList.add("bg-primary/10", "text-primary", "border-l-4", "border-primary");
      a.classList.add("dark:text-primary");
      a.setAttribute("aria-current", "page");
    }

    let iconEl = null;
    const iconUrl = resolveIconMediaUrl(icon);
    if (iconUrl) {
      iconEl = document.createElement("img");
      assignImageSourceWithFallback(iconEl, iconUrl);
      iconEl.alt = label || "";
      iconEl.className = "w-5 h-5 object-contain mgts-nav-icon";
      iconEl.loading = "lazy";
      iconEl.decoding = "async";
      if (active) iconEl.classList.add("is-active");
      } else {
      iconEl = document.createElement("span");
      iconEl.className = "material-symbols-outlined text-xl mgts-nav-icon";
      const iconName = resolveSidebarIconName(icon) || pickSidebarIcon(label);
      iconEl.textContent = iconName || "lan";
      if (active) {
        iconEl.classList.add("text-primary");
          } else {
        iconEl.classList.add("group-hover:text-primary");
      }
    }

    const text = document.createElement("span");
    text.className = active ? "text-sm font-bold font-display" : "text-sm font-medium font-display";
    text.textContent = label || "Link";
    a.appendChild(iconEl);
    a.appendChild(text);
    return a;
  }


  function makeSidebarGroupTitle(label, { indent = 0 } = {}) {
        const d = document.createElement("div");
    d.textContent = label || "Group";
    d.className =
      "text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-2 mt-5 font-display";
    if (indent) d.classList.add("pl-6");
    return d;
  }


  function ensureGlobalContrastStyles() {
    if (document.getElementById("mgts-global-contrast-styles")) return;
    const style = document.createElement("style");
    style.id = "mgts-global-contrast-styles";
    style.textContent = `
      html.dark .bg-white\\/5 { background-color: rgba(255, 255, 255, 0.08) !important; }
      html.dark .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.14) !important; }
      html.dark .bg-black\\/20 { background-color: rgba(0, 0, 0, 0.35) !important; }
      html.dark .bg-slate-900\\/50 { background-color: rgba(15, 23, 42, 0.6) !important; }
      html.dark .border-white\\/10 { border-color: rgba(255, 255, 255, 0.18) !important; }
      html.dark .border-white\\/20 { border-color: rgba(255, 255, 255, 0.28) !important; }
      html.dark .border-slate-200 { border-color: rgba(255, 255, 255, 0.18) !important; }
      html.dark .border-slate-800 { border-color: rgba(255, 255, 255, 0.14) !important; }
      html.dark .text-slate-500 { color: rgba(226, 232, 240, 0.72) !important; }
      html.dark .text-slate-600 { color: rgba(226, 232, 240, 0.8) !important; }
      html.dark .text-white\\/60 { color: rgba(248, 250, 252, 0.78) !important; }
      html.dark .text-white\\/70 { color: rgba(248, 250, 252, 0.86) !important; }
      html.dark .text-white\\/80 { color: rgba(248, 250, 252, 0.92) !important; }
      html.dark .glass-panel,
      html.dark .glass-card,
      html.dark .section-table,
      html.dark .files-table,
      html.dark .history-timeline,
      html.dark .crm-cards,
      html.dark .section-map,
      html.dark .form-glass {
        border-color: rgba(255, 255, 255, 0.18) !important;
        background-color: rgba(15, 23, 42, 0.55) !important;
      }
      .mgts-nav-icon {
        color: rgba(248, 250, 252, 0.92);
        opacity: 0.9;
        transition: transform 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
      }
      .group:hover .mgts-nav-icon {
        opacity: 1;
        transform: translateY(-1px) scale(1.06);
        filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.45));
      }
      .mgts-nav-icon.is-active {
        opacity: 1;
        filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
      }
      [data-deepnav-sidebar] .mgts-nav-icon {
        color: #0066cc !important;
        opacity: 1 !important;
      }
      [data-deepnav-sidebar] img.mgts-nav-icon {
        filter: brightness(0) saturate(100%) invert(43%) sepia(98%) saturate(4900%) hue-rotate(198deg) brightness(102%) contrast(101%) !important;
      }
      html.dark input,
      html.dark textarea,
      html.dark select {
        border-color: rgba(255, 255, 255, 0.22) !important;
      }
      html.dark input::placeholder,
      html.dark textarea::placeholder {
        color: rgba(226, 232, 240, 0.6) !important;
      }
    `;
    document.head.appendChild(style);
  }


  function resolveTreeForSlug(tree, slugValue) {
    const items = Array.isArray(tree?.items) ? tree.items : [];
    const matches = (href) => {
      const slug2 = extractSlug(href);
      if (!slug2) return false;
      const targets = new Set(slugVariants(slugValue));
      return slugVariants(slug2).some((s) => targets.has(s));
    };
    for (const it of items) {
      if (!it) continue;
      const isLinkLike = it.kind === "link" || (!it.kind && it.href);
      if (isLinkLike && matches(it.href)) return true;
      if (it.kind === "group") {
        const children = Array.isArray(it.children) ? it.children : [];
        if (children.some((ch) => matches(ch?.href))) return true;
      }
    }
    return false;
  }


  async function initSidebar(page, root) {
    if (!root) root = document;
    const sidebar = root.querySelector("[data-deepnav-sidebar]");
    if (sidebar) sidebar.classList.add("font-display");
    const contentWrap =
      root.querySelector("[data-cms-content]") ||
      root.querySelector("[data-doc-content]") ||
      root.querySelector("[data-form-content]") ||
      (sidebar && sidebar.parentElement ? sidebar.parentElement.querySelector(":scope > div") : null);

    const updateSidebarLayout = (on) => {
      if (!sidebar) return;
      sidebar.classList.toggle("hidden", !on);
      if (contentWrap && contentWrap instanceof HTMLElement) {
        if (on) {
          contentWrap.style.gridColumn = "";
          contentWrap.classList.remove("lg:col-span-12");
          contentWrap.classList.add("lg:col-span-9");
        } else {
          contentWrap.style.gridColumn = "1 / -1";
          contentWrap.style.minWidth = "0";
          contentWrap.classList.remove("lg:col-span-9");
          contentWrap.classList.add("lg:col-span-12");
        }
      }
    };

    const tryRenderTabsSidebar = () => {
      if (!sidebar || !Array.isArray(page.sections)) return false;
      const tabSection = page.sections.find((s) => Array.isArray(s?.tabs) && s.tabs.length);
      if (!tabSection) return false;
      updateSidebarLayout(true);
      const t = sidebar.querySelector("[data-deepnav-title]");
      if (t) {
        t.textContent = tabSection.title || page.title || "Раздел";
        t.classList.add("font-display");
      }
      const nav = sidebar.querySelector("[data-deepnav-nav]");
      if (!nav) return true;
      nav.classList.add("font-display");
      clearNode(nav);
      const tabs = Array.isArray(tabSection.tabs) ? tabSection.tabs : [];
      const hasActive = tabs.some((tab) => tab && tab.isActive);
      tabs.forEach((tab, idx) => {
        if (!tab) return;
        nav.appendChild(
          makeSidebarLink({
            label: tab.title,
            href: "#",
            active: tab.isActive || (!hasActive && idx === 0),
          })
        );
      });
      return true;
    };

    const slug = getSlugFromQueryOrPath("");
    let sidebarRendered = false;

    if (page.deepNavKey && sidebar) {
      const navUrl = `${STRAPI_BASE}/api/navigation/deep-nav/${encodeURIComponent(String(page.deepNavKey))}`;
      try {
      const navJson = await fetchJson(navUrl);
      const tree = navJson && navJson.data ? navJson.data : null;
      if (tree) {
          updateSidebarLayout(true);
        const t = sidebar.querySelector("[data-deepnav-title]");
        if (t) {
          t.textContent = tree.title || "Раздел";
          t.classList.add("font-display");
        }
        const nav = sidebar.querySelector("[data-deepnav-nav]");
        if (nav) {
          nav.classList.add("font-display");
          clearNode(nav);
          const items = Array.isArray(tree.items) ? tree.items : [];
            let hasActive = false;
            let hashActiveUsed = false;
          for (const it of items) {
            if (!it) continue;
            if (it.kind === "link") {
                const isActive = resolveTreeForSlug({ items: [it] }, slug);
                if (isActive) hasActive = true;
                const href = it.href || "#";
                const shouldActivateHash = !hasActive && !hashActiveUsed && href.startsWith("#");
                if (shouldActivateHash) hashActiveUsed = true;
                nav.appendChild(
                  makeSidebarLink({
                    label: it.label,
                    href,
                    active: isActive || shouldActivateHash,
                    icon: it.icon,
                  })
                );
            } else if (it.kind === "group") {
                nav.appendChild(makeSidebarGroupTitle(it.label));
              const children = Array.isArray(it.children) ? it.children : [];
              for (const ch of children) {
                  const isActive = resolveTreeForSlug({ items: [ch] }, slug);
                  if (isActive) hasActive = true;
                  const href = ch.href || "#";
                  const shouldActivateHash = !hasActive && !hashActiveUsed && href.startsWith("#");
                  if (shouldActivateHash) hashActiveUsed = true;
                  nav.appendChild(
                    makeSidebarLink({
                      label: ch.label,
                      href,
                      active: isActive || shouldActivateHash,
                      indent: 1,
                      icon: ch.icon,
                    })
                  );
                }
              }
            }
          }
          sidebarRendered = true;
        }
      } catch (e) {
        console.warn("[Sidebar] failed to load deep-nav:", e);
      }
    }

    if (!sidebarRendered) {
      sidebarRendered = tryRenderTabsSidebar();
    }
    if (!sidebarRendered) {
      updateSidebarLayout(false);
    }
  }

  ensureGlobalContrastStyles();


  window.MGTS_CMS_ADAPTER_CORE = {
    PAGE: PAGE,
    STRAPI_BASE: STRAPI_BASE,
    getPageName: getPageName,
    deriveSlugFromPrettyPath: deriveSlugFromPrettyPath,
    getSlugFromQueryOrPath: getSlugFromQueryOrPath,
    safeRun: safeRun,
    fetchJson: fetchJson,
    formatDateRu: formatDateRu,
    setText: setText,
    setBgImage: setBgImage,
    resolveMediaUrl: resolveMediaUrl,
    applyHeroBackground: applyHeroBackground,
    clearNode: clearNode,
    resolveAnyMediaUrl: resolveAnyMediaUrl,
    resolveIconMediaUrl: resolveIconMediaUrl,
    assignImageSourceWithFallback: assignImageSourceWithFallback,
    ensureIconPreviewByName: ensureIconPreviewByName,
    isCustomIconName: isCustomIconName,
    hrefToSlug: hrefToSlug,
    toPrettyRoute: toPrettyRoute,
    hashString: hashString,
    pickPlaceholderImage: pickPlaceholderImage,
    safeParseJsonArray: safeParseJsonArray,
    slugifyId: slugifyId,
    normalizeSlug: normalizeSlug,
    slugVariants: slugVariants,
    extractSlug: extractSlug,
    makeSidebarLink: makeSidebarLink,
    makeSidebarGroupTitle: makeSidebarGroupTitle,
    resolveTreeForSlug: resolveTreeForSlug,
    initSidebar: initSidebar
  };
})();

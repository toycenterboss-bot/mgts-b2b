(function () {
  "use strict";

  const api = window.MGTS_CMS_LOADER;
  if (!api) return;
  const { register, utils } = api;
  const { STRAPI_BASE, fetchJson, unwrapApiData, normalizeCmsHref } = utils;

  const ensureMegaMenuContrastStyles = () => {
    if (document.getElementById("mgts-mega-contrast-styles")) return;
    const style = document.createElement("style");
    style.id = "mgts-mega-contrast-styles";
    style.textContent = `
      [data-mega-panel] {
        background-color: rgba(9, 14, 22, 0.96) !important;
        border-color: rgba(255, 255, 255, 0.18) !important;
      }
      [data-mega-panel] .border-r {
        border-right-color: rgba(255, 255, 255, 0.16) !important;
      }
      [data-mega-panel] .border,
      [data-mega-panel] .border-slate-200,
      [data-mega-panel] .border-slate-800 {
        border-color: rgba(255, 255, 255, 0.18) !important;
      }
      [data-mega-panel] .rounded-xl,
      [data-mega-panel] .rounded-2xl {
        background-color: rgba(15, 23, 42, 0.6) !important;
        border-color: rgba(255, 255, 255, 0.2) !important;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04);
      }
      [data-mega-panel] .rounded-xl:hover,
      [data-mega-panel] .rounded-2xl:hover {
        background-color: rgba(255, 255, 255, 0.12) !important;
        border-color: rgba(255, 255, 255, 0.28) !important;
      }
      [data-mega-panel] [class*="bg-white"] {
        background-color: rgba(15, 23, 42, 0.6) !important;
      }
      [data-mega-panel] [class*="bg-slate-900"] {
        background-color: rgba(15, 23, 42, 0.6) !important;
      }
      [data-mega-panel] [class*="bg-black"] {
        background-color: rgba(15, 23, 42, 0.6) !important;
      }
      [data-mega-root] [data-mega-trigger] {
        color: rgba(226, 232, 240, 0.82);
      }
      [data-mega-root] [data-mega-trigger]:hover {
        color: #ffffff;
      }
      [data-mega-root] [data-mega-trigger][aria-expanded="true"] {
        color: #ffffff;
        border-color: currentColor;
        text-shadow: 0 0 6px rgba(255, 255, 255, 0.35);
      }
      [data-mega-panel] [data-mega-category] {
        color: rgba(226, 232, 240, 0.78);
        border: 1px solid rgba(255, 255, 255, 0.18);
        background-color: rgba(15, 23, 42, 0.55);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
      }
      [data-mega-panel] [data-mega-category]:hover {
        background-color: rgba(255, 255, 255, 0.16);
        border-color: rgba(255, 255, 255, 0.38);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2), 0 6px 16px rgba(0, 0, 0, 0.35);
        color: #ffffff;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      [data-mega-panel] [data-mega-category][data-mega-active="1"] {
        color: #ffffff;
        background-color: rgba(37, 99, 235, 0.2);
        border-color: rgba(37, 99, 235, 0.45);
        box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.25);
      }
      [data-mega-panel] [data-mega-category] .material-symbols-outlined {
        color: rgba(248, 250, 252, 0.85);
        opacity: 1;
      }
      [data-mega-panel] .material-symbols-outlined {
        color: rgba(248, 250, 252, 0.85);
      }
      [data-mega-panel] .mgts-nav-icon {
        opacity: 0.9;
        transition: transform 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
      }
      [data-mega-panel] a:hover .mgts-nav-icon,
      [data-mega-panel] .group:hover .mgts-nav-icon {
        opacity: 1;
        transform: translateY(-1px) scale(1.06);
        filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.45));
      }
      [data-mega-panel] h3 {
        color: rgba(226, 232, 240, 0.82);
      }
      [data-mega-panel] h4 {
        color: #f8fafc;
      }
      [data-mega-panel] p {
        color: rgba(226, 232, 240, 0.7);
      }
      html.light [data-mega-panel] .border,
      html.light [data-mega-panel] .border-slate-200,
      html.light [data-mega-panel] .border-slate-800 {
        border-color: rgba(15, 23, 42, 0.12) !important;
      }
      html.light [data-mega-panel] {
        background-color: #ffffff !important;
        border-color: rgba(15, 23, 42, 0.08) !important;
      }
      html.light [data-mega-panel] .border-r {
        border-right-color: rgba(15, 23, 42, 0.12) !important;
      }
      html.light [data-mega-panel] .rounded-xl,
      html.light [data-mega-panel] .rounded-2xl {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }
      html.light [data-mega-panel] .rounded-xl:hover,
      html.light [data-mega-panel] .rounded-2xl:hover {
        background-color: #f8fafc !important;
        border-color: #cbd5f5 !important;
      }
      html.light [data-mega-panel] [class*="bg-white"],
      html.light [data-mega-panel] [class*="bg-slate-900"],
      html.light [data-mega-panel] [class*="bg-black"] {
        background-color: #ffffff !important;
      }
      html.light [data-mega-root] [data-mega-trigger] {
        color: rgba(30, 41, 59, 0.85);
      }
      html.light [data-mega-root] [data-mega-trigger]:hover {
        color: #0f172a;
      }
      html.light [data-mega-root] [data-mega-trigger][aria-expanded="true"] {
        color: #0f172a;
        text-shadow: 0 0 6px rgba(15, 23, 42, 0.12);
      }
      html.light [data-mega-panel] [data-mega-category] {
        color: #0f172a;
        border: 1px solid rgba(15, 23, 42, 0.12);
        background-color: #f8fafc;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
      }
      html.light [data-mega-panel] [data-mega-category]:hover {
        background-color: #eef2f7;
        border-color: rgba(15, 23, 42, 0.22);
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.1), 0 6px 16px rgba(15, 23, 42, 0.12);
        color: #0f172a;
      }
      html.light [data-mega-panel] [data-mega-category][data-mega-active="1"] {
        background-color: #e2e8f0;
        border-color: #94a3b8;
        color: #0f172a;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
      }
      html.light [data-mega-panel] [data-mega-category] .material-symbols-outlined,
      html.light [data-mega-panel] .material-symbols-outlined {
        color: #0f172a;
      }
      html.light [data-mega-panel] .mgts-nav-icon {
        opacity: 0.95;
        filter: brightness(0) saturate(100%) invert(43%) sepia(98%) saturate(4900%) hue-rotate(198deg) brightness(102%) contrast(101%);
      }
      html.light [data-mega-panel] a:hover .mgts-nav-icon,
      html.light [data-mega-panel] .group:hover .mgts-nav-icon {
        filter: brightness(0) saturate(100%) invert(37%) sepia(90%) saturate(3340%) hue-rotate(198deg) brightness(98%) contrast(105%);
      }
      html.light [data-mega-panel] h3,
      html.light [data-mega-panel] h4 {
        color: #0f172a;
      }
      html.light [data-mega-panel] p {
        color: #475569;
      }
      html.light [data-mega-panel] .text-slate-500 {
        color: #475569 !important;
      }
      html.light [data-mega-panel] .text-slate-400 {
        color: #64748b !important;
      }
      html.light [data-mega-panel] .bg-gradient-to-br {
        color: #ffffff !important;
      }
      html.light [data-mega-panel] .bg-gradient-to-br .text-white {
        color: #ffffff !important;
      }
      html.light [data-mega-panel] .bg-gradient-to-br .text-blue-100 {
        color: #dbeafe !important;
      }
      [data-mega-panel] [data-mega-cta-title],
      html.light [data-mega-panel] [data-mega-cta-title] {
        color: #ffffff !important;
      }
    `;
    document.head.appendChild(style);
  };

  // Mega-menu content and behavior from megaMenus.
  register({
    id: "canonical:megaMenuContent",
    scope: "document",
    priority: 110,
    init: function () {
      (async () => {
        ensureMegaMenuContrastStyles();
        let nav = null;
        try {
          const navJson = await fetchJson(`${STRAPI_BASE}/api/navigation`);
          nav = unwrapApiData(navJson);
        } catch (e) {
          console.warn("[MGTS_CMS_LOADER] navigation fetch failed:", e);
        }

        if (!nav) return;

        const mega = document.querySelector("[data-mega-panel]");
        const megaMenus = Array.isArray(nav.megaMenus) ? nav.megaMenus.filter(Boolean) : [];
        if (!mega || !megaMenus.length) return;

        const titleEl = mega.querySelector("[data-mega-title]");
        const sectionsRoot = mega.querySelector("[data-mega-sections]");
        const headerBlock = document.querySelector('[data-stitch-block="header_and_mega_menu"]');
        const headerRoot = headerBlock
          ? headerBlock.querySelector("header[data-mega-root]") || headerBlock.querySelector("header")
          : null;
        const triggersRoot = headerRoot ? headerRoot.querySelector("nav[data-mega-triggers]") : null;
        const getTriggers = () =>
          triggersRoot ? Array.from(triggersRoot.querySelectorAll("[data-mega-trigger]")) : [];

        const resolveMenuHref = (menu) => {
          const raw =
            menu && (menu.href || menu.link || menu.url || menu.targetUrl || menu.target || "");
          const href = String(raw || "").trim();
          if (href) {
            return typeof normalizeCmsHref === "function" ? normalizeCmsHref(href) : href;
          }
          const menuId = String(menu?.menuId || "").trim();
          if (!menuId) return "#";
          const landingIds = new Set([
            "services",
            "developers",
            "operators",
            "government",
            "partners",
            "business",
          ]);
          if (landingIds.has(menuId)) {
            const legacy = `/html_pages/tpl_segment_landing.html?slug=${menuId}`;
            return typeof normalizeCmsHref === "function" ? normalizeCmsHref(legacy) : legacy;
          }
          return "#";
        };

        // Ensure header nav triggers use titles from Strapi megaMenus.
        if (triggersRoot) {
          const triggers = Array.from(triggersRoot.querySelectorAll("[data-mega-trigger]"));
          if (triggers.length >= megaMenus.length && triggers.length > 0) {
            for (let i = 0; i < megaMenus.length; i++) {
              const m = megaMenus[i];
              const menuId = String(m.menuId || "").trim();
              const title = String(m.title || menuId || "").trim();
              const t = triggers[i];
              if (!menuId || !title || !t) continue;
              t.setAttribute("data-mega-key", menuId);
              t.textContent = title;
              const targetHref = resolveMenuHref(m);
              t.setAttribute("href", targetHref || "#");
            }
          } else {
            triggersRoot.innerHTML = "";
            megaMenus.forEach((m, idx) => {
              const menuId = String(m.menuId || "").trim();
              const title = String(m.title || menuId || "").trim();
              if (!menuId || !title) return;
              const a = document.createElement("a");
              a.className =
                idx === 0
                  ? "text-sm font-semibold border-b-2 border-primary pb-1 text-white"
                  : "text-sm font-semibold text-slate-200/80 hover:text-white transition-colors pb-1 border-b-2 border-transparent";
              a.setAttribute("data-mega-trigger", "");
              a.setAttribute("data-mega-key", menuId);
              a.setAttribute("aria-expanded", "false");
              a.setAttribute("aria-controls", mega.id || "mgts-mega-panel");
              a.href = resolveMenuHref(m);
              a.textContent = title;
              triggersRoot.appendChild(a);
            });
          }
        }
        const legacyCat = mega.querySelector("[data-mega-category]");
        const legacyParent = legacyCat ? legacyCat.parentElement : null;
        if (legacyParent) {
          legacyParent.innerHTML = "";
        }

        if (sectionsRoot) {
          sectionsRoot.innerHTML = "";
          const outerGrid = sectionsRoot.closest(".grid");
          if (outerGrid) {
            outerGrid.classList.remove("gap-10");
            outerGrid.classList.add("gap-6");
          }
          sectionsRoot.classList.remove("grid", "grid-cols-2", "gap-6");

          const resolveIconName = (val) => {
            if (!val) return "";
            if (typeof val === "string") return val;
            if (typeof val === "object") {
              return (
                val.name ||
                val.key ||
                val.iconName ||
                val.iconSymbol ||
                (val.data &&
                  (val.data.name ||
                    val.data.key ||
                    (val.data.attributes &&
                      (val.data.attributes.name || val.data.attributes.key)))) ||
                ""
              );
            }
            return "";
          };

          const ICON_PREVIEW_CACHE = new Map();
          const ICON_PREVIEW_INFLIGHT = new Map();

          const normalizeIconKey = (name) => String(name || "").trim();
          const isCustomIconName = (name) => {
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
          };

          const fetchIconPreviewByName = (name) => {
            const key = normalizeIconKey(name);
            if (!key) return Promise.resolve(null);
            if (ICON_PREVIEW_CACHE.has(key)) return Promise.resolve(ICON_PREVIEW_CACHE.get(key));
            if (ICON_PREVIEW_INFLIGHT.has(key)) return ICON_PREVIEW_INFLIGHT.get(key);
            const url = `${STRAPI_BASE}/api/icons?filters[name][$eq]=${encodeURIComponent(
              key
            )}&populate=preview`;
            const req = fetchJson(url)
              .then((json) => {
                const item = Array.isArray(json?.data) ? json.data[0] : null;
                const preview = item?.preview || item?.attributes?.preview || null;
                const raw =
                  preview?.url ||
                  preview?.data?.attributes?.url ||
                  preview?.attributes?.url ||
                  "";
                const abs = raw ? (raw.startsWith("http") ? raw : `${STRAPI_BASE}${raw}`) : null;
                ICON_PREVIEW_CACHE.set(key, abs);
                return abs;
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
          };
          const resolveIconPreviewUrl = (icon) => {
            if (!icon) return "";
            const preview =
              icon.preview ||
              icon.previewImage ||
              icon?.data?.attributes?.preview ||
              icon?.attributes?.preview ||
              icon?.data?.preview ||
              null;
            if (!preview) return "";
            const url =
              preview?.url ||
              preview?.data?.attributes?.url ||
              preview?.attributes?.url ||
              "";
            if (!url) return "";
            return url.startsWith("http") ? url : `${STRAPI_BASE}${url}`;
          };

          const assignImageSourceWithFallback = (img, url) => {
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
          };

          const buildIconNode = (icon, fallback, spanClass, imgClass, alt) => {
            const url = resolveIconPreviewUrl(icon);
            if (url) {
              const img = document.createElement("img");
              assignImageSourceWithFallback(img, url);
              img.alt = alt || "";
              img.className = imgClass || "w-6 h-6 object-contain";
              img.loading = "lazy";
              img.decoding = "async";
              return img;
            }
            const name = typeof icon === "string" ? String(icon).trim() : "";
            const isCustom = name && isCustomIconName(name);
            const span = document.createElement("span");
            span.className = spanClass || "material-symbols-outlined";
            span.textContent = isCustom ? "image" : fallback || "";
            if (isCustom) {
              fetchIconPreviewByName(name)
                .then((resolvedUrl) => {
                  if (!resolvedUrl || !span.parentElement) return;
                  const img = document.createElement("img");
                  assignImageSourceWithFallback(img, resolvedUrl);
                  img.alt = alt || "";
                  img.className = imgClass || "w-6 h-6 object-contain";
                  img.loading = "lazy";
                  img.decoding = "async";
                  span.replaceWith(img);
                })
                .catch(() => {});
            }
            return span;
          };

          // Fix CTA height so it doesn't depend on mega-menu height.
          const ctaCol = sectionsRoot.closest(".grid")?.querySelector(".col-span-3:last-child");
          if (ctaCol) {
            ctaCol.setAttribute("data-mega-cta", "");
            const ctaCard =
              ctaCol.querySelector(".bg-gradient-to-br") ||
              ctaCol.querySelector(".rounded-2xl") ||
              ctaCol.querySelector(".rounded-xl") ||
              ctaCol.firstElementChild;
            if (ctaCard instanceof HTMLElement) {
              ctaCard.style.height = "280px";
              ctaCard.style.minHeight = "280px";
              ctaCard.style.maxHeight = "280px";
            }
            ctaCol.querySelectorAll(".h-full").forEach((el) => {
              if (el instanceof HTMLElement) {
                el.classList.remove("h-full");
                el.style.height = "280px";
                el.style.minHeight = "280px";
                el.style.maxHeight = "280px";
              }
            });

            // Apply CTA content from Strapi if provided.
            const cta = nav.megaMenuCta;
            if (cta && cta.isVisible === false) {
              ctaCol.classList.add("hidden");
            } else if (cta) {
              ctaCol.classList.remove("hidden");
              const titleEl = ctaCol.querySelector("h4");
              if (titleEl) {
                titleEl.setAttribute("data-mega-cta-title", "");
                if (cta.title) titleEl.textContent = String(cta.title);
              }
              const descEl = ctaCol.querySelector("p");
              if (descEl && cta.description) descEl.textContent = String(cta.description);

              const btn = ctaCol.querySelector("button, a");
              if (btn && cta.buttonText) btn.textContent = String(cta.buttonText);
              if (btn && cta.buttonHref) {
                const rawCtaHref = String(cta.buttonHref);
                const nextHref =
                  typeof normalizeCmsHref === "function" ? normalizeCmsHref(rawCtaHref) : rawCtaHref;
                if (btn.tagName && btn.tagName.toLowerCase() === "a") {
                  btn.setAttribute("href", nextHref);
                } else {
                  btn.setAttribute("data-mega-cta-href", nextHref);
                  if (!btn.__megaCtaBound) {
                    btn.__megaCtaBound = true;
                    btn.addEventListener("click", () => {
                      try {
                        window.location.assign(nextHref);
                      } catch {
                        // ignore
                      }
                    });
                  }
                }
              }

              const phoneWrap = ctaCol.querySelector(".flex.items-center");
              if (phoneWrap) {
                const iconEl = phoneWrap.querySelector(".material-symbols-outlined");
                const phoneIconName = resolveIconName(cta.phoneIcon);
                const phoneIconUrl = resolveIconPreviewUrl(cta.phoneIcon);
                let currentIcon = iconEl || null;
                if (phoneIconUrl) {
                  const img = buildIconNode(
                    cta.phoneIcon,
                    phoneIconName,
                    "material-symbols-outlined mgts-nav-icon",
                    "w-4 h-4 object-contain mgts-nav-icon",
                    "phone"
                  );
                  if (iconEl) {
                    iconEl.replaceWith(img);
                  } else {
                    phoneWrap.prepend(img);
                  }
                  currentIcon = img;
                } else if (phoneIconName) {
                  const node = buildIconNode(
                    cta.phoneIcon || phoneIconName,
                    phoneIconName,
                    "material-symbols-outlined mgts-nav-icon",
                    "w-4 h-4 object-contain mgts-nav-icon",
                    "phone"
                  );
                  if (iconEl) {
                    iconEl.replaceWith(node);
                  } else {
                    phoneWrap.prepend(node);
                  }
                  currentIcon = node;
                }
                const phoneText = cta.phoneText || nav.phoneDisplay || nav.phone || "";
                if (phoneText) {
                  // Preserve icon, replace text nodes
                  const nodes = Array.from(phoneWrap.childNodes).filter((n) => n !== currentIcon);
                  nodes.forEach((n) => n.remove());
                  phoneWrap.appendChild(document.createTextNode(String(phoneText)));
                }
              }

              const bgIconEl = ctaCol.querySelector(".absolute .material-symbols-outlined");
              const bgIconName = resolveIconName(cta.backgroundIcon);
              const bgIconUrl = resolveIconPreviewUrl(cta.backgroundIcon);
              if (bgIconUrl) {
                const img = buildIconNode(cta.backgroundIcon, bgIconName, "", "w-32 h-32 object-contain", "cta");
                if (bgIconEl && bgIconEl.parentElement) {
                  bgIconEl.parentElement.replaceChild(img, bgIconEl);
                }
              } else if (bgIconName) {
                const node = buildIconNode(cta.backgroundIcon || bgIconName, bgIconName, "", "w-32 h-32 object-contain", "cta");
                if (bgIconEl && bgIconEl.parentElement) {
                  bgIconEl.parentElement.replaceChild(node, bgIconEl);
                }
              }
            }
          }

          const resolveIcon = (lnk) => {
            const iconCandidate =
              resolveIconName(lnk.icon) ||
              (typeof lnk.iconName === "string" && lnk.iconName) ||
              (typeof lnk.iconSymbol === "string" && lnk.iconSymbol) ||
              "";
            if (iconCandidate) return iconCandidate;

            const label = String(lnk.label || lnk.title || "").toLowerCase();
            const href = String(lnk.href || lnk.url || lnk.link || lnk.slug || "").toLowerCase();
            const hay = `${label} ${href}`;
            const rules = [
              ["видеонаблю", "videocam"],
              ["скуд", "shield_lock"],
              ["асу", "settings"],
              ["аскуэ", "bolt"],
              ["сопряж", "sync_alt"],
              ["громкоговор", "campaign"],
              ["оповещ", "campaign"],
              ["оборудован", "memory"],
              ["документ", "description"],
              ["рамочн", "description"],
              ["закуп", "shopping_cart"],
              ["допуск", "rule"],
              ["реализац", "inventory_2"],
              ["тариф", "request_quote"],
              ["кабель", "settings_input_antenna"],
              ["проектирован", "engineering"],
              ["строитель", "construction"],
              ["присоедин", "sync_alt"],
              ["трафик", "sync_alt"],
              ["передач", "swap_horiz"],
              ["данн", "swap_horiz"],
              ["доступ", "vpn_key"],
              ["видео", "videocam"],
              ["связ", "call"],
              ["инфраструктур", "hub"],
              ["безопас", "shield"],
              ["компенсац", "payments"],
              ["цифров", "devices"],
              ["объект", "location_city"],
            ];
            for (const [needle, icon] of rules) {
              if (hay.includes(needle)) return icon;
            }
            return "bolt";
          };

          const resolveDesc = (lnk) =>
            String(
              lnk.description ||
                lnk.subtitle ||
                lnk.summary ||
                lnk.text ||
                lnk.caption ||
                ""
            ).trim();

          const renderCards = (menu, sectionIdx) => {
            const sections = Array.isArray(menu.sections) ? menu.sections.filter(Boolean) : [];
            const section = sections[sectionIdx] || sections[0] || null;
            const links = section && Array.isArray(section.links) ? section.links.filter(Boolean) : [];

            sectionsRoot.innerHTML = "";
            const grid = document.createElement("div");
            grid.className = "grid grid-cols-2 gap-6";

            links.forEach((lnk) => {
              const rawHref = String(lnk.href || lnk.url || lnk.link || lnk.slug || "").trim();
              const href =
                typeof normalizeCmsHref === "function" ? normalizeCmsHref(rawHref) : rawHref;
              const label = String(lnk.label || lnk.title || "").trim();
              const desc = resolveDesc(lnk);
              if (!href || !label) return;
              const a = document.createElement("a");
              a.className =
                "block flex gap-4 p-4 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-primary/50 transition-all cursor-pointer group";
              a.href = href;
              if (lnk.isExternal) {
                a.target = "_blank";
                a.rel = "noreferrer";
              }
              const iconName = resolveIcon(lnk);
              const iconWrap = document.createElement("div");
              iconWrap.className = "size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary";
              const iconEl = buildIconNode(
                lnk.icon,
                iconName,
                "material-symbols-outlined text-[28px] mgts-nav-icon",
                "w-7 h-7 object-contain mgts-nav-icon",
                label
              );
              iconWrap.appendChild(iconEl);

              const textWrap = document.createElement("div");
              const title = document.createElement("h4");
              title.className = "font-bold mb-1 group-hover:text-primary transition-colors";
              title.textContent = label;
              textWrap.appendChild(title);
              if (desc) {
                const p = document.createElement("p");
                p.className = "text-xs text-slate-500 leading-relaxed";
                p.textContent = desc;
                textWrap.appendChild(p);
              }

              a.appendChild(iconWrap);
              a.appendChild(textWrap);
              grid.appendChild(a);
            });

            sectionsRoot.appendChild(grid);
          };

          const renderSections = (menu) => {
            const sections = Array.isArray(menu.sections) ? menu.sections.filter(Boolean) : [];
            const cats = [];
            if (legacyParent) {
              legacyParent.innerHTML = "";
              sections.forEach((s, sIdx) => {
                const title = String(s.title || "").trim();
                if (!title) return;
                const cat = document.createElement("div");
                cat.setAttribute("data-mega-category", String(s.key || s.title || sIdx));
                cat.className =
                  sIdx === 0
                    ? "bg-primary/10 text-slate-900 dark:text-white p-3 rounded-lg flex items-center justify-between group cursor-pointer border border-primary/30"
                    : "text-slate-600 dark:text-slate-200/80 p-3 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors";
                cat.setAttribute("role", "button");
                cat.setAttribute("tabindex", "0");
                cat.innerHTML = `
                  <span class="font-bold">${title}</span>
                  <span class="material-symbols-outlined ${sIdx === 0 ? "" : "opacity-0 group-hover:opacity-100 transition-opacity"}">chevron_right</span>
                `;
                cats.push(cat);
                legacyParent.appendChild(cat);
              });
            }

            const setActive = (activeIdx) => {
              cats.forEach((cat, idx) => {
                  cat.className =
                    idx === activeIdx
                      ? "bg-primary/15 text-slate-900 dark:text-white p-3 rounded-lg flex items-center justify-between group cursor-pointer border border-primary/30"
                      : "text-slate-600 dark:text-slate-200/80 p-3 rounded-lg flex items-center justify-between group cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-transparent";
                cat.setAttribute("data-mega-active", idx === activeIdx ? "1" : "0");
                const arrow = cat.querySelector(".material-symbols-outlined");
                if (arrow) {
                  arrow.className = `material-symbols-outlined ${
                    idx === activeIdx ? "" : "opacity-0 group-hover:opacity-100 transition-opacity"
                  }`;
                }
              });
            };

            cats.forEach((cat, sIdx) => {
              cat.addEventListener("mouseenter", () => {
                setActive(sIdx);
                renderCards(menu, sIdx);
              });
              cat.addEventListener("click", () => {
                setActive(sIdx);
                renderCards(menu, sIdx);
              });
            });

            setActive(0);
            renderCards(menu, 0);
          };

          if (triggersRoot && !triggersRoot.__mgtsMegaNavGuard) {
            triggersRoot.__mgtsMegaNavGuard = true;
            triggersRoot.addEventListener("click", (e) => {
              const target = e.target && e.target.closest ? e.target.closest("[data-mega-trigger]") : null;
              if (!target) return;
              const href = target.getAttribute("href") || "";
              if (!href || href === "#") {
                e.preventDefault();
              }
            });
          }

          const menuById = new Map(
            megaMenus.map((m, idx) => [String(m.menuId || "").trim(), idx]).filter((x) => x[0])
          );

          const renderMenu = (menuIdx, menuKey) => {
            const idx = menuKey && menuById.has(menuKey) ? menuById.get(menuKey) : menuIdx;
            const menu = megaMenus[idx] || megaMenus[0];
            if (!menu) return;
            const title = String(menu.title || menu.menuId || "").trim();
            if (titleEl && title) titleEl.textContent = title;
            renderSections(menu);
          };

          getTriggers().forEach((t, idx) => {
            const key = String(t.getAttribute("data-mega-key") || "").trim();
            t.addEventListener("mouseenter", () => renderMenu(idx, key));
            t.addEventListener("focus", () => renderMenu(idx, key));
            t.addEventListener("click", () => renderMenu(idx, key));
          });

          renderMenu(0);
        }

        document.dispatchEvent(new CustomEvent("mgts:navigation-updated"));
      })();
    },
  });

  // Mega menu panel toggle.
  register({
    id: "canonical:megaMenu",
    scope: "document",
    priority: 100,
    init: function () {
      ensureMegaMenuContrastStyles();
      const mega = document.querySelector("[data-mega-panel]") || document.querySelector(".mega-menu-blur");
      if (!mega) return;

      const headerBlock = document.querySelector('[data-stitch-block="header_and_mega_menu"]');
      const headerRoot = headerBlock
        ? headerBlock.querySelector("header[data-mega-root]") || headerBlock.querySelector("header")
        : null;
      const triggersRoot = headerRoot ? headerRoot.querySelector("nav[data-mega-triggers]") : null;
      const getTriggers = () =>
        triggersRoot ? Array.from(triggersRoot.querySelectorAll("[data-mega-trigger]")) : [];
      const titleEl = mega.querySelector("[data-mega-title]");

      const open = () => {
        mega.classList.remove("hidden");
        mega.setAttribute("aria-hidden", "false");
      };
      const close = () => {
        mega.classList.add("hidden");
        mega.setAttribute("aria-hidden", "true");
        getTriggers().forEach((t) => t && t.setAttribute && t.setAttribute("aria-expanded", "false"));
      };

      // default: closed
      close();

      const root =
        mega.closest('[data-stitch-block="header_and_mega_menu"]') ||
        mega.closest('[data-stitch-block="header_and_mega_menu_alt"]') ||
        document;

      const keepOpenAreas = [
        mega,
        root.querySelector("[data-mega-triggers]"),
        root.querySelector("[data-mega-panel]"),
      ].filter(Boolean);

      const isInside = (target) => keepOpenAreas.some((node) => node && node.contains && node.contains(target));

      const bindTrigger = (t) => {
        if (!t) return;
        t.addEventListener("mouseenter", () => {
          getTriggers().forEach((x) => x && x.setAttribute && x.setAttribute("aria-expanded", "false"));
          t.setAttribute("aria-expanded", "true");
          if (titleEl) titleEl.textContent = String(t.textContent || "").trim();
          open();
        });
        t.addEventListener("focus", () => {
          getTriggers().forEach((x) => x && x.setAttribute && x.setAttribute("aria-expanded", "false"));
          t.setAttribute("aria-expanded", "true");
          if (titleEl) titleEl.textContent = String(t.textContent || "").trim();
          open();
        });
      };

      getTriggers().forEach(bindTrigger);

      // Close on outside hover/click.
      let closeTmr = 0;
      const scheduleClose = () => {
        window.clearTimeout(closeTmr);
        closeTmr = window.setTimeout(() => close(), 180);
      };
      const cancelClose = () => {
        window.clearTimeout(closeTmr);
      };

      keepOpenAreas.forEach((node) => {
        if (!node) return;
        node.addEventListener("mouseenter", cancelClose);
        node.addEventListener("mouseleave", scheduleClose);
      });

      document.addEventListener("mouseover", (e) => {
        const t = e.target;
        if (!isInside(t)) scheduleClose();
      });
      document.addEventListener("click", (e) => {
        const t = e.target;
        if (!isInside(t)) close();
      });
    },
  });
})();

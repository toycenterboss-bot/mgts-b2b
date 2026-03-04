(function () {
  "use strict";

  const api = window.MGTS_CMS_LOADER;
  if (!api) return;
  const { register, utils } = api;
  const { STRAPI_BASE, fetchJson, unwrapApiData, setTheme, getTheme, normalizeCmsHref } = utils;

  // Top menu in header: strictly from mainMenuItems.
  register({
    id: "canonical:topMenu",
    scope: "document",
    priority: 120,
    init: function () {
      (async () => {
        let nav = null;
        try {
          const navJson = await fetchJson(`${STRAPI_BASE}/api/navigation`);
          nav = unwrapApiData(navJson);
        } catch (e) {
          console.warn("[MGTS_CMS_LOADER] navigation fetch failed:", e);
        }

        if (!nav) return;

        const items = Array.isArray(nav.mainMenuItems) ? nav.mainMenuItems.filter(Boolean) : [];
        const headerBlock = document.querySelector('[data-stitch-block="header_and_mega_menu"]');
        const topBar = headerBlock ? headerBlock.querySelector(".w-full.border-b") : null;
        if (!topBar) return;
        const groups = topBar.querySelectorAll(".flex.items-center.gap-6");
        const leftGroup = groups[0] || null;
        const rightGroup = groups[1] || null;
        if (!leftGroup) return;

        const templateAnchor = leftGroup.querySelector("a");
        const baseClass = templateAnchor ? templateAnchor.className : "hover:text-primary transition-colors";

        leftGroup.innerHTML = "";
        if (rightGroup) rightGroup.innerHTML = "";
        const normalizedItems = items.filter((x) => x && (x.label || x.title));
        if (normalizedItems.length === 0) return;
        normalizedItems.forEach((it, idx) => {
          const label = String(it.label || it.title || "").trim();
          if (!label) return;
          const rawHref = String(it.href || it.url || it.link || it.slug || "").trim();
          const href = typeof normalizeCmsHref === "function" ? normalizeCmsHref(rawHref) : rawHref || "#";
          const menuId =
            String(it.menuId || it.key || it.id || "").trim() ||
            (href && href !== "#" ? href.replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+/, "").split(/[?#]/)[0] : "");

          const a = document.createElement("a");
          a.className = baseClass;
          a.href = href || "#";
          a.textContent = label;
          leftGroup.appendChild(a);
        });

        if (rightGroup) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.themeToggle = "true";
          btn.className =
            "flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1 border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/50 transition-colors";

          const icon = document.createElement("span");
          icon.className = "material-symbols-outlined text-[16px]";
          const label = document.createElement("span");

          const sync = () => {
            const isLight = typeof getTheme === "function" && getTheme() === "light";
            icon.textContent = isLight ? "dark_mode" : "light_mode";
            label.textContent = isLight ? "Темная тема" : "Светлая тема";
            btn.setAttribute("aria-pressed", String(isLight));
          };

          btn.addEventListener("click", () => {
            const isLight = typeof getTheme === "function" && getTheme() === "light";
            const next = isLight ? "dark" : "light";
            if (typeof setTheme === "function") {
              setTheme(next);
            }
            sync();
          });

          sync();
          btn.appendChild(icon);
          btn.appendChild(label);
          rightGroup.appendChild(btn);
        }
      })();
    },
  });
})();

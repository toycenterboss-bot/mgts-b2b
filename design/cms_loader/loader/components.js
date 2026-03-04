(function () {
  "use strict";

  const api = window.MGTS_CMS_LOADER;
  if (!api) return;
  const { register, utils } = api;
  const { STRAPI_BASE, fetchJson, unwrapApiData, getSlugFromQueryOrPath, normalizeCmsHref } = utils;

  const MGTS_LOGO_URL = "/assets/images/mgts-logo.svg";

  const applyBrandLogo = () => {
    const replaceLogoBox = (box, sizeClass) => {
      if (!box || box.dataset.mgtsLogoApplied) return;
      box.dataset.mgtsLogoApplied = "1";
      box.className = `${sizeClass} flex items-center justify-center`;
      const img = document.createElement("img");
      img.src = MGTS_LOGO_URL;
      img.alt = "MGTS";
      img.className = `${sizeClass} object-contain`;
      img.decoding = "async";
      img.loading = "lazy";
      box.innerHTML = "";
      box.appendChild(img);
    };

    const header = document.querySelector("header[data-mega-root]");
    if (header) {
      const headerText = header.querySelector("span.text-xl");
      if (headerText && /mgts/i.test(headerText.textContent || "")) {
        const wrap = headerText.closest("div.flex");
        const box = wrap ? wrap.firstElementChild : null;
        replaceLogoBox(box, "w-8 h-8");
        headerText.remove();
      }
    }

    const foot = document.querySelector("footer");
    if (foot) {
      const footerText = foot.querySelector("span.text-2xl");
      if (footerText && /мгтс|mgts/i.test(footerText.textContent || "")) {
        const wrap = footerText.closest("div.flex");
        const box = wrap ? wrap.firstElementChild : null;
        replaceLogoBox(box, "w-10 h-10");
      }
    }
  };

  register({
    id: "canonical:brand-logo",
    scope: "document",
    priority: 115,
    init: function () {
      applyBrandLogo();
    },
  });

  // Breadcrumbs: render based on Strapi page.breadcrumbs (json) or fallback from slug.
  register({
    id: "canonical:breadcrumbs",
    scope: "document",
    priority: 95,
    init: function (_ctx, _root) {
      const nav = document.querySelector('[data-stitch-block="breadcrumbs"] nav');
      if (!nav) return;

      const block = nav.closest('[data-stitch-block="breadcrumbs"]') || nav.parentElement;
      let slug = getSlugFromQueryOrPath();
      if (!slug) return;
      const slugAliases = {
        "business/equipment_setup/computer_help": "computer_help",
        "business/security_alarm": "security_alarm",
      };
      if (slugAliases[slug]) {
        slug = slugAliases[slug];
      }

      (async () => {
        let page = null;
        const fetchPageBySlug = async (slugValue) => {
          const res = await fetch(`${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slugValue)}`, {
            credentials: "omit",
          });
          if (!res.ok) return null;
          const json = await res.json();
          return unwrapApiData(json);
        };
        try {
          page = await fetchPageBySlug(slug);
          if (!page && slug.includes("/")) {
            const fallbackSlug = slug.split("/").filter(Boolean).pop() || "";
            if (fallbackSlug) {
              page = await fetchPageBySlug(fallbackSlug);
              slug = fallbackSlug;
            }
          }
        } catch (e) {
          console.warn("[MGTS_CMS_LOADER] breadcrumbs: page fetch failed:", e);
          return;
        }
        if (!page) return;

        const show = page.showBreadcrumbs !== false;
        if (block && block.classList) block.classList.toggle("hidden", !show);
        if (!show) return;

        /** @type {{ label: string, href?: string }[]} */
        let crumbs = [];
        const raw = page.breadcrumbs;

        const TEMPLATE_TO_HTML = {
          TPL_Service: "tpl_service.html",
          TPL_Doc_Page: "tpl_doc_page.html",
          TPL_Form_Page: "tpl_form_page.html",
          TPL_DeepNav: "tpl_deepnav.html",
          TPL_CMS_Page: "tpl_cms_page.html",
          TPL_Contact_Hub: "tpl_contact_hub.html",
          TPL_Segment_Landing: "tpl_segment_landing.html",
          TPL_Scenario: "tpl_scenario.html",
          TPL_News_List: "tpl_news_list.html",
          TPL_News_Archive: "tpl_news_archive.html",
          TPL_News_Detail: "tpl_news_detail.html",
          TPL_Home: "tpl_home.html",
        };
        const resolveHtml = (tpl) => TEMPLATE_TO_HTML[tpl] || "tpl_cms_page.html";
        const buildHref = (node) => {
          if (!node) return "";
          const slugValue = String(node.slug || "").trim();
          if (!slugValue) return "";
          const html = resolveHtml(node.template);
          return `/html_pages/${html}?slug=${encodeURIComponent(slugValue)}`;
        };
        const normalizeParent = (node) => {
          if (!node) return null;
          if (node.data) return node.data;
          return node;
        };
        const buildFromParents = () => {
          const chain = [];
          let current = page;
          let guard = 0;
          while (current && guard < 10) {
            chain.unshift(current);
            current = normalizeParent(current.parent);
            guard += 1;
          }
          return chain
            .filter((n) => n && (n.title || n.slug))
            .map((n, idx, arr) => ({
              label: String(n.title || n.slug),
              href: idx === arr.length - 1 ? "" : buildHref(n),
            }));
        };

        if (page.parent) {
          crumbs = buildFromParents();
        } else if (Array.isArray(raw)) {
          crumbs = raw
            .map((x) => {
              if (!x) return null;
              if (typeof x === "string") return { label: x, href: "" };
              const label = String(x.label || x.title || x.name || "").trim();
              const rawHref = String(x.href || x.url || x.link || "").trim();
              const href = typeof normalizeCmsHref === "function" ? normalizeCmsHref(rawHref) : rawHref;
              if (!label) return null;
              return { label, href };
            })
            .filter(Boolean);
        }

        if (!crumbs.length) {
          const parts = String(slug).split("/").filter(Boolean);
          const makeLabel = (s) =>
            String(s || "")
              .replace(/[_-]+/g, " ")
              .trim()
              .replace(/^\w/, (c) => c.toUpperCase());
          const cum = [];
          crumbs = parts.map((p) => {
            cum.push(p);
            return {
              label: makeLabel(p),
              href: "/" + cum.join("/") + "/",
            };
          });
        }

        // Ensure "Home" is first.
        const homeLabel = "Главная";
        const homeHref = "/";
        if (!crumbs.length || String(crumbs[0].label || "").trim() !== homeLabel) {
          crumbs.unshift({ label: homeLabel, href: homeHref });
        } else if (!crumbs[0].href || String(crumbs[0].href).trim() === "/") {
          crumbs[0].href = homeHref;
        }

        // Render
        nav.innerHTML = "";
        nav.className = "flex items-center gap-2 text-sm font-medium";

        const addSep = () => {
          const sep = document.createElement("span");
          sep.className = "material-symbols-outlined text-slate-400 text-sm";
          sep.textContent = "chevron_right";
          nav.appendChild(sep);
        };

        crumbs.forEach((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          const label = String(c.label || "").trim() || "Страница";
          const rawHref = String(c.href || "").trim();
          const href = typeof normalizeCmsHref === "function" ? normalizeCmsHref(rawHref) : rawHref;

          if (isLast) {
            const span = document.createElement("span");
            span.className = "text-primary font-bold";
            span.textContent = label;
            nav.appendChild(span);
            return;
          }

          const a = document.createElement("a");
          a.className =
            idx === 0
              ? "text-slate-500 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
              : "text-slate-500 dark:text-slate-400 hover:text-primary transition-colors";
          a.href = href || "#";
          if (idx === 0) {
            const icon = document.createElement("span");
            icon.className = "material-symbols-outlined text-base";
            icon.textContent = "home";
            a.appendChild(icon);
          }
          a.appendChild(document.createTextNode(label));
          nav.appendChild(a);
          addSep();
        });
      })();
    },
  });


  // Tabs (scaffold): requires data attributes; supports page overrides.
  register({
    id: "canonical:tabs",
    scope: "element",
    selector: "[data-tabs]",
    priority: 50,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const buttons = Array.from(root.querySelectorAll("[data-tab]"));
      const panels = Array.from(root.querySelectorAll("[data-panel]"));
      if (buttons.length === 0 || panels.length === 0) return;

      const parseClasses = (s) =>
        (s || "")
          .split(" ")
          .map((x) => x.trim())
          .filter(Boolean);

      const applyClasses = (el2, add, remove) => {
        if (!el2) return;
        parseClasses(remove).forEach((c) => el2.classList.remove(c));
        parseClasses(add).forEach((c) => el2.classList.add(c));
      };

      const activate = (tabId, focus = false) => {
        buttons.forEach((b) => {
          const active = b.getAttribute("data-tab") === tabId;
          b.setAttribute("role", "tab");
          b.setAttribute("aria-selected", active ? "true" : "false");
          b.setAttribute("tabindex", active ? "0" : "-1");

          const label = b.querySelector("[data-tab-label]");
          const underline = b.querySelector("[data-tab-underline]");
          if (label) {
            if (active) applyClasses(label, label.dataset.activeClasses, label.dataset.inactiveClasses);
            else applyClasses(label, label.dataset.inactiveClasses, label.dataset.activeClasses);
          }
          if (underline) {
            underline.classList.toggle("hidden", !active);
          }

          if (active && focus) b.focus();
        });
        panels.forEach((p) => {
          const active = p.getAttribute("data-panel") === tabId;
          p.setAttribute("role", "tabpanel");
          p.classList.toggle("hidden", !active);
          p.setAttribute("aria-hidden", active ? "false" : "true");
        });
      };

      buttons.forEach((b) => {
        b.addEventListener("click", (e) => {
          e.preventDefault();
          activate(b.getAttribute("data-tab"), true);
        });
        b.addEventListener("keydown", (e) => {
          const idx = buttons.indexOf(b);
          if (idx < 0) return;
          let next = idx;
          if (e.key === "ArrowRight") next = (idx + 1) % buttons.length;
          else if (e.key === "ArrowLeft") next = (idx - 1 + buttons.length) % buttons.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = buttons.length - 1;
          else return;
          e.preventDefault();
          activate(buttons[next].getAttribute("data-tab"), true);
        });
      });

      // default: from data-default-tab or first
      const def = root.dataset ? root.dataset.defaultTab : "";
      const initial = def && buttons.some((b) => b.getAttribute("data-tab") === def) ? def : buttons[0].getAttribute("data-tab");
      activate(initial, false);
    },
  });

  // Dropdown (scaffold): requires data attributes.
  register({
    id: "canonical:dropdown",
    scope: "element",
    selector: "[data-dropdown]",
    priority: 40,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const trigger = root.querySelector("[data-dropdown-trigger]");
      const menu = root.querySelector("[data-dropdown-menu]");
      if (!trigger || !menu) return;

      const label = trigger.querySelector("[data-dropdown-label]") || trigger.querySelector("span");
      const icon = trigger.querySelector("[data-dropdown-icon]");
      const options = Array.from(root.querySelectorAll("[data-dropdown-option]"));
      const searchInput = root.querySelector("[data-dropdown-search]");

      const applyClassList = (node, add, remove) => {
        if (!node) return;
        if (remove) remove.split(" ").filter(Boolean).forEach((c) => node.classList.remove(c));
        if (add) add.split(" ").filter(Boolean).forEach((c) => node.classList.add(c));
      };

      const open = () => {
        menu.classList.remove("hidden");
        trigger.setAttribute("aria-expanded", "true");
        applyClassList(trigger, trigger.dataset.dropdownTriggerOpenClass, trigger.dataset.dropdownTriggerOpenRemoveClass);
      };
      const close = () => {
        menu.classList.add("hidden");
        trigger.setAttribute("aria-expanded", "false");
        applyClassList(trigger, trigger.dataset.dropdownTriggerCloseClass, trigger.dataset.dropdownTriggerCloseRemoveClass);
      };

      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const opened = !menu.classList.contains("hidden");
        if (opened) close();
        else open();
      });

      options.forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.preventDefault();
          const value = opt.getAttribute("data-dropdown-option") || opt.textContent || "";
          if (label) label.textContent = String(value).trim();
          root.setAttribute("data-dropdown-value", String(value).trim());
          close();
        });
      });

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          const q = String(searchInput.value || "").toLowerCase();
          options.forEach((opt) => {
            const txt = String(opt.textContent || "").toLowerCase();
            opt.classList.toggle("hidden", q && !txt.includes(q));
          });
        });
      }

      document.addEventListener("click", (e) => {
        if (!root.contains(e.target)) close();
      });
    },
  });

  // Choice group: single-select for any group of buttons.
  register({
    id: "canonical:choiceGroup",
    scope: "element",
    selector: "[data-choice-group]",
    priority: 40,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const buttons = Array.from(root.querySelectorAll("[data-choice]"));
      if (!buttons.length) return;
      const activeClass = root.dataset.choiceActiveClass || "is-active";

      const setActive = (btn) => {
        buttons.forEach((b) => b.classList.toggle(activeClass, b === btn));
        root.setAttribute("data-choice-value", btn.getAttribute("data-choice") || btn.textContent || "");
      };

      buttons.forEach((b, idx) => {
        b.addEventListener("click", (e) => {
          e.preventDefault();
          setActive(b);
        });
        if (idx === 0) setActive(b);
      });
    },
  });

  // Switch: toggle for a pair of states
  register({
    id: "canonical:switch",
    scope: "element",
    selector: "[data-switch]",
    priority: 40,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const btn = root.querySelector("[data-switch-toggle]") || root.querySelector("button");
      if (!btn) return;
      const onClass = root.dataset.switchOnClass || "is-on";
      const offClass = root.dataset.switchOffClass || "is-off";
      const valueAttr = root.dataset.switchAttr || "data-switch-value";

      const set = (on) => {
        root.classList.toggle(onClass, on);
        root.classList.toggle(offClass, !on);
        root.setAttribute(valueAttr, on ? "on" : "off");
      };

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const on = !root.classList.contains(onClass);
        set(on);
      });

      set(root.classList.contains(onClass));
    },
  });

  // Accordion: collapsible sections with [data-accordion-item].
  register({
    id: "canonical:accordion",
    scope: "element",
    selector: "[data-accordion]",
    priority: 40,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const items = Array.from(root.querySelectorAll("[data-accordion-item]"));
      if (!items.length) return;
      const multi = root.dataset.accordionMulti === "true";

      items.forEach((item) => {
        const trigger = item.querySelector("[data-accordion-trigger]");
        const panel = item.querySelector("[data-accordion-panel]");
        if (!trigger || !panel) return;
        trigger.addEventListener("click", (e) => {
          e.preventDefault();
          const isOpen = item.classList.contains("is-open");
          if (!multi) {
            items.forEach((i) => i.classList.remove("is-open"));
          }
          item.classList.toggle("is-open", !isOpen);
          panel.classList.toggle("hidden", isOpen);
        });
      });
    },
  });

  // Load more: reveal hidden items in batches.
  register({
    id: "canonical:loadMore",
    scope: "element",
    selector: "[data-load-more]",
    priority: 40,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const btn = root.querySelector("[data-load-more-trigger]");
      const items = Array.from(root.querySelectorAll("[data-load-more-item]"));
      const batch = parseInt(root.dataset.loadMoreBatch || "6", 10);
      if (!btn || !items.length) return;

      let shown = items.filter((x) => !x.classList.contains("hidden")).length;
      const showNext = () => {
        const next = items.slice(shown, shown + batch);
        next.forEach((x) => x.classList.remove("hidden"));
        shown += next.length;
        btn.classList.toggle("hidden", shown >= items.length);
      };

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showNext();
      });

      btn.classList.toggle("hidden", shown >= items.length);
    },
  });

  // Billing toggle: switches between monthly/annual panels.
  register({
    id: "canonical:billingToggle",
    scope: "element",
    selector: "[data-billing-toggle]",
    priority: 40,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const toggle = root.querySelector("[data-billing-switch]");
      const monthly = root.querySelectorAll("[data-billing-monthly]");
      const annual = root.querySelectorAll("[data-billing-annual]");
      if (!toggle || monthly.length === 0 || annual.length === 0) return;

      const set = (isAnnual) => {
        monthly.forEach((m) => m.classList.toggle("hidden", isAnnual));
        annual.forEach((a) => a.classList.toggle("hidden", !isAnnual));
        toggle.setAttribute("aria-checked", isAnnual ? "true" : "false");
      };

      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        const isAnnual = toggle.getAttribute("aria-checked") !== "true";
        set(isAnnual);
      });

      set(toggle.getAttribute("aria-checked") === "true");
    },
  });

  // Simple switcher for data-switcher (tabs without panel toggling).
  register({
    id: "canonical:switcher",
    scope: "element",
    selector: "[data-switcher]",
    priority: 40,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const buttons = Array.from(root.querySelectorAll("[data-switcher-option]"));
      if (!buttons.length) return;
      const activeClass = root.dataset.switcherActiveClass || "is-active";

      const setActive = (btn) => {
        buttons.forEach((b) => b.classList.toggle(activeClass, b === btn));
        root.setAttribute("data-switcher-value", btn.getAttribute("data-switcher-option") || "");
      };

      buttons.forEach((b, idx) => {
        b.addEventListener("click", (e) => {
          e.preventDefault();
          setActive(b);
        });
        if (idx === 0) setActive(b);
      });
    },
  });

  // Contact hub map: sync markers/cards + category/search filtering.
  register({
    id: "canonical:contactHubMap",
    scope: "element",
    selector: "[data-contact-hub]",
    priority: 30,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const markers = Array.from(root.querySelectorAll("[data-contact-marker],[data-contact-pin]"));
      const items = Array.from(root.querySelectorAll("[data-contact-item],[data-contact-card]"));
      if (!markers.length || !items.length) return;

      const activeClass = root.dataset.contactActiveClass || "is-active";
      const getId = (node) =>
        node.getAttribute("data-contact-id") ||
        node.getAttribute("data-contact-pin") ||
        node.getAttribute("data-contact-card") ||
        "";
      const getCategory = (node) =>
        node.getAttribute("data-contact-category") ||
        node.getAttribute("data-contact-type") ||
        "";

      const applyButtonState = (btn, isActive) => {
        const active = String(btn.getAttribute("data-active-classes") || "")
          .split(" ")
          .map((x) => x.trim())
          .filter(Boolean);
        const inactive = String(btn.getAttribute("data-inactive-classes") || "")
          .split(" ")
          .map((x) => x.trim())
          .filter(Boolean);
        active.forEach((cls) => btn.classList.toggle(cls, isActive));
        inactive.forEach((cls) => btn.classList.toggle(cls, !isActive));
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      };

      let activeId = "";
      let activeCategory = "";
      let query = "";

      const setActiveId = (value) => {
        activeId = value || "";
        markers.forEach((m) => {
          const match = getId(m) === activeId;
          m.classList.toggle(activeClass, match);
          const halo = m.querySelector("[data-contact-halo]");
          if (halo) halo.classList.toggle("hidden", !match);
        });
        items.forEach((c) => {
          c.classList.toggle(activeClass, getId(c) === activeId);
        });
      };

      const matchesQuery = (node) => {
        if (!query) return true;
        const text =
          (node.getAttribute("data-contact-label") || "") +
          " " +
          (node.getAttribute("data-contact-address") || "") +
          " " +
          (node.textContent || "");
        return text.toLowerCase().includes(query);
      };

      const applyFilters = () => {
        const visibleMarkers = [];
        const visibleItems = [];
        markers.forEach((m) => {
          const cat = getCategory(m);
          const show = (!activeCategory || cat === activeCategory) && matchesQuery(m);
          m.classList.toggle("hidden", !show);
          if (show) visibleMarkers.push(m);
        });
        items.forEach((c) => {
          const cat = getCategory(c);
          const show = (!activeCategory || cat === activeCategory) && matchesQuery(c);
          c.classList.toggle("hidden", !show);
          if (show) visibleItems.push(c);
        });
        const candidate = activeId && visibleItems.find((c) => getId(c) === activeId) ? activeId : "";
        if (!candidate) {
          const first = visibleItems[0] || visibleMarkers[0];
          setActiveId(first ? getId(first) : "");
        }
      };

      markers.forEach((m) => {
        m.addEventListener("click", (e) => {
          e.preventDefault();
          const id = getId(m);
          if (id) setActiveId(id);
        });
      });
      items.forEach((c) => {
        c.addEventListener("click", (e) => {
          const target = e.target;
          if (target && target.closest("a,button")) return;
          const id = getId(c);
          if (id) setActiveId(id);
        });
      });

      const filterButtons = Array.from(root.querySelectorAll("[data-choice][data-contact-category]"));
      if (filterButtons.length) {
        filterButtons.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            activeCategory = String(btn.getAttribute("data-contact-category") || "").trim();
            filterButtons.forEach((b) => applyButtonState(b, b === btn));
            applyFilters();
          });
        });
        const initial =
          filterButtons.find((b) => b.getAttribute("aria-pressed") === "true") || filterButtons[0];
        activeCategory = String(initial.getAttribute("data-contact-category") || "").trim();
        filterButtons.forEach((b) => applyButtonState(b, b === initial));
      }

      const searchInput =
        root.querySelector('input[placeholder*="Поиск офиса"]') ||
        root.querySelector('input[placeholder*="Поиск"]');
      if (searchInput) {
        searchInput.addEventListener("input", () => {
          query = String(searchInput.value || "").trim().toLowerCase();
          applyFilters();
        });
      }

      const first = items[0] || markers[0];
      if (first) setActiveId(getId(first));
      applyFilters();
    },
  });

  // Section map: highlight section based on index selection.
  register({
    id: "canonical:sectionMap",
    scope: "element",
    selector: "[data-section-map]",
    priority: 30,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const triggers = Array.from(root.querySelectorAll("[data-section-trigger]"));
      const panels = Array.from(root.querySelectorAll("[data-section-panel]"));
      if (!triggers.length || !panels.length) return;
      const activeClass = root.dataset.sectionActiveClass || "is-active";

      const setActive = (value) => {
        triggers.forEach((t) => t.classList.toggle(activeClass, t.getAttribute("data-section-trigger") === value));
        panels.forEach((p) => p.classList.toggle("hidden", p.getAttribute("data-section-panel") !== value));
      };

      triggers.forEach((t, idx) => {
        t.addEventListener("click", (e) => {
          e.preventDefault();
          setActive(t.getAttribute("data-section-trigger") || "");
        });
        if (idx === 0) setActive(t.getAttribute("data-section-trigger") || "");
      });
    },
  });

  // Modal: simple open/close with data-modal-id targets.
  register({
    id: "canonical:modal",
    scope: "document",
    priority: 30,
    init: function (_ctx, _root) {
      const openModal = (id) => {
        const modal =
          document.querySelector(`[data-modal-id="${id}"]`) ||
          document.querySelector(id ? `#${CSS.escape(id)}` : "");
        if (!modal) return;
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
      };
      const closeModal = (id) => {
        const modal =
          document.querySelector(`[data-modal-id="${id}"]`) ||
          document.querySelector(id ? `#${CSS.escape(id)}` : "");
        if (!modal) return;
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
      };

      document.addEventListener("click", (e) => {
        const opener = e.target && e.target.closest ? e.target.closest("[data-modal-open]") : null;
        if (opener) {
          e.preventDefault();
          const id = opener.getAttribute("data-modal-open") || "";
          if (id) openModal(id);
          return;
        }
        const btn = e.target && e.target.closest ? e.target.closest("[data-modal-close]") : null;
        if (!btn) return;
        e.preventDefault();
        const id = btn.getAttribute("data-modal-close") || "";
        if (id) {
          closeModal(id);
          return;
        }
        const modal = btn.closest("[data-modal-id], [data-modal]");
        if (!modal) return;
        const modalId = modal.getAttribute("data-modal-id") || modal.id || "";
        if (modalId) closeModal(modalId);
      });

      document.addEventListener("click", (e) => {
        const overlay = e.target && e.target.closest ? e.target.closest("[data-modal-overlay]") : null;
        if (!overlay) return;
        const modal = overlay.closest("[data-modal-id], [data-modal]");
        if (!modal) return;
        const id = modal.getAttribute("data-modal-id") || modal.id || "";
        if (id) closeModal(id);
      });

      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        const open = document.querySelector('[data-modal][aria-hidden="false"], [data-modal-id][aria-hidden="false"]');
        if (!open) return;
        const id = open.getAttribute("data-modal-id") || open.id || "";
        if (id) closeModal(id);
      });
    },
  });

  // Content open dispatcher: emits mgts:open for cards/links with data-route-open.
  register({
    id: "canonical:contentOpen",
    scope: "document",
    priority: 45,
    init: function (_ctx, _root) {
      const openModal = (id) => {
        if (!id) return;
        const modal = document.querySelector(`[data-modal-id="${id}"],#${CSS.escape(id)}`);
        if (!modal) return;
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
      };

      document.addEventListener("click", (e) => {
        const target =
          e.target && e.target.closest
            ? e.target.closest("[data-route-open],[data-modal-open],[data-content-type]")
            : null;
        if (!target) return;

        const url = String(target.getAttribute("data-route-open") || "").trim();
        const modalId = String(target.getAttribute("data-modal-open") || "").trim();
        const openMode = String(target.getAttribute("data-open-mode") || "").trim().toLowerCase();
        const contentType = String(target.getAttribute("data-content-type") || "").trim();
        const contentId = String(target.getAttribute("data-content-id") || "").trim();

        if (!url && !modalId) return;

        const detail = {
          url,
          modalId,
          openMode: openMode || (modalId ? "modal" : "route"),
          contentType,
          contentId,
        };
        const evt = new CustomEvent("mgts:open", { bubbles: true, cancelable: true, detail });
        target.dispatchEvent(evt);

        if (evt.defaultPrevented) return;

        // Default behavior: route navigation if requested.
        if (detail.openMode === "route" && detail.url) {
          try {
            window.location.assign(detail.url);
          } catch {
            // ignore
          }
        } else if (detail.openMode === "modal" && detail.modalId) {
          openModal(detail.modalId);
        }
      });
    },
  });

  // Carousel: basic next/prev scrolling for overflow container.
  register({
    id: "canonical:carousel",
    scope: "element",
    selector: "[data-carousel]",
    priority: 20,
    init: function (_ctx, el) {
      const root = /** @type {HTMLElement} */ (el);
      const track = root.querySelector("[data-carousel-track]");
      const prev = root.querySelector("[data-carousel-prev]");
      const next = root.querySelector("[data-carousel-next]");
      if (!track) return;

      const step = parseInt(root.dataset.carouselStep || "300", 10) || 300;
      const progress = root.querySelector("[data-carousel-progress]");
      const counter = root.querySelector("[data-carousel-counter]");
      const items = Array.from(track.children).filter((el) => el instanceof HTMLElement);

      const getActiveIndex = () => {
        if (!items.length) return 0;
        const trackRect = track.getBoundingClientRect();
        let activeIdx = 0;
        let minDist = Infinity;
        items.forEach((item, idx) => {
          const rect = item.getBoundingClientRect();
          const dist = Math.abs(rect.left - trackRect.left);
          if (dist < minDist) {
            minDist = dist;
            activeIdx = idx;
          }
        });
        return activeIdx;
      };

      const updateUI = () => {
        if (!items.length) return;
        const idx = getActiveIndex();
        if (counter) {
          const total = items.length;
          counter.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
        }
        if (progress) {
          const total = items.length;
          const pct = Math.min(100, ((idx + 1) / total) * 100);
          progress.style.width = `${pct}%`;
        }
      };

      const easeInOut = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
      const animateScrollTo = (left, duration) => {
        const start = track.scrollLeft;
        const change = left - start;
        if (!change) return;
        const prevSnap = track.style.scrollSnapType;
        track.style.scrollSnapType = "none";
        const t0 = performance.now();
        const tick = (now) => {
          const elapsed = now - t0;
          const progress = Math.min(1, elapsed / duration);
          const eased = easeInOut(progress);
          track.scrollLeft = start + change * eased;
          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            track.scrollLeft = left;
            track.style.scrollSnapType = prevSnap;
            requestAnimationFrame(() => {
              track.scrollTo({ left, behavior: "auto" });
            });
          }
        };
        requestAnimationFrame(tick);
      };

      const scrollToIndex = (idx) => {
        if (!items.length) return;
        const clamped = Math.max(0, Math.min(items.length - 1, idx));
        const target = items[clamped];
        const duration =
          parseInt(root.dataset.carouselDuration || "1200", 10) || 1200;
        animateScrollTo(target.offsetLeft, duration);
      };

      if (prev) {
        prev.addEventListener("click", (e) => {
          e.preventDefault();
          const idx = getActiveIndex();
          scrollToIndex(idx - 1);
        });
      }
      if (next) {
        next.addEventListener("click", (e) => {
          e.preventDefault();
          const idx = getActiveIndex();
          scrollToIndex(idx + 1);
        });
      }

      let rafId = 0;
      const onScroll = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(updateUI);
      };
      track.addEventListener("scroll", onScroll);
      window.addEventListener("resize", updateUI);
      updateUI();

      const autoplay =
        root.dataset.carouselAutoplay === "true" || root.dataset.carouselAutoplay === "1";
      if (autoplay && items.length > 1) {
        const interval =
          parseInt(root.dataset.carouselInterval || "5000", 10) || 5000;
        let timer = setInterval(() => {
          const idx = getActiveIndex();
          const nextIdx = (idx + 1) % items.length;
          scrollToIndex(nextIdx);
          setTimeout(updateUI, 450);
        }, interval);
        const pause = () => {
          if (timer) clearInterval(timer);
          timer = null;
        };
        const resume = () => {
          if (!timer) {
            timer = setInterval(() => {
              const idx = getActiveIndex();
              const nextIdx = (idx + 1) % items.length;
              scrollToIndex(nextIdx);
              setTimeout(updateUI, 450);
            }, interval);
          }
        };
        root.addEventListener("mouseenter", pause);
        root.addEventListener("mouseleave", resume);
      }
    },
  });
})();

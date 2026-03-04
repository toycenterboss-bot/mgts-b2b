(function () {
  "use strict";

  const core = window.MGTS_CMS_ADAPTER_CORE || {};
  const { resolveAnyMediaUrl, clearNode } = core;

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

  function extFromUrl(url) {
    try {
      const u = new URL(url, window.location.origin);
      const p = u.pathname || "";
      const m = p.match(/\.([a-z0-9]+)$/i);
      return m ? String(m[1]).toLowerCase() : "";
    } catch {
      const m = String(url || "").match(/\.([a-z0-9]+)(?:\?|#|$)/i);
      return m ? String(m[1]).toLowerCase() : "";
    }
  }

  function extractLinksFromHtml(html) {
    if (!html) return [];
    try {
      const doc = new DOMParser().parseFromString(String(html), "text/html");
      const links = Array.from(doc.querySelectorAll("a[href]"));
      return links
        .map((a) => ({
          href: String(a.getAttribute("href") || "").trim(),
          label: String(a.textContent || "").trim(),
        }))
        .filter((l) => l.href && l.label);
    } catch {
      return [];
    }
  }

  function docIconColors(ext) {
    if (ext === "pdf") return ["bg-red-500/10", "text-red-500"];
    if (ext === "doc" || ext === "docx") return ["bg-blue-500/10", "text-blue-500"];
    if (ext === "xls" || ext === "xlsx") return ["bg-emerald-500/10", "text-emerald-400"];
    return ["bg-slate-500/10", "text-slate-400"];
  }

  function renderDocList(links) {
    const list = document.createElement("div");
    list.className = "space-y-4";
    links.forEach((lnk) => {
      const ext = extFromUrl(lnk.href);
      const [bgCls, textCls] = docIconColors(ext);
      const item = document.createElement("div");
      item.className =
        "flex items-center justify-between p-4 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";
      item.setAttribute("data-doc-file-item", "");
      item.setAttribute("data-file-name", String(lnk.label || "").toLowerCase());
      item.setAttribute("data-file-type", ext);
      item.setAttribute("data-route-open", String(lnk.href || ""));

      const left = document.createElement("div");
      left.className = "flex items-center gap-4";

      const iconWrap = document.createElement("div");
      iconWrap.className = `size-10 flex items-center justify-center ${bgCls} ${textCls} rounded-lg`;
      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.textContent = fileTypeIcon(ext);
      iconWrap.appendChild(icon);

      const text = document.createElement("div");
      const title = document.createElement("button");
      title.type = "button";
      title.className = "text-sm font-bold leading-none mb-1 text-left hover:text-primary transition-colors";
      title.textContent = lnk.label;
      title.setAttribute("data-modal-open", "mgts-doc-preview-modal");
      title.setAttribute("data-open-mode", "modal");
      title.setAttribute("data-content-type", "file");
      title.setAttribute("data-content-id", lnk.label);
      title.setAttribute("data-route-open", lnk.href);
      const meta = document.createElement("p");
      meta.className = "text-xs text-slate-500 dark:text-slate-400";
      meta.textContent = `${humanFileType(ext) || "FILE"} • документ`;

      text.appendChild(title);
      text.appendChild(meta);

      left.appendChild(iconWrap);
      left.appendChild(text);

      const action = document.createElement("a");
      action.className =
        "size-9 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all";
      action.href = lnk.href;
      action.setAttribute("download", "");
      const actionIcon = document.createElement("span");
      actionIcon.className = "material-symbols-outlined text-[20px]";
      actionIcon.textContent = "download";
      action.appendChild(actionIcon);

      item.appendChild(left);
      item.appendChild(action);
      list.appendChild(item);
    });
    return list;
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
            <button class="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 transition-colors" type="button" data-modal-close aria-label="Закрыть">
              <span class="material-symbols-outlined text-[20px]">close</span>
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


  function bindDocPreviewClicks() {
    if (window.__MGTS_DOC_PREVIEW_BOUND) return;
    window.__MGTS_DOC_PREVIEW_BOUND = true;

    const hide = (el) => {
      if (!el) return;
      el.classList.add("hidden");
      try {
        if (el.tagName === "EMBED" || el.tagName === "IFRAME") el.setAttribute("src", "about:blank");
        if (el.tagName === "IMG") el.setAttribute("src", "");
      } catch {
        // ignore
      }
    };

    const show = (el) => {
      if (!el) return;
      el.classList.remove("hidden");
    };

    const extFromUrl = (url) => {
      try {
        const u = new URL(url, window.location.origin);
        const p = u.pathname || "";
        const m = p.match(/\.([a-z0-9]+)$/i);
        return m ? String(m[1]).toLowerCase() : "";
      } catch {
        const m = String(url || "").match(/\.([a-z0-9]+)(?:\?|#|$)/i);
        return m ? String(m[1]).toLowerCase() : "";
      }
    };

    const fileNameFromUrl = (url) => {
      try {
        const u = new URL(url, window.location.origin);
        const p = u.pathname || "";
        const name = p.split("/").filter(Boolean).slice(-1)[0] || "";
        return decodeURIComponent(name);
      } catch {
        return String(url || "").split("/").filter(Boolean).slice(-1)[0] || "";
      }
    };

    document.addEventListener(
      "click",
      (e) => {
        const target = e && e.target && e.target.closest ? e.target.closest('[data-modal-open="mgts-doc-preview-modal"]') : null;
        if (!target) return;

        const url = String(target.getAttribute("data-route-open") || "").trim();
        if (!url) return;

        const modal = ensureDocPreviewModal();

        const titleEl = modal.querySelector("[data-doc-preview-title]");
        const dl = modal.querySelector("[data-doc-preview-download]");
        const embed = modal.querySelector("[data-doc-preview-embed]");
        const iframe = modal.querySelector("[data-doc-preview-iframe]");
        const img = modal.querySelector("[data-doc-preview-image]");
        const fallback = modal.querySelector("[data-doc-preview-fallback]");
        const extEl = modal.querySelector("[data-doc-preview-ext]");
        const fnEl = modal.querySelector("[data-doc-preview-filename]");

        const title = String(target.getAttribute("data-content-id") || "Документ").trim();
        if (titleEl) titleEl.textContent = title || "Документ";
        if (dl) dl.setAttribute("href", url);

        hide(embed);
        hide(iframe);
        hide(img);
        hide(fallback);

        const ft = String(target.getAttribute("data-file-type") || "").trim().toLowerCase();
        const ext = ft || extFromUrl(url);
        const fn = fileNameFromUrl(url);
        if (extEl) extEl.textContent = ext ? ext.toUpperCase() : "FILE";
        if (fnEl) fnEl.textContent = fn || "";

        if (ext === "pdf") {
          if (embed) {
            embed.setAttribute("type", "application/pdf");
            embed.setAttribute("src", url);
            show(embed);
          } else if (iframe) {
            iframe.setAttribute("src", url);
            show(iframe);
          }
          return;
        }

        if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
          if (img) {
            img.setAttribute("src", url);
            show(img);
            return;
          }
        }

        show(fallback);
      },
      true
    );
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
      a.href = "#";
      a.setAttribute("data-modal-open", "mgts-doc-preview-modal");
      a.setAttribute("data-open-mode", "modal");
      a.setAttribute("data-content-type", "file");
      a.setAttribute("data-content-id", String(f.name || "Документ"));
      if (url) a.setAttribute("data-route-open", url);
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

    const promoteTableRows = () => {
      const items = Array.from(root.querySelectorAll("[data-doc-file-item]")).filter(
        (x) => x instanceof HTMLElement
      );
      const rowMeta = new Map();
      items.forEach((el) => {
        const tr = el.closest("tr");
        if (!tr) return;
        const name = (el.getAttribute("data-file-name") || el.textContent || "").trim();
        const typeAttr = (el.getAttribute("data-file-type") || "").trim().toLowerCase();
        const href = (el.getAttribute("data-route-open") || el.getAttribute("href") || "").trim();
        const type = typeAttr || extFromUrl(href) || "";
        const meta = rowMeta.get(tr) || { names: [], types: [], hrefs: [] };
        if (name) meta.names.push(name);
        if (type) meta.types.push(type);
        if (href) meta.hrefs.push(href);
        rowMeta.set(tr, meta);
        // Avoid filtering on inner buttons; filter row instead.
        el.removeAttribute("data-doc-file-item");
      });
      rowMeta.forEach((meta, tr) => {
        if (!tr) return;
        tr.setAttribute("data-doc-file-item", "");
        if (meta.names.length) tr.setAttribute("data-file-name", meta.names.join(" ").toLowerCase());
        if (meta.types.length) {
          const uniq = Array.from(new Set(meta.types));
          tr.setAttribute("data-file-type", uniq.join(","));
        }
        if (meta.hrefs.length) tr.setAttribute("data-route-open", meta.hrefs[0]);
      });
    };

    const getAllItems = () =>
      Array.from(root.querySelectorAll("[data-doc-file-item]")).filter((x) => x instanceof HTMLElement);
    promoteTableRows();
    const allItems = getAllItems();
    if (allItems.length === 0) return;

    const headerRow = root.querySelector(":scope > .flex.items-center.justify-between");
    const insertAfter = headerRow && headerRow.parentElement === root ? headerRow : null;

    const typeFromName = (name) => {
      const m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)(?:\s|$)/);
      return m ? m[1] : "";
    };
    const getType = (el) => {
      const attr = (el.getAttribute("data-file-type") || "").trim().toLowerCase();
      if (attr) return attr;
      const href =
        el.getAttribute("data-route-open") ||
        el.getAttribute("href") ||
        "";
      const ext = extFromUrl(href);
      if (ext) return ext;
      return typeFromName(el.getAttribute("data-file-name") || el.textContent || "");
    };
    const types = Array.from(new Set(allItems.map(getType).filter(Boolean))).sort();

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
    select.style.display = "none";

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

    const dropdown = document.createElement("div");
    dropdown.className = "relative";
    dropdown.style.flex = "0 0 auto";

    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "min-w-[120px] flex items-center justify-between h-12 px-4 rounded-lg border border-slate-300 dark:border-[#3a4755] bg-slate-50 dark:bg-[#111418] text-slate-500 dark:text-[#9babbb] text-sm transition-all";
    const label = document.createElement("span");
    label.textContent = "Все типы";
    const caret = document.createElement("span");
    caret.className = "material-symbols-outlined text-[20px]";
    caret.textContent = "expand_more";
    button.appendChild(label);
    button.appendChild(caret);

    const menu = document.createElement("div");
    menu.className =
      "absolute right-0 mt-0 min-w-[180px] bg-white dark:bg-[#1b2127] border border-primary border-t-0 rounded-b-lg shadow-xl overflow-hidden hidden z-10";
    const list = document.createElement("div");
    list.className = "p-1 space-y-0.5";

    const setOpen = (open) => {
      menu.classList.toggle("hidden", !open);
      button.classList.toggle("border-primary", open);
      button.classList.toggle("bg-primary/5", open);
      button.classList.toggle("text-slate-900", open);
      button.classList.toggle("dark:text-white", open);
      caret.classList.toggle("rotate-180", open);
    };

    const buildOption = (value, text, selected) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className =
        "w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-slate-600 dark:text-[#9babbb] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";
      const textSpan = document.createElement("span");
      textSpan.textContent = text;
      const check = document.createElement("span");
      check.className = "material-symbols-outlined text-sm";
      check.textContent = "check";
      check.classList.toggle("hidden", !selected);
      if (selected) {
        opt.classList.add("text-white", "bg-primary", "rounded-md", "shadow-lg", "shadow-primary/20");
        textSpan.classList.add("font-medium");
      }
      opt.appendChild(textSpan);
      opt.appendChild(check);
      opt.addEventListener("click", () => {
        select.value = value;
        label.textContent = text;
        [...list.querySelectorAll("button")].forEach((b) => {
          b.classList.remove("text-white", "bg-primary", "rounded-md", "shadow-lg", "shadow-primary/20");
          const c = b.querySelector(".material-symbols-outlined");
          if (c) c.classList.add("hidden");
          const t = b.querySelector("span");
          if (t) t.classList.remove("font-medium");
        });
        opt.classList.add("text-white", "bg-primary", "rounded-md", "shadow-lg", "shadow-primary/20");
        const c = opt.querySelector(".material-symbols-outlined");
        if (c) c.classList.remove("hidden");
        textSpan.classList.add("font-medium");
        setOpen(false);
        apply();
      });
      return opt;
    };
    list.appendChild(buildOption("", "Все типы", true));
    types.forEach((t) => {
      list.appendChild(buildOption(t, humanFileType(t), false));
    });
    menu.appendChild(list);
    dropdown.appendChild(button);
    dropdown.appendChild(menu);

    button.addEventListener("click", () => {
      const open = !menu.classList.contains("hidden");
      setOpen(!open);
    });
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) setOpen(false);
    });

    filterBar.appendChild(input);
    filterBar.appendChild(dropdown);
    filterBar.appendChild(select);

    if (insertAfter) insertAfter.insertAdjacentElement("afterend", filterBar);
    else root.insertAdjacentElement("afterbegin", filterBar);

    filterBar.insertAdjacentElement("afterend", empty);

    const countEl = root.querySelector("[data-doc-docs-count]");
    let currentCategoryKey = "";

    const hasPanels =
      !!root.querySelector("[data-doc-all-panel]") || !!root.querySelector("[data-doc-active-panel]");

    const apply = () => {
      const q = String(input.value || "").trim().toLowerCase();
      const ft = String(select.value || "").trim().toLowerCase();
      const searchAll = q.length > 0;
      const cat = searchAll ? "" : String(currentCategoryKey || "").trim().toLowerCase();

      const docTabs = Array.from(root.querySelectorAll(".document-tabs"));
      docTabs.forEach((dt) => {
        if (typeof dt.__setDocSearchMode === "function") {
          dt.__setDocSearchMode(searchAll);
        }
      });
      if (hasPanels) {
        root
          .querySelectorAll("[data-doc-all-panel]")
          .forEach((p) => p.classList.toggle("hidden", !searchAll));
        root
          .querySelectorAll("[data-doc-active-panel]")
          .forEach((p) => p.classList.toggle("hidden", searchAll));
      }

      let visible = 0;
      const items = getAllItems();
      items.forEach((el) => {
        const inAllPanel = !!el.closest("[data-doc-all-panel]");
        const inTabs = !!el.closest(".document-tabs");
        if (hasPanels) {
          if (searchAll && inTabs && !inAllPanel) {
            el.classList.add("hidden");
            return;
          }
          if (!searchAll && inAllPanel) {
            el.classList.add("hidden");
            return;
          }
        }
        const name = (el.getAttribute("data-file-name") || el.textContent || "").toLowerCase();
        const type = getType(el);
        const cat2 = (el.getAttribute("data-file-category") || "").toLowerCase();
        const okName = !q || name.includes(q);
      const okType = !ft || String(type || "").split(",").map((t) => t.trim()).includes(ft);
        const okCat = !cat || cat2 === cat;
        const show = okName && okType && okCat;
        el.classList.toggle("hidden", !show);
        if (show) visible += 1;
      });

      empty.style.display = visible === 0 ? "block" : "none";
      if (countEl) countEl.textContent = `Найдено: ${visible} файлов`;
      return visible;
    };

    let tmr = 0;
    input.addEventListener("input", () => {
      window.clearTimeout(tmr);
      tmr = window.setTimeout(apply, 120);
    });
    select.addEventListener("change", apply);
    apply();

    root.addEventListener("mgts:docTabChange", (e) => {
      const ev = /** @type {CustomEvent} */ (e);
      const key = ev && ev.detail ? String(ev.detail.key || "") : "";
      currentCategoryKey = key;
      const visible = apply();
      // If the selected tab maps to an empty category, keep the UI usable by showing all files.
      if (visible === 0 && currentCategoryKey) {
        currentCategoryKey = "";
        apply();
      }
    });

    const activeTab = root.querySelector('[data-doc-category-key][aria-pressed="true"]');
    if (activeTab) {
      currentCategoryKey = String(activeTab.getAttribute("data-doc-category-key") || "");
      const visible = apply();
      // If the default tab points to an empty category, show all docs by default.
      // (Keeps UI responsive even when content defaultTab is misconfigured.)
      if (visible === 0) {
        currentCategoryKey = "";
        apply();
      }
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

    const tabsWrap = document.createElement("div");
    tabsWrap.className = "document-tabs__tabs-stack space-y-2 mb-4";

    const content = document.createElement("div");
    content.className = "document-tabs__tab-content";

    const activePanel = document.createElement("div");
    activePanel.setAttribute("data-doc-active-panel", "");

    const allPanel = document.createElement("div");
    allPanel.setAttribute("data-doc-all-panel", "");
    allPanel.classList.add("hidden");

    const sorted = tabs
      .map((t, idx) => ({ t, idx }))
      .sort((a, b) => {
        const ao = Number.isFinite(a.t?.order) ? Number(a.t.order) : 0;
        const bo = Number.isFinite(b.t?.order) ? Number(b.t.order) : 0;
        if (ao !== bo) return ao - bo;
        return a.idx - b.idx;
      })
      .map((x) => x.t);
    let active = 0;
    const hash = String(window.location.hash || "").replace("#", "");
    if (hash) {
      const m = hash.match(/^doc-tab-(\d+)(?:-(\d+))?(?:-(\d+))?$/);
      const idx = m ? Number(m[1]) - 1 : -1;
      if (idx >= 0) active = idx;
    }

    const getChildren = (tab) => {
      if (!tab) return [];
      if (Array.isArray(tab.children)) return tab.children.filter(Boolean);
      if (Array.isArray(tab.tabs)) return tab.tabs.filter(Boolean);
      return [];
    };

    const state = { level1: active, level2: 0, level3: 0 };
    if (hash) {
      const m = hash.match(/^doc-tab-(\d+)(?:-(\d+))?(?:-(\d+))?$/);
      if (m) {
        state.level1 = Math.max(0, Number(m[1]) - 1);
        if (m[2]) state.level2 = Math.max(0, Number(m[2]) - 1);
        if (m[3]) state.level3 = Math.max(0, Number(m[3]) - 1);
      }
    }

    const setHash = (l1, l2, l3, hasL2, hasL3) => {
      let h = `doc-tab-${l1 + 1}`;
      if (hasL2) h += `-${l2 + 1}`;
      if (hasL3) h += `-${l3 + 1}`;
      if (window.location.hash !== `#${h}`) {
        window.history.replaceState(null, "", `#${h}`);
      }
    };

    const renderContent = (t, host) => {
      const body = document.createElement("div");
      const html = String(t?.content || "");
      body.className = "prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary";
      body.innerHTML = html;
      const links = extractLinksFromHtml(html);
      if (links.length) {
        clearNode(body);
        body.className = "max-w-none";
        body.appendChild(renderDocList(links));
      }
      host.appendChild(body);
      bindDocPreviewClicks();
    };

    const renderActive = () => {
      clearNode(activePanel);
      const t1 = sorted[state.level1];
      const lvl2 = getChildren(t1);
      const t2 = lvl2[state.level2] || null;
      const lvl3 = getChildren(t2);
      const t3 = lvl3[state.level3] || null;
      const activeTab = t3 || t2 || t1;
      if (!activeTab) return;
      renderContent(activeTab, activePanel);
    };
    const collectLinks = (tab) => {
      const html = String(tab?.content || "");
      const links = extractLinksFromHtml(html);
      return Array.isArray(links) ? links : [];
    };
    const collectAllLinks = (tabsList) => {
      const acc = [];
      const walk = (t) => {
        acc.push(...collectLinks(t));
        const children = getChildren(t);
        children.forEach(walk);
      };
      tabsList.forEach(walk);
      return acc;
    };

    const keyOf = (t) => String(t?.filterKey ?? "").trim();

    const renderTabsRow = (tabsList, level) => {
      const row = document.createElement("div");
      row.className = "document-tabs__tabs flex flex-wrap gap-2";
      tabsList.forEach((t, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        const key = keyOf(t);
        const isActive =
          (level === 1 && idx === state.level1) ||
          (level === 2 && idx === state.level2) ||
          (level === 3 && idx === state.level3);
        b.setAttribute("data-doc-category-key", key);
        b.className =
          "document-tabs__tab-button px-4 py-2 rounded-lg transition-colors border " +
          (level > 1 ? "text-xs font-bold" : "text-sm font-black") +
          " " +
          (isActive
            ? "bg-primary/20 border-primary/40 text-white"
            : "bg-black/20 border-white/10 text-white/70 hover:bg-black/10");
        b.textContent = String(t.name || `Tab ${idx + 1}`);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
        b.addEventListener("click", () => {
          if (level === 1) {
            state.level1 = idx;
            state.level2 = 0;
            state.level3 = 0;
          } else if (level === 2) {
            state.level2 = idx;
            state.level3 = 0;
          } else {
            state.level3 = idx;
          }
          render();
          b.dispatchEvent(
            new CustomEvent("mgts:docTabChange", {
              bubbles: true,
              detail: { key },
            })
          );
        });
        row.appendChild(b);
      });
      return row;
    };

    const render = () => {
      clearNode(tabsWrap);
      clearNode(allPanel);
      const row1 = renderTabsRow(sorted, 1);
      tabsWrap.appendChild(row1);
      const t1 = sorted[state.level1];
      const lvl2 = getChildren(t1);
      let hasL2 = false;
      let hasL3 = false;
      if (lvl2.length) {
        hasL2 = true;
        const row2 = renderTabsRow(lvl2, 2);
        tabsWrap.appendChild(row2);
        const t2 = lvl2[state.level2] || null;
        const lvl3 = getChildren(t2);
        if (lvl3.length) {
          hasL3 = true;
          const row3 = renderTabsRow(lvl3, 3);
          tabsWrap.appendChild(row3);
        }
      }
      renderActive();
      const allLinks = collectAllLinks(sorted);
      const unique = [];
      const seen = new Set();
      allLinks.forEach((l) => {
        const key = `${l.href}|${l.label}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(l);
      });
      if (unique.length) {
        allPanel.appendChild(renderDocList(unique));
      }
      setHash(state.level1, state.level2, state.level3, hasL2, hasL3);
      window.setTimeout(() => {
        if (wrap.isConnected) {
          document.dispatchEvent(new CustomEvent("mgts:content-updated"));
        }
      }, 0);
    };

    wrap.__setDocSearchMode = (on) => {
      activePanel.classList.toggle("hidden", on);
      allPanel.classList.toggle("hidden", !on);
    };

    wrap.appendChild(tabsWrap);
    content.appendChild(activePanel);
    content.appendChild(allPanel);
    wrap.appendChild(content);
    render();
    return wrap;
  }


  Object.assign(core, {
    fileTypeIcon,
    humanFileType,
    ensureDocPreviewModal,
    bindDocPreviewClicks,
    renderFilesTable,
    initDocFilesFilter,
    renderDocumentTabs
  });
})();

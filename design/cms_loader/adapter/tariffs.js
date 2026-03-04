(function () {
  "use strict";

  const core = window.MGTS_CMS_ADAPTER_CORE || {};
  const { clearNode } = core;

  function fillTariffTable(tableEl, section) {
    if (!tableEl) return;
    const cols = Array.isArray(section?.columns) ? section.columns : [];
    const rows = Array.isArray(section?.rows) ? section.rows : [];

    clearNode(tableEl);

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    trh.className = "bg-slate-50 dark:bg-slate-900/50";
    cols.forEach((col, idx) => {
      const th = document.createElement("th");
      th.className =
        idx === 0
          ? "p-6 text-left text-slate-900 dark:text-white min-w-[220px] border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest"
          : "p-6 text-center text-slate-900 dark:text-white min-w-[220px] border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest";
      if (idx === 0) {
        const wrap = document.createElement("div");
        wrap.className = "flex items-center gap-2";
        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined text-primary";
        icon.textContent = "tune";
        const label = document.createElement("span");
        label.textContent = String(col?.name || col?.key || "");
        wrap.appendChild(icon);
        wrap.appendChild(label);
        th.appendChild(wrap);
      } else {
        th.textContent = String(col?.name || col?.key || "");
      }
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    tableEl.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.className = "row-hover transition-colors";
      cols.forEach((col, idx) => {
        const td = document.createElement("td");
        td.className =
          idx === 0
            ? "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm text-slate-900 dark:text-slate-100 align-top font-semibold"
            : "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm text-center";
        const key = col?.key;
        td.textContent = key ? String(r?.[key] ?? "") : "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    tableEl.appendChild(tbody);
  }


  function renderTariffTable(section) {
    const columns = Array.isArray(section?.columns) ? section.columns : [];
    const rows = Array.isArray(section?.rows) ? section.rows : [];
    if (!columns.length) return null;

    const wrap = document.createElement("section");
    wrap.className =
      "tariff-table max-w-[1200px] mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark p-6 md:p-8 shadow-2xl shadow-primary/5";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className =
        "tariff-table__title text-slate-900 dark:text-white text-3xl font-bold tracking-tight mb-4";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }
    if (section?.description) {
      const p = document.createElement("p");
      p.className = "text-slate-500 dark:text-slate-400 text-lg font-normal max-w-2xl mb-6";
      p.textContent = String(section.description);
      wrap.appendChild(p);
    }

    const tableWrap = document.createElement("div");
    tableWrap.className =
      "tariff-table__table w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark shadow-2xl shadow-primary/5";
    const tableScroll = document.createElement("div");
    tableScroll.className = "overflow-x-auto";

    const table = document.createElement("table");
    table.className = "w-full border-collapse tariff-table__table";

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    trh.className = "bg-slate-50 dark:bg-slate-900/50";
    for (let i = 0; i < columns.length; i += 1) {
      const c = columns[i];
      const th = document.createElement("th");
      th.className =
        i === 0
          ? "p-6 text-left text-slate-900 dark:text-white min-w-[220px] border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest"
          : "p-6 text-center text-slate-900 dark:text-white min-w-[220px] border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest";
      th.textContent = String(c?.name || c?.key || "");
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.className = "row-hover transition-colors";
      for (let i = 0; i < columns.length; i += 1) {
        const c = columns[i];
        const td = document.createElement("td");
        td.className =
          i === 0
            ? "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm align-top text-slate-900 dark:text-slate-100 font-semibold"
            : "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm align-top text-center text-slate-900 dark:text-slate-100";
        const key = c?.key;
        const v = key ? (r ? r[key] : "") : "";
        td.textContent = v == null ? "" : String(v);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    tableScroll.appendChild(table);
    tableWrap.appendChild(tableScroll);
    wrap.appendChild(tableWrap);
    return wrap;
  }


  Object.assign(core, {
    fillTariffTable,
    renderTariffTable
  });
})();

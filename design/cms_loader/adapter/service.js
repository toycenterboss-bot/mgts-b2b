(function () {
  "use strict";

  const core = window.MGTS_CMS_ADAPTER_CORE || {};

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


  function renderServiceFaq(section) {
    const items = Array.isArray(section?.items) ? section.items : [];
    if (!items.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "service-faq rounded-2xl border border-white/10 bg-white/5 p-6";

    const h = document.createElement("h2");
    h.className =
      "service-faq__title text-2xl font-bold flex items-center gap-3 mb-6 text-white";
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
    if (core.ensureTextLinkStyles) core.ensureTextLinkStyles();
    if (core.enhanceDocLinks) core.enhanceDocLinks(ans);
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

    const field = (label, name, type = "text", opts = {}) => {
      const w = document.createElement("label");
      w.className = "service-order-form__field-wrapper flex flex-col gap-2";
      w.dataset.required = opts.required ? "true" : "false";
      const l = document.createElement("span");
      l.className = "service-order-form__label text-xs font-black uppercase tracking-widest text-white/50";
      l.textContent = label;
      const i = document.createElement("input");
      i.className =
        "service-order-form__input h-11 rounded-xl bg-black/20 border border-white/10 px-4 text-sm outline-none focus:border-primary/60";
      i.type = type;
      i.name = name;
      if (opts.maxLength) i.maxLength = opts.maxLength;
      if (type === "tel") {
        i.placeholder = "+7 (___) ___-__-__";
        i.inputMode = "tel";
        i.addEventListener("input", () => {
          const digits = i.value.replace(/\D/g, "").replace(/^7/, "");
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
          i.value = formatted;
        });
      }
      w.appendChild(l);
      w.appendChild(i);
      const counter = document.createElement("div");
      if (opts.maxLength) {
        counter.className = "text-xs text-gray-500 text-right";
        const updateCounter = () => {
          const remaining = Math.max(0, opts.maxLength - i.value.length);
          counter.textContent = `Осталось: ${remaining}`;
        };
        i.addEventListener("input", updateCounter);
        updateCounter();
        w.appendChild(counter);
      }
      const error = document.createElement("div");
      error.className = "text-xs text-red-400 hidden";
      error.textContent = "Пожалуйста, заполните поле";
      w.appendChild(error);
      return w;
    };

    form.appendChild(
      field("Имя", "name", "text", {
        required: section?.nameRequired !== false,
        maxLength: section?.nameMaxLength || 300,
      })
    );
    form.appendChild(
      field("Телефон", "phone", "tel", {
        required: section?.phoneRequired !== false,
        maxLength: section?.phoneMaxLength || 18,
      })
    );
    form.appendChild(
      field("Email", "email", "email", {
        required: section?.emailRequired === true,
        maxLength: section?.emailMaxLength || 300,
      })
    );

    const msgWrap = document.createElement("label");
    msgWrap.className = "service-order-form__field-wrapper flex flex-col gap-2 md:col-span-2";
    msgWrap.dataset.required = section?.messageRequired === true ? "true" : "false";
    const ml = document.createElement("span");
    ml.className = "text-xs font-black uppercase tracking-widest text-white/50";
    ml.textContent = "Комментарий";
    const ta = document.createElement("textarea");
    ta.className = "min-h-[110px] rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary/60";
    ta.name = "message";
    const msgMax = section?.messageMaxLength || 300;
    ta.maxLength = msgMax;
    msgWrap.appendChild(ml);
    msgWrap.appendChild(ta);
    const msgCounter = document.createElement("div");
    msgCounter.className = "text-xs text-gray-500 text-right";
    const updateMsgCounter = () => {
      const remaining = Math.max(0, msgMax - ta.value.length);
      msgCounter.textContent = `Осталось: ${remaining}`;
    };
    ta.addEventListener("input", updateMsgCounter);
    updateMsgCounter();
    msgWrap.appendChild(msgCounter);
    const msgError = document.createElement("div");
    msgError.className = "text-xs text-red-400 hidden";
    msgError.textContent = "Пожалуйста, заполните поле";
    msgWrap.appendChild(msgError);
    form.appendChild(msgWrap);

    const btn = document.createElement("button");
    btn.type = "submit";
    btn.className =
      "service-order-form__button md:col-span-2 h-11 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all";
    btn.textContent = "Отправить";
    form.appendChild(btn);

    form.addEventListener("submit", (e) => {
      let hasError = false;
      const wrappers = Array.from(form.querySelectorAll(".service-order-form__field-wrapper"));
      wrappers.forEach((wrapEl) => {
        const required = wrapEl.dataset.required === "true";
        const input = wrapEl.querySelector("input, textarea");
        const error = wrapEl.querySelector(".text-red-400");
        const value = input ? input.value.trim() : "";
        if (required && !value) {
          hasError = true;
          if (input) {
            input.classList.remove("border-white/10");
            input.classList.add("border-red-500", "focus:border-red-500");
          }
          if (error) error.classList.remove("hidden");
          return;
        }
        if (input && value) {
          if (input.type === "tel" && !isPhoneValid(value)) {
            hasError = true;
            input.classList.remove("border-white/10");
            input.classList.add("border-red-500", "focus:border-red-500");
            if (error) {
              error.textContent = "Некорректный номер";
              error.classList.remove("hidden");
            }
            return;
          }
          if (isSuspicious(value)) {
            hasError = true;
            input.classList.remove("border-white/10");
            input.classList.add("border-red-500", "focus:border-red-500");
            if (error) {
              error.textContent = "Недопустимый ввод";
              error.classList.remove("hidden");
            }
            return;
          }
          if (error) {
            error.textContent = "Пожалуйста, заполните поле";
            error.classList.add("hidden");
          }
          input.classList.remove("border-red-500", "focus:border-red-500");
          input.classList.add("border-white/10");
        }
      });
      if (hasError) e.preventDefault();
    });

    wrap.appendChild(form);
    return wrap;
  }


  function renderServiceTabs(section) {
    const tabs = Array.isArray(section?.tabs) ? section.tabs.filter(Boolean) : [];
    if (!tabs.length) return null;

    const wrap = document.createElement("section");
    wrap.className =
      "service-tabs space-y-6 bg-slate-100 dark:bg-white/[0.02] p-6 lg:p-8 rounded-2xl border border-slate-200 dark:border-white/5";

    if (section?.title) {
      const head = document.createElement("div");
      head.className = "text-center max-w-2xl mx-auto space-y-2";
      const h = document.createElement("h2");
      h.className = "service-tabs__title text-2xl font-bold tracking-tight text-slate-900 dark:text-white";
      h.textContent = String(section.title);
      head.appendChild(h);
      wrap.appendChild(head);
    }

    const root = document.createElement("div");
    root.className = "service-tabs__container";
    root.setAttribute("data-switcher", "");

    const sorted = tabs.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    const defIdx = Number.isFinite(section?.defaultTab) ? Number(section.defaultTab) : 0;
    const active = Math.min(sorted.length - 1, Math.max(0, defIdx));

    const keyOf = (t) => String(t?.order ?? t?.name ?? "");
    const defKey = keyOf(sorted[active]);
    if (defKey) root.setAttribute("data-switcher-default", defKey);

    const tabsWrap = document.createElement("div");
    tabsWrap.className = "flex justify-center";
    const tabsRow = document.createElement("div");
    tabsRow.className = "service-tabs__tabs inline-flex border-b border-slate-200 dark:border-white/10 px-2";

    const content = document.createElement("div");
    content.className = "service-tabs__tab-content pt-6";

    sorted.forEach((t, idx) => {
      const k = keyOf(t);

      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "service-tabs__tab-button relative flex flex-col items-center px-6 py-3 text-sm font-bold tracking-wide transition-colors rounded-t-lg border-b-2 border-transparent text-slate-500 dark:text-slate-400";
      b.textContent = String(t.name || `Tab ${idx + 1}`);
      b.setAttribute("data-switch-trigger", "");
      b.setAttribute("data-switch-key", k);
      b.setAttribute("data-switch-active-classes", "text-primary border-primary");
      b.setAttribute(
        "data-switch-inactive-classes",
        "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 border-transparent"
      );
      tabsRow.appendChild(b);

      const panel = document.createElement("div");
      panel.className = "service-tabs__panel";
      panel.setAttribute("data-switch-panel", "");
      panel.setAttribute("data-switch-key", k);

      const body = document.createElement("div");
      body.className =
        "prose prose-invert max-w-none text-white/80 prose-p:leading-relaxed prose-a:text-primary";
      body.innerHTML = String(t.content || "");
      const imgs = Array.from(body.querySelectorAll("img"));
      imgs.forEach((img) => {
        if (!(img instanceof HTMLImageElement)) return;
        img.style.height = "457px";
        img.style.width = "auto";
        img.style.maxWidth = "100%";
        img.style.objectFit = "contain";
        img.style.display = "block";
        img.style.margin = "0 auto";
      });
      panel.appendChild(body);
      content.appendChild(panel);
    });

    tabsWrap.appendChild(tabsRow);
    root.appendChild(tabsWrap);
    root.appendChild(content);
    wrap.appendChild(root);
    return wrap;
  }


  function initSwitchers(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    const switchers = Array.from(root.querySelectorAll("[data-switcher]")).filter((el) => el instanceof HTMLElement);
    if (switchers.length === 0) return;

    const parseClasses = (s) => String(s || "").trim().split(/\s+/).filter(Boolean);

    for (const sw of switchers) {
      if (sw.getAttribute("data-switcher-initialized") === "1") continue;
      sw.setAttribute("data-switcher-initialized", "1");

      const triggers = Array.from(sw.querySelectorAll("[data-switch-trigger][data-switch-key]")).filter(
        (el) => el instanceof HTMLElement
      );
      const panels = Array.from(sw.querySelectorAll("[data-switch-panel][data-switch-key]")).filter(
        (el) => el instanceof HTMLElement
      );
      if (triggers.length === 0 || panels.length === 0) continue;

      const defaultKey =
        (sw.getAttribute("data-switcher-default") || "").trim() ||
        (triggers[0].getAttribute("data-switch-key") || "").trim();

      const activate = (key) => {
        const k = String(key || "").trim();
        triggers.forEach((t) => {
          const tk = String(t.getAttribute("data-switch-key") || "").trim();
          const isActive = tk === k;
          const on = parseClasses(t.getAttribute("data-switch-active-classes"));
          const off = parseClasses(t.getAttribute("data-switch-inactive-classes"));
          on.forEach((c) => t.classList.toggle(c, isActive));
          off.forEach((c) => t.classList.toggle(c, !isActive));
        });
        panels.forEach((p) => {
          const pk = String(p.getAttribute("data-switch-key") || "").trim();
          p.classList.toggle("hidden", pk !== k);
        });
      };

      triggers.forEach((t) => {
        t.addEventListener("click", (e) => {
          e.preventDefault();
          const k = String(t.getAttribute("data-switch-key") || "").trim();
          if (!k) return;
          activate(k);
        });
      });

      activate(defaultKey);
    }
  }


  Object.assign(core, {
    buildFaqDetailsItem,
    renderServiceFaq,
    renderServiceOrderForm,
    renderServiceTabs,
    initSwitchers
  });
})();

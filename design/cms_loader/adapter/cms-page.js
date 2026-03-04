(function () {
  "use strict";

  const core = window.MGTS_CMS_ADAPTER_CORE || {};
  const {
    STRAPI_BASE,
    getSlugFromQueryOrPath,
    fetchJson,
    clearNode,
    renderSectionText,
    renderCardGrid,
    renderSectionTable,
    renderTariffTable,
    renderServiceFaq,
    renderFilesTable,
    renderDocumentTabs,
    renderImageCarousel,
    renderImageSwitcher,
    renderHistoryTimeline,
    renderCrmCards,
    renderHowToConnect,
    renderSectionMap,
    renderServiceTabs,
    renderServiceOrderForm,
    renderUnknownSection,
    resolveAnyMediaUrl,
    hrefToSlug,
    toPrettyRoute,
    initSidebar,
    renderCareerValues,
    renderCareerVacancies,
    renderCareerWhyCompany,
    renderCareerCvForm,
  } = core;

  async function renderCmsPage() {
    const root = document.querySelector("[data-cms-page]");
    if (!root) return;

    const slug = getSlugFromQueryOrPath("");
    const demo = root.querySelector("[data-cms-demo]");
    const qs = new URLSearchParams(window.location.search || "");
    const debugEnabled = qs.get("cmsDebug") === "1";
    const debugLines = [];
    let debugTone = "text-white/60";
    const ensureDebug = (text, tone = "text-white/60") => {
      if (!debugEnabled) return;
      let box = root.querySelector("[data-cms-debug]");
      if (!box) {
        box = document.createElement("div");
        box.setAttribute("data-cms-debug", "");
        box.className = "mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs";
        const host = root.querySelector("[data-cms-content]") || root;
        host.insertBefore(box, host.firstChild);
      }
      debugTone = tone;
      debugLines.push(text);
      box.className = `mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs ${debugTone}`;
      box.textContent = debugLines.join("\n");
    };

    if (!slug) {
      if (demo) {
        demo.innerHTML =
          '<p class="text-xs font-black uppercase tracking-[0.25em] text-white/40">CMS page demo • укажи <code>?slug=...</code> или открой <code>/career</code></p>';
      }
      ensureDebug("CMS debug: slug не задан. Откройте ?slug=career", "text-amber-300");
      return;
    }

    ensureDebug(`CMS debug: slug=${slug} • strapi=${STRAPI_BASE}`);

    const url = `${STRAPI_BASE}/api/pages/by-slug?slug=${encodeURIComponent(slug)}`;
    let json = null;
    try {
      json = await fetchJson(url);
    } catch (err) {
      if (demo) {
        demo.innerHTML =
          `<p class="text-xs font-black uppercase tracking-[0.25em] text-red-400">CMS error • ${String(err?.message || err)}</p>`;
      }
      ensureDebug(`CMS debug: fetch failed • ${String(err?.message || err)}`, "text-red-400");
      return;
    }
    const page = json && json.data ? json.data : null;
    if (!page) {
      ensureDebug("CMS debug: страница не найдена", "text-red-400");
      return;
    }

    const titleEl = root.querySelector("[data-cms-title]");
    if (titleEl) {
      // Use hero.title if available, otherwise page.title
      titleEl.textContent = page.hero?.title || page.title || slug;
    }

    const subEl = root.querySelector("[data-cms-subtitle]");
    if (subEl) {
      const subtitle = page.hero?.subtitle ? String(page.hero.subtitle) : "";
      subEl.textContent = subtitle;
      subEl.classList.toggle("hidden", !subtitle);
    }

    const applyFullBleed = (sectionEl) => {
      if (!sectionEl) return;
      sectionEl.style.width = "100vw";
      sectionEl.style.marginLeft = "calc(50% - 50vw)";
      sectionEl.style.marginRight = "calc(50% - 50vw)";
    };

    const renderCmsHero = () => {
      if (page?.template && page.template !== "TPL_CMS_Page") return null;
      const hero = page.hero;
      if (!hero) return null;
      const title = String(hero.title || page.title || "");
      const subtitle = hero.subtitle ? String(hero.subtitle) : "";
      const ctaButtons = Array.isArray(hero.ctaButtons) ? hero.ctaButtons.filter(Boolean) : [];

      const heroSection = document.createElement("section");
      heroSection.className = "relative overflow-hidden py-16 lg:py-24 bg-background-dark w-full";
      heroSection.setAttribute("data-cms-hero", "");
      applyFullBleed(heroSection);

      const bgUrl = resolveAnyMediaUrl(hero.backgroundImage);
      if (bgUrl) {
        heroSection.style.backgroundImage =
          "linear-gradient(180deg, rgba(6,10,18,0.78) 0%, rgba(6,10,18,0.85) 100%), " +
          `url('${bgUrl}')`;
        heroSection.style.backgroundSize = "cover";
        heroSection.style.backgroundPosition = "center";
      }

      const container = document.createElement("div");
      container.className = "max-w-[1280px] mx-auto px-6 lg:px-10";

      if (title) {
        const h1 = document.createElement("h1");
        h1.className = "text-4xl lg:text-6xl font-black leading-[1.1] tracking-tight text-white mb-6";
        h1.textContent = title;
        container.appendChild(h1);
      }

      if (subtitle) {
        const p = document.createElement("p");
        p.className = "text-lg text-slate-300 max-w-2xl leading-relaxed mb-8";
        p.textContent = subtitle;
        container.appendChild(p);
      }

      if (ctaButtons.length) {
        const actions = document.createElement("div");
        actions.className = "flex flex-wrap gap-4";
        ctaButtons.forEach((btn) => {
          const a = document.createElement("a");
          const style = String(btn.style || "primary");
          a.href = String(btn.href || "#");
          a.textContent = String(btn.text || "");
          a.className =
            style === "outline"
              ? "bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-lg font-bold text-base backdrop-blur-sm transition-all"
              : style === "secondary"
                ? "bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-bold text-base transition-all"
                : "bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-lg font-bold text-base transition-all";
          actions.appendChild(a);
        });
        container.appendChild(actions);
      }

      heroSection.appendChild(container);
      return heroSection;
    };

    if (demo) demo.remove();
    if (debugEnabled) {
      ensureDebug(`CMS debug: ok • sections=${Array.isArray(page.sections) ? page.sections.length : 0}`, "text-emerald-300");
    }

    const isCeo = slug === "general_director_message";
    // CEO page uses its own dedicated feedback block, so hide the template footer form.
    const ceoOrderSectionEl = document.querySelector("[data-order-form-section]");
    if (isCeo && ceoOrderSectionEl) {
      ceoOrderSectionEl.classList.add("hidden");
    }
    const appendSectionNode = (host, node, section) => {
      if (!host || !node) return;
      const hasBg = !!resolveAnyMediaUrl(section?.backgroundImage);
      if (section?.isVisible === false && !hasBg && node.childNodes && node.childNodes.length) {
        const frag = document.createDocumentFragment();
        while (node.firstChild) frag.appendChild(node.firstChild);
        host.appendChild(frag);
        return;
      }
      if (debugEnabled && node && node.style) {
        node.style.outline = "2px dashed rgba(34,197,94,0.7)";
        node.style.outlineOffset = "4px";
      }
      host.appendChild(node);
    };
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
    const renderSurveyFormSection = (section) => {
      if (!section || section.__component !== "page.form-section") return null;
      const elements = Array.isArray(section.elements) ? section.elements : [];
      const questions = elements.filter((el) => el && (el.text || el.label));
      if (!questions.length) return null;

      const wrap = document.createElement("section");
      wrap.className = "glass-panel rounded-3xl p-6 md:p-10 flex flex-col gap-8";

      const blocks = [];
      questions.forEach((q, idx) => {
        const block = document.createElement("section");
        block.className = "space-y-4";
        const title = document.createElement("h3");
        title.className = "text-white text-lg font-bold tracking-tight";
        title.textContent = String(q.text || q.label || `Вопрос ${idx + 1}`);
        block.appendChild(title);
        const error = document.createElement("div");
        error.className = "text-xs text-red-400 hidden";

        const options = Array.isArray(q.options) ? q.options.filter(Boolean) : [];
        if (options.length) {
          const list = document.createElement("div");
          list.className = "flex flex-col gap-3";
          options.forEach((opt) => {
            const label = document.createElement("label");
            label.className = "flex items-center gap-4 cursor-pointer group";
            const input = document.createElement("input");
            input.type = "radio";
            input.name = `survey_q_${idx + 1}`;
            input.className =
              "w-5 h-5 border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0";
            input.addEventListener("change", () => {
              error.classList.add("hidden");
            });
            const text = document.createElement("span");
            text.className = "text-white/80 group-hover:text-white transition-colors";
            text.textContent = String(opt);
            label.appendChild(input);
            label.appendChild(text);
            list.appendChild(label);
          });
          block.appendChild(list);
        } else {
          const textarea = document.createElement("textarea");
          textarea.rows = 4;
          textarea.placeholder = "Напишите здесь свой ответ...";
          textarea.className =
            "w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";
          textarea.addEventListener("input", () => {
            textarea.classList.remove("border-red-500");
            error.classList.add("hidden");
          });
          block.appendChild(textarea);
        }

        block.appendChild(error);
        wrap.appendChild(block);
        blocks.push({ block, error });
      });

      const footer = document.createElement("div");
      footer.className =
        "flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/10";
      const disclaimer = document.createElement("p");
      disclaimer.className = "text-white/40 text-xs max-w-sm text-center md:text-left";
      if (section.disclaimerHtml) {
        disclaimer.innerHTML = String(section.disclaimerHtml);
      } else {
        disclaimer.textContent =
          "Нажимая кнопку «Отправить», вы соглашаетесь с условиями обработки персональных данных.";
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "glow-button w-full md:w-auto flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-10 bg-primary text-white text-lg font-bold transition-all hover:scale-[1.02] active:scale-95";
      button.textContent = section.submitText || "Отправить";
      button.addEventListener("click", () => {
        let hasErrors = false;
        blocks.forEach(({ block, error }, idx) => {
          const radios = Array.from(block.querySelectorAll("input[type='radio']"));
          const textarea = block.querySelector("textarea");
          if (radios.length) {
            const checked = radios.some((r) => r.checked);
            if (!checked) {
              error.textContent = "Ответьте на вопрос.";
              error.classList.remove("hidden");
              hasErrors = true;
            } else {
              error.classList.add("hidden");
            }
            return;
          }
          if (textarea) {
            const value = String(textarea.value || "").trim();
            if (!value) {
              error.textContent = "Заполните поле.";
              error.classList.remove("hidden");
              textarea.classList.add("border-red-500");
              hasErrors = true;
              return;
            }
            if (isSuspicious(value)) {
              error.textContent = "Обнаружены недопустимые символы или команды.";
              error.classList.remove("hidden");
              textarea.classList.add("border-red-500");
              hasErrors = true;
              return;
            }
            error.classList.add("hidden");
            textarea.classList.remove("border-red-500");
          }
        });
        if (hasErrors) {
          const first = blocks.find(({ error }) => !error.classList.contains("hidden"));
          if (first && first.block.scrollIntoView) {
            first.block.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      });
      footer.appendChild(disclaimer);
      footer.appendChild(button);
      wrap.appendChild(footer);

      return wrap;
    };
    let sectionsHost = root.querySelector("[data-cms-sections]");
    const contentHost = root.querySelector("[data-cms-content]") || root;
    const sections = Array.isArray(page.sections) ? page.sections : [];
    const isDeepNavTemplate =
      document.body && document.body.getAttribute("data-page") === "tpl_deepnav";
    const cardVariant =
      isDeepNavTemplate || page?.template === "TPL_DeepNav" || page?.template === "TPL_Service"
        ? "service-cards"
        : "default";
    const orderSection = sections.find((s) => s?.__component === "page.service-order-form");
    const consultSectionData = sections.find((s) => s?.__component === "page.service-consultation-card");
    const orderSectionEl = document.querySelector("[data-order-form-section]");
    if (contentHost && !isCeo) {
      const existingHero = contentHost.querySelector("[data-cms-hero]");
      if (existingHero) existingHero.remove();
      const heroSection = renderCmsHero();
      if (heroSection) {
        if (sectionsHost && sectionsHost.parentElement) {
          sectionsHost.parentElement.insertBefore(heroSection, sectionsHost);
        } else {
          contentHost.insertBefore(heroSection, contentHost.firstChild);
        }
      }
    }

    if (!sectionsHost && contentHost) {
      sectionsHost = document.createElement("div");
      sectionsHost.className = "space-y-10";
      sectionsHost.setAttribute("data-cms-sections", "");
      contentHost.appendChild(sectionsHost);
    }

    let renderedCount = 0;
    const renderedComponents = [];

    if (sectionsHost && !isCeo) {
      clearNode(sectionsHost);
      for (const s of sections) {
        if (s && s.__component === "page.section-text") {
          const node = renderSectionText(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.section-cards") {
          const node = renderCardGrid(s.title || "", s.cards || [], {
            columns: s.columns,
            subtitle: s.subtitle,
            variant: cardVariant,
          });
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.section-grid") {
          const node = renderCardGrid(s.title || "", s.items || []);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.section-table") {
          const node = renderSectionTable(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.tariff-table") {
          const node = renderTariffTable(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.service-faq") {
          const node = renderServiceFaq(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.files-table") {
          const node = renderFilesTable(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.document-tabs") {
          const node = renderDocumentTabs(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.image-carousel") {
          const node = renderImageCarousel(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.image-switcher") {
          const node = renderImageSwitcher(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.history-timeline") {
          const node = renderHistoryTimeline(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.crm-cards") {
          const node = renderCrmCards(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.how-to-connect") {
          const node = renderHowToConnect(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.section-map") {
          const node = renderSectionMap(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.service-tabs") {
          const node = renderServiceTabs(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.service-order-form") {
          if (!orderSectionEl) {
          const node = renderServiceOrderForm(s);
            if (node) {
              appendSectionNode(sectionsHost, node, s);
              renderedCount += 1;
              renderedComponents.push(s.__component);
            }
          }
        } else if (s && s.__component === "page.form-section") {
          const node = renderSurveyFormSection(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.service-consultation-card") {
          // Render below as a dedicated block near footer.
          continue;
        } else if (s && s.__component === "page.career-values") {
          const node = renderCareerValues(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.career-vacancies") {
          const node = renderCareerVacancies(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.career-why-company") {
          const node = renderCareerWhyCompany(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else if (s && s.__component === "page.career-cv-form") {
          const node = renderCareerCvForm(s);
          if (node) {
            appendSectionNode(sectionsHost, node, s);
            renderedCount += 1;
            renderedComponents.push(s.__component);
          }
        } else {
          if (typeof renderUnknownSection === "function") {
          sectionsHost.appendChild(renderUnknownSection(s));
            renderedCount += 1;
            renderedComponents.push(s?.__component || "unknown");
          }
        }
      }

    }

    if (debugEnabled) {
      if (!sectionsHost) {
        ensureDebug("CMS debug: не найден [data-cms-sections] — секции не отрисованы", "text-red-400");
      } else {
        ensureDebug(`CMS debug: sections=${Array.isArray(sections) ? sections.length : 0} • rendered=${renderedCount} • ${renderedComponents.join(", ")}`, "text-emerald-300");
        const details = (Array.isArray(sections) ? sections : []).map((s) => {
          const comp = s?.__component || "unknown";
          if (comp === "page.career-values") {
            return `${comp}: title=${s?.title || ""} items=${(s?.items || []).length}`;
          }
          if (comp === "page.career-vacancies") {
            return `${comp}: title=${s?.title || ""} vacancies=${(s?.vacancies || []).length} filters=${(s?.filters || []).length}`;
          }
          if (comp === "page.career-why-company") {
            const cards = s?.cards || [];
            const items = cards.map((c) => (c?.items || []).length).join("/");
            return `${comp}: title=${s?.title || ""} cards=${cards.length} items=${items}`;
          }
          if (comp === "page.career-cv-form") {
            return `${comp}: title=${s?.title || ""}`;
          }
          return comp;
        });
        if (details.length) {
          ensureDebug(`CMS debug: details\n${details.join("\n")}`, "text-emerald-300");
        }
      }
    }

    // Trigger loader modules (carousel, tabs, etc.) after dynamic render.
    document.dispatchEvent(new CustomEvent("mgts:content-updated"));

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

    if (consultSectionData && consultSectionData.isVisible !== false) {
      const consultSection = document.querySelector('[data-stitch-block="service_consultation_card"]');
      if (consultSection) {
        consultSection.classList.remove("hidden");
        const title = consultSection.querySelector("[data-service-consult-title]");
        const subtitle = consultSection.querySelector("[data-service-consult-subtitle]");
        if (title) title.textContent = String(consultSectionData.title || "");
        if (subtitle) subtitle.textContent = String(consultSectionData.subtitle || "");
        const btn = consultSection.querySelector("[data-service-consult-button]");
        if (btn) {
          const label = consultSectionData.buttonText ? String(consultSectionData.buttonText) : "";
          btn.innerHTML = `
            <svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3 8.5 12 13.5 21 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${label}</span>
          `;
          bindButtonHref(btn, consultSectionData.buttonHref || "");
        }
      } else {
        const footer = document.querySelector('[data-stitch-block="footer_and_contact_form"]');
        const holder = document.createElement("section");
        holder.className = "py-24 bg-background-light dark:bg-background-dark relative";
        holder.setAttribute("data-stitch-block", "service_consultation_card");
        holder.innerHTML = `
          <div class="max-w-[1200px] mx-auto px-6 lg:px-10">
            <div class="relative rounded-[2rem] overflow-hidden p-8 md:p-16 border border-white/5 shadow-2xl">
              <div class="absolute inset-0 tech-gradient z-0"></div>
              <div class="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none"
                style="background-image: radial-gradient(circle at 20% 50%, #0066cc 0%, transparent 50%);"></div>
              <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                <div class="max-w-2xl text-center lg:text-left">
                  <h2 class="text-4xl md:text-5xl font-black text-white leading-tight mb-6 tracking-tight" data-service-consult-title></h2>
                  <p class="text-slate-400 text-lg md:text-xl leading-relaxed" data-service-consult-subtitle></p>
                </div>
                <div class="flex flex-col gap-6 w-full max-w-sm">
                  <button
                    class="w-full bg-primary hover:bg-primary/90 text-white py-5 px-8 rounded-xl text-xl font-bold transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-3"
                    data-service-consult-button></button>
                </div>
              </div>
              <div class="absolute bottom-4 left-4 text-white/5">
                <span class="material-symbols-outlined text-4xl">cloud_queue</span>
              </div>
            </div>
          </div>
        `;
        const title = holder.querySelector("[data-service-consult-title]");
        const subtitle = holder.querySelector("[data-service-consult-subtitle]");
        if (title) title.textContent = String(consultSectionData.title || "");
        if (subtitle) subtitle.textContent = String(consultSectionData.subtitle || "");
        const btn = holder.querySelector("[data-service-consult-button]");
        if (btn) {
          const label = consultSectionData.buttonText ? String(consultSectionData.buttonText) : "";
          btn.innerHTML = `
            <svg class="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3 8.5 12 13.5 21 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${label}</span>
          `;
          bindButtonHref(btn, consultSectionData.buttonHref || "");
        }
        if (footer && footer.parentElement) {
          footer.parentElement.insertBefore(holder, footer);
        } else if (sectionsHost && sectionsHost.parentElement) {
          sectionsHost.parentElement.appendChild(holder);
        }
      }
      if (orderSectionEl) orderSectionEl.classList.add("hidden");
    }

    const sidebarPromise = Promise.resolve(initSidebar(page, root));
    if (isCeo) {
      return sidebarPromise.then(() => injectCeoTemplate(root, page));
    }
    return sidebarPromise;
  }

  async function injectCeoTemplate(root, page) {
    const contentWrap =
      root.querySelector("[data-cms-content]") ||
      root.querySelector("[data-cms-sections]") ||
      root;
    if (!contentWrap) return;
    let html = "";
    const templateCandidates = [
      "/html_pages/page_ceo_feedback.html",
      "page_ceo_feedback.html",
      "/html_blocks/ceo_address_and_feedback_page/block.html",
      "html_blocks/ceo_address_and_feedback_page/block.html",
    ];
    for (const candidate of templateCandidates) {
      try {
        const url = new URL(candidate, window.location.href).toString();
        const res = await fetch(url, { credentials: "omit" });
        if (res.ok) {
          html = await res.text();
          if (html) break;
        }
      } catch {
        // ignore
      }
    }
    if (!html) return;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const section = doc.querySelector('[data-stitch-block="ceo_address_and_feedback_page"]');
    if (!section) return;

    clearNode(contentWrap);
    const holder = document.createElement("div");
    holder.innerHTML = section.outerHTML;
    const ceoSection = holder.firstElementChild;
    if (ceoSection) contentWrap.appendChild(ceoSection);

    const h1 = contentWrap.querySelector("h1");
    if (h1) h1.textContent = String(page.title || "Обращение генерального директора");

    const ceoMain = contentWrap.querySelector(
      '[data-stitch-block="ceo_address_and_feedback_page"] main'
    );
    if (ceoMain) {
      ceoMain.classList.remove("px-6", "md:px-20", "lg:px-40");
      ceoMain.classList.add("px-0");
    }

    const ceoRoot = contentWrap.querySelector(
      '[data-stitch-block="ceo_address_and_feedback_page"] .relative.z-10.flex'
    );
    if (ceoRoot) {
      ceoRoot.classList.remove("min-h-screen");
      ceoRoot.classList.add("justify-start", "items-start");
    }

    const ceoLeftCol = contentWrap.querySelector(
      '[data-stitch-block="ceo_address_and_feedback_page"] .lg\\:col-span-5'
    );
    if (ceoLeftCol) {
      ceoLeftCol.classList.remove("sticky", "top-28");
      ceoLeftCol.classList.add("self-start");
    }

    const textWrap =
      contentWrap.querySelector(".space-y-6.text-lg") ||
      contentWrap.querySelector(".space-y-6");
    if (textWrap && Array.isArray(page.sections)) {
      const htmlContent = page.sections
        .filter((s) => s && s.__component === "page.section-text" && s.content)
        .map((s) => String(s.content))
        .join("\n");
      if (htmlContent) textWrap.innerHTML = htmlContent;
    }

    const ceoScope =
      contentWrap.querySelector('[data-stitch-block="ceo_address_and_feedback_page"]') ||
      contentWrap;
    const feedbackSection = contentWrap.querySelector('section.mt-24.mb-20');
    const feedbackData = Array.isArray(page.sections)
      ? page.sections.find((s) => s && s.__component === "page.ceo-feedback")
      : null;

    if (feedbackSection && feedbackData) {
      const leftCol = feedbackSection.querySelector(".grid > div");
      if (leftCol) {
        const titleEl = leftCol.querySelector("h2");
        if (titleEl && feedbackData.title) titleEl.textContent = String(feedbackData.title);

        const descEl = leftCol.querySelector("p");
        if (descEl && feedbackData.description) descEl.textContent = String(feedbackData.description);

        const noteWrap = leftCol.querySelector(".flex.items-center");
        if (noteWrap) {
          const iconEl = noteWrap.querySelector(".material-symbols-outlined");
          if (iconEl && feedbackData.noteIcon) iconEl.textContent = String(feedbackData.noteIcon);
          const noteTextEl = noteWrap.querySelector("span:last-child");
          if (noteTextEl && feedbackData.note) noteTextEl.textContent = String(feedbackData.note);
        }
      }

      const portrait = resolveAnyMediaUrl(feedbackData.portraitImage);
      if (portrait) {
        const img =
          ceoScope.querySelector("img[data-alt]") ||
          ceoScope.querySelector(".aspect-\\[3\\/4\\] img") ||
          ceoScope.querySelector("img");
        if (img) img.setAttribute("src", portrait);
      }

      const videoUrl = resolveAnyMediaUrl(feedbackData.video);
      const modal = ceoScope.querySelector("#ceo-video-modal");
      const playBtn = ceoScope.querySelector("[data-modal-open='ceo-video-modal']");
      const badge = ceoScope.querySelector(".absolute.bottom-6.left-6");
      if (videoUrl) {
        const videoEl = ceoScope.querySelector("video");
        if (videoEl) {
          videoEl.setAttribute("src", videoUrl);
          videoEl.load();
        }
        if (modal && playBtn) {
          const openModal = () => {
            modal.classList.remove("hidden");
            modal.setAttribute("aria-hidden", "false");
            const v = modal.querySelector("video");
            if (v && v.play) {
              v.play().catch(() => {
                // ignore autoplay restrictions
              });
            }
          };
          const closeModal = () => {
            modal.classList.add("hidden");
            modal.setAttribute("aria-hidden", "true");
            const v = modal.querySelector("video");
            if (v && v.pause) v.pause();
          };
          playBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openModal();
          });
          const overlay = modal.querySelector("[data-modal-overlay]");
          const closeBtn = modal.querySelector("[data-modal-close]");
          if (overlay) overlay.addEventListener("click", closeModal);
          if (closeBtn) closeBtn.addEventListener("click", closeModal);
        }
      } else {
        if (playBtn) playBtn.classList.add("hidden");
        if (badge) badge.classList.add("hidden");
        if (modal) modal.remove();
      }

      const form = feedbackSection.querySelector("form");
      if (form) {
        const labels = form.querySelectorAll("label");
        const inputs = form.querySelectorAll("input, textarea");

        const labelValues = [
          feedbackData.nameLabel,
          feedbackData.companyLabel,
          feedbackData.emailLabel,
          feedbackData.messageLabel,
        ];
        labels.forEach((label, idx) => {
          const value = labelValues[idx];
          if (value) label.textContent = String(value);
        });

        const placeholderValues = [
          feedbackData.namePlaceholder,
          feedbackData.companyPlaceholder,
          feedbackData.emailPlaceholder,
          feedbackData.messagePlaceholder,
        ];
        inputs.forEach((input, idx) => {
          const value = placeholderValues[idx];
          if (value) input.setAttribute("placeholder", String(value));
        });

        const submitText = form.querySelector("button[type='submit'] span");
        if (submitText && feedbackData.submitLabel) {
          submitText.textContent = String(feedbackData.submitLabel);
        }

        const disclaimer = form.querySelector("p");
        if (disclaimer && feedbackData.disclaimer) {
          disclaimer.textContent = String(feedbackData.disclaimer);
        }
      }
    } else if (feedbackSection) {
      // If no CEO feedback component is provided from Strapi, remove template block.
      feedbackSection.remove();
    }

    const quote = contentWrap.querySelector("blockquote");
    if (quote) quote.remove();

    const signature =
      contentWrap.querySelector("div.flex.items-center.gap-8.mt-6.pt-8.border-t") ||
      contentWrap.querySelector(".border-t.border-white/10");
    if (signature) signature.remove();

    document.dispatchEvent(new CustomEvent("mgts:content-updated"));
  }


  Object.assign(core, {
    renderCmsPage
  });

  // Fallback: ensure CMS pages render even if pages.js did not run.
  if (!window.__MGTS_CMS_PAGE_AUTO_RENDER) {
    window.__MGTS_CMS_PAGE_AUTO_RENDER = true;
    const run = () => {
      renderCmsPage().catch((err) => {
        console.error("[CMS_ADAPTER] renderCmsPage failed:", err);
      });
    };
    if (document.readyState !== "loading") run();
    else document.addEventListener("DOMContentLoaded", run);
  }
})();

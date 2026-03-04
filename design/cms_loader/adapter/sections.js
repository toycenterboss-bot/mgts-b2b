(function () {
  "use strict";

  const core = window.MGTS_CMS_ADAPTER_CORE || {};
  const {
    resolveAnyMediaUrl,
    resolveIconMediaUrl,
    clearNode,
    assignImageSourceWithFallback,
    ensureIconPreviewByName,
    isCustomIconName,
  } = core;

  function resolveIconPreviewUrl(icon) {
    if (typeof resolveIconMediaUrl === "function") {
      return resolveIconMediaUrl(icon);
    }
    const preview =
      icon?.preview ||
      icon?.previewImage ||
      icon?.data?.attributes?.preview ||
      icon?.attributes?.preview ||
      icon?.data?.preview ||
      null;
    return preview ? resolveAnyMediaUrl(preview) : null;
  }

  function buildIconElement({ icon, fallback, spanClass, imgClass, alt }) {
    const url = resolveIconPreviewUrl(icon);
    if (url) {
      const img = document.createElement("img");
      if (typeof assignImageSourceWithFallback === "function") {
        assignImageSourceWithFallback(img, url);
      } else {
        img.src = url;
      }
      img.alt = alt || "";
      img.className = imgClass || "w-8 h-8 object-contain";
      img.loading = "lazy";
      img.decoding = "async";
      return img;
    }
    const name = typeof icon === "string" ? String(icon).trim() : "";
    const isCustom = name && typeof isCustomIconName === "function" ? isCustomIconName(name) : false;
    const span = document.createElement("span");
    span.className = spanClass || "material-symbols-outlined";
    if (isCustom) {
      span.textContent = fallback || "image";
      if (typeof ensureIconPreviewByName === "function") {
        ensureIconPreviewByName(name).then((resolvedUrl) => {
          if (!resolvedUrl) return;
          if (!span.parentElement) return;
          const img = document.createElement("img");
          if (typeof assignImageSourceWithFallback === "function") {
            assignImageSourceWithFallback(img, resolvedUrl);
          } else {
            img.src = resolvedUrl;
          }
          img.alt = alt || "";
          img.className = imgClass || "w-8 h-8 object-contain";
          img.loading = "lazy";
          img.decoding = "async";
          span.replaceWith(img);
        });
      }
    } else {
      span.textContent = fallback || name || "";
    }
    return span;
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

  function normalizeHref(href) {
    const raw = String(href || "").trim();
    if (!raw) return "";
    if (/^(https?:)?\/\//i.test(raw)) return raw;
    if (/^(mailto:|tel:|#)/i.test(raw)) return raw;
    if (raw.startsWith("/")) return raw;
    return `/${raw}`;
  }

  function isDocExt(ext) {
    return ["pdf", "doc", "docx", "xls", "xlsx", "zip"].includes(ext);
  }

  function isImageExt(ext) {
    return ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"].includes(ext);
  }

  function resolveContentImageUrl(href) {
    const normalized = normalizeHref(href);
    if (!normalized) return "";
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return `${core.STRAPI_BASE}${normalized}`;
  }

  function renderInlineImages(root) {
    if (!root) return;
    const images = Array.from(root.querySelectorAll("img[src]"));
    images.forEach((img) => {
      const raw = String(img.getAttribute("src") || "").trim();
      if (!raw) return;
      if (!/^https?:\/\//i.test(raw)) {
        const normalized = raw.startsWith("/") ? raw : `/${raw}`;
        img.setAttribute("src", `${core.STRAPI_BASE}${normalized}`);
      }
      img.classList.add("w-full", "h-auto", "rounded-xl", "border", "border-white/10");
    });

    const anchors = Array.from(root.querySelectorAll("a[href]"));
    anchors.forEach((a) => {
      if (a.querySelector("img")) return;
      const href = normalizeHref(a.getAttribute("href") || "");
      const ext = extFromUrl(href);
      if (!isImageExt(ext)) return;
      const imgUrl = resolveContentImageUrl(href);
      if (!imgUrl) return;
      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = String(a.textContent || "").trim();
      img.className = "w-full h-auto rounded-xl border border-white/10";
      const figure = document.createElement("figure");
      figure.className = "my-6";
      figure.appendChild(img);
      const parent = a.parentElement;
      if (parent && parent.tagName && parent.tagName.toLowerCase() === "p" && parent.childNodes.length === 1) {
        parent.replaceWith(figure);
      } else {
        a.replaceWith(figure);
      }
    });
  }

  function renderMarkdownImages(root) {
    if (!root) return;
    const { NodeFilter } = window;
    const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      const parent = node.parentElement;
      if (parent && parent.closest("a, img, code, pre")) continue;
      if (!pattern.test(node.nodeValue)) continue;
      nodes.push(node);
    }
    nodes.forEach((textNode) => {
      const text = textNode.nodeValue || "";
      let lastIndex = 0;
      const frag = document.createDocumentFragment();
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text))) {
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const alt = String(match[1] || "").trim();
        const rawUrl = String(match[2] || "").trim();
        const imgUrl = resolveContentImageUrl(rawUrl);
        if (imgUrl) {
          const figure = document.createElement("figure");
          figure.className = "my-6";
          const img = document.createElement("img");
          img.src = imgUrl;
          img.alt = alt;
          img.className = "w-full h-auto rounded-xl border border-white/10";
          figure.appendChild(img);
          frag.appendChild(figure);
        } else {
          frag.appendChild(document.createTextNode(match[0]));
        }
        lastIndex = pattern.lastIndex;
      }
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      if (frag.childNodes.length) {
        textNode.parentNode.replaceChild(frag, textNode);
      }
    });
  }

  function normalizeExistingLists(root) {
    if (!root) return;
    const uls = Array.from(root.querySelectorAll("ul"));
    const ols = Array.from(root.querySelectorAll("ol"));
    uls.forEach((ul) => {
      ul.classList.add("list-disc", "list-inside", "pl-4", "space-y-1");
      ul.style.setProperty("list-style-type", "disc", "important");
      ul.style.setProperty("list-style-position", "outside", "important");
      ul.style.setProperty("padding-left", "1.25rem", "important");
    });
    ols.forEach((ol) => {
      ol.classList.add("list-decimal", "list-inside", "pl-4", "space-y-1");
      ol.style.setProperty("list-style-type", "decimal", "important");
      ol.style.setProperty("list-style-position", "outside", "important");
      ol.style.setProperty("padding-left", "1.25rem", "important");
    });
    const items = Array.from(root.querySelectorAll("ul li, ol li"));
    items.forEach((li) => {
      li.style.setProperty("display", "list-item", "important");
    });
  }

  function docIconColors(ext) {
    if (ext === "pdf") return ["bg-red-500/10", "text-red-500"];
    if (ext === "doc" || ext === "docx") return ["bg-blue-500/10", "text-blue-500"];
    if (ext === "xls" || ext === "xlsx") return ["bg-emerald-500/10", "text-emerald-400"];
    return ["bg-slate-500/10", "text-slate-400"];
  }

  function renderInlineDocList(links) {
    const list = document.createElement("div");
    list.className = "space-y-4";
    links.forEach((lnk) => {
      const href = normalizeHref(lnk.href);
      const ext = extFromUrl(href);
      const [bgCls, textCls] = docIconColors(ext);
      const item = document.createElement("div");
      item.className =
        "flex items-center justify-between p-4 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";

      const left = document.createElement("div");
      left.className = "flex items-center gap-4";

      const iconWrap = document.createElement("div");
      iconWrap.className = `size-10 flex items-center justify-center ${bgCls} ${textCls} rounded-lg`;
      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.textContent = core.fileTypeIcon ? core.fileTypeIcon(ext) : "attach_file";
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
      title.setAttribute("data-route-open", href);
      title.setAttribute("data-doc-file-item", "");
      title.setAttribute("data-file-name", lnk.label.toLowerCase());
      title.setAttribute("data-file-type", ext);
      const meta = document.createElement("p");
      meta.className = "text-xs text-slate-500 dark:text-slate-400";
      meta.textContent = `${core.humanFileType ? core.humanFileType(ext) : ext.toUpperCase()} • документ`;

      text.appendChild(title);
      text.appendChild(meta);

      left.appendChild(iconWrap);
      left.appendChild(text);

      const action = document.createElement("a");
      action.className =
        "size-9 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all";
      action.href = href;
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

  function enhanceDocLinks(body) {
    if (!body) return;
    const anchors = Array.from(body.querySelectorAll("a[href]"));
    const links = anchors
      .map((a) => ({
        href: normalizeHref(a.getAttribute("href") || ""),
        label: String(a.textContent || "").trim(),
      }))
      .filter((l) => l.href && l.label && isDocExt(extFromUrl(l.href)));
    if (!links.length) return;

    const lists = Array.from(body.querySelectorAll("ul, ol"));
    lists.forEach((list) => {
      const listLinks = Array.from(list.querySelectorAll("a[href]"));
      if (!listLinks.length) return;
      const allDocs = listLinks.every((a) => isDocExt(extFromUrl(a.getAttribute("href") || "")));
      if (allDocs) list.remove();
    });

    const wrap = document.createElement("div");
    wrap.className = "mt-6";
    wrap.appendChild(renderInlineDocList(links));
    body.appendChild(wrap);

    if (core.ensureDocPreviewModal) core.ensureDocPreviewModal();
    if (core.bindDocPreviewClicks) core.bindDocPreviewClicks();
  }

  function linkifyWebLinks(root) {
    if (!root) return;
    const { NodeFilter } = window;
    const pattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      if (node.parentElement && node.parentElement.closest("a")) continue;
      nodes.push(node);
    }
    nodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      let match;
      let lastIndex = 0;
      const frag = document.createDocumentFragment();
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text))) {
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const raw = match[1];
        const href = raw.startsWith("http") ? raw : `http://${raw}`;
        const a = document.createElement("a");
        a.href = href;
        a.textContent = raw;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        frag.appendChild(a);
        lastIndex = pattern.lastIndex;
      }
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      if (frag.childNodes.length) {
        textNode.parentNode.replaceChild(frag, textNode);
      }
    });
  }

  function linkifyContactHtml(root) {
    if (!root) return;
    const { NodeFilter } = window;
    const emailRegex = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
    const phoneRegex = /((?:\+7|8)\s*495[\d\s().-]*)/g;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      if (node.parentElement && node.parentElement.closest("a")) continue;
      nodes.push(node);
    }
    nodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      let lastIndex = 0;
      const frag = document.createDocumentFragment();
      const combined = new RegExp(
        `${emailRegex.source}|${phoneRegex.source}`,
        "gi"
      );
      combined.lastIndex = 0;
      let match;
      while ((match = combined.exec(text))) {
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const raw = match[0];
        if (emailRegex.test(raw)) {
          const a = document.createElement("a");
          a.href = `mailto:${raw}`;
          a.textContent = raw;
          frag.appendChild(a);
        } else if (phoneRegex.test(raw)) {
          const tel = normalizeTel(raw);
          if (tel) {
            const a = document.createElement("a");
            a.href = `tel:${tel}`;
            a.textContent = raw;
            frag.appendChild(a);
          } else {
            frag.appendChild(document.createTextNode(raw));
          }
        } else {
          frag.appendChild(document.createTextNode(raw));
        }
        lastIndex = combined.lastIndex;
      }
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      if (frag.childNodes.length) {
        textNode.parentNode.replaceChild(frag, textNode);
      }
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeTel(raw) {
    const digits = String(raw || "").replace(/[^\d+]/g, "");
    if (!digits) return "";
    if (digits.startsWith("+")) return digits;
    if (digits.startsWith("8") && digits.length === 11) return `+7${digits.slice(1)}`;
    if (digits.startsWith("7") && digits.length === 11) return `+${digits}`;
    return digits;
  }

  function linkifyContactText(text) {
    const safe = escapeHtml(text);
    const emailRegex = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
    const phoneRegex = /((?:\+7|8)\s*495[\d\s().-]*)/g;
    let result = safe.replace(emailRegex, (match) => `<a href="mailto:${match}">${match}</a>`);
    result = result.replace(phoneRegex, (match) => {
      const tel = normalizeTel(match);
      if (!tel) return match;
      return `<a href="tel:${tel}">${match}</a>`;
    });
    return result;
  }

  function ensureTextLinkStyles() {
    if (document.getElementById("cms-text-link-styles")) return;
    const style = document.createElement("style");
    style.id = "cms-text-link-styles";
    style.textContent = `
.cms-text-content a,
.service-faq__answer a {
  color: var(--color-primary, #3b82f6);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.cms-text-content a:hover,
.service-faq__answer a:hover {
  opacity: 0.85;
  text-decoration-thickness: 2px;
}
    `.trim();
    document.head.appendChild(style);
  }

  function socialIconBadge(label, platform) {
    const badge = document.createElement("div");
    badge.className = "size-10 rounded-lg flex items-center justify-center font-black text-xs";
    const p = String(platform || "").toLowerCase();
    let text = String(label || "").trim();
    let bg = "bg-slate-500/10";
    let fg = "text-slate-300";
    if (p === "vk") {
      text = "VK";
      bg = "bg-blue-500/15";
      fg = "text-blue-400";
    } else if (p === "ok") {
      text = "OK";
      bg = "bg-orange-500/15";
      fg = "text-orange-400";
    } else if (p === "telegram") {
      text = "TG";
      bg = "bg-sky-500/15";
      fg = "text-sky-400";
    } else if (p === "youtube") {
      text = "YT";
      bg = "bg-red-500/15";
      fg = "text-red-400";
    } else if (text) {
      text = text.slice(0, 2).toUpperCase();
    } else {
      text = "SN";
    }
    badge.classList.add(bg, fg);
    badge.textContent = text;
    return badge;
  }

  function renderSocialLinks(section) {
    const group = section?.socialLinks;
    const items = Array.isArray(group?.items) ? group.items.filter(Boolean) : [];
    if (!items.length) return null;

    const wrap = document.createElement("div");
    wrap.className = "mt-6";

    if (group?.title) {
      const h = document.createElement("h3");
      h.className = "text-sm font-black uppercase tracking-widest text-white/70 mb-3";
      h.textContent = String(group.title);
      wrap.appendChild(h);
    }

    const list = document.createElement("div");
    list.className = "grid grid-cols-1 sm:grid-cols-2 gap-3";

    items.forEach((it) => {
      const a = document.createElement("a");
      a.className =
        "flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/10 transition-colors p-3";
      a.href = String(it.href || "#");
      a.target = "_blank";
      a.rel = "noreferrer";

      const iconUrl = resolveAnyMediaUrl(it.icon);
      if (iconUrl) {
        const imgWrap = document.createElement("div");
        imgWrap.className = "size-10 rounded-lg overflow-hidden bg-white/5 border border-white/10";
        const img = document.createElement("img");
        img.className = "h-full w-full object-contain";
        img.alt = "";
        img.src = iconUrl;
        imgWrap.appendChild(img);
        a.appendChild(imgWrap);
      } else {
        a.appendChild(socialIconBadge(it.label, it.platform));
      }

      const text = document.createElement("div");
      const title = document.createElement("div");
      title.className = "text-sm font-bold";
      title.textContent = String(it.label || "");
      const subtitle = document.createElement("div");
      subtitle.className = "text-xs text-white/55";
      subtitle.textContent = String(it.href || "");
      text.appendChild(title);
      text.appendChild(subtitle);
      a.appendChild(text);

      list.appendChild(a);
    });

    wrap.appendChild(list);
    return wrap;
  }

  function renderSectionText(section) {
    const wrap = document.createElement("section");
    wrap.className = "rounded-2xl border border-white/10 bg-white/5 p-6";
    const bgUrl = resolveAnyMediaUrl(section?.backgroundImage);
    if (bgUrl) {
      wrap.style.backgroundImage = `url('${bgUrl}')`;
      wrap.style.backgroundSize = "cover";
      wrap.style.backgroundPosition = "center";
      wrap.style.backgroundRepeat = "no-repeat";
    }
    const title = section?.title ? String(section.title) : "";
    const content = section?.content ? String(section.content) : "";
    if (title) {
      const h = document.createElement("h2");
      h.className = "text-slate-900 dark:text-white text-3xl font-bold tracking-tight mb-4";
      h.textContent = title;
      wrap.appendChild(h);
    }
    const body = document.createElement("div");
    body.className =
      "cms-text-content prose prose-lg max-w-none text-slate-800 dark:text-white prose-p:leading-relaxed prose-a:text-primary";
    body.innerHTML = content || "";
    ensureTextLinkStyles();
    renderMarkdownImages(body);
    linkifyWebLinks(body);
    renderInlineImages(body);
    normalizeExistingLists(body);
    const bulletPattern = "[-•–—]";
    const orderedPrefixPattern = /^\d+(?:\.\d+)*[.)]\s+/;
    const orderedInlinePattern = /(?:^|\s)(\d+(?:\.\d+)*[.)]\s+)/g;
    const normalizeWhitespace = (value) => String(value || "").replace(/\u00a0/g, " ");
    const ensureBulletPrefix = (value) => {
      const raw = normalizeWhitespace(value).trim();
      if (!raw) return raw;
      return new RegExp(`^${bulletPattern}\\s+`).test(raw) ? raw : `• ${raw}`;
    };
    const parseListItem = (text) => {
      const raw = normalizeWhitespace(text).trim();
      if (!raw) return null;
      if (orderedPrefixPattern.test(raw)) {
        return { type: "ol", text: raw.replace(orderedPrefixPattern, ""), raw };
      }
      const bulletStart = new RegExp(`^${bulletPattern}\\s+`);
      if (bulletStart.test(raw)) {
        return { type: "ul", text: raw.replace(bulletStart, ""), raw };
      }
      return null;
    };

    const splitInlineBullets = (text) => {
      const raw = normalizeWhitespace(text).trim();
      const matches = raw.match(new RegExp(`(?:^|\\s)${bulletPattern}\\s+`, "g"));
      if (!matches || matches.length < 2) return null;
      const parts = raw
        .split(new RegExp(`(?:^|\\s)${bulletPattern}\\s+`))
        .map((part) => part.trim())
        .filter(Boolean);
      return parts.length >= 2 ? parts : null;
    };

    const extractInlineOrdered = (text) => {
      const raw = normalizeWhitespace(text).trim();
      if (!raw) return null;
      const matches = Array.from(raw.matchAll(orderedInlinePattern));
      if (!matches || matches.length < 2) return null;
      const getNumberStart = (match) => match.index + (match[0].length - match[1].length);
      const items = [];
      for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i];
        const numberStart = getNumberStart(match);
        const contentStart = numberStart + match[1].length;
        const next = matches[i + 1];
        const nextStart = next ? getNumberStart(next) : raw.length;
        const content = raw.slice(contentStart, nextStart).trim();
        const number = String(match[1] || "").trim();
        if (content) {
          items.push(`${number} ${content}`.trim());
        } else if (number) {
          items.push(number);
        }
      }
      if (items.length < 2) return null;
      const firstStart = getNumberStart(matches[0]);
      const prefix = raw.slice(0, firstStart).trim();
      return { prefix, items };
    };

    const splitInlineOrdered = (text) => {
      const extracted = extractInlineOrdered(text);
      return extracted ? extracted.items : null;
    };

    const buildListFromLines = (lines) => {
      const parts = lines.map((line) => normalizeWhitespace(line).trim()).filter(Boolean);
      if (!parts.length) return null;
      const ordered = parts.every((line) => orderedPrefixPattern.test(line));
      const unordered = parts.every((line) => new RegExp(`^${bulletPattern}\\s+`).test(line));
      if (!ordered && !unordered) return null;
      const list = document.createElement(ordered ? "ol" : "ul");
      list.className = "list-none pl-4 space-y-1";
      parts.forEach((line) => {
        const li = document.createElement("li");
        li.textContent = ordered ? line : ensureBulletPrefix(line);
        list.appendChild(li);
      });
      return list;
    };

    const normalizeParagraphLists = (root) => {
      const paragraphs = Array.from(root.querySelectorAll("p"));
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const item = parseListItem(p.textContent || "");
        const orderedInline = extractInlineOrdered(p.textContent || "");
        const inlineItems =
          item?.type === "ol"
            ? orderedInline?.items || splitInlineOrdered(p.textContent || "")
            : item?.type === "ul"
              ? splitInlineBullets(p.textContent || "")
              : null;
        if (inlineItems && inlineItems.length) {
          const list = document.createElement(item.type);
          list.className = "list-none pl-4 space-y-1";
          inlineItems.forEach((text) => {
            const li = document.createElement("li");
            li.textContent = item.type === "ul" ? ensureBulletPrefix(text) : text;
            list.appendChild(li);
          });
          if (orderedInline?.prefix) {
            const prefix = document.createElement("p");
            prefix.textContent = orderedInline.prefix;
            p.replaceWith(prefix, list);
          } else {
            p.replaceWith(list);
          }
          continue;
        }
        if (!item) {
          if (orderedInline && orderedInline.items && orderedInline.items.length) {
            const list = document.createElement("ol");
            list.className = "list-none pl-4 space-y-1";
            orderedInline.items.forEach((text) => {
              const li = document.createElement("li");
              li.textContent = text;
              list.appendChild(li);
            });
            if (orderedInline.prefix) {
              const prefix = document.createElement("p");
              prefix.textContent = orderedInline.prefix;
              p.replaceWith(prefix, list);
            } else {
              p.replaceWith(list);
            }
          }
          continue;
        }
        const list = document.createElement(item.type);
        list.className = "list-none pl-4 space-y-1";
        let j = i;
        while (j < paragraphs.length) {
          const nextItem = parseListItem(paragraphs[j].textContent || "");
          if (!nextItem || nextItem.type !== item.type) break;
          const li = document.createElement("li");
          li.textContent = nextItem.type === "ul" ? ensureBulletPrefix(nextItem.raw) : nextItem.raw;
          list.appendChild(li);
          j += 1;
        }
        paragraphs[i].replaceWith(list);
        for (let k = i + 1; k < j; k++) {
          paragraphs[k].remove();
        }
        i = j - 1;
      }
    };

    const normalizeInlineLists = (root) => {
      if (!root.querySelector("p") && !root.querySelector("ul, ol")) {
        const raw = root.textContent || "";
        const inlineOrdered = extractInlineOrdered(raw);
        if (inlineOrdered && inlineOrdered.items.length) {
          const list = document.createElement("ol");
          list.className = "list-none pl-4 space-y-1";
          inlineOrdered.items.forEach((text) => {
            const li = document.createElement("li");
            li.textContent = text;
            list.appendChild(li);
          });
          root.innerHTML = "";
          if (inlineOrdered.prefix) {
            const prefix = document.createElement("p");
            prefix.textContent = inlineOrdered.prefix;
            root.appendChild(prefix);
          }
          root.appendChild(list);
          return;
        }
        const lines = raw.replace(/\r\n/g, "\n").split("\n");
        const list = buildListFromLines(lines);
        if (list) {
          root.innerHTML = "";
          root.appendChild(list);
          return;
        }
      }
      const paragraphs = Array.from(root.querySelectorAll("p"));
      paragraphs.forEach((p) => {
        if (p.querySelector("ul, ol")) return;
        const html = p.innerHTML || "";
        if (!html.includes("<br") && !/\n/.test(html)) return;
        const parts = html
          .replace(/\r\n/g, "\n")
          .replace(/<br\s*\/?>/gi, "\n")
          .split("\n");
        const list = buildListFromLines(parts);
        if (!list) return;
        p.replaceWith(list);
      });
      normalizeParagraphLists(root);
    };
    normalizeInlineLists(body);
    enhanceDocLinks(body);
    wrap.appendChild(body);
    const social = renderSocialLinks(section);
    if (social) wrap.appendChild(social);
    return wrap;
  }


  function serviceIconFromTitle(title) {
    const t = String(title || "").toLowerCase();
    if (t.includes("интернет") || t.includes("gpon") || t.includes("канал")) return "language";
    if (t.includes("облак") || t.includes("cloud")) return "cloud";
    if (t.includes("безопас") || t.includes("ddos") || t.includes("защит")) return "security";
    if (t.includes("телефон") || t.includes("voice") || t.includes("sip")) return "call";
    if (t.includes("видео") || t.includes("камера")) return "videocam";
    if (t.includes("центр") || t.includes("data")) return "dns";
    if (t.includes("сеть") || t.includes("wifi") || t.includes("wi-fi")) return "wifi";
    if (t.includes("мониторинг") || t.includes("control")) return "monitoring";
    return "hub";
  }

  function resolveMaterialIconName(icon) {
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

  function renderCardGrid(title, cards, opts = {}) {
    const list = Array.isArray(cards) ? cards.filter(Boolean) : [];
    if (!title && list.length === 0) return null;

    const variant = opts?.variant || "default";
    const colsRaw = Number(opts?.columns);
    const columns = Number.isFinite(colsRaw) ? Math.min(4, Math.max(1, colsRaw)) : 3;
    const wrap = document.createElement("section");
    wrap.className =
      variant === "service-cards"
        ? "w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-10"
        : "w-full rounded-2xl border border-white/10 bg-white/5 p-6";

    if (title) {
      const h = document.createElement("h2");
      h.className =
        variant === "service-cards"
          ? "text-slate-900 dark:text-white text-3xl font-bold tracking-tight mb-8"
          : "text-xl font-black tracking-tight mb-4";
      h.textContent = title;
      wrap.appendChild(h);
    }
    if (opts?.subtitle) {
      const p = document.createElement("p");
      p.className =
        variant === "service-cards"
          ? "text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8"
          : "text-sm text-white/70 leading-relaxed mb-4";
      p.textContent = String(opts.subtitle);
      wrap.appendChild(p);
    }

    const grid = document.createElement("div");
    const gridColsClass = (() => {
      if (columns === 1) return "grid-cols-1";
      if (columns === 2) return "grid-cols-1 md:grid-cols-2";
      if (columns === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    })();
    grid.className =
      variant === "service-cards"
        ? `grid ${gridColsClass} gap-8`
        : `grid ${gridColsClass} gap-4`;

    for (let idx = 0; idx < list.length; idx += 1) {
      const c = list[idx];
      const cardLink = c.link ? String(c.link) : "";
      const inlineLink = /^mailto:|^tel:/i.test(cardLink);
      const a = document.createElement(cardLink && !inlineLink ? "a" : "div");
      if (variant === "service-cards") {
        a.className =
          "relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 flex flex-col min-h-[320px] group transition-all hover:border-primary/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_0_30px_rgba(0,102,204,0.3)] shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] hover:-translate-y-1.5 hover:scale-[1.03]";
      } else {
      a.className =
        "block rounded-2xl border border-white/10 bg-black/20 hover:bg-black/10 transition-colors p-5";
      }
      if (cardLink && !inlineLink) a.setAttribute("href", cardLink);

      const bgUrl = resolveAnyMediaUrl(c.backgroundImage);
      if (bgUrl) {
        a.style.backgroundImage =
          "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.1) 100%), " +
          `url('${bgUrl}')`;
        a.style.backgroundSize = "cover";
        a.style.backgroundPosition = "center";
        a.style.backgroundRepeat = "no-repeat";
        a.style.backgroundBlendMode = "multiply";
        a.style.position = "relative";
        a.style.overflow = "hidden";
        const overlay = document.createElement("div");
        overlay.style.pointerEvents = "none";
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.background =
          "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 100%)";
        a.appendChild(overlay);
      }

      if (variant === "service-cards") {
        const sweep = document.createElement("div");
        sweep.className =
          "pointer-events-none absolute inset-y-0 -left-[60%] w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] transition-all duration-700 group-hover:left-[120%]";
        a.appendChild(sweep);
      }

      const imgUrl = resolveAnyMediaUrl(c.image);
      if (imgUrl || variant === "service-cards") {
        const imgWrap = document.createElement("div");
        if (variant === "service-cards") {
          imgWrap.className =
            "mb-8 relative h-16 w-16 flex items-center justify-center overflow-hidden rounded-2xl bg-white/5 border border-white/10 text-primary group-hover:scale-110 transition-transform";
          const glow = document.createElement("div");
          glow.className =
            "absolute inset-0 bg-primary/20 blur-xl rounded-full scale-75 group-hover:scale-110 transition-transform";
          imgWrap.appendChild(glow);
        } else {
        imgWrap.className = "mb-4 h-36 rounded-xl overflow-hidden bg-white/5 border border-white/10";
        }
        if (imgUrl) {
        const img = document.createElement("img");
          img.className =
            variant === "service-cards" ? "h-16 w-16 object-contain relative z-10" : "h-full w-full object-cover";
        img.alt = "";
        img.src = imgUrl;
        imgWrap.appendChild(img);
        } else if (variant === "service-cards") {
          const iconName = resolveMaterialIconName(c.icon) || serviceIconFromTitle(c.title);
          const iconEl = buildIconElement({
            icon: c.icon,
            fallback: iconName || "hub",
            spanClass: "material-symbols-outlined text-4xl relative z-10",
            imgClass: "h-12 w-12 max-h-full max-w-full object-contain relative z-10",
            alt: c.title || "",
          });
          if (iconEl && iconEl.tagName === "IMG") {
            // Default to the same blue tone as fallback Material icons.
            iconEl.style.filter =
              "brightness(0) saturate(100%) invert(43%) sepia(98%) saturate(4900%) hue-rotate(198deg) brightness(102%) contrast(101%)";
          }
          imgWrap.appendChild(iconEl);
        }
        a.appendChild(imgWrap);
      }

      const textWrap = bgUrl ? document.createElement("div") : null;
      if (textWrap) {
        textWrap.style.position = "relative";
        textWrap.style.zIndex = "2";
        textWrap.style.borderRadius = "0.75rem";
        textWrap.style.border = "1px solid rgba(255,255,255,0.1)";
        textWrap.style.background = "rgba(0,0,0,0.1)";
        textWrap.style.backdropFilter = "blur(4px)";
        textWrap.style.padding = "1rem";
        textWrap.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
      }
      const contentTarget = textWrap || a;

      const h3 = document.createElement("h3");
      h3.className =
        variant === "service-cards"
          ? "text-slate-900 dark:text-white text-xl font-bold mb-3"
          : "text-base font-black tracking-tight";
      h3.textContent = c.title || "Card";
      if (bgUrl) {
        h3.style.color = "#fff";
        h3.style.textShadow = "0 2px 10px rgba(0,0,0,0.85)";
      }
      contentTarget.appendChild(h3);

      if (c.subtitle) {
        const subtitle = document.createElement("p");
        subtitle.className =
          variant === "service-cards"
            ? "text-slate-500 dark:text-slate-300 text-sm font-semibold mb-2"
            : "mt-1 text-sm text-white/70 font-semibold";
        const subtitleText = String(c.subtitle || "");
        const needsContactLinks = /@|(?:\+7|8)\s*495/i.test(subtitleText);
        if (inlineLink || needsContactLinks) {
          ensureTextLinkStyles();
          subtitle.classList.add("cms-text-content");
          subtitle.innerHTML = linkifyContactText(subtitleText);
        } else {
          subtitle.textContent = subtitleText;
        }
        if (bgUrl) {
          subtitle.style.color = "rgba(255,255,255,0.85)";
          subtitle.style.textShadow = "0 1px 8px rgba(0,0,0,0.8)";
        }
        contentTarget.appendChild(subtitle);
      }

      if (c.description) {
        const subtitleText = String(c.subtitle || "").trim();
        const descText = String(c.description || "").trim();
        if (subtitleText && subtitleText === descText) {
          grid.appendChild(a);
          continue;
        }
        const p = document.createElement("p");
        p.className =
          variant === "service-cards"
            ? "text-slate-600 dark:text-[#9aabbc] text-sm leading-relaxed mb-6"
            : "mt-2 text-sm text-white/60 leading-relaxed";
        const needsContactLinks = /@|(?:\+7|8)\s*495/i.test(descText);
        if (inlineLink || needsContactLinks) {
          ensureTextLinkStyles();
          p.classList.add("cms-text-content");
          p.innerHTML = linkifyContactText(descText);
        } else {
          p.textContent = descText;
        }
        if (bgUrl) {
          p.style.color = "rgba(255,255,255,0.82)";
          p.style.textShadow = "0 1px 8px rgba(0,0,0,0.8)";
        }
        contentTarget.appendChild(p);
      }

      if (c.disclaimerHtml) {
        const disclaimer = document.createElement("div");
        disclaimer.className =
          variant === "service-cards"
            ? "text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
            : "mt-2 text-xs text-white/50 leading-relaxed";
        disclaimer.innerHTML = String(c.disclaimerHtml);
        ensureTextLinkStyles();
        disclaimer.classList.add("cms-text-content");
        linkifyContactHtml(disclaimer);
        const normalizeInlineLists = (root) => {
          const buildListFromLines = (lines) => {
            const parts = lines.map((line) => line.trim()).filter(Boolean);
            if (!parts.length) return null;
            const ordered = parts.every((line) => /^\d+[\).]\s+/.test(line));
            const unordered = parts.every((line) => /^[-•]\s+/.test(line));
            if (!ordered && !unordered) return null;
            const list = document.createElement(ordered ? "ol" : "ul");
            list.className = "list-none pl-0 space-y-1";
            parts.forEach((line) => {
              const li = document.createElement("li");
              li.textContent = line;
              list.appendChild(li);
            });
            return list;
          };

          if (!root.querySelector("p") && !root.querySelector("ul, ol")) {
            const raw = root.textContent || "";
            const lines = raw.replace(/\r\n/g, "\n").split("\n");
            const list = buildListFromLines(lines);
            if (list) {
              root.innerHTML = "";
              root.appendChild(list);
              return;
            }
          }
          const paragraphs = Array.from(root.querySelectorAll("p"));
          paragraphs.forEach((p) => {
            if (p.querySelector("ul, ol")) return;
            const html = p.innerHTML || "";
            if (!html.includes("<br") && !/\n/.test(html)) return;
            const parts = html
              .replace(/\r\n/g, "\n")
              .replace(/<br\s*\/?>/gi, "\n")
              .split("\n");
            const list = buildListFromLines(parts);
            if (!list) return;
            p.replaceWith(list);
          });
        };
        normalizeInlineLists(disclaimer);
        if (bgUrl) {
          disclaimer.style.color = "rgba(255,255,255,0.75)";
          disclaimer.style.textShadow = "0 1px 8px rgba(0,0,0,0.75)";
        }
        contentTarget.appendChild(disclaimer);
      }

      if (textWrap) {
        a.appendChild(textWrap);
      }

      grid.appendChild(a);
    }

    wrap.appendChild(grid);
    return wrap;
  }


  function renderUnknownSection(section) {
    const wrap = document.createElement("section");
    wrap.className = "rounded-2xl border border-white/10 bg-white/5 p-6";
    const p = document.createElement("p");
    p.className = "text-white/60 text-sm mb-3";
    p.textContent = `Неподдерживаемая секция: ${section?.__component || "unknown"}`;
    wrap.appendChild(p);
    const pre = document.createElement("pre");
    pre.className = "text-xs text-white/50 overflow-auto";
    try {
      pre.textContent = JSON.stringify(section, null, 2);
    } catch {
      pre.textContent = String(section);
    }
    wrap.appendChild(pre);
    return wrap;
  }


  function isTableLike(v) {
    return !!v && typeof v === "object";
  }


  function normalizeTableData(tableData) {
    if (!tableData) return { columns: [], rows: [] };

    if (isTableLike(tableData) && Array.isArray(tableData.columns) && Array.isArray(tableData.rows)) {
      const columns = tableData.columns.map((c) => ({
        name: String(c?.name ?? c?.key ?? ""),
        key: String(c?.key ?? c?.name ?? ""),
      }));
      const rows = tableData.rows;
      return { columns, rows };
    }

    if (isTableLike(tableData) && Array.isArray(tableData.headers) && Array.isArray(tableData.rows)) {
      const headers = tableData.headers.map((h) => String(h ?? ""));
      const rowsRaw = tableData.rows || [];
      if (rowsRaw.length && !Array.isArray(rowsRaw[0]) && isTableLike(rowsRaw[0])) {
        const columns = headers.map((h) => ({ name: h, key: h }));
        const rows = rowsRaw.map((r) => {
          const obj = {};
          headers.forEach((h) => {
            obj[h] = r[h];
          });
          return obj;
        });
        return { columns, rows };
      }
      const columns = headers.map((h, idx) => ({ name: h, key: String(idx) }));
      const rows = rowsRaw.map((r) => {
        if (!Array.isArray(r)) return {};
        const obj = {};
        r.forEach((v, idx) => {
          obj[String(idx)] = v;
        });
        return obj;
      });
      return { columns, rows };
    }

    if (Array.isArray(tableData)) {
      if (tableData.length === 0) return { columns: [], rows: [] };

      if (Array.isArray(tableData[0])) {
        const headers = tableData[0].map((h) => String(h ?? ""));
        const columns = headers.map((h, idx) => ({ name: h, key: String(idx) }));
        const rows = tableData.slice(1).map((r) => {
          const obj = {};
          (Array.isArray(r) ? r : []).forEach((v, idx) => {
            obj[String(idx)] = v;
          });
          return obj;
        });
        return { columns, rows };
      }

      if (isTableLike(tableData[0])) {
        const keys = Object.keys(tableData[0] || {});
        const columns = keys.map((k) => ({ name: k, key: k }));
        return { columns, rows: tableData };
      }
    }

    return { columns: [], rows: [] };
  }


  function renderSectionTable(section) {
    const td = section?.tableData;
    const { columns, rows } = normalizeTableData(td);
    if (!columns.length) return null;

    const wrap = document.createElement("section");
    wrap.className =
      "section-table max-w-[1200px] mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark p-6 md:p-8 shadow-2xl shadow-primary/5";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className =
        "section-table__title text-slate-900 dark:text-white text-3xl font-bold tracking-tight mb-4";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }
    if (section?.description) {
      const p = document.createElement("p");
      p.className =
        "section-table__description text-slate-500 dark:text-slate-400 text-lg font-normal max-w-2xl mb-6";
      p.textContent = String(section.description);
      wrap.appendChild(p);
    }

    const tableWrap = document.createElement("div");
    tableWrap.className =
      "section-table__table w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark shadow-2xl shadow-primary/5";
    const tableScroll = document.createElement("div");
    tableScroll.className = "overflow-x-auto";

    const table = document.createElement("table");
    table.className = "w-full border-collapse section-table__table";

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    trh.className = "bg-slate-50 dark:bg-slate-900/50";
    for (const c of columns) {
      const th = document.createElement("th");
      const isFirst = c === columns[0];
      th.className = isFirst
        ? "p-6 text-left text-slate-900 dark:text-white min-w-[220px] border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest"
        : "p-6 text-center text-slate-900 dark:text-white min-w-[220px] border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest";
      th.textContent = String(c?.name || c?.key || "");
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);

    const renderCellValue = (cell, value) => {
      if (value == null) return;
      const normalizeLink = (raw) => {
        const href = normalizeHref(raw?.href || raw?.url || "");
        const label =
          raw?.text || raw?.label || raw?.title || raw?.name || href;
        return { href, label, raw };
      };
      const isDocLink = (link) => {
        if (!link?.href) return false;
        return isDocExt(extFromUrl(link.href));
      };

      if (Array.isArray(value)) {
        const links = value
          .filter((item) => item && typeof item === "object" && (item.href || item.url))
          .map(normalizeLink)
          .filter((link) => link.href);
        const docLinks = links.filter(isDocLink);
        if (docLinks.length) {
          cell.appendChild(renderInlineDocList(docLinks));
          if (core.ensureDocPreviewModal) core.ensureDocPreviewModal();
          if (core.bindDocPreviewClicks) core.bindDocPreviewClicks();
          return;
        }
        value.forEach((item, idx) => {
          if (idx > 0) cell.appendChild(document.createElement("br"));
          renderCellValue(cell, item);
        });
        return;
      }
      if (typeof value === "object") {
        const link = normalizeLink(value);
        if (link.href) {
          if (isDocLink(link)) {
            cell.appendChild(renderInlineDocList([link]));
            if (core.ensureDocPreviewModal) core.ensureDocPreviewModal();
            if (core.bindDocPreviewClicks) core.bindDocPreviewClicks();
            return;
          }
          const anchor = document.createElement("a");
          anchor.href = link.href;
          anchor.textContent = link.label;
          anchor.className = "text-primary hover:underline";
          if (value.isExternal || /^https?:\/\//i.test(link.href)) {
            anchor.target = "_blank";
            anchor.rel = "noreferrer noopener";
          }
          if (value.download) {
            anchor.download = value.download === true ? "" : value.download;
          }
          cell.appendChild(anchor);
          return;
        }
        if (value.html) {
          cell.innerHTML = String(value.html);
          return;
        }
        cell.textContent = String(value);
        return;
      }
      const html = String(value);
      cell.innerHTML = html;
    };

    const tbody = document.createElement("tbody");
    for (const r of Array.isArray(rows) ? rows : []) {
      const tr = document.createElement("tr");
      tr.className = "row-hover transition-colors";
      columns.forEach((c, idx) => {
        const tdEl = document.createElement("td");
        tdEl.className =
          idx === 0
            ? "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm align-top text-slate-900 dark:text-slate-100 font-semibold"
            : "p-6 border-b border-slate-100 dark:border-slate-800/50 text-sm align-top text-center text-slate-900 dark:text-slate-100";
        const key = c?.key;
        const v = key ? (r ? r[key] : "") : "";
        renderCellValue(tdEl, v);
        tr.appendChild(tdEl);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    tableScroll.appendChild(table);
    tableWrap.appendChild(tableScroll);
    wrap.appendChild(tableWrap);

    if (section?.showCustomization !== false) {
      const customization = document.createElement("div");
      customization.className =
        "mt-12 p-8 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8";

      const iconWrap = document.createElement("div");
      iconWrap.className =
        "size-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0";
      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined text-primary text-3xl";
      icon.textContent = "info";
      iconWrap.appendChild(icon);

      const textWrap = document.createElement("div");
      textWrap.className = "flex-1";
      const title = document.createElement("h4");
      title.className =
        "text-lg font-bold text-slate-900 dark:text-white mb-1";
      title.textContent =
        section?.customizationTitle || "Нужна индивидуальная конфигурация?";
      const text = document.createElement("p");
      text.className = "text-slate-500 dark:text-slate-400";
      text.textContent =
        section?.customizationText ||
        "Мы можем подготовить специфическое решение под ваши задачи: от выделенных каналов связи до гибридных облачных инфраструктур с особыми требованиями безопасности.";
      textWrap.appendChild(title);
      textWrap.appendChild(text);

      const action = document.createElement("a");
      action.className =
        "shrink-0 px-8 h-14 rounded-lg bg-transparent border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center";
      action.href = section?.customizationButtonHref || "/contact";
      action.textContent =
        section?.customizationButtonText || "Заказать консультацию";

      customization.appendChild(iconWrap);
      customization.appendChild(textWrap);
      customization.appendChild(action);
      wrap.appendChild(customization);
    }
    return wrap;
  }


  function renderImageCarousel(section) {
    const items = Array.isArray(section?.items) ? section.items.filter(Boolean) : [];
    if (!items.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "image-carousel space-y-6";
    wrap.setAttribute("data-carousel", "");
    wrap.setAttribute("data-carousel-step", "420");
    if (section?.autoPlay) {
      wrap.setAttribute("data-carousel-autoplay", "true");
    }
    if (section?.interval) {
      wrap.setAttribute("data-carousel-interval", String(section.interval));
    }

    const header = document.createElement("div");
    header.className = "flex items-end justify-between px-2";
    const headerText = document.createElement("div");
    if (section?.title) {
      const h = document.createElement("h2");
      h.className =
        "image-carousel__title text-white text-3xl lg:text-4xl font-bold tracking-tight";
      h.textContent = String(section.title);
      headerText.appendChild(h);
    }
    if (section?.subtitle) {
      const p = document.createElement("p");
      p.className = "text-slate-500 dark:text-slate-400 mt-2";
      p.textContent = String(section.subtitle);
      headerText.appendChild(p);
    }
    header.appendChild(headerText);

    if (section?.showNavigation !== false) {
      const headerNav = document.createElement("div");
      headerNav.className = "flex gap-3";
      const headerPrev = document.createElement("button");
      headerPrev.type = "button";
      headerPrev.className =
        "glass size-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors";
      headerPrev.setAttribute("data-carousel-prev", "");
      headerPrev.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
      const headerNext = document.createElement("button");
      headerNext.type = "button";
      headerNext.className =
        "glass size-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors";
      headerNext.setAttribute("data-carousel-next", "");
      headerNext.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
      headerNav.appendChild(headerPrev);
      headerNav.appendChild(headerNext);
      header.appendChild(headerNav);
    }
    wrap.appendChild(header);

    const track = document.createElement("div");
    track.className =
      "flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 hide-scrollbar";
    track.setAttribute("data-carousel-track", "");

    const sorted = items.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    for (const it of sorted) {
      const card = document.createElement("div");
      card.className =
        "image-carousel__item min-w-[85%] lg:min-w-[70%] aspect-[21/9] rounded-xl overflow-hidden snap-start relative group/card";

      const overlay = document.createElement("div");
      overlay.className =
        "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10";
      card.appendChild(overlay);

      const imgLayer = document.createElement("div");
      imgLayer.className =
        "absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/card:scale-105";
      const imgUrl = resolveAnyMediaUrl(it.image);
      if (imgUrl) imgLayer.style.backgroundImage = `url('${imgUrl}')`;
      card.appendChild(imgLayer);

      const body = document.createElement("div");
      body.className = "absolute bottom-0 left-0 p-8 lg:p-12 z-20 max-w-2xl";

      const badgeText = String(it.badge || it.tag || "").trim();
      if (badgeText) {
        const badge = document.createElement("span");
        badge.className =
          "inline-block px-3 py-1 bg-primary text-[10px] font-bold uppercase tracking-widest rounded mb-4";
        badge.textContent = badgeText;
        body.appendChild(badge);
      }

      const t = document.createElement("h3");
      t.className = "text-3xl font-bold text-white mb-4";
      t.textContent = String(it.title || "");
      body.appendChild(t);

      if (it.description) {
        const d = document.createElement("p");
        d.className = "text-slate-200 text-lg mb-6";
        d.textContent = String(it.description);
        body.appendChild(d);
      }

      if (it?.ctaText && it?.ctaHref) {
        const btn = document.createElement("a");
        btn.className =
          "bg-white text-black px-6 py-3 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors inline-flex";
        btn.href = String(it.ctaHref);
        btn.textContent = String(it.ctaText);
        body.appendChild(btn);
      }

      card.appendChild(body);
      track.appendChild(card);
    }

    wrap.appendChild(track);

    if (section?.showNavigation !== false) {
      const progress = document.createElement("div");
      progress.className = "mt-8 flex items-center gap-4 px-2";

      const bar = document.createElement("div");
      bar.className =
        "flex-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden";
      const fill = document.createElement("div");
      const total = Math.max(1, sorted.length);
      fill.className = "h-full bg-primary tab-glow transition-all duration-500";
      fill.setAttribute("data-carousel-progress", "");
      fill.style.width = `${Math.min(100, (1 / total) * 100)}%`;
      bar.appendChild(fill);

      const counter = document.createElement("div");
      counter.className = "text-xs font-bold text-slate-500 tracking-widest";
      counter.setAttribute("data-carousel-counter", "");
      counter.textContent = `01 / ${String(total).padStart(2, "0")}`;

      progress.appendChild(bar);
      progress.appendChild(counter);
      wrap.appendChild(progress);
      return wrap;
    }
    return wrap;
  }


  function renderImageSwitcher(section) {
    const items = Array.isArray(section?.items) ? section.items.filter(Boolean) : [];
    if (!items.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "image-switcher rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "image-switcher__title text-xl font-black tracking-tight mb-4";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }

    const root = document.createElement("div");
    root.className = "image-switcher__container grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6";
    root.setAttribute("data-switcher", "");

    const sorted = items.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    const defIdx = Number.isFinite(section?.defaultImage) ? Number(section.defaultImage) : 0;
    const def = sorted[Math.min(sorted.length - 1, Math.max(0, defIdx))];
    if (def) root.setAttribute("data-switcher-default", String(def.order ?? def.title ?? "0"));

    const keys = (it) => String(it.order ?? it.title ?? "");

    const nav = document.createElement("div");
    nav.className = "flex flex-col gap-2";

    for (const it of sorted) {
      const key = keys(it);
      const b = document.createElement("button");
      b.type = "button";
      b.className =
        "flex items-center gap-3 px-4 py-3 rounded-xl border bg-black/20 border-white/10 text-left transition-colors";
      b.setAttribute("data-switch-trigger", "");
      b.setAttribute("data-switch-key", key);
      b.setAttribute("data-switch-active-classes", "bg-primary/20 border-primary/40 text-white");
      b.setAttribute("data-switch-inactive-classes", "bg-black/20 border-white/10 text-white/75 hover:bg-black/10");

      if (it.svgIcon) {
        const icon = document.createElement("span");
        icon.className = "shrink-0 w-8 h-8 text-white/80";
        icon.innerHTML = String(it.svgIcon);
        b.appendChild(icon);
      } else {
        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined text-white/70";
        icon.textContent = "image";
        b.appendChild(icon);
      }

      const label = document.createElement("div");
      label.className = "min-w-0";
      const t = document.createElement("div");
      t.className = "font-black truncate";
      t.textContent = String(it.title || "");
      label.appendChild(t);
      if (it.description) {
        const d = document.createElement("div");
        d.className = "mt-1 text-xs text-white/55 line-clamp-2";
        d.textContent = String(it.description);
        label.appendChild(d);
      }
      b.appendChild(label);
      nav.appendChild(b);
    }

    const panels = document.createElement("div");
    panels.className = "relative";

    for (const it of sorted) {
      const key = keys(it);
      const panel = document.createElement("div");
      panel.className =
        "image-switcher__item rounded-2xl border border-white/10 bg-black/20 overflow-hidden";
      panel.setAttribute("data-switch-panel", "");
      panel.setAttribute("data-switch-key", key);

      const imgUrl = resolveAnyMediaUrl(it.image);
      if (imgUrl) {
        const img = document.createElement("img");
        img.alt = "";
        img.src = imgUrl;
        img.className = "w-full h-[320px] md:h-[420px] object-cover";
        panel.appendChild(img);
      }

      const body = document.createElement("div");
      body.className = "p-5";
      const t = document.createElement("div");
      t.className = "font-black text-white/90";
      t.textContent = String(it.title || "");
      body.appendChild(t);
      if (it.description) {
        const d = document.createElement("div");
        d.className = "mt-2 text-sm text-white/65 leading-relaxed";
        d.textContent = String(it.description);
        body.appendChild(d);
      }
      panel.appendChild(body);

      panels.appendChild(panel);
    }

    root.appendChild(nav);
    root.appendChild(panels);
    wrap.appendChild(root);
    return wrap;
  }


  function renderHistoryTimeline(section) {
    const periods = Array.isArray(section?.periods) ? section.periods.filter(Boolean) : [];
    if (!periods.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "history-timeline w-full";
    wrap.style.minHeight = "calc(100vh - 220px)";

    const introTitle = String(section?.introTitle || section?.title || "").trim();
    if (introTitle) {
      const h = document.createElement("h2");
      h.className = "text-3xl md:text-4xl font-black tracking-tight text-white mb-6";
      h.textContent = introTitle;
      wrap.appendChild(h);
    }
    const introSubtitle = String(section?.introSubtitle || "").trim();
    if (introSubtitle) {
      const p = document.createElement("p");
      p.className = "text-white/60 text-lg leading-relaxed mb-6 max-w-3xl";
      p.textContent = introSubtitle;
      wrap.appendChild(p);
    }
    const ctaLabel = String(section?.ctaLabel || "").trim();
    if (ctaLabel) {
      const cta = document.createElement("a");
      cta.className =
        "inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 rounded-xl transition-all text-sm font-bold mb-8";
      cta.href = String(section?.ctaHref || "#");
      const iconName = resolveMaterialIconName(section?.icon) || "mail";
      const iconEl = buildIconElement({
        icon: section?.icon,
        fallback: iconName,
        spanClass: "material-symbols-outlined",
        imgClass: "w-5 h-5 object-contain",
        alt: iconName,
      });
      cta.appendChild(iconEl);
      cta.appendChild(document.createTextNode(ctaLabel));
      wrap.appendChild(cta);
    }

    const sorted = periods.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    const defIdx = Number.isFinite(section?.defaultPeriod) ? Number(section.defaultPeriod) : 0;
    let active = Math.min(sorted.length - 1, Math.max(0, defIdx));

    const tabsRow = document.createElement("div");
    tabsRow.className = "flex flex-nowrap overflow-x-auto pb-4 gap-2 no-scrollbar mb-6";

    const fiber = document.createElement("div");
    fiber.className = "w-full relative h-12 mb-10 flex items-center";
    fiber.innerHTML = `
      <div class="absolute left-4 right-4 h-px" style="background: linear-gradient(90deg, rgba(112,66,20,0.9) 0%, rgba(0,102,204,0.9) 100%); box-shadow: 0 0 18px rgba(0, 102, 204, 0.35);" data-history-line></div>
      <div class="absolute w-full flex justify-between px-4" data-history-dots></div>
    `;

    const periodHost = document.createElement("div");
    periodHost.className = "history-timeline__period";

    const getParagraphs = (html) => {
      const div = document.createElement("div");
      div.innerHTML = String(html || "");
      const paragraphs = Array.from(div.querySelectorAll("p"))
        .map((p) => String(p.textContent || "").trim())
        .filter(Boolean);
      if (paragraphs.length) return paragraphs;
      const raw = String(div.textContent || "").trim();
      return raw ? [raw] : [];
    };
    const buildHighlights = (p) => {
      const highlights = Array.isArray(p?.highlights) ? p.highlights.filter(Boolean) : [];
      if (highlights.length) {
        return highlights.map((h) => ({
          title: String(h.title || "").trim(),
          description: String(h.description || "").trim(),
          icon: String(h.icon || "check").trim(),
        }));
      }
      const paragraphs = getParagraphs(p?.content);
      return paragraphs.slice(0, 4).map((text) => {
        const idx = text.indexOf(":");
        if (idx > 0) {
          return { title: text.slice(0, idx).trim(), description: text.slice(idx + 1).trim(), icon: "check" };
        }
        return { title: text.slice(0, 80).trim(), description: text, icon: "check" };
      });
    };

    const renderActive = () => {
      clearNode(periodHost);
      const p = sorted[active];
      if (!p) return;

      const card = document.createElement("div");
      card.className =
        "w-full glass-card rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row";

      const left = document.createElement("div");
      left.className = "lg:w-1/2 relative min-h-[360px]";
      const imgUrl = resolveAnyMediaUrl(p.image);
      let imgBg = null;
      if (imgUrl) {
        const img = document.createElement("img");
        img.alt = "";
        img.src = imgUrl;
        img.loading = "lazy";
        img.decoding = "async";
        img.className = "absolute inset-0 w-full h-full object-cover opacity-50";
        img.style.pointerEvents = "none";
        img.style.zIndex = "0";
        imgBg = img;
      } else {
        const fallback = document.createElement("div");
        fallback.className = "absolute inset-0";
        fallback.style.pointerEvents = "none";
        fallback.style.zIndex = "0";
        imgBg = fallback;
      }
      left.appendChild(imgBg);
      const overlay = document.createElement("div");
      overlay.className = "absolute inset-0 bg-gradient-to-r from-background-dark/80 via-transparent to-transparent";
      left.appendChild(overlay);

      const leftInner = document.createElement("div");
      leftInner.className = "relative h-full p-10 flex flex-col";
      leftInner.style.zIndex = "2";
      const badgeLabel = String(p.badgeLabel || "Текущий этап");
      const badge = document.createElement("div");
      badge.className =
        "inline-flex items-center gap-2 bg-primary/20 backdrop-blur-md border border-primary/30 px-4 py-1.5 rounded-full w-fit mb-6";
      const dot = document.createElement("span");
      dot.className = "w-2 h-2 rounded-full bg-primary animate-ping";
      const badgeText = document.createElement("span");
      badgeText.className = "text-xs font-bold tracking-widest uppercase";
      badgeText.textContent = badgeLabel;
      badge.appendChild(dot);
      badge.appendChild(badgeText);
      leftInner.appendChild(badge);

      if (p.title) {
        const h = document.createElement("h3");
        h.className = "text-4xl font-black mb-4 leading-tight";
        h.textContent = String(p.title);
        leftInner.appendChild(h);
      }
      const contentPreview = document.createElement("div");
      contentPreview.className = "text-white/70 text-lg max-w-md overflow-y-auto";
      contentPreview.style.maxHeight = "170px";
      contentPreview.style.scrollbarWidth = "thin";
      const imageDesc = String(p.imageDescription || "").trim();
      contentPreview.textContent = imageDesc || getParagraphs(p.content)[0] || "";
      leftInner.appendChild(contentPreview);
      left.appendChild(leftInner);

      const right = document.createElement("div");
      right.className = "lg:w-1/2 p-8 lg:p-10 flex flex-col justify-between gap-10";
      right.style.maxHeight = "520px";
      right.style.overflow = "hidden";
      const rightScroll = document.createElement("div");
      rightScroll.className = "flex flex-col gap-10 overflow-y-auto";
      rightScroll.style.maxHeight = "520px";
      rightScroll.style.scrollbarWidth = "thin";

      const label = document.createElement("h4");
      label.className = "text-sm font-bold uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2";
      const labelIcon = document.createElement("span");
      labelIcon.className = "material-symbols-outlined text-lg";
      labelIcon.textContent = "verified_user";
      label.appendChild(labelIcon);
      label.appendChild(document.createTextNode("Ключевые достижения"));
      rightScroll.appendChild(label);

      const list = document.createElement("ul");
      list.className = "space-y-6";
      const highlights = buildHighlights(p);
      highlights.forEach((item) => {
        const li = document.createElement("li");
        li.className = "flex items-start gap-4";
        const iconWrap = document.createElement("div");
        iconWrap.className = "mt-1 w-6 h-6 rounded bg-primary/20 flex items-center justify-center shrink-0";
        const iconEl = buildIconElement({
          icon: item.icon,
          fallback: resolveMaterialIconName(item.icon) || "check",
          spanClass: "material-symbols-outlined text-primary text-sm font-bold",
          imgClass: "w-4 h-4 object-contain",
          alt: item.title || "",
        });
        iconWrap.appendChild(iconEl);
        const body = document.createElement("div");
        const t = document.createElement("p");
        t.className = "font-bold text-lg mb-1";
        t.textContent = String(item.title || "");
        const d = document.createElement("p");
        d.className = "text-white/50 text-sm";
        d.textContent = String(item.description || "");
        body.appendChild(t);
        body.appendChild(d);
        li.appendChild(iconWrap);
        li.appendChild(body);
        list.appendChild(li);
      });
      if (highlights.length) {
        rightScroll.appendChild(list);
      }

      const factText = String(p.factText || "").trim();
      if (factText) {
        const fact = document.createElement("div");
        fact.className = "bg-white/5 rounded-2xl p-6 border border-white/10 relative overflow-hidden group";
        const factLabel = document.createElement("p");
        factLabel.className = "text-primary font-bold text-xs uppercase tracking-widest mb-2";
        factLabel.textContent = String(p.factLabel || "Интересный факт");
        const factBody = document.createElement("p");
        factBody.className = "text-white/80 leading-relaxed italic";
        factBody.textContent = factText;
        fact.appendChild(factLabel);
        fact.appendChild(factBody);
        rightScroll.appendChild(fact);
      }
      const fade = document.createElement("div");
      fade.className = "pointer-events-none";
      fade.style.position = "relative";
      fade.style.height = "40px";
      fade.style.marginTop = "-40px";
      fade.style.background = "linear-gradient(180deg, rgba(15,25,35,0) 0%, rgba(15,25,35,0.9) 100%)";
      right.appendChild(rightScroll);
      right.appendChild(fade);

      card.appendChild(left);
      card.appendChild(right);
      periodHost.appendChild(card);
    };

    sorted.forEach((p, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      const isActive = idx === active;
      b.className =
        "flex-1 min-w-[160px] py-4 px-2 border-b-2 text-center transition-all " +
        (isActive
          ? "border-primary text-primary bg-primary/10"
          : "border-white/20 text-white/40 hover:text-white");

      const top = document.createElement("span");
      top.className = "text-[10px] font-bold uppercase tracking-widest block mb-1";
      top.textContent = String(p.period || `Период ${idx + 1}`);
      const bottom = document.createElement("span");
      bottom.className = "text-sm font-bold";
      bottom.textContent = String(p.title || "");
      b.appendChild(top);
      b.appendChild(bottom);

      b.addEventListener("click", () => {
        active = idx;
        [...tabsRow.querySelectorAll("button")].forEach((bb, j) => {
          const on = j === active;
          bb.classList.toggle("border-primary", on);
          bb.classList.toggle("text-primary", on);
          bb.classList.toggle("bg-primary/10", on);
          bb.classList.toggle("text-white/40", !on);
        });
        renderActive();
        const dots = fiber.querySelectorAll("[data-history-dot]");
        dots.forEach((d, j) => {
          d.innerHTML =
            j === active
              ? '<div class="w-6 h-6 rounded-full bg-primary border-4 border-white shadow-[0_0_20px_#0066cc] animate-pulse"></div><div class="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-primary text-xs font-bold uppercase">Вы здесь</div>'
              : '<div class="w-4 h-4 rounded-full bg-white/20 border-2 border-white/10"></div>';
        });
      });
      tabsRow.appendChild(b);
    });

    const dotsHost = fiber.querySelector("[data-history-dots]");
    if (dotsHost) {
      dotsHost.innerHTML = "";
      sorted.forEach((_, idx) => {
        const dot = document.createElement("div");
        dot.className = "relative";
        dot.setAttribute("data-history-dot", "");
        dot.innerHTML =
          idx === active
            ? '<div class="w-6 h-6 rounded-full bg-primary border-4 border-white shadow-[0_0_20px_#0066cc] animate-pulse"></div><div class="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-primary text-xs font-bold uppercase">Вы здесь</div>'
            : '<div class="w-4 h-4 rounded-full border-2 border-white/20" style="background: radial-gradient(circle at top left, rgba(112,66,20,0.7), rgba(0,102,204,0.7));"></div>';
        dotsHost.appendChild(dot);
      });
    }

    wrap.appendChild(tabsRow);
    wrap.appendChild(fiber);
    wrap.appendChild(periodHost);
    const ctaWrap = document.createElement("div");
    ctaWrap.className = "mt-12 text-center";
    const secondaryLabel = String(section?.secondaryCtaLabel || "").trim();
    const secondaryHref = String(section?.secondaryCtaHref || "").trim();
    const secondaryLabel2 = String(section?.secondaryCtaSecondaryLabel || "").trim();
    const secondaryHref2 = String(section?.secondaryCtaSecondaryHref || "").trim();
    if (secondaryLabel || secondaryLabel2) {
      const p = document.createElement("p");
      p.className = "text-white/40 mb-6 max-w-xl mx-auto";
      p.textContent =
        "Хотите стать частью нашей истории и внедрить инновации в свой бизнес? Наши эксперты помогут подобрать оптимальное решение.";
      ctaWrap.appendChild(p);
      const btns = document.createElement("div");
      btns.className = "flex flex-wrap justify-center gap-4";
      if (secondaryLabel) {
        const btn = document.createElement("a");
        btn.className =
          "bg-primary hover:bg-primary/80 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl shadow-primary/20 flex items-center gap-3";
        btn.href = secondaryHref || "#";
        btn.textContent = secondaryLabel;
        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined";
        icon.textContent = "trending_flat";
        btn.appendChild(icon);
        btns.appendChild(btn);
      }
      if (secondaryLabel2) {
        const btn = document.createElement("a");
        btn.className =
          "bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3";
        btn.href = secondaryHref2 || "#";
        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined";
        icon.textContent = "download";
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(secondaryLabel2));
        btns.appendChild(btn);
      }
      ctaWrap.appendChild(btns);
      wrap.appendChild(ctaWrap);
    }
    renderActive();
    return wrap;
  }


  function renderCrmCards(section) {
    const cards = Array.isArray(section?.cards) ? section.cards.filter(Boolean) : [];
    if (!cards.length) return null;

    const wrap = document.createElement("section");
    wrap.className = "crm-cards rounded-2xl border border-white/10 bg-white/5 p-6";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "crm-cards__title text-xl font-black tracking-tight mb-2";
      h.textContent = String(section.title);
      wrap.appendChild(h);
    }
    if (section?.description) {
      const p = document.createElement("p");
      p.className = "text-sm text-white/60 mb-5";
      p.textContent = String(section.description);
      wrap.appendChild(p);
    }

    const grid = document.createElement("div");
    grid.className = "crm-cards__container grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";

    const sorted = cards.sort((a, b) => (a?.order || 0) - (b?.order || 0));
    for (const c of sorted) {
      const a = document.createElement(c.link ? "a" : "div");
      a.className =
        "crm-cards__card flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 hover:bg-black/10 transition-colors p-4 min-h-[84px]";
      if (c.link) {
        a.setAttribute("href", String(c.link));
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noreferrer");
      }

      const imgUrl = resolveAnyMediaUrl(c.image);
      if (imgUrl) {
        const img = document.createElement("img");
        img.className = "crm-cards__card-image max-h-10 max-w-full object-contain";
        img.alt = String(c.title || "");
        img.src = imgUrl;
        a.appendChild(img);
      } else {
        const t = document.createElement("span");
        t.className = "font-black text-white/80 text-sm text-center";
        t.textContent = String(c.title || "CRM");
        a.appendChild(t);
      }

      grid.appendChild(a);
    }

    wrap.appendChild(grid);
    return wrap;
  }


  function renderHowToConnect(section) {
    const title = String(section?.title || "").trim();
    const steps = Array.isArray(section?.steps) ? section.steps.filter(Boolean) : [];
    const desc = String(section?.description || "").trim();
    const contentHtml = String(section?.content || "").trim();
    if (!title && steps.length === 0 && !desc && !contentHtml) return null;

    const ensureStepModal = () => {
      const id = "mgts-steps-modal";
      const existing = document.getElementById(id);
      if (existing) return existing;
      const modal = document.createElement("div");
      modal.id = id;
      modal.className = "fixed inset-0 z-50 hidden";
      modal.innerHTML = `
        <div class="absolute inset-0" data-step-modal-overlay style="background: rgba(0,0,0,0.72); backdrop-filter: blur(6px);"></div>
        <div class="relative mx-auto flex h-full w-full max-w-[980px] items-center justify-center p-6">
          <div class="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl" style="max-height: 90vh; display: flex; flex-direction: column;">
            <div class="flex items-center justify-between border-b border-white/10 px-6 py-4 gap-4">
              <div class="min-w-0">
                <p class="text-xs uppercase tracking-widest text-primary font-bold">Шаг</p>
                <p class="text-base font-black tracking-tight text-white truncate" data-step-modal-title></p>
              </div>
              <button class="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 transition-colors" type="button" data-step-modal-close aria-label="Закрыть">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div class="p-6 space-y-4 step-modal-body" style="overflow: auto; flex: 1 1 auto; min-height: 0;" data-step-modal-body></div>
          </div>
        </div>
        <style>
          .step-modal-body { color: rgba(226,232,240,0.9); font-size: 14px; line-height: 1.6; }
          .step-modal-body a { color: #60a5fa; text-decoration: underline; }
          .step-modal-body h1, .step-modal-body h2, .step-modal-body h3 { color: #e2e8f0; font-weight: 800; margin: 12px 0; }
          .step-modal-body p { margin: 10px 0; }
          .step-modal-body ol, .step-modal-body ul { margin: 8px 0 12px 18px; }
          .step-modal-body li { margin: 6px 0; }
          .step-modal-body .warning-banner { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); padding: 12px; border-radius: 12px; }
        </style>
      `;
      modal.addEventListener("click", (e) => {
        const target = e.target;
        if (
          target?.hasAttribute?.("data-step-modal-overlay") ||
          target?.closest?.(".modal-container__header-cross") ||
          target?.closest?.("[data-step-modal-close]")
        ) {
          modal.classList.add("hidden");
        }
      });
      document.body.appendChild(modal);
      return modal;
    };

    const extractModalBodyHtml = (html) => {
      if (!html) return "";
      try {
        const doc = new DOMParser().parseFromString(String(html), "text/html");
        const body = doc.querySelector(".modal-container__content") || doc.body;
        if (!body) return String(html);
        return body.innerHTML || "";
      } catch {
        return String(html);
      }
    };

    const wrap = document.createElement("section");
    wrap.className = "how-to-connect rounded-2xl border border-white/10 bg-white/5 p-6";

    if (title) {
      const h = document.createElement("h2");
      h.className = "how-to-connect__title text-xl font-black tracking-tight mb-2";
      h.textContent = title;
      wrap.appendChild(h);
    }
    if (desc) {
      const p = document.createElement("p");
      p.className = "text-sm text-white/60 mb-5";
      p.textContent = desc;
      wrap.appendChild(p);
    }

    if (steps.length) {
      const list = document.createElement("div");
      list.className = "how-to-connect__steps grid grid-cols-1 md:grid-cols-2 gap-4";

      const sorted = steps.sort((a, b) => (a?.stepNumber || 0) - (b?.stepNumber || 0));
      for (const s of sorted) {
        const card = document.createElement("div");
        card.className =
          "how-to-connect__step rounded-2xl border border-white/10 bg-black/20 p-5 flex flex-col transition-all hover:border-primary hover:bg-primary/5 hover:shadow-xl hover:shadow-primary/20";
        card.style.minHeight = "190px";

        const head = document.createElement("div");
        head.className = "flex items-start gap-4 flex-1";

        const badge = document.createElement("div");
        badge.className =
          "shrink-0 w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center font-black";
        badge.textContent = String(s.stepNumber ?? "");

        const text = document.createElement("div");
        text.className = "min-w-0 flex flex-col h-full";

        const st = document.createElement("div");
        st.className = "font-black text-white/90";
        st.textContent = String(s.title || "");
        text.appendChild(st);

        if (s.description) {
          const sd = document.createElement("div");
          sd.className = "mt-3 text-sm text-white/65 leading-relaxed";
          sd.textContent = String(s.description);
          text.appendChild(sd);
        }

        head.appendChild(badge);
        head.appendChild(text);
        card.appendChild(head);

        const imgUrl = resolveAnyMediaUrl(s.image);
        if (imgUrl) {
          const img = document.createElement("img");
          img.alt = "";
          img.src = imgUrl;
          img.className = "mt-4 w-full h-40 object-cover rounded-xl border border-white/10";
          card.appendChild(img);
        }

        if (s.content) {
          const body = document.createElement("div");
          body.className =
            "mt-4 prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary";
          body.innerHTML = String(s.content);
          card.appendChild(body);
        }

        if (s.modalHtml) {
          const more = document.createElement("button");
          more.type = "button";
          more.className =
            "mt-auto text-primary text-sm font-medium flex items-center gap-2 hover:gap-3 transition-all";
          more.innerHTML = `Подробнее <span class="material-symbols-outlined text-sm">arrow_forward</span>`;
          more.addEventListener("click", () => {
            const modal = ensureStepModal();
            const titleEl = modal.querySelector("[data-step-modal-title]");
            if (titleEl) titleEl.textContent = String(s.title || "");
            const body = modal.querySelector("[data-step-modal-body]");
            if (body) body.innerHTML = extractModalBodyHtml(s.modalHtml);
            modal.classList.remove("hidden");
          });
          text.appendChild(more);
        }

        list.appendChild(card);
      }

      wrap.appendChild(list);
    }

    if (contentHtml) {
      const body = document.createElement("div");
      body.className = "mt-6 prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-primary";
      body.innerHTML = contentHtml;
      wrap.appendChild(body);
    }

    return wrap;
  }


  function renderSectionMap(section) {
    const title = String(section?.title || "").trim();
    const desc = String(section?.description || "").trim();
    const markers = Array.isArray(section?.markers) ? section.markers.filter(Boolean) : [];
    const mapUrl = String(section?.mapUrl || "").trim();

    if (!title && !desc && markers.length === 0) return null;

    const wrap = document.createElement("section");
    wrap.className = "section-map rounded-2xl border border-white/10 bg-white/5 p-6";
    wrap.setAttribute("data-section-map", "");
    wrap.setAttribute("data-map-provider", String(section?.mapType || "yandex"));
    if (Number.isFinite(section?.centerLat)) wrap.setAttribute("data-map-center-lat", String(section.centerLat));
    if (Number.isFinite(section?.centerLng)) wrap.setAttribute("data-map-center-lng", String(section.centerLng));
    if (Number.isFinite(section?.zoom)) wrap.setAttribute("data-map-zoom", String(section.zoom));

    if (title) {
      const h = document.createElement("h2");
      h.className = "section-map__title text-xl font-black tracking-tight mb-2 text-white";
      h.textContent = title;
      wrap.appendChild(h);
    }
    const container = document.createElement("div");
    container.className =
      "section-map__container grid grid-cols-[420px_minmax(0,1fr)] gap-6 items-stretch";
    container.style.gridTemplateColumns = "420px minmax(0, 1fr)";

    const objects = document.createElement("div");
    objects.className = "section-map__objects";

    const list = document.createElement("div");
    list.className =
      "section-map__objects-list flex flex-col gap-2 h-[85vh] overflow-y-auto pr-2";

    const normalizeMapEmbedUrl = (base) => {
      if (!base) return "";
      try {
        const url = new URL(base, window.location.origin);
        if (/yandex\.ru$/i.test(url.hostname) && url.pathname.startsWith("/maps")) {
          const embed = new URL("https://yandex.ru/map-widget/v1/");
          ["ll", "z", "l", "text"].forEach((key) => {
            const val = url.searchParams.get(key);
            if (val) embed.searchParams.set(key, val);
          });
          return embed.toString();
        }
        return url.toString();
      } catch {
        return base;
      }
    };

    const buildMapUrl = (base, marker) => {
      if (!base) return "";
      try {
        const url = new URL(base, window.location.origin);
        const lat = marker?.lat;
        const lng = marker?.lng;
        const address = marker?.address || marker?.title || "";
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          url.searchParams.set("ll", `${lng},${lat}`);
          url.searchParams.set("z", String(section?.zoom || 17));
          url.searchParams.delete("text");
        } else if (address) {
          url.searchParams.set("text", address);
          url.searchParams.delete("ll");
        }
        return normalizeMapEmbedUrl(url.toString());
      } catch {
        return normalizeMapEmbedUrl(base);
      }
    };

    markers.forEach((m, idx) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className =
        "section-map__object-item text-left rounded-lg border border-white/10 bg-black/20 hover:bg-black/10 transition-colors px-4 py-3";
      item.setAttribute("data-map-marker", "");
      item.setAttribute("data-map-marker-idx", String(idx));
      if (m.lat != null) item.setAttribute("data-lat", String(m.lat));
      if (m.lng != null) item.setAttribute("data-lng", String(m.lng));

      const t = document.createElement("div");
      t.className = "font-black text-white/90";
      t.textContent = String(m.title || `Точка ${idx + 1}`);
      item.appendChild(t);

      if (m.description) {
        const d = document.createElement("div");
        d.className = "mt-2 text-sm text-white/65 leading-relaxed";
        d.textContent = String(m.description);
        item.appendChild(d);
      }

      list.appendChild(item);
    });

    if (markers.length === 0) {
      const empty = document.createElement("div");
      empty.className = "text-sm text-white/50 border border-white/10 bg-black/20 rounded-xl p-4";
      empty.textContent = "Нет маркеров для отображения.";
      list.appendChild(empty);
    }

    objects.appendChild(list);

    const mapWrap = document.createElement("div");
    mapWrap.className =
      "section-map__map-wrapper rounded-2xl border border-white/10 bg-black/20 overflow-hidden h-[85vh] w-full";
    mapWrap.setAttribute("data-section-map-canvas", "");

    let mapFrame = null;
    if (mapUrl) {
      mapFrame = document.createElement("iframe");
      mapFrame.className = "w-full h-full border-0";
      mapFrame.loading = "lazy";
      mapFrame.referrerPolicy = "no-referrer-when-downgrade";
      const initialMarker = markers[0];
      mapFrame.src = buildMapUrl(mapUrl, initialMarker) || normalizeMapEmbedUrl(mapUrl) || mapUrl;
      mapWrap.appendChild(mapFrame);
    }

    const markerJson = document.createElement("script");
    markerJson.type = "application/json";
    markerJson.setAttribute("data-section-map-markers", "");
    try {
      markerJson.textContent = JSON.stringify(markers);
    } catch {
      markerJson.textContent = "[]";
    }

    container.appendChild(objects);
    container.appendChild(mapWrap);
    wrap.appendChild(container);
    wrap.appendChild(markerJson);

    if (mapFrame && markers.length) {
      const items = Array.from(list.querySelectorAll("[data-map-marker-idx]"));
      items.forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.getAttribute("data-map-marker-idx"));
          const marker = Number.isFinite(idx) ? markers[idx] : null;
          const nextUrl = marker ? buildMapUrl(mapUrl, marker) : "";
          if (nextUrl) mapFrame.src = nextUrl;
        });
      });
    }
    return wrap;
  }


  function setContactMarker(el, m, { defaultCategory = "offices" } = {}) {
    if (!el || !m) return;
    const id = String(m.id || m.slug || slugifyId(m.title || m.name || "") || "");
    const cat = String(m.category || m.type || defaultCategory || "");
    if (id) el.setAttribute("data-contact-id", id);
    if (cat) el.setAttribute("data-contact-category", cat);

    if (m.lat != null) el.setAttribute("data-lat", String(m.lat));
    if (m.lng != null) el.setAttribute("data-lng", String(m.lng));

    const tip = el.querySelector("div.absolute.-top-12") || el.querySelector("div.bg-primary,div.bg-cyan-500");
    if (tip) tip.textContent = String(m.label || m.title || m.name || "").toUpperCase();
  }


  function setContactItem(el, m, { defaultCategory = "offices" } = {}) {
    if (!el || !m) return;
    const id = String(m.id || m.slug || slugifyId(m.title || m.name || "") || "");
    const cat = String(m.category || m.type || defaultCategory || "");
    if (id) el.setAttribute("data-contact-id", id);
    if (cat) el.setAttribute("data-contact-category", cat);

    if (m.lat != null) el.setAttribute("data-lat", String(m.lat));
    if (m.lng != null) el.setAttribute("data-lng", String(m.lng));

    const titleEl = el.querySelector("h4");
    if (titleEl) titleEl.textContent = String(m.title || m.name || "Локация");
    const addrEl = el.querySelector("p");
    if (addrEl) addrEl.textContent = String(m.address || m.description || "");

    const badge = el.querySelector("span.text-\\[10px\\]") || el.querySelector("span.bg-green-500\\/20,span.bg-primary\\/20");
    if (badge) {
      if (cat === "network") {
        badge.textContent = String(m.badge || "Узел связи");
        badge.classList.remove("bg-green-500/20", "text-green-400");
        badge.classList.add("bg-primary/20", "text-primary");
      } else {
        badge.textContent = String(m.badge || "Открыто");
        badge.classList.remove("bg-primary/20", "text-primary");
        badge.classList.add("bg-green-500/20", "text-green-400");
      }
    }
  }


  function applyFullBleed(sectionEl) {
    if (!sectionEl) return;
    sectionEl.style.width = "100vw";
    sectionEl.style.marginLeft = "calc(50% - 50vw)";
    sectionEl.style.marginRight = "calc(50% - 50vw)";
  }

  // Career Values Section
  function renderCareerValues(section) {
    const items = Array.isArray(section?.items) ? section.items.filter(Boolean) : [];
    if (!items.length && !section?.title) return null;

    const wrap = document.createElement("section");
    wrap.className = "py-20 bg-background-dark w-full";
    wrap.id = "values";
    wrap.setAttribute("data-career-section", "values");
    applyFullBleed(wrap);

    const container = document.createElement("div");
    container.className = "max-w-[1280px] mx-auto px-6 lg:px-10";

    const header = document.createElement("div");
    header.className = "flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4";

    const headerText = document.createElement("div");
    headerText.className = "space-y-2";

    if (section?.eyebrow) {
      const eyebrow = document.createElement("h3");
      eyebrow.className = "text-primary font-bold text-sm tracking-widest uppercase";
      eyebrow.textContent = String(section.eyebrow);
      headerText.appendChild(eyebrow);
    }

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "text-3xl font-bold text-white";
      h.textContent = String(section.title);
      headerText.appendChild(h);
    }

    header.appendChild(headerText);

    if (section?.description) {
      const p = document.createElement("p");
      p.className = "text-slate-400 max-w-sm text-sm";
      p.textContent = String(section.description);
      header.appendChild(p);
    }

    container.appendChild(header);

    if (items.length) {
      const grid = document.createElement("div");
      grid.className = "grid grid-cols-1 md:grid-cols-3 gap-6";

      items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "glass-card p-8 rounded-xl border border-white/5 hover:border-primary/50 transition-all group";

        const iconWrap = document.createElement("div");
        iconWrap.className = "w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all";

        const iconEl = buildIconElement({
          icon: item.icon,
          fallback: resolveMaterialIconName(item.icon) || "verified_user",
          spanClass: "material-symbols-outlined text-3xl",
          imgClass: "w-7 h-7 object-contain",
          alt: item.title || "",
        });
        iconWrap.appendChild(iconEl);
        card.appendChild(iconWrap);

        if (item.title) {
          const h = document.createElement("h3");
          h.className = "text-xl font-bold mb-3 text-white";
          h.textContent = String(item.title);
          card.appendChild(h);
        }

        if (item.description) {
          const p = document.createElement("p");
          p.className = "text-slate-400 leading-relaxed";
          p.textContent = String(item.description);
          card.appendChild(p);
        }

        grid.appendChild(card);
      });

      container.appendChild(grid);
    }

    wrap.appendChild(container);
    return wrap;
  }

  // Career Vacancies Section
  function renderCareerVacancies(section) {
    const filters = Array.isArray(section?.filters) ? section.filters.filter(Boolean) : [];
    const itemsRaw = Array.isArray(section?.vacancies) ? section.vacancies : section?.items;
    const items = Array.isArray(itemsRaw) ? itemsRaw.filter(Boolean) : [];
    const initialVisible = Number(section?.initialVisible ?? section?.loadMoreVisible ?? 4) || 4;
    if (!items.length && !section?.title) return null;

    const wrap = document.createElement("section");
    wrap.className = "py-20 bg-[#0b0e14] w-full";
    wrap.id = "vacancies";
    wrap.setAttribute("data-career-section", "vacancies");
    applyFullBleed(wrap);

    const container = document.createElement("div");
    container.className = "max-w-[1280px] mx-auto px-6 lg:px-10";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "text-3xl font-bold text-white mb-8";
      h.textContent = String(section.title);
      container.appendChild(h);
    }

    const getFilterKey = (f) => String((f && (f.key || f.slug)) || "").trim();
    const getTagKeys = (tags) =>
      (Array.isArray(tags) ? tags : [])
        .map((t) => String((t && (t.key || t.slug)) || "").trim())
        .filter(Boolean);

    // Filters
    if (filters.length) {
      const filterWrap = document.createElement("div");
      filterWrap.className = "flex flex-wrap gap-2 mb-10";
      filterWrap.setAttribute("data-vacancy-filters", "");

      const hasActive = filters.some((f) => f && f.isActive);
      filters.forEach((f, idx) => {
        const key = getFilterKey(f);
        const isActive = hasActive ? !!f.isActive : idx === 0;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = isActive
          ? "px-6 py-2 rounded-full bg-primary text-white text-sm font-bold"
          : "px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium border border-white/10";
        btn.textContent = String(f.label || "");
        btn.setAttribute("data-filter-key", key);
        btn.setAttribute("data-filter-active", String(isActive));
        filterWrap.appendChild(btn);
      });

      container.appendChild(filterWrap);
    }

    // Vacancy cards
    if (items.length) {
      const listWrap = document.createElement("div");
      listWrap.setAttribute("data-loadmore", "");
      listWrap.setAttribute("data-loadmore-visible", String(initialVisible));

      const list = document.createElement("div");
      list.className = "flex flex-col gap-4";
      list.setAttribute("data-loadmore-list", "");
      list.setAttribute("data-vacancy-table", "");

      let loadMoreWrap = null;
      let loadMoreCountEl = null;
      let loadMoreBtn = null;

      items.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className =
          "p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/20";
        card.setAttribute("data-vacancy-row", "");
        if (idx >= initialVisible) {
          card.classList.add("hidden");
        }
        card.setAttribute("data-loadmore-item", "");
        const tagKeys = getTagKeys(item?.tags);
        if (tagKeys.length) {
          card.setAttribute("data-vacancy-tags", tagKeys.join(","));
        }

        const left = document.createElement("div");
        left.className = "flex flex-col gap-2";

        if (item.title) {
          const h = document.createElement("h4");
          h.className = "text-lg md:text-xl font-semibold text-white";
          h.setAttribute("data-vacancy-title", "");
          h.textContent = String(item.title);
          left.appendChild(h);
        }

        const meta = Array.isArray(item?.meta) ? item.meta.filter(Boolean) : [];
        if (meta.length) {
          const metaWrap = document.createElement("div");
          metaWrap.className = "flex flex-wrap items-center gap-4 text-sm text-slate-300";
          metaWrap.setAttribute("data-vacancy-meta", "");

          meta.forEach((m) => {
            const span = document.createElement("span");
            span.className = "flex items-center gap-1";
            const icon = document.createElement("span");
            icon.className = "material-symbols-outlined text-base text-slate-400";
            icon.textContent = String(m.icon || "info");
            span.appendChild(icon);
            span.appendChild(document.createTextNode(String(m.text || "")));
            metaWrap.appendChild(span);
          });

          left.appendChild(metaWrap);
        }

        card.appendChild(left);

        const right = document.createElement("div");
        right.className = "mt-2 md:mt-0 flex items-center gap-4 md:gap-6 flex-wrap md:flex-nowrap";

        const salaryText = item.salaryText || item.salary || "";
        if (salaryText) {
          const salary = document.createElement("span");
          salary.className = "text-primary font-semibold";
          salary.setAttribute("data-vacancy-salary", "");
          salary.textContent = String(salaryText);
          right.appendChild(salary);
        }

        const ctaUrl = item.ctaUrl || item.link;
        if (ctaUrl) {
          const btn = document.createElement("a");
          btn.className =
            "bg-primary/20 text-primary hover:bg-primary hover:text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all inline-flex items-center justify-center";
          btn.setAttribute("data-vacancy-cta", "");
          btn.href = String(ctaUrl);
          btn.textContent = String(item.ctaLabel || "Откликнуться");
          right.appendChild(btn);
        }

        card.appendChild(right);
        list.appendChild(card);
      });

      listWrap.appendChild(list);

      // Load more button
      if (items.length > initialVisible) {
        loadMoreWrap = document.createElement("div");
        loadMoreWrap.className = "mt-12 text-center";

        loadMoreBtn = document.createElement("button");
        loadMoreBtn.type = "button";
        loadMoreBtn.className = "text-slate-400 hover:text-white flex items-center gap-2 mx-auto font-medium transition-colors";
        loadMoreBtn.setAttribute("data-loadmore-button", "");

        const label = document.createElement("span");
        label.setAttribute("data-loadmore-label", "");
        label.textContent = String(section?.showMoreLabel || section?.loadMoreText || "Показать все");

        const count = document.createElement("span");
        count.setAttribute("data-loadmore-total", "");
        count.textContent = String(section?.totalCount || items.length);
        loadMoreCountEl = count;

        const countLabel = document.createElement("span");
        countLabel.textContent = " " + String(section?.totalSuffix || section?.loadMoreCountText || "вакансии");

        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined";
        icon.textContent = "expand_more";

        loadMoreBtn.appendChild(label);
        loadMoreBtn.appendChild(document.createTextNode(" "));
        loadMoreBtn.appendChild(count);
        loadMoreBtn.appendChild(countLabel);
        loadMoreBtn.appendChild(icon);
        loadMoreWrap.appendChild(loadMoreBtn);
        listWrap.appendChild(loadMoreWrap);
      }

      container.appendChild(listWrap);

      // Filtering behavior
      if (filters.length) {
        const buttons = Array.from(container.querySelectorAll("[data-filter-key]"));
        const applyButtonState = (btn, active) => {
          if (active) {
            btn.className = "px-6 py-2 rounded-full bg-primary text-white text-sm font-bold";
            btn.setAttribute("data-filter-active", "true");
          } else {
            btn.className =
              "px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium border border-white/10";
            btn.setAttribute("data-filter-active", "false");
          }
        };

        const applyFilter = (key) => {
          const normalized = key || "all";
          let matched = [];
          const cards = Array.from(list.querySelectorAll("[data-loadmore-item]"));
          cards.forEach((card) => {
            const tags = String(card.getAttribute("data-vacancy-tags") || "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
            const isMatch = normalized === "all" || !normalized || tags.includes(normalized);
            card.setAttribute("data-vacancy-match", isMatch ? "1" : "0");
            if (isMatch) matched.push(card);
          });

          // Show initialVisible items from matched
          matched.forEach((card, idx) => {
            if (idx < initialVisible) {
              card.classList.remove("hidden");
            } else {
              card.classList.add("hidden");
            }
          });
          // Hide non-matching
          cards.forEach((card) => {
            if (card.getAttribute("data-vacancy-match") !== "1") {
              card.classList.add("hidden");
            }
          });

          if (loadMoreWrap) {
            loadMoreWrap.classList.toggle("hidden", matched.length <= initialVisible);
          }
          if (loadMoreCountEl) {
            loadMoreCountEl.textContent = String(matched.length);
          }
        };

        const defaultBtn =
          buttons.find((b) => b.getAttribute("data-filter-active") === "true") || buttons[0];
        const defaultKey = defaultBtn ? defaultBtn.getAttribute("data-filter-key") : "all";
        buttons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-filter-key") || "all";
            buttons.forEach((b) => applyButtonState(b, b === btn));
            applyFilter(key);
          });
        });

        applyFilter(defaultKey);

        if (loadMoreBtn && loadMoreWrap) {
          loadMoreBtn.addEventListener("click", () => {
            const cards = Array.from(list.querySelectorAll("[data-loadmore-item]"));
            cards.forEach((card) => {
              if (card.getAttribute("data-vacancy-match") === "1") {
                card.classList.remove("hidden");
              }
            });
            loadMoreWrap.classList.add("hidden");
          });
        }
      }
    }

    wrap.appendChild(container);
    return wrap;
  }

  // Career Why Company Section
  function renderCareerWhyCompany(section) {
    const cards = Array.isArray(section?.cards) ? section.cards.filter(Boolean) : [];
    if (!cards.length && !section?.title) return null;

    const wrap = document.createElement("section");
    wrap.className = "py-20 bg-background-dark border-t border-white/5 w-full";
    wrap.setAttribute("data-career-section", "why-company");
    applyFullBleed(wrap);

    const container = document.createElement("div");
    container.className = "max-w-[1280px] mx-auto px-6 lg:px-10";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "text-3xl font-bold text-white mb-12 text-center";
      h.textContent = String(section.title);
      container.appendChild(h);
    }

    if (cards.length) {
      const grid = document.createElement("div");
      grid.className = "grid grid-cols-1 lg:grid-cols-2 gap-8";

      cards.forEach((card) => {
        const cardWrap = document.createElement("div");
        const accent = String(card.accent || "primary");
        const isRed = accent === "brand-red";
        cardWrap.className = isRed
          ? "relative group overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-background-dark p-8 border border-primary/20 min-h-[400px]"
          : "relative group overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-background-dark p-8 border border-white/10 min-h-[400px]";

        // Background icon
        const bgIcon = document.createElement("div");
        bgIcon.className = "absolute -right-10 -bottom-10 opacity-10 transform rotate-12 group-hover:rotate-0 transition-transform duration-500";
        const accentColor = card.iconColor || (isRed ? "#ef4444" : "#0066cc");
        const iconName = resolveMaterialIconName(card.icon) || "architecture";
        const bgIconEl = buildIconElement({
          icon: card.icon,
          fallback: iconName,
          spanClass: "material-symbols-outlined text-[180px]",
          imgClass: "w-[180px] h-[180px] object-contain",
          alt: card.title || "",
        });
        if (bgIconEl.tagName === "SPAN") {
          bgIconEl.style.color = accentColor;
        }
        bgIcon.appendChild(bgIconEl);
        cardWrap.appendChild(bgIcon);

        const content = document.createElement("div");
        content.className = "relative z-10";

        if (card.title) {
          const h = document.createElement("h3");
          h.className = "text-2xl font-bold text-white mb-4";
          h.textContent = String(card.title);
          content.appendChild(h);
        }

        if (card.description) {
          const p = document.createElement("p");
          p.className = "text-slate-400 mb-8 max-w-sm";
          p.textContent = String(card.description);
          content.appendChild(p);
        }

        const items = Array.isArray(card?.items) ? card.items.filter(Boolean) : [];
        if (items.length) {
          const list = document.createElement("ul");
          list.className = "space-y-4";

          items.forEach((item) => {
            const li = document.createElement("li");
            li.className = "flex items-start gap-3 text-slate-300";

            const iconEl = buildIconElement({
              icon: item.icon,
              fallback: resolveMaterialIconName(item.icon) || "check_circle",
              spanClass: "material-symbols-outlined",
              imgClass: "w-5 h-5 object-contain",
              alt: item.text || "",
            });
            if (iconEl.tagName === "SPAN") {
              iconEl.style.color = accentColor;
            }

            const text = document.createElement("span");
            text.textContent = String(item.text || "");

            li.appendChild(iconEl);
            li.appendChild(text);
            list.appendChild(li);
          });

          content.appendChild(list);
        }

        cardWrap.appendChild(content);
        grid.appendChild(cardWrap);
      });

      container.appendChild(grid);
    }

    wrap.appendChild(container);
    return wrap;
  }

  // Career CV Form Section
  function renderCareerCvForm(section) {
    const wrap = document.createElement("section");
    wrap.className = "py-24 relative overflow-hidden w-full";
    wrap.setAttribute("data-career-section", "cv-form");
    wrap.setAttribute("data-career-cv-form", "");
    applyFullBleed(wrap);

    const bgOverlay = document.createElement("div");
    bgOverlay.className = "absolute inset-0 bg-primary/10";
    bgOverlay.setAttribute("data-career-cv-overlay", "");
    wrap.appendChild(bgOverlay);

    const container = document.createElement("div");
    container.className = "max-w-[800px] mx-auto px-6 relative z-10 text-center";

    if (section?.title) {
      const h = document.createElement("h2");
      h.className = "text-4xl font-bold text-white mb-6";
      h.setAttribute("data-career-cv-title", "");
      h.textContent = String(section.title);
      container.appendChild(h);
    }

    const cvDescription = section?.description || section?.subtitle || "";
    if (cvDescription) {
      const p = document.createElement("p");
      p.className = "text-slate-400 mb-10 text-lg max-w-2xl mx-auto";
      p.setAttribute("data-career-cv-description", "");
      p.textContent = String(cvDescription);
      container.appendChild(p);
    }

    const formWrap = document.createElement("div");
    formWrap.className = "flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto";

    const inputType = String(section?.inputType || "email");
    const input = document.createElement("input");
    input.type = inputType;
    input.className = "bg-white/5 border border-white/20 rounded-lg px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary flex-1 min-w-[250px]";
    input.setAttribute("data-career-cv-input", "");
    input.placeholder = String(section?.inputPlaceholder || section?.emailPlaceholder || "Ваш e-mail");
    formWrap.appendChild(input);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-lg font-bold text-base transition-all whitespace-nowrap";
    btn.setAttribute("data-career-cv-button", "");
    btn.textContent = String(section?.buttonLabel || section?.buttonText || "Отправить резюме");
    formWrap.appendChild(btn);

    container.appendChild(formWrap);

    if (section?.disclaimerHtml || section?.disclaimerText) {
      const disclaimer = document.createElement("div");
      disclaimer.className = "mt-6 text-xs text-slate-500 max-w-md mx-auto";
      disclaimer.setAttribute("data-career-cv-disclaimer", "");
      if (section?.disclaimerHtml) {
        disclaimer.innerHTML = String(section.disclaimerHtml);
      } else {
        const linkHref = String(section?.disclaimerLink || "/data_processing");
        disclaimer.innerHTML =
          `Нажимая кнопку, вы соглашаетесь с <a href="${linkHref}" class="underline hover:text-primary transition-colors">политикой обработки персональных данных</a>`;
      }
      container.appendChild(disclaimer);
    } else {
      // Default disclaimer
      const disclaimer = document.createElement("p");
      disclaimer.className = "mt-6 text-xs text-slate-500";
      disclaimer.setAttribute("data-career-cv-disclaimer", "");
      disclaimer.innerHTML = 'Нажимая кнопку, вы соглашаетесь с <a href="/data_processing" class="underline hover:text-primary transition-colors">политикой обработки персональных данных</a>';
      container.appendChild(disclaimer);
    }

    wrap.appendChild(container);
    return wrap;
  }

  Object.assign(core, {
    renderSectionText,
    renderCardGrid,
    renderUnknownSection,
    isTableLike,
    normalizeTableData,
    renderSectionTable,
    renderImageCarousel,
    renderImageSwitcher,
    renderHistoryTimeline,
    renderCrmCards,
    renderHowToConnect,
    renderSectionMap,
    setContactMarker,
    setContactItem,
    enhanceDocLinks,
    ensureTextLinkStyles,
    linkifyWebLinks,
    linkifyContactHtml,
    renderCareerValues,
    renderCareerVacancies,
    renderCareerWhyCompany,
    renderCareerCvForm
  });
})();

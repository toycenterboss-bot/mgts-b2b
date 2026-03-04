(function () {
  "use strict";

  const api = window.MGTS_CMS_LOADER;
  if (!api) return;
  const { register, utils } = api;
  const { STRAPI_BASE, fetchJson, unwrapApiData, normalizeCmsHref } = utils;

  register({
    id: "footer:ai-chat-visible",
    scope: "document",
    pages: ["tpl_ai_chat"],
    priority: 95,
    init: function () {
      const block = document.querySelector('[data-stitch-block="footer_and_contact_form"]');
      if (block) {
        block.classList.remove("hidden");
        block.style.display = "";
        const orderSection = block.querySelector("[data-order-form-section]");
        if (orderSection) orderSection.classList.remove("hidden");
      }
    },
  });

  register({
    id: "canonical:footer",
    scope: "document",
    priority: 90,
    init: function (_ctx, _root) {
      (async () => {
        let footer = null;
        try {
          const footerJson = await fetchJson(`${STRAPI_BASE}/api/footer`);
          footer = unwrapApiData(footerJson);
        } catch (e) {
          console.warn("[MGTS_CMS_LOADER] footer fetch failed:", e);
        }

        if (!footer) return;

        try {
          const foot = document.querySelector("footer");
          if (foot) {
            const normalizeLinks = (links) => {
              let list = [];
              if (Array.isArray(links)) list = links;
              else if (links && Array.isArray(links.data)) list = links.data;
              return list
                .map((lnk) => {
                  if (!lnk) return null;
                  if (lnk.attributes && typeof lnk.attributes === "object") lnk = lnk.attributes;
                  if (lnk.data && lnk.data.attributes && typeof lnk.data.attributes === "object") lnk = lnk.data.attributes;
                  const label = String(lnk.label || "").trim();
                  const href = String(lnk.href || "").trim();
                  if (!label || !href) return null;
                  return {
                    label,
                    href,
                    isExternal: !!lnk.isExternal,
                  };
                })
                .filter(Boolean);
            };

            const legalLinksRaw =
              footer.legalLinks ||
              footer.legal_links ||
              footer.legalLinksList ||
              footer.legal_links_list ||
              (footer.legalLinks && footer.legalLinks.data) ||
              [];
            let legalLinks = normalizeLinks(legalLinksRaw);
            const legalLabelSet = new Set(
              legalLinks.map((lnk) => String(lnk.label || "").trim().toLowerCase()).filter(Boolean)
            );
            const legalKeySet = new Set(
              legalLinks.map((lnk) => `${lnk.label}|${lnk.href}`)
            );

            let sections = Array.isArray(footer.sections)
              ? footer.sections.filter(Boolean)
              : Array.isArray(footer.columns)
                ? footer.columns.filter(Boolean)
                : [];
            if (!legalLinks.length) {
              const legalSection = sections.find((sec) => {
                const title = String(sec.title || "").trim().toLowerCase();
                return title.includes("правов") || title.includes("legal");
              });
              if (legalSection) {
                legalLinks = normalizeLinks(legalSection.links);
              }
            }
            if (legalKeySet.size) {
              sections = sections.filter((sec) => {
                const links = normalizeLinks(sec.links);
                if (!links.length) return true;
                const filtered = links.filter((lnk) => {
                  const key = `${lnk.label}|${lnk.href}`;
                  return !legalKeySet.has(key) && !legalLabelSet.has(lnk.label.toLowerCase());
                });
                sec.links = filtered;
                return filtered.length > 0;
              });
            }
            const grid = foot.querySelector(".grid");
            if (grid) {
              const cols = Array.from(grid.children).filter((x) => x instanceof HTMLElement);
              const brandCol = cols[0] || null;

              grid.innerHTML = "";
              if (brandCol) grid.appendChild(brandCol);

              grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";

              sections.forEach((sec) => {
                const col = document.createElement("div");

                const h3 = document.createElement("h3");
                h3.className = "text-xs font-bold uppercase tracking-[0.18em] text-primary";
                h3.textContent = String(sec.title || "").trim() || "Раздел";
                col.appendChild(h3);

                const ul = document.createElement("ul");
                ul.className = "flex flex-col gap-0.5";
                const links = normalizeLinks(sec.links);
                links.forEach((lnk) => {
                  const li = document.createElement("li");
                  const a = document.createElement("a");
                  a.className = "text-xs leading-[1.1] text-gray-400 hover:text-white transition-colors";
                  const rawHref = lnk.href;
                  a.href = typeof normalizeCmsHref === "function" ? normalizeCmsHref(rawHref) : rawHref;
                  if (lnk.isExternal) {
                    a.target = "_blank";
                    a.rel = "noreferrer";
                  }
                  a.textContent = lnk.label;
                  li.appendChild(a);
                  ul.appendChild(li);
                });
                col.appendChild(ul);
                grid.appendChild(col);
              });
            }

            // Copyright (bottom-left)
            const rawCopyright =
              footer.copyright ||
              footer.copyrightText ||
              footer.copyrightNotice ||
              footer.copy ||
              footer.legalText ||
              footer.bottomText ||
              "";
            const copyrightText =
              (rawCopyright &&
              typeof rawCopyright === "object" &&
              typeof rawCopyright.text === "string"
                ? rawCopyright.text
                : rawCopyright &&
                  typeof rawCopyright === "object" &&
                  typeof rawCopyright.label === "string"
                  ? rawCopyright.label
                  : String(rawCopyright || ""))
                .trim();
            if (copyrightText) {
              const legalContainer = foot.querySelector("div.pt-10.border-t") || foot.querySelector("div.border-t");
              const linksWrap = legalContainer ? legalContainer.querySelector(".flex.items-center.gap-4") : null;
              const leftWrap =
                legalContainer &&
                legalContainer.querySelector("div.flex.flex-col.md\\:flex-row.items-center.gap-4.md\\:gap-8")
                  ? legalContainer.querySelector("div.flex.flex-col.md\\:flex-row.items-center.gap-4.md\\:gap-8")
                  : linksWrap
                    ? linksWrap.parentElement
                    : legalContainer
                      ? legalContainer.querySelector("div.flex")
                      : null;
              const p =
                (leftWrap && leftWrap.querySelector("p")) ||
                Array.from(foot.querySelectorAll("p")).find((x) => String(x.textContent || "").includes("©")) ||
                null;
              if (p) {
                p.textContent = copyrightText;
              } else if (leftWrap) {
                const newP = document.createElement("p");
                newP.className = "text-xs text-gray-600 uppercase tracking-widest";
                newP.textContent = copyrightText;
                leftWrap.insertAdjacentElement("afterbegin", newP);
              }
            }

            // Legal links (render all into the existing container if present)
            const legalContainer = foot.querySelector("div.pt-10.border-t") || foot.querySelector("div.border-t");
            if (legalContainer && legalLinks.length) {
              let leftWrap = legalContainer.querySelector(
                "div.flex.flex-col.md\\:flex-row.items-center.gap-4.md\\:gap-8"
              );
              if (!leftWrap) {
                leftWrap = document.createElement("div");
                leftWrap.className = "flex flex-col md:flex-row items-center gap-4 md:gap-8";
                legalContainer.insertAdjacentElement("afterbegin", leftWrap);
              }

              let linksWrap = leftWrap.querySelector(".flex.items-center.gap-4");
              if (!linksWrap) {
                linksWrap = document.createElement("div");
                linksWrap.className = "flex items-center gap-4";
                leftWrap.appendChild(linksWrap);
              }

              linksWrap.innerHTML = "";
              legalLinks.forEach((lnk) => {
                const a = document.createElement("a");
                a.className = "text-xs text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-widest";
                const rawHref = lnk.href;
                a.href = typeof normalizeCmsHref === "function" ? normalizeCmsHref(rawHref) : rawHref;
                if (lnk.isExternal) {
                  a.target = "_blank";
                  a.rel = "noreferrer";
                }
                a.textContent = lnk.label;
                linksWrap.appendChild(a);
              });
            }
          }
        } catch (e) {
          console.error("[MGTS_CMS_LOADER] apply footer failed:", e);
        }
      })();
    },
  });
})();

(function () {
  "use strict";

  if (window.MGTS_CMS_LOADER && window.MGTS_CMS_LOADER.__coreLoaded) return;

  // Track "initialized" markers without touching data-* attributes.
  // Using DOMStringMap (el.dataset[...]) is unsafe when module IDs contain ":" etc.
  /** @type {WeakMap<Element, Set<string>>} */
  const enhancedByEl = new WeakMap();

  /** @returns {string} */
  function getPageName() {
    const body = document.body;
    const fromData = body && body.dataset ? body.dataset.page : "";
    if (fromData) return fromData;
    // fallback: title (tpl_home, etc.)
    return (document.title || "").trim();
  }

  function toPrettyRoute(slug) {
    const s = String(slug || "")
      .trim()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
    if (!s) return "/";
    const parts = s.split("/").filter(Boolean);
    const encoded = parts.map((p) => encodeURIComponent(p));
    return `/${encoded.join("/")}`;
  }

  function extractSlugFromHref(rawHref) {
    const s = String(rawHref || "").trim();
    if (!s) return "";
    try {
      const u = new URL(s, window.location.origin);
      const qsSlug = (u.searchParams.get("slug") || "").trim();
      if (qsSlug) return qsSlug;
      const cleaned = (u.pathname || "")
        .replace(/^https?:\/\/[^/]+/i, "")
        .replace(/^\//, "")
        .replace(/#.*$/, "")
        .replace(/\?.*$/, "")
        .replace(/index\.html$/i, "")
        .replace(/\.html$/i, "")
        .replace(/\/$/, "");
      return cleaned;
    } catch {
      return "";
    }
  }

  function normalizeCmsHref(rawHref) {
    const s = String(rawHref || "").trim();
    if (!s) return "#";
    if (s.startsWith("#")) return s;
    if (/^(mailto|tel):/i.test(s)) return s;
    const isAbs = /^https?:\/\//i.test(s);
    if (isAbs) {
      try {
        const u = new URL(s);
        const host = u.hostname;
        const internalHost =
          host === window.location.hostname || host === "localhost" || host === "127.0.0.1";
        if (!internalHost) return s;
      } catch {
        return s;
      }
    }
    const slug = extractSlugFromHref(s);
    if (!slug) return s;
    return toPrettyRoute(slug);
  }

  function getStrapiBase() {
    try {
      const qsStrapi = new URLSearchParams(window.location.search).get("strapi");
      if (qsStrapi && qsStrapi.trim()) return qsStrapi.trim();
    } catch {
      // ignore
    }
    const inferredHost = window.location.hostname || "localhost";
    const inferredProtocol = window.location.protocol === "file:" ? "http:" : window.location.protocol;
    const inferredBase = `${inferredProtocol}//${inferredHost}:1337`;
    return inferredBase.startsWith("http://") || inferredBase.startsWith("https://") ? inferredBase : "http://localhost:1337";
  }

  const STRAPI_BASE = getStrapiBase();
  let activeTheme = "";

  function applyThemeOverride() {
    const root = document.documentElement;
    if (!root) return;
    let theme = "";
    try {
      const qs = new URLSearchParams(window.location.search);
      theme = String(qs.get("theme") || qs.get("mode") || "").trim().toLowerCase();
    } catch {
      // ignore
    }
    if (!theme) {
      const raw = String(window.location.search || "");
      if (raw.includes("%3D") || raw.includes("%3F")) {
        try {
          const decoded = decodeURIComponent(raw);
          const nextSearch = decoded.startsWith("?") ? decoded : `?${decoded}`;
          const qs2 = new URLSearchParams(nextSearch);
          theme = String(qs2.get("theme") || qs2.get("mode") || "").trim().toLowerCase();
          const url = new URL(window.location.href);
          url.search = nextSearch;
          if (url.toString() !== window.location.href) {
            window.location.replace(url.toString());
            return;
          }
        } catch {
          // ignore
        }
      }
    }
    if (!theme) return;
    if (theme === "auto") {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light", { updateUrl: false });
      return;
    }
    setTheme(theme, { updateUrl: false });
  }

  applyThemeOverride();

  function ensureBaseStyles() {
    if (document.getElementById("mgts-base-overrides")) return;
    const style = document.createElement("style");
    style.id = "mgts-base-overrides";
    style.textContent = `
      .mega-menu-blur {
        backdrop-filter: blur(12px);
        background-color: rgba(15, 25, 35, 0.95);
      }
    `;
    document.head.appendChild(style);
  }

  ensureBaseStyles();

  function ensureLightNewsVisibility() {
    if (!document.documentElement.classList.contains("light")) return;
    const block = document.querySelector('[data-stitch-block="news_and_documents_list_2"]');
    if (!block) return;
    block.classList.remove("hidden");
    const h1 = block.querySelector("h1");
    if (h1) {
      h1.style.color = "#0f172a";
      h1.style.backgroundImage = "none";
      h1.style.webkitTextFillColor = "#0f172a";
    }
  }

  function ensureLightThemeStyles() {
    if (document.getElementById("mgts-light-theme-overrides")) return;
    const style = document.createElement("style");
    style.id = "mgts-light-theme-overrides";
    style.textContent = `
      html.light, html.light body {
        background-color: #f5f7f8;
        color: #0f172a;
      }
      html.light .bg-background-dark { background-color: #f5f7f8 !important; }
      html.light .bg-background-dark\\/40,
      html.light .bg-background-dark\\/50,
      html.light .bg-background-dark\\/60,
      html.light .bg-background-dark\\/80,
      html.light .bg-background-dark\\/90 {
        background-color: #f5f7f8 !important;
      }
      html.light .bg-premium-dark { background-color: #ffffff !important; }
      html.light .bg-slate-700 {
        background-color: #f8fafc !important;
      }
      html.light .bg-slate-900, 
      html.light .bg-slate-900\\/50,
      html.light .bg-slate-900\\/60,
      html.light .bg-black\\/20,
      html.light .bg-black\\/30,
      html.light .bg-black\\/40,
      html.light .bg-black\\/50 {
        background-color: #ffffff !important;
      }
      html.light .bg-white\\/5,
      html.light .bg-white\\/10,
      html.light .bg-white\\/20 {
        background-color: rgba(15, 23, 42, 0.04) !important;
      }
      html.light .bg-black,
      html.light .bg-black\\/60,
      html.light .bg-black\\/70,
      html.light .bg-black\\/80 {
        background-color: #ffffff !important;
      }
      html.light .border-white\\/10,
      html.light .border-white\\/20,
      html.light .border-white\\/30,
      html.light .border-white\\/5 {
        border-color: rgba(15, 23, 42, 0.12) !important;
      }
      html.light .text-white,
      html.light .text-white\\/60,
      html.light .text-white\\/70,
      html.light .text-white\\/80,
      html.light .text-white\\/90 {
        color: #0f172a !important;
      }
      html.light [class*="text-white/"] {
        color: #475569 !important;
      }
      html.light .bg-primary {
        background-color: #0066cc !important;
      }
      html.light .bg-accent-red {
        background-color: #E30611 !important;
      }
      html.light .bg-primary.text-white {
        color: #ffffff !important;
      }
      html.light .bg-accent-red.text-white {
        color: #ffffff !important;
      }
      html.light [class*="from-primary"][class*="to-"] {
        color: #ffffff !important;
      }
      html.light [class*="from-primary"][class*="to-"] [class*="text-white"] {
        color: #ffffff !important;
      }
      html.light [class*="bg-primary/"].text-white,
      html.light [class*="bg-primary/"] .text-white,
      html.light [class*="bg-accent-red/"].text-white,
      html.light [class*="bg-accent-red/"] .text-white {
        color: #ffffff !important;
      }
      html.light .bg-primary:hover {
        background-color: #1a75d1 !important;
      }
      html.light .hover\\:bg-blue-700:hover {
        background-color: #1a75d1 !important;
      }
      html.light .text-slate-100,
      html.light .text-slate-200,
      html.light .text-slate-300,
      html.light .text-slate-400 {
        color: #334155 !important;
      }
      html.light .text-slate-500,
      html.light .text-slate-600 {
        color: #475569 !important;
      }
      html.light .bg-panel-dark {
        background-color: #ffffff !important;
      }
      html.light .glass-effect {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }
      html.light .glass-button {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
      }
      html.light .glass-button:hover {
        background: #f8fafc !important;
        border-color: #94a3b8 !important;
      }
      html.light [data-stitch-block="footer_and_contact_form"] {
        color: #0f172a;
      }
      html.light [data-stitch-block="footer_and_contact_form"] .form-glass {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }
      html.light [data-stitch-block="footer_and_contact_form"] [class*="text-gray-"],
      html.light [data-stitch-block="footer_and_contact_form"] [class*="text-white/"],
      html.light [data-stitch-block="footer_and_contact_form"] .text-white {
        color: #0f172a !important;
      }
      html.light [data-stitch-block="footer_and_contact_form"] input,
      html.light [data-stitch-block="footer_and_contact_form"] textarea {
        background-color: #ffffff !important;
        color: #0f172a !important;
        border-color: #e2e8f0 !important;
      }
      html.light [data-stitch-block="footer_and_contact_form"] input::placeholder,
      html.light [data-stitch-block="footer_and_contact_form"] textarea::placeholder {
        color: #94a3b8 !important;
      }
      html.light [data-order-form-section] {
        color: #0f172a;
      }
      html.light [data-order-form-section] [class*="text-gray-"] {
        color: #475569 !important;
      }
      html.light [data-order-form-section] .bg-primary.text-white,
      html.light [data-order-form-section] .bg-primary.text-white * {
        color: #ffffff !important;
      }
      html.light [data-stitch-block="service_consultation_card"] {
        color: #ffffff !important;
      }
      html.light [data-stitch-block="service_consultation_card"] .text-white,
      html.light [data-stitch-block="service_consultation_card"] [class*="text-white/"] {
        color: #ffffff !important;
      }
      html.light [data-stitch-block="service_consultation_card"] .text-slate-400,
      html.light [data-stitch-block="service_consultation_card"] .text-slate-500 {
        color: rgba(226, 232, 240, 0.82) !important;
      }
      html.light [data-stitch-block="service_consultation_card"] .bg-primary.text-white,
      html.light [data-stitch-block="service_consultation_card"] .bg-primary.text-white * {
        color: #ffffff !important;
      }
      html.light [data-carousel] .image-carousel__item .text-white,
      html.light [data-carousel] .image-carousel__item [class*="text-white/"] {
        color: #ffffff !important;
      }
      html.light [data-carousel] .image-carousel__item .text-slate-200,
      html.light [data-carousel] .image-carousel__item .text-slate-300 {
        color: #e2e8f0 !important;
      }
      html.light [data-carousel] .image-carousel__item .bg-primary {
        color: #ffffff !important;
      }
      html.light [data-stitch-block="ceo_address_and_feedback_page"] {
        color: #0f172a;
      }
      html.light [data-stitch-block="ceo_address_and_feedback_page"] [class*="text-[#9dabb9]"],
      html.light [data-stitch-block="ceo_address_and_feedback_page"] [class*="text-white/"],
      html.light [data-stitch-block="ceo_address_and_feedback_page"] .text-white {
        color: #0f172a !important;
      }
      html.light [data-stitch-block="ceo_address_and_feedback_page"] input,
      html.light [data-stitch-block="ceo_address_and_feedback_page"] textarea {
        background-color: #ffffff !important;
        color: #0f172a !important;
        border-color: #e2e8f0 !important;
      }
      html.light [data-stitch-block="ceo_address_and_feedback_page"] input::placeholder,
      html.light [data-stitch-block="ceo_address_and_feedback_page"] textarea::placeholder {
        color: #94a3b8 !important;
      }
      html.light [data-stitch-block="ceo_address_and_feedback_page"] .bg-black\\/20 {
        background-color: rgba(0, 0, 0, 0.2) !important;
      }
      html.light [data-stitch-block="ceo_address_and_feedback_page"] .bg-black\\/40 {
        background-color: rgba(0, 0, 0, 0.4) !important;
      }
      html.light [data-stitch-block="ceo_address_and_feedback_page"] .bg-black\\/50 {
        background-color: rgba(0, 0, 0, 0.5) !important;
      }
      html.light [data-stitch-block="ceo_address_and_feedback_page"] .bg-black\\/70 {
        background-color: rgba(0, 0, 0, 0.7) !important;
      }
      html.light .bg-clip-text.text-transparent,
      html.light .text-transparent.bg-clip-text,
      html.light [class*="bg-clip-text"].text-transparent {
        color: #0f172a !important;
        -webkit-text-fill-color: #0f172a !important;
        background-image: none !important;
      }
      html.light [class*="text-[#9aabbc]"] {
        color: #64748b !important;
      }
      html.light .glass-panel,
      html.light .glass-card,
      html.light .section-table,
      html.light .files-table,
      html.light .history-timeline,
      html.light .crm-cards,
      html.light .section-map,
      html.light .form-glass {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }
      html.light [data-cms-hero] {
        background-color: #0b0e14 !important;
        color: #ffffff;
      }
      html.light [data-cms-hero].bg-background-dark {
        background-color: #0b0e14 !important;
      }
      html.light [data-cms-hero] .text-white,
      html.light [data-cms-hero] [class*="text-white/"] {
        color: #ffffff !important;
      }
      html.light [data-cms-hero] .text-slate-300,
      html.light [data-cms-hero] .text-slate-400 {
        color: #cbd5e1 !important;
      }
      html.light [data-career-section] {
        color: #e2e8f0;
      }
      html.light [data-career-section].bg-background-dark,
      html.light [data-career-section] .bg-background-dark,
      html.light [data-career-section="vacancies"] {
        background-color: #0b0e14 !important;
      }
      html.light [data-career-section] .text-white,
      html.light [data-career-section] [class*="text-white/"] {
        color: #ffffff !important;
      }
      html.light [data-career-section] .text-slate-300 {
        color: #cbd5e1 !important;
      }
      html.light [data-career-section] .text-slate-400 {
        color: #94a3b8 !important;
      }
      html.light [data-career-section] .glass-card {
        background-color: rgba(255, 255, 255, 0.04) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        box-shadow: none;
      }
      html.light [data-career-section] .bg-white\\/5 {
        background-color: rgba(255, 255, 255, 0.05) !important;
      }
      html.light [data-career-section] .bg-white\\/10 {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
      html.light [data-career-section] .border-white\\/5,
      html.light [data-career-section] .border-white\\/10,
      html.light [data-career-section] .border-white\\/20 {
        border-color: rgba(255, 255, 255, 0.12) !important;
      }
      html.light [data-career-section="why-company"] [class*="from-background-dark"] {
        --tw-gradient-from: #0b0e14 !important;
        --tw-gradient-to: rgba(11, 14, 20, 0) !important;
        --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
      }
      html.light [data-career-section="why-company"] [class*="to-background-dark"] {
        --tw-gradient-to: #0b0e14 !important;
      }
      html.light [data-career-section="vacancies"] [data-vacancy-table] {
        border-color: #e2e8f0 !important;
      }
      html.light [data-career-section="vacancies"] [data-vacancy-row] {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }
      html.light [data-career-section="vacancies"] [data-vacancy-row]:hover {
        background-color: #f8fafc !important;
      }
      html.light [data-career-section="vacancies"] [data-vacancy-title] {
        color: #0f172a !important;
      }
      html.light [data-career-section="vacancies"] [data-vacancy-meta],
      html.light [data-career-section="vacancies"] [data-vacancy-meta] * {
        color: #475569 !important;
      }
      html.light [data-career-section="vacancies"] [data-vacancy-salary] {
        color: #2563eb !important;
      }
      html.light [data-career-section="vacancies"] [data-vacancy-cta] {
        background-color: #2563eb !important;
        color: #ffffff !important;
      }
      html.light [data-career-section="cv-form"] {
        color: #0f172a;
      }
      html.light [data-career-section="cv-form"] [data-career-cv-overlay] {
        background-color: #e2e8f0 !important;
      }
      html.light [data-career-section="cv-form"] [data-career-cv-title] {
        color: #0f172a !important;
      }
      html.light [data-career-section="cv-form"] [data-career-cv-description] {
        color: #475569 !important;
      }
      html.light [data-career-section="cv-form"] [data-career-cv-input] {
        background-color: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      html.light [data-career-section="cv-form"] [data-career-cv-input]::placeholder {
        color: #94a3b8 !important;
      }
      html.light [data-career-section="cv-form"] [data-career-cv-disclaimer],
      html.light [data-career-section="cv-form"] [data-career-cv-disclaimer] * {
        color: #64748b !important;
      }
      html.light .mega-menu-blur {
        background-color: rgba(255, 255, 255, 0.95) !important;
        border-color: rgba(15, 23, 42, 0.08) !important;
      }
      html.light .hero-gradient,
      html.light .tech-gradient,
      html.light .section-gradient,
      html.light .bg-deep-gradient {
        background: linear-gradient(135deg, #ffffff 0%, #f3f6f9 100%) !important;
      }
      html.light .digital-twin-overlay {
        background-color: rgba(15, 23, 42, 0.04) !important;
      }
      html.light .glass-nav {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      html.light .light-leak,
      html.light .glow-leak {
        opacity: 0.18 !important;
      }
      html.light .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
      }
      html.light .mgts-nav-icon {
        opacity: 0.95;
        filter: brightness(0) saturate(100%) invert(43%) sepia(98%) saturate(4900%) hue-rotate(198deg) brightness(102%) contrast(101%);
      }
      html.light [data-stitch-block="news_and_documents_list_2"] {
        display: block !important;
        color: #0f172a !important;
      }
      html.light [data-stitch-block="news_and_documents_list_2"] h1 {
        color: #0f172a !important;
        -webkit-text-fill-color: #0f172a !important;
        background-image: none !important;
      }
      html.light [data-stitch-block="news_and_documents_list_2"] .news-card-3d {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }
      html.light [data-stitch-block="news_and_documents_list_2"] .image-overlay {
        background: rgba(15, 23, 42, 0.08) !important;
      }
      html.light [data-stitch-block="news_and_documents_list_2"] [class*="text-white/"] {
        color: #475569 !important;
      }
      html.light [class*="bg-[#1a232e]"],
      html.light [class*="bg-[#1b2127]"],
      html.light [class*="bg-[#1b2128]"],
      html.light [class*="bg-[#111418]"],
      html.light [class*="bg-[#0a0f18]"],
      html.light [class*="bg-[#0b0e14]"],
      html.light [class*="bg-[#080a0e]"],
      html.light [class*="bg-[#181111]"],
      html.light [class*="bg-[#230f10]"],
      html.light [class*="bg-[#27303a]"],
      html.light [class*="bg-[#283039]"],
      html.light [class*="bg-[#3a4755]"],
      html.light [class*="bg-[#0f1923]"],
      html.light [class*="bg-[#0a1622]"] {
        background-color: #ffffff !important;
      }
      html.light [class*="from-background-dark"] {
        --tw-gradient-from: #ffffff !important;
        --tw-gradient-to: rgba(255, 255, 255, 0) !important;
        --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
      }
      html.light [class*="via-background-dark"] {
        --tw-gradient-stops: var(--tw-gradient-from), #f1f5f9, var(--tw-gradient-to) !important;
      }
      html.light [class*="to-background-dark"] {
        --tw-gradient-to: #eef2f7 !important;
      }
      html.light [data-stitch-block="hero_section_and_cta_banner_1"] .hero-mesh {
        background-color: #f5f7f8 !important;
      }
      html.light [data-stitch-block="hero_section_and_cta_banner_1"] [data-home-hero-bg] {
        opacity: 0.06 !important;
        filter: grayscale(1) contrast(0.9);
      }
      html.light [data-stitch-block="hero_section_and_cta_banner_2"] .bg-gradient-to-tr {
        background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 60%, rgba(0, 102, 204, 0.12) 100%) !important;
      }
      html.light [data-stitch-block="hero_section_and_cta_banner_2"] [data-service-hero-bg] {
        opacity: 0.08 !important;
        filter: grayscale(1) contrast(0.9);
      }
      html.light [data-stitch-block="service_and_scenario_cards_2"] {
        color: #0f172a;
      }
      html.light [data-home-cooperation] {
        color: #0f172a;
      }
      html.light [data-home-cooperation] .bg-gradient-to-br {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      html.light [data-home-cooperation] [data-home-coop-title] {
        color: #0f172a !important;
      }
      html.light [data-home-cooperation] [data-home-coop-desc] {
        color: #475569 !important;
      }
      html.light [data-home-cooperation] [data-home-coop-perks] {
        color: #64748b !important;
      }
      html.light [data-home-cooperation] [data-home-coop-button] {
        background-color: #2563eb !important;
        color: #ffffff !important;
      }
      html.light [data-home-industry] {
        color: #0f172a;
      }
      html.light [data-home-industry] .glass-card {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      html.light [data-home-industry] .glass-card .text-white {
        color: #0f172a !important;
      }
      html.light [data-home-industry] .glass-card [data-home-industry-card-desc] {
        color: #64748b !important;
      }
      html.light [data-home-industry] .glass-card [data-home-industry-card-button] {
        background-color: #0f172a !important;
        color: #ffffff !important;
      }
      html.light [data-home-private-zone] {
        color: #0f172a;
      }
      html.light [data-home-private-zone] [data-home-private-card] {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      html.light [data-home-private-zone] [data-home-private-desc] {
        color: #64748b !important;
      }
      html.light [data-seg-filter-tabs] {
        background-color: #eef2f7 !important;
        border-color: #e2e8f0 !important;
      }
      html.light [data-seg-filter-tabs] button {
        color: #475569 !important;
      }
      html.light [data-seg-filter-tabs] .bg-primary {
        color: #ffffff !important;
      }
      html.light [data-seg-search] {
        color: #0f172a !important;
      }
      html.light [data-seg-search]::placeholder {
        color: #64748b !important;
      }
      html.light [data-seg-service-card],
      html.light [data-seg-scenario-card] {
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }
      html.light [data-seg-service-card] [data-seg-service-title],
      html.light [data-seg-scenario-card] [data-seg-scenario-title] {
        color: #0f172a !important;
      }
      html.light [data-seg-service-card] [data-seg-service-desc],
      html.light [data-seg-scenario-card] [data-seg-scenario-desc] {
        color: #64748b !important;
      }
      html.light [data-seg-scenario-card] .bg-gradient-to-t {
        background: linear-gradient(0deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0)) !important;
      }
    `;
    document.head.appendChild(style);
  }

  if (document.documentElement.classList.contains("light")) {
    ensureLightThemeStyles();
    if (document.readyState !== "loading") {
      ensureLightNewsVisibility();
    } else {
      document.addEventListener("DOMContentLoaded", ensureLightNewsVisibility, { once: true });
    }
  }

  function setTheme(theme, { updateUrl = true } = {}) {
    const root = document.documentElement;
    if (!root) return;
    const normalized = String(theme || "").trim().toLowerCase() === "light" ? "light" : "dark";
    activeTheme = normalized;
    root.classList.toggle("dark", normalized === "dark");
    root.classList.toggle("light", normalized === "light");
    if (normalized === "light") ensureLightThemeStyles();
    if (updateUrl) {
      try {
        const url = new URL(window.location.href);
        if (normalized === "light") {
          url.searchParams.set("theme", "light");
        } else {
          url.searchParams.delete("theme");
        }
        url.searchParams.delete("mode");
        window.history.replaceState(null, "", url.toString());
      } catch {
        // ignore
      }
    }
  }

  function getTheme() {
    if (activeTheme) return activeTheme;
    return document.documentElement.classList.contains("light") ? "light" : "dark";
  }

  function ensureThemeLinkDecorator() {
    if (window.__mgtsThemeLinkDecorator) return;
    window.__mgtsThemeLinkDecorator = true;
    document.addEventListener(
      "click",
      (evt) => {
        const theme = getTheme();
        if (theme !== "light") return;
        const target = evt.target;
        if (!target || !target.closest) return;
        const a = target.closest("a");
        if (!a) return;
        if (a.target && a.target !== "_self") return;
        const href = a.getAttribute("href");
        if (!href || href.startsWith("#") || /^mailto:|^tel:/i.test(href)) return;
        try {
          const url = new URL(href, window.location.origin);
          if (url.origin !== window.location.origin) return;
          url.searchParams.set("theme", "light");
          a.setAttribute("href", url.pathname + url.search + url.hash);
        } catch {
          // ignore
        }
      },
      true
    );
  }

  ensureThemeLinkDecorator();

  /** @returns {string} */
  function getSlugFromQueryOrPath() {
    try {
      const qs = new URLSearchParams(window.location.search);
      const fromQuery = String(qs.get("slug") || "").trim();
      if (fromQuery) return fromQuery;
    } catch {
      // ignore
    }

    // Pretty routes: /<slug>/ or /news/<slug> etc.
    const path = String(window.location.pathname || "").trim();
    if (!path) return "";
    const cleaned = path.replace(/\/+$/, "").replace(/^\/+/, ""); // trim slashes
    if (!cleaned) return "";

    // If it's an HTML page path (design server), we usually rely on ?slug=...
    if (cleaned.endsWith(".html")) return "";

    return cleaned;
  }

  function unwrapApiData(payload) {
    const root = payload && typeof payload === "object" ? payload : null;
    if (!root) return null;
    // Our Strapi controllers sometimes return { data: <object> } directly.
    if (root.data && typeof root.data === "object") {
      // common Strapi REST shapes:
      // - { data: { ...fields } }
      // - { data: { data: { ...fields } } }
      // - { data: { attributes: { ...fields } } }
      // - { data: { data: { attributes: { ...fields } } } }
      const d = root.data;
      if (d.data && typeof d.data === "object") {
        const dd = d.data;
        if (dd.attributes && typeof dd.attributes === "object") return dd.attributes;
        return dd;
      }
      if (d.attributes && typeof d.attributes === "object") return d.attributes;
      return d;
    }
    return root;
  }

  async function fetchJson(url, { timeoutMs = 12000 } = {}) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const tmr = window.setTimeout(() => ctrl && ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { credentials: "omit", signal: ctrl ? ctrl.signal : undefined });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return await res.json();
    } finally {
      window.clearTimeout(tmr);
    }
  }

  /** @returns {boolean} */
  function matchesPage(pages, pageName) {
    if (!pages || pages.length === 0) return true;
    return pages.includes(pageName);
  }

  /** @returns {boolean} */
  function markOnce(el, moduleId) {
    if (!el || !moduleId) return false;
    let set = enhancedByEl.get(el);
    if (!set) {
      set = new Set();
      enhancedByEl.set(el, set);
    }
    if (set.has(moduleId)) return false;
    set.add(moduleId);
    return true;
  }

  /** Registry entry
   * @typedef {{
   *   id: string,
   *   scope?: "document" | "element",
   *   selector?: string,
   *   pages?: string[],
   *   priority?: number,
   *   init: (ctx: any, root: Document|Element) => void
   * }} Module
   */

  /** @type {Module[]} */
  const modules = [];

  function register(module) {
    modules.push({
      scope: "document",
      priority: 0,
      ...module,
    });
    modules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  function run() {
    const pageName = getPageName();
    const ctx = {
      pageName,
      // hook for future: CMS slug, locale, env flags
    };

    for (const m of modules) {
      if (!matchesPage(m.pages, pageName)) continue;

      if (m.scope === "element" && m.selector) {
        document.querySelectorAll(m.selector).forEach((el) => {
          if (!markOnce(el, m.id)) return;
          try {
            m.init(ctx, el);
          } catch (e) {
            // Do not break the whole page because of one module
            console.error(`[MGTS_CMS_LOADER] module ${m.id} failed`, e);
          }
        });
        continue;
      }

      // document-scope
      try {
        m.init(ctx, document);
      } catch (e) {
        console.error(`[MGTS_CMS_LOADER] module ${m.id} failed`, e);
      }
    }
  }

  window.MGTS_CMS_LOADER = {
    register,
    run,
    utils: {
      STRAPI_BASE,
      getPageName,
      getSlugFromQueryOrPath,
      unwrapApiData,
      fetchJson,
      matchesPage,
      markOnce,
      setTheme,
      getTheme,
      toPrettyRoute,
      normalizeCmsHref,
    },
    __coreLoaded: true,
  };
})();

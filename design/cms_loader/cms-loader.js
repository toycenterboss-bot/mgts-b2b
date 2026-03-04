(function () {
  "use strict";

  const current =
    document.currentScript ||
    document.querySelector('script[src*="cms-loader.js"]');
  const baseUrl = current && current.src ? new URL(".", current.src) : new URL("/cms_loader/", window.location.href);
  const version = "?v=2026-03-03-4";
  const scripts = [
    "loader/core.js",
    "loader/top-menu.js",
    "loader/mega-menu.js",
    "loader/footer.js",
    "loader/components.js",
  ];

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = new URL(`${src}${version}`, baseUrl).toString();
      el.async = false;
      el.defer = true;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(el);
    });

  (async () => {
    for (const src of scripts) {
      await loadScript(src);
    }
    if (window.MGTS_CMS_LOADER && typeof window.MGTS_CMS_LOADER.run === "function") {
      if (document.readyState !== "loading") {
        window.MGTS_CMS_LOADER.run();
      }
      document.addEventListener("DOMContentLoaded", window.MGTS_CMS_LOADER.run);
      document.addEventListener("mgts:content-updated", window.MGTS_CMS_LOADER.run);
    }
  })();
})();

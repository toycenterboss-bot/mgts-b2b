(function () {
  "use strict";

  const current = document.currentScript;
  const baseUrl = current && current.src ? new URL(".", current.src) : new URL("./", window.location.href);
  const version = current && current.src ? new URL(current.src).search : "";
  const scripts = [
    "core.js",
    "sections.js",
    "tariffs.js",
    "documents.js",
    "service.js",
    "cms-page.js",
    "news.js",
    "pages.js",
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
  })();
})();

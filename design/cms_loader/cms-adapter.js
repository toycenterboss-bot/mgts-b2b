(function () {
  "use strict";

  const current =
    document.currentScript ||
    document.querySelector('script[src*="cms-adapter.js"]');
  const baseUrl = current && current.src ? new URL(".", current.src) : new URL("/cms_loader/", window.location.href);
  const version = current && current.src ? new URL(current.src).search : "";
  const src = new URL(`adapter/legacy.js${version}`, baseUrl).toString();

  const el = document.createElement("script");
  el.src = src;
  el.async = false;
  el.defer = true;
  document.head.appendChild(el);
})();

"use client";

import { useEffect } from "react";

export default function MegaMenuController() {
  useEffect(() => {
    const root = document.querySelector(".mgts-header");
    if (!root) return;
    const detailsList = Array.from(root.querySelectorAll("details"));
    const closeTimers = new Map<HTMLDetailsElement, number>();

    const splitClasses = (value: string | null) =>
      String(value || "")
        .split(" ")
        .map((item) => item.trim())
        .filter(Boolean);

    const setActiveCategory = (panel: Element, key: string) => {
      if (!key) return;
      const categories = Array.from(panel.querySelectorAll<HTMLElement>("[data-mega-category]"));
      const sections = Array.from(panel.querySelectorAll<HTMLElement>("[data-mega-section]"));
      categories.forEach((item) => {
        const itemKey = item.getAttribute("data-mega-category") || "";
        const active = itemKey === key;
        const activeClasses = splitClasses(item.getAttribute("data-mega-active-classes"));
        const inactiveClasses = splitClasses(item.getAttribute("data-mega-inactive-classes"));
        item.classList.remove(...activeClasses, ...inactiveClasses);
        item.classList.add(...(active ? activeClasses : inactiveClasses));
        item.setAttribute("aria-pressed", active ? "true" : "false");
        const icon = item.querySelector(".material-symbols-outlined");
        if (icon) icon.classList.toggle("opacity-0", !active);
      });
      sections.forEach((item) => {
        const itemKey = item.getAttribute("data-mega-section") || "";
        const active = itemKey === key;
        item.classList.toggle("hidden", !active);
        item.setAttribute("aria-hidden", active ? "false" : "true");
      });
    };

    const initPanel = (panel: Element | null) => {
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>("[data-mega-category]");
      const key = first?.getAttribute("data-mega-category") || "";
      if (key) setActiveCategory(panel, key);
    };

    const onToggle = (event: Event) => {
      const target = event.target as HTMLDetailsElement | null;
      if (!target || !target.open) return;
      detailsList.forEach((item) => {
        if (item !== target) item.removeAttribute("open");
      });
      initPanel(target.querySelector(".mega-menu-panel"));
    };

    const onEnter = (event: Event) => {
      const target = event.currentTarget as HTMLDetailsElement | null;
      if (!target) return;
      const timer = closeTimers.get(target);
      if (timer) window.clearTimeout(timer);
      detailsList.forEach((item) => {
        if (item !== target) item.removeAttribute("open");
      });
      if (!target.open) target.setAttribute("open", "");
      initPanel(target.querySelector(".mega-menu-panel"));
    };

    const onLeave = (event: Event) => {
      const target = event.currentTarget as HTMLDetailsElement | null;
      if (!target) return;
      const timer = window.setTimeout(() => {
        target.removeAttribute("open");
      }, 120);
      closeTimers.set(target, timer);
    };

    detailsList.forEach((item) => {
      item.addEventListener("toggle", onToggle);
      item.addEventListener("mouseenter", onEnter);
      item.addEventListener("mouseleave", onLeave);
    });

    const onCategory = (event: Event) => {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-mega-category]");
      if (!el) return;
      const panel = el.closest(".mega-menu-panel");
      if (!panel) return;
      const key = el.getAttribute("data-mega-category") || "";
      if (key) setActiveCategory(panel, key);
    };

    const onDocClick = (event: MouseEvent) => {
      const el = event.target as HTMLElement | null;
      if (el && root.contains(el)) return;
      detailsList.forEach((item) => item.removeAttribute("open"));
    };

    document.addEventListener("click", onDocClick);
    root.addEventListener("mouseover", onCategory);
    root.addEventListener("click", onCategory);
    return () => {
      detailsList.forEach((item) => {
        item.removeEventListener("toggle", onToggle);
        item.removeEventListener("mouseenter", onEnter);
        item.removeEventListener("mouseleave", onLeave);
      });
      document.removeEventListener("click", onDocClick);
      root.removeEventListener("mouseover", onCategory);
      root.removeEventListener("click", onCategory);
    };
  }, []);

  return null;
}

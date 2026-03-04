"use client";

import { useEffect } from "react";

const applyTheme = (theme: string) => {
  const root = document.documentElement;
  const normalized = theme === "light" ? "light" : "dark";
  root.classList.toggle("light", normalized === "light");
  root.classList.toggle("dark", normalized === "dark");
  try {
    localStorage.setItem("mgts-theme", normalized);
  } catch {
    // ignore
  }
};

export default function ThemeInit() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const themeParam = (params.get("theme") || params.get("mode") || "").toLowerCase();
    const stored = (() => {
      try {
        return localStorage.getItem("mgts-theme") || "";
      } catch {
        return "";
      }
    })();
    const theme = themeParam || stored || "dark";
    applyTheme(theme);
  }, []);

  return null;
}

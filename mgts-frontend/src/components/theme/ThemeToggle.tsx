"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const initial = root.classList.contains("light") ? "light" : "dark";
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    const root = document.documentElement;
    root.classList.toggle("light", next === "light");
    root.classList.toggle("dark", next === "dark");
    setTheme(next);
    try {
      localStorage.setItem("mgts-theme", next);
    } catch {
      // ignore
    }
  };

  return (
    <button className="theme-toggle" type="button" onClick={toggle}>
      {theme === "light" ? "Тёмная тема" : "Светлая тема"}
    </button>
  );
}

module.exports = {
  darkMode: "class",
  content: [
    // B-04: раньше сканировались только html_blocks. Классы, живущие в React,
    // в бандл не попадали — 44 из 562 utility-классов оставались без стилей,
    // 74 вхождения в разметке. Мутация: убрать строку с mgts-frontend и пересобрать
    // — тест tailwind-coverage обязан покраснеть.
    "../html_blocks/**/*.html",
    "../html_pages/**/*.html",
    "../../mgts-frontend/src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Ф1: цвета берутся из слоя токенов (tokens.css), а не заданы литералом.
           Из-за этого светлая тема перестала быть простынёй переопределений
           `html.light .<utility> { … !important }`: меняется переменная, а не
           двести правил. Формат «каналы через пробел» нужен для модификатора
           прозрачности — bg-surface/40 продолжает работать. */
        "bg": "rgb(var(--c-bg) / <alpha-value>)",
        "surface": "rgb(var(--c-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--c-surface-2) / <alpha-value>)",
        "fg": "rgb(var(--c-fg) / <alpha-value>)",
        "fg-muted": "rgb(var(--c-fg-muted) / <alpha-value>)",
        "fg-subtle": "rgb(var(--c-fg-subtle) / <alpha-value>)",
        "line": "rgb(var(--c-line) / <alpha-value>)",
        "accent-text": "rgb(var(--c-accent-text) / <alpha-value>)",
        "on-primary": "rgb(var(--c-on-primary) / <alpha-value>)",

        /* прежние имена сохранены, но теперь тоже смотрят в токены */
        "background-dark": "rgb(var(--c-bg) / <alpha-value>)",
        "background-light": "rgb(var(--c-bg) / <alpha-value>)",
        "panel-dark": "rgb(var(--c-surface) / <alpha-value>)",
        "surface-dark": "rgb(var(--c-surface-2) / <alpha-value>)",
        "premium-dark": "rgb(var(--c-surface) / <alpha-value>)",
        "border-dark": "rgb(var(--c-line) / <alpha-value>)",
        "text-muted": "rgb(var(--c-fg-muted) / <alpha-value>)",
        "primary": "rgb(var(--c-primary) / <alpha-value>)",
        "primary-hover": "rgb(var(--c-primary-hover) / <alpha-value>)",
        "primary-active": "rgb(var(--c-primary-hover) / <alpha-value>)",

        /* фирменные и служебные — от темы не зависят */
        "accent": "#00f2ff",
        "accent-glow": "rgba(0, 102, 204, 0.15)",
        "accent-red": "#E30611",
        "brand-red": "#E30611",
        "bubble-ai": "rgb(var(--c-surface-2) / <alpha-value>)",
        "bubble-user": "rgb(var(--c-surface) / <alpha-value>)",
        "error": "#e53e3e",
        "glass": "rgba(255, 255, 255, 0.03)",
        "glass-border": "rgba(255, 255, 255, 0.1)",
        "glass-dark": "rgba(255, 255, 255, 0.03)",
        "glass-plate": "rgba(255, 255, 255, 0.03)",
      },
      fontFamily: {
        /* Одно объявление на проект. var(--font-display) подставляет next/font;
           строковые имена оставлены фолбэком для статических прототипов
           design/html_pages, куда переменная не приезжает. */
        "display": ["var(--font-display)", "Space Grotesk", "sans-serif"],
        /* 🔴 `sans` намеренно оставлен прежним. Замер показал то, чего никто не
           знал: preflight Tailwind ставит на <html> именно fontFamily.sans и
           перебивает правило из globals.css. То есть сайт грузит Space Grotesk,
           а основной текст рисует системным шрифтом. Поменять sans — значит
           переверстать все 100 страниц; это решение владельца, а не побочный
           эффект темы. Вынесено в Д-35. */
        "sans": ["Noto Sans", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.5rem",
        "3xl": "1.5rem",
        "DEFAULT": "0.25rem",
        "full": "9999px",
        "lg": "0.5rem",
        "xl": "0.75rem",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};

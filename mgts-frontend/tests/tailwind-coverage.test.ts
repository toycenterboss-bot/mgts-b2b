/**
 * Покрытие Tailwind: класс в разметке — стиль в бандле (B-04).
 *
 * Конфиг сборки сканировал только `design/html_blocks/**` и не видел исходники
 * фронта. Классы, живущие только в React, в бандл не попадали: элемент получал
 * класс, стиля к нему не существовало, и никто об этом не узнавал — вёрстка
 * просто выглядела «немного не так».
 *
 * Класс ошибки: К-02, правишь источник — не прошёл по потребителям.
 *
 * ⚠️ Про измерение. Tailwind экранирует спецсимволы в селекторах:
 * `.dark\:bg-x`, `.border-white\/10`, `.max-w-\[1200px\]`. Две первые версии
 * этого детектора искали неэкранированную форму и врали — показывали 240
 * отсутствующих классов там, где их было 44. Здесь селектор строится ровно так,
 * как его пишет Tailwind, и ищется буквально.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "node:fs";

const ROOT = join(__dirname, "..", "..");
const BUNDLE = join(ROOT, "design", "assets", "css", "stitch-tailwind.css");

const UTIL =
  /^(flex|grid|block|inline|hidden|relative|absolute|fixed|sticky|truncate|(text|bg|border|rounded|p|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|w|h|min|max|gap|space|items|justify|self|font|leading|tracking|shadow|opacity|z|col|row|order|overflow|transition|duration|scale|translate|cursor|select|object|aspect|backdrop|ring|divide|list|whitespace|break)[-a-z0-9[\]/.%]*)$/;

/** Собственные классы проекта и классы плагинов, которых в бандле нет и не должно быть. */
const NOT_TAILWIND = new Set([
  "mts-bold", "row-hover", "hide-scrollbar", "how-to-connect",
  "winter-frost", "perspective-1000", "shadow-3xl",
  "prose", "prose-lg", "prose-invert", "prose-p:leading-relaxed", "prose-a:text-primary",
  // ловятся эвристикой по первой букве, но это имена проекта, а не утилиты Tailwind
  "page", "hero-gradient", "hero-mesh", "history-timeline",
]);

function selector(cls: string): string {
  let out = ".";
  for (const ch of cls) {
    if (":/[]().%,#".includes(ch)) out += "\\";
    out += ch;
  }
  return out;
}

function usedClasses(): Map<string, number> {
  const files = globSync(join(ROOT, "mgts-frontend", "src", "**", "*.tsx"));
  const used = new Map<string, number>();
  for (const f of files) {
    const t = readFileSync(f, "utf-8");
    for (const m of t.matchAll(/className\s*=\s*"([^"]+)"/g)) {
      for (const c of m[1].split(/\s+/)) {
        const base = c.split(":").pop() ?? "";
        if (UTIL.test(base)) used.set(c, (used.get(c) ?? 0) + 1);
      }
    }
  }
  return used;
}

describe("сборка Tailwind покрывает разметку фронта", () => {
  const css = readFileSync(BUNDLE, "utf-8");
  const used = usedClasses();
  const missing = [...used.keys()].filter(
    (c) => !NOT_TAILWIND.has(c) && !css.includes(selector(c))
  );

  it("в разметке есть что проверять — иначе тест зелёный по пустоте", () => {
    expect(used.size).toBeGreaterThan(400);
  });

  it("ни один tailwind-класс из tsx не остался без стиля", () => {
    expect(missing, `без стилей: ${missing.slice(0, 10).join(", ")}`).toEqual([]);
  });

  it("бандл собран не только из html_blocks — иначе он не знал бы про React", () => {
    // класс, который встречается ТОЛЬКО в tsx и никогда в html_blocks
    expect(css).toContain(selector("dark:bg-background-dark"));
  });
});

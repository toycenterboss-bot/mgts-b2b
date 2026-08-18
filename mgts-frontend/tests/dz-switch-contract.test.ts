/**
 * Контракт «схема ↔ рендер».
 *
 * Ловушка Л-2 (PLAN-01 §4): в SectionRenderer стоит `default: return null`.
 * Компонент, у которого нет ветки, исчезает со страницы МОЛЧА — редактор видит
 * блок в админке, посетитель не видит ничего, в логах пусто.
 *
 * Класс ошибки: К-04, молчание принято за исправность.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const SCHEMA = join(ROOT, "mgts-backend/src/api/page/content-types/page/schema.json");
const RENDERER = join(ROOT, "mgts-frontend/src/components/sections/SectionRenderer.tsx");

/**
 * Ветки, которых нет в динамической зоне, но которые допустимы.
 * Каждая должна быть объяснена: молчаливое расширение этого списка —
 * то же самое, что молчаливое исчезновение секции, только наоборот.
 */
const ALLOWED_EXTRA = new Set([
  "template.block", // легаси-алиас page.template-block, встречается в старом контенте
]);

function dzComponents(): Set<string> {
  const schema = JSON.parse(readFileSync(SCHEMA, "utf-8"));
  const zone = schema.attributes?.sections;
  if (!zone || zone.type !== "dynamiczone") {
    throw new Error("В page.schema.json нет динамической зоны sections");
  }
  return new Set<string>(zone.components);
}

function switchCases(): Set<string> {
  const src = readFileSync(RENDERER, "utf-8");
  const found = [...src.matchAll(/case\s+["']([^"']+)["']/g)].map((m) => m[1]);
  if (found.length === 0) throw new Error("В SectionRenderer не найдено ни одной ветки case");
  return new Set(found);
}

describe("динамическая зона = свитч рендерера", () => {
  it("у каждого компонента зоны есть ветка — иначе секция исчезнет молча", () => {
    const missing = [...dzComponents()].filter((c) => !switchCases().has(c)).sort();
    expect(missing, `нет ветки в SectionRenderer: ${missing.join(", ")}`).toEqual([]);
  });

  it("лишние ветки только из списка допустимых", () => {
    const dz = dzComponents();
    const extra = [...switchCases()]
      .filter((c) => !dz.has(c) && !ALLOWED_EXTRA.has(c))
      .sort();
    expect(extra, `ветка есть, а компонента в схеме нет: ${extra.join(", ")}`).toEqual([]);
  });

  it("зона не опустела и не схлопнулась", () => {
    expect(dzComponents().size).toBeGreaterThanOrEqual(29);
  });
});

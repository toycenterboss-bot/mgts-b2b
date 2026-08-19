/**
 * Геометрия карты: контракт данных (B-24).
 *
 * Файл извлечён обратно из прототипа — исходники пайплайна погибли вместе
 * с временным окружением. Значит проверять его форму особенно важно: второй
 * раз восстанавливать будет неоткуда.
 *
 * Сторожит К-15 (рисую от руки то, что есть в данных) и К-02 (правишь источник —
 * не прошёл по потребителям: карта молча съедет).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const GEO = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "design", "geo", "moscow.json"), "utf-8")
);

const flat = (v: unknown): number[][] => {
  if (!Array.isArray(v)) return [];
  if (typeof v[0] === "number") return [v as number[]];
  return (v as unknown[]).flatMap(flat);
};

describe("moscow.json — форма данных", () => {
  it("все обязательные слои на месте", () => {
    expect(Object.keys(GEO)).toEqual(
      expect.arrayContaining(["outline", "islands", "districts", "moskva", "yauza", "nodes", "edges"])
    );
  });

  it("контур не выродился: сотни точек, а не десяток", () => {
    expect(flat(GEO.outline).length).toBeGreaterThan(300);
  });

  it("районов больше сотни — иначе карта перестанет читаться как Москва", () => {
    expect(GEO.districts.length).toBeGreaterThanOrEqual(120);
  });

  /**
   * Нормировка сделана по КОНТУРУ ГОРОДА, а не по всем слоям.
   * Зеленоград и анклавы лежат за МКАД и честно выходят за [-1…1]:
   * districts до -1.27, islands до -1.24, nodes до -1.21.
   * Первая версия этого теста требовала [-1…1] от всего сразу и была неверна —
   * ошибка была в моём README, а не в данных.
   */
  it("контур города строго в [-1…1] — на нём держится проекция", () => {
    const bad = flat(GEO.outline).filter(([x, y]) => Math.abs(x) > 1.001 || Math.abs(y) > 1.001);
    expect(bad.length, `точек контура вне [-1…1]: ${bad.length}`).toBe(0);
  });

  it("спутники за МКАД не улетают дальше 1.3 — иначе это не Зеленоград, а ошибка проекции", () => {
    const pts = [...flat(GEO.districts), ...flat(GEO.islands), ...flat(GEO.moskva), ...flat(GEO.nodes)];
    const bad = pts.filter(([x, y]) => Math.abs(x) > 1.3 || Math.abs(y) > 1.3);
    expect(bad.length, `точек дальше 1.3: ${bad.length}`).toBe(0);
  });

  it("рёбра ссылаются на существующие узлы", () => {
    const n = GEO.nodes.length;
    const broken = (GEO.edges as number[][]).filter(([a, b]) => a >= n || b >= n || a < 0 || b < 0);
    expect(broken.length, `битых рёбер: ${broken.length}`).toBe(0);
  });

  it("в файле нет ни одного адреса — только геометрия", () => {
    const raw = JSON.stringify(GEO);
    expect(raw).not.toMatch(/улиц|проезд|дом |корп|street/i);
  });
});

const NAMED: Record<string, [number, number]> = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "design", "geo", "districts_named.json"), "utf-8")
);

describe("districts_named.json — справочник районов", () => {
  it("125 названий: меньше — значит справочник обрезали", () => {
    expect(Object.keys(NAMED).length).toBe(125);
  });

  it("каждый центроид — пара чисел внутри карты", () => {
    const bad = Object.entries(NAMED).filter(
      ([, v]) => !Array.isArray(v) || v.length !== 2 || v.some((n) => typeof n !== "number" || Math.abs(n) > 1.3)
    );
    expect(bad.map(([k]) => k), `битых записей: ${bad.length}`).toEqual([]);
  });

  /**
   * 🔴 Замер 19.08: центроидов, совпавших с узлами схемы, — 0 из 125.
   * Справочник имён и схема связности посчитаны разными способами.
   * Соединять их по координатам НЕЛЬЗЯ, только по названию.
   * Тест фиксирует это как факт, чтобы будущий join не приняли за рабочий.
   */
  it("не совпадает с узлами схемы — и это ожидаемо, а не ошибка", () => {
    const nodes = new Set((GEO.nodes as number[][]).map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`));
    const hits = Object.values(NAMED).filter(([x, y]) => nodes.has(`${x.toFixed(4)},${y.toFixed(4)}`));
    expect(hits.length).toBeLessThan(5);
  });
});

/**
 * Аналитика: код есть, счётчика может не быть — и это должно быть ВИДНО.
 * Класс, от которого сторожим: К-04, молчание принято за исправность.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(__dirname, "..", "src");

async function loadWithId(id?: string) {
  vi.resetModules();
  if (id === undefined) delete process.env.NEXT_PUBLIC_METRIKA_ID;
  else process.env.NEXT_PUBLIC_METRIKA_ID = id;
  return await import("../src/lib/analytics");
}

describe("метрика Ф0: счётчик в коде есть", () => {
  it("вызов ym( присутствует во фронте — до этого его не было ни разу", () => {
    const component = readFileSync(join(SRC, "components/analytics/Analytics.tsx"), "utf-8");
    const lib = readFileSync(join(SRC, "lib/analytics.ts"), "utf-8");
    expect(component + lib).toMatch(/ym\(/);
  });
});

describe("без счётчика", () => {
  beforeEach(() => { (globalThis as any).window = {}; });
  afterEach(() => { delete (globalThis as any).window; });

  it("analyticsEnabled = false, если идентификатор не задан", async () => {
    const a = await loadWithId(undefined);
    expect(a.analyticsEnabled()).toBe(false);
  });

  it("пустая строка и пробелы — это тоже «не задан»", async () => {
    const a = await loadWithId("   ");
    expect(a.analyticsEnabled()).toBe(false);
  });

  it("track не падает и не притворяется — событие никуда не уходит", async () => {
    const a = await loadWithId(undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => a.track("fork_proptech")).not.toThrow();
    expect((globalThis as any).window.ym).toBeUndefined();
    warn.mockRestore();
  });
});

describe("со счётчиком", () => {
  beforeEach(() => { (globalThis as any).window = {}; });
  afterEach(() => { delete (globalThis as any).window; });

  it("событие уходит в ym с идентификатором и именем цели", async () => {
    const a = await loadWithId("12345678");
    const ym = vi.fn();
    (globalThis as any).window.ym = ym;
    a.track("form_submit", { form: "lead" });
    expect(ym).toHaveBeenCalledWith("12345678", "reachGoal", "form_submit", { form: "lead" });
  });

  it("все ветки развилки имеют собственное событие", async () => {
    const a = await loadWithId("12345678");
    const ym = vi.fn();
    (globalThis as any).window.ym = ym;
    for (const e of ["fork_proptech", "fork_infratech", "fork_account", "fork_spec"] as const) a.track(e);
    expect(ym.mock.calls.map((c) => c[2])).toEqual([
      "fork_proptech", "fork_infratech", "fork_account", "fork_spec",
    ]);
  });
});

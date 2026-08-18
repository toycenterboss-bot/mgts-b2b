/**
 * Правила механизма заглушек (B-27, PLAN-01 §2.2).
 *
 * Каждый тест — подсаженный инцидент. Замок готовности: мера не считается
 * внедрённой, пока проверка не поймала искусственный инцидент.
 */
import { describe, it, expect } from "vitest";
import { findViolations, notApproved, renderRegistry, type StubbedBlock } from "../src/lib/stubs";

const СЕГОДНЯ = new Date("2026-08-18T00:00:00Z");

const ок: StubbedBlock = {
  where: "/business → fact-strip[0].value",
  value: "−30…40 %",
  audience: "client",
  stub: { status: "draft", source: "стратегия 2027–2029, с. 47", owner: "PropTech" },
};

describe("Р-1 · цифры в заглушке запрещены", () => {
  it("ловит правдоподобное число, придуманное из головы", () => {
    const v = findViolations([{ ...ок, value: "12 раб. дней", stub: { status: "stub", expectedForm: "⟨N⟩ раб. дней" } }], СЕГОДНЯ);
    expect(v.map((x) => x.rule)).toContain("Р-1 цифра в заглушке");
  });

  it("пропускает форму ответа без цифр", () => {
    const v = findViolations([{ ...ок, value: "⟨N⟩ раб. дней", stub: { status: "stub", expectedForm: "⟨N⟩ раб. дней" } }], СЕГОДНЯ);
    expect(v).toEqual([]);
  });

  it("не мешает настоящему числу в draft с источником", () => {
    expect(findViolations([ок], СЕГОДНЯ)).toEqual([]);
  });
});

describe("Р-2 · заглушка обязана показывать форму ответа", () => {
  it("ловит stub без expectedForm — это снова «нужны данные»", () => {
    const v = findViolations([{ where: "x", value: "", stub: { status: "stub" } }], СЕГОДНЯ);
    expect(v.map((x) => x.rule)).toContain("Р-2 заглушка без формы ответа");
  });
});

describe("Р-3 · черновик обязан назвать источник", () => {
  it("ловит draft без source", () => {
    const v = findViolations([{ where: "x", value: "−30 %", stub: { status: "draft" } }], СЕГОДНЯ);
    expect(v.map((x) => x.rule)).toContain("Р-3 черновик без источника");
  });
});

describe("Р-4 · согласование обязано оставить след", () => {
  it("ловит approved без source/approvedBy/approvedAt", () => {
    const v = findViolations([{ where: "x", value: "42 %", stub: { status: "approved" } }], СЕГОДНЯ);
    const msg = v.find((x) => x.rule === "Р-4 согласование без следа")?.message ?? "";
    expect(msg).toContain("source");
    expect(msg).toContain("approvedBy");
    expect(msg).toContain("approvedAt");
  });

  it("пропускает согласованное с полным следом", () => {
    const v = findViolations([{ where: "x", value: "42 %", audience: "client",
      stub: { status: "approved", source: "справка PropTech", approvedBy: "владелец направления", approvedAt: "2026-08-18" } }], СЕГОДНЯ);
    expect(v).toEqual([]);
  });
});

describe("Р-5 · своя метрика вместо клиентской (К-14)", () => {
  it("ловит audience: company на публичной странице", () => {
    const v = findViolations([{ where: "/", value: "×4 роста выручки", audience: "company",
      stub: { status: "approved", source: "стратегия", approvedBy: "кто-то", approvedAt: "2026-08-18" } }], СЕГОДНЯ);
    expect(v.map((x) => x.rule)).toContain("Р-5 своя метрика вместо клиентской");
  });
});

describe("Р-6 · заглушка не живёт вечно", () => {
  it("ловит просрочку больше 14 дней", () => {
    const v = findViolations([{ where: "x", value: "⟨N⟩ %", stub: { status: "stub", expectedForm: "⟨N⟩ %", due: "2026-07-01", owner: "InfraTech" } }], СЕГОДНЯ);
    expect(v.map((x) => x.rule)).toContain("Р-6 заглушка просрочена");
  });

  it("молчит, пока срок не вышел", () => {
    const v = findViolations([{ where: "x", value: "⟨N⟩ %", stub: { status: "stub", expectedForm: "⟨N⟩ %", due: "2026-08-14" } }], СЕГОДНЯ);
    expect(v).toEqual([]);
  });

  it("не трогает согласованное — у него срока нет", () => {
    const v = findViolations([{ where: "x", value: "5 %", audience: "client",
      stub: { status: "approved", source: "s", approvedBy: "a", approvedAt: "2026-01-01", due: "2020-01-01" } }], СЕГОДНЯ);
    expect(v).toEqual([]);
  });
});

describe("ворота в прод", () => {
  const blocks: StubbedBlock[] = [
    ок,
    { where: "y", value: "⟨N⟩ кВт", stub: { status: "stub", expectedForm: "⟨N⟩ кВт на стойку", owner: "InfraTech", due: "2026-09-01" } },
    { where: "z", value: "5 %", audience: "client", stub: { status: "approved", source: "s", approvedBy: "a", approvedAt: "2026-08-01" } },
  ];

  it("не пускает всё, что не approved", () => {
    expect(notApproved(blocks).map((b) => b.where)).toEqual([ок.where, "y"]);
  });

  it("реестр называет, чего ждём и с кого", () => {
    const md = renderRegistry(blocks, СЕГОДНЯ);
    expect(md).toContain("Всего блоков без согласования: **2**");
    expect(md).toContain("⟨N⟩ кВт на стойку");
    expect(md).toContain("InfraTech");
    expect(md).not.toContain("| z |");
  });
});

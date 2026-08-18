/**
 * Ворота заглушек (B-27, PLAN-01 §2.2).
 *
 *   npm run check:stubs        — отчёт, код возврата 0 (режим стенда)
 *   npm run check:stubs -- --gate  — ворота: любой не-approved роняет сборку
 *
 * Правила живут в src/lib/stubs.ts и покрыты тестами. Здесь только обход данных:
 * одно правило — одна реализация (К-11).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { findViolations, notApproved, renderRegistry, type StubbedBlock } from "../src/lib/stubs.ts";

const STRAPI = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";
const OUT = join(import.meta.dirname, "..", "..", "docs", "ЗАГЛУШКИ.md");
/**
 * Ворота включаются ЯВНО, а не по NODE_ENV.
 * На машине владельца NODE_ENV=production выставлен глобально в оболочке —
 * привяжись мы к нему, режим стенда был бы недостижим, а прод-ворота
 * срабатывали бы там, где их не звали. Окружение — не признак намерения.
 */
const PROD = process.argv.includes("--gate") || process.env.STUBS_GATE === "1";

/** Рекурсивно достаёт из тела страницы всё, что несёт компонент meta.stub. */
function collect(node: unknown, where: string, out: StubbedBlock[]): void {
  if (Array.isArray(node)) {
    node.forEach((n, i) => collect(n, `${where}[${i}]`, out));
    return;
  }
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if (o.stub && typeof o.stub === "object") {
    out.push({
      where,
      value: typeof o.value === "string" ? o.value : null,
      audience: o.audience === "company" ? "company" : o.audience === "client" ? "client" : undefined,
      stub: o.stub as StubbedBlock["stub"],
    });
  }
  for (const [k, v] of Object.entries(o)) {
    if (k === "stub") continue;
    collect(v, `${where} → ${k}`, out);
  }
}

async function main() {
  let pages: Array<Record<string, unknown>> = [];
  try {
    const res = await fetch(`${STRAPI}/api/pages?pagination[pageSize]=500&status=published`);
    const json = await res.json();
    pages = Array.isArray(json?.data) ? json.data : [];
  } catch (e) {
    console.error(`❌ Strapi недоступен на ${STRAPI}: ${(e as Error).message}`);
    process.exit(PROD ? 1 : 0);
  }

  const blocks: StubbedBlock[] = [];
  for (const p of pages) collect(p, `/${p.slug ?? p.id}`, blocks);

  const violations = findViolations(blocks);
  const pending = notApproved(blocks);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, renderRegistry(blocks), "utf-8");

  console.log(`страниц опубликовано : ${pages.length}`);
  console.log(`блоков с заглушкой   : ${blocks.length}`);
  console.log(`из них не согласовано: ${pending.length}`);
  console.log(`нарушений правил     : ${violations.length}`);
  console.log(`реестр               : docs/ЗАГЛУШКИ.md`);

  if (blocks.length === 0) {
    console.log("");
    console.log("⚠️  Ни один блок не размечен полем stub.");
    console.log("   Это НЕ значит «всё согласовано» — это значит, что размечать пока нечем:");
    console.log("   компонент meta.stub переезжает в mgts-backend в спринте Ф2.");
  }

  for (const v of violations) console.error(`❌ ${v.rule} — ${v.where}: ${v.message}`);

  if (violations.length) process.exit(1);
  if (PROD && pending.length) {
    console.error("");
    console.error(`❌ Прод-сборка остановлена: ${pending.length} блоков без статуса approved.`);
    for (const b of pending) console.error(`   ${b.where} — ждёт: ${b.stub?.owner || "не назначен"}`);
    process.exit(1);
  }
  console.log("✅ ворота пройдены");
}

main();

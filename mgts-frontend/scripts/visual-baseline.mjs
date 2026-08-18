/**
 * Эталон «React до → React после» (Б-3, спринт Ф0).
 *
 * Существующий visual-compare.js сравнивает React со СТАРОЙ СТАТИКОЙ. Для
 * редизайна это прибор с перевёрнутым знаком: мы уводим вёрстку от статики
 * намеренно, расхождение вырастет — и это будет успехом, а не провалом (К-03).
 *
 * Здесь эталон другой: снимок сайта ДО правки против снимка ПОСЛЕ.
 * Вопрос, на который отвечает инструмент: «что сдвинулось от моей темы?»
 *
 *   node scripts/visual-baseline.mjs capture .visual/before --limit 20
 *   ... правим тему ...
 *   node scripts/visual-baseline.mjs capture .visual/after --limit 20
 *   node scripts/visual-baseline.mjs compare .visual/before .visual/after
 */
import { mkdirSync, readdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatchModule from "pixelmatch";

const pixelmatch = pixelmatchModule.default || pixelmatchModule;
const STRAPI = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";
const SITE = process.env.SITE_BASE_URL || "http://localhost:3000";
const [cmd, a, b] = process.argv.slice(2);
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 0;
const VIEWPORT = { width: 1366, height: 900 };
/**
 * Порог шума. Два снимка одной и той же страницы расходятся сами по себе:
 * анимации, карусели, время. Замер 18.08 на нетронутой теме: медиана 0,00 %,
 * максимум 0,30 % (ai-chat, affiliated_persons). Порог 0,5 % выше этого шума
 * и заметно ниже настоящего сдвига от темы (замер той же мутации: 1,03 % медиана).
 */
const thrArg = process.argv.indexOf("--threshold");
const THRESHOLD = thrArg > -1 ? Number(process.argv[thrArg + 1]) : 0.5;

async function slugs() {
  const res = await fetch(`${STRAPI}/api/pages?pagination[pageSize]=500&status=published&fields[0]=slug`);
  const json = await res.json();
  const list = (json?.data ?? []).map((p) => p.slug).filter(Boolean).sort();
  return LIMIT > 0 ? list.slice(0, LIMIT) : list;
}

async function capture(dir) {
  const list = await slugs();
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  let ok = 0, failed = 0;
  for (const slug of list) {
    const file = join(dir, `${slug.replace(/\//g, "__")}.png`);
    try {
      const r = await page.goto(`${SITE}/${slug}`, { waitUntil: "networkidle", timeout: 20000 });
      if (!r || r.status() >= 400) throw new Error(`код ${r?.status()}`);
      await page.screenshot({ path: file, fullPage: false });
      ok++;
    } catch (e) {
      failed++;
      console.error(`  ✗ ${slug}: ${e.message}`);
    }
  }
  await browser.close();
  writeFileSync(join(dir, "_meta.json"), JSON.stringify({ site: SITE, viewport: VIEWPORT, ok, failed, count: list.length }, null, 2));
  console.log(`снято ${ok} из ${list.length}, не открылось ${failed} → ${dir}`);
}

function compare(dirA, dirB) {
  const files = readdirSync(dirA).filter((f) => f.endsWith(".png"));
  const rows = [];
  for (const f of files) {
    const pb = join(dirB, f);
    if (!existsSync(pb)) { rows.push({ f, pct: null, note: "нет снимка после" }); continue; }
    const A = PNG.sync.read(readFileSync(join(dirA, f)));
    const B = PNG.sync.read(readFileSync(pb));
    if (A.width !== B.width || A.height !== B.height) { rows.push({ f, pct: null, note: "размер изменился" }); continue; }
    const diff = new PNG({ width: A.width, height: A.height });
    const n = pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0.1 });
    rows.push({ f, pct: (n / (A.width * A.height)) * 100 });
  }
  const pcts = rows.filter((r) => r.pct !== null).map((r) => r.pct).sort((x, y) => x - y);
  const q = (p) => (pcts.length ? pcts[Math.min(pcts.length - 1, Math.floor(pcts.length * p))] : NaN);
  console.log(`страниц сравнено : ${pcts.length}`);
  console.log(`медиана          : ${q(0.5).toFixed(2)} %`);
  console.log(`p90              : ${q(0.9).toFixed(2)} %`);
  console.log(`максимум         : ${(pcts.at(-1) ?? NaN).toFixed(2)} %`);
  const moved = rows.filter((r) => r.pct !== null && r.pct > THRESHOLD).sort((x, y) => y.pct - x.pct);
  console.log(`порог шума       : ${THRESHOLD} %`);
  console.log(`страниц со сдвигом: ${moved.length}`);
  for (const r of moved.slice(0, 10)) console.log(`   ${r.pct.toFixed(2)} %  ${r.f}`);
  for (const r of rows.filter((r) => r.pct === null)) console.log(`   ⚠️  ${r.f}: ${r.note}`);
  return moved.length;
}

if (cmd === "capture") await capture(a);
else if (cmd === "compare") process.exit(compare(a, b) > 0 ? 1 : 0);
else { console.error("использование: capture <dir> [--limit N] | compare <dirA> <dirB>"); process.exit(2); }

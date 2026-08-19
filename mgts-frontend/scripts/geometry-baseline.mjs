/**
 * Эталон геометрии (спринт Ф1).
 *
 * Инвариант Ф1 звучит так: «тема не меняет раскладку, правится только визуальный
 * слой». Проверять это попиксельным сравнением нельзя: тема МЕНЯЕТ цвет, значит
 * пиксели разойдутся на каждой странице — и прибор будет кричать там, где всё
 * правильно, и молчать там, где съехал блок. Это К-03: прибор смотрит мимо.
 *
 * Поэтому сравниваем не пиксели, а КОРОБКИ: положение и размер каждого элемента.
 * Цвет коробку не двигает. Двигает её сломанная раскладка — а это ровно то,
 * что инвариант запрещает.
 *
 *   node scripts/geometry-baseline.mjs capture .geo/before
 *   ... правим тему ...
 *   node scripts/geometry-baseline.mjs capture .geo/after
 *   node scripts/geometry-baseline.mjs compare .geo/before .geo/after
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const STRAPI = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";
const SITE = process.env.SITE_BASE_URL || "http://localhost:3000";
const [cmd, a, b] = process.argv.slice(2);
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 0;
const TOL = 1; // допуск в пикселях: субпиксельное округление шрифта — не сдвиг раскладки
const VIEWPORT = { width: 1366, height: 900 };

const IN_PAGE = () => {
  /* Индекс считается среди СОСЕДЕЙ ТОГО ЖЕ ТЕГА, а не среди всех детей.
     Первая версия считала среди всех — и служебный <nextjs-portal>, который
     оверлей разработки вставляет не на каждой загрузке, сдвигал индексы всего
     поддерева: два снимка одного и того же состояния расходились на 341 элементе.
     Прибор показывал «раскладка изменилась» там, где менялся только оверлей. */
  const SERVICE = /^(nextjs-|next-route)/;
  const path = (el) => {
    const parts = [];
    let n = el;
    while (n && n !== document.body) {
      const p = n.parentElement;
      if (!p) break;
      const tag = n.tagName.toLowerCase();
      const same = Array.prototype.filter.call(p.children, (c) => c.tagName === n.tagName);
      parts.push(`${tag}:${same.indexOf(n)}`);
      n = p;
    }
    return parts.reverse().join(">");
  };
  const isService = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (SERVICE.test(n.tagName.toLowerCase())) return true;
    }
    return false;
  };
  const out = {};
  for (const el of document.querySelectorAll("body *")) {
    if (isService(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    out[path(el)] = [Math.round(r.x), Math.round(r.y + window.scrollY), Math.round(r.width), Math.round(r.height)];
  }
  return out;
};

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
  let ok = 0;
  for (const slug of list) {
    try {
      const r = await page.goto(`${SITE}/${slug}`, { waitUntil: "networkidle", timeout: 25000 });
      if (!r || r.status() >= 400) throw new Error(`код ${r?.status()}`);
      const boxes = await page.evaluate(IN_PAGE);
      writeFileSync(join(dir, `${slug.replace(/\//g, "__")}.json`), JSON.stringify(boxes));
      ok++;
    } catch (e) { console.error(`  ✗ ${slug}: ${e.message}`); }
  }
  await browser.close();
  console.log(`снято ${ok} из ${list.length} → ${dir}`);
}

function compare(dirA, dirB) {
  const files = readdirSync(dirA).filter((f) => f.endsWith(".json"));
  let movedPages = 0, movedEls = 0, addedEls = 0, goneEls = 0, totalEls = 0;
  const worst = [];
  for (const f of files) {
    const pb = join(dirB, f);
    if (!existsSync(pb)) { console.log(`   ⚠️  ${f}: нет снимка «после»`); continue; }
    const A = JSON.parse(readFileSync(join(dirA, f), "utf8"));
    const B = JSON.parse(readFileSync(pb, "utf8"));
    let m = 0;
    for (const [k, v] of Object.entries(A)) {
      totalEls++;
      const w = B[k];
      if (!w) { goneEls++; m++; continue; }
      const d = Math.max(...v.map((x, i) => Math.abs(x - w[i])));
      if (d > TOL) { m++; movedEls++; if (worst.length < 12) worst.push({ f, k, was: v, now: w, d }); }
    }
    for (const k of Object.keys(B)) if (!(k in A)) addedEls++;
    if (m > 0) movedPages++;
  }
  console.log(`страниц сравнено ....... ${files.length}`);
  console.log(`элементов в эталоне .... ${totalEls}`);
  console.log(`сдвинулось ............. ${movedEls}`);
  console.log(`исчезло ................ ${goneEls}`);
  console.log(`появилось .............. ${addedEls}`);
  console.log(`страниц со сдвигом ..... ${movedPages}`);
  for (const w of worst) console.log(`   ${w.d}px  ${w.f}  ${w.k}  ${w.was} → ${w.now}`);
  return movedPages;
}

if (cmd === "capture") await capture(a);
else if (cmd === "compare") process.exit(compare(a, b) > 0 ? 1 : 0);
else { console.error("использование: capture <dir> [--limit N] | compare <dirA> <dirB>"); process.exit(2); }

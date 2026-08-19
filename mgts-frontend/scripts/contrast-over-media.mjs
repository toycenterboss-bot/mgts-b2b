/**
 * Контраст текста поверх картинок и градиентов (дефект Д-30, класс К-04).
 *
 * Почему отдельный прибор. `design-metrics` берёт фон из вычисленных стилей и
 * честно ПРОПУСКАЕТ узлы, под которыми картинка, градиент или полупрозрачный
 * слой: цвета фона там нет, есть пиксели. Пропущенных — треть. Ровно в этой
 * трети 19.08 проехала регрессия: заголовок героя в светлой теме стал тёмным
 * поверх тёмной фотографии, прибор показал ноль, а владелец открыл страницу
 * и увидел. Слепое пятно, записанное в отчёт, всё равно остаётся слепым пятном.
 *
 * Здесь фон берётся из СНИМКА: элемент фотографируется, из его коробки
 * считается медианная яркость пикселей, и контраст меряется против неё.
 *
 *   node scripts/contrast-over-media.mjs --theme light --limit 20 --out /tmp/media.json
 *
 * 🔴 Граница честности. Медиана по коробке — приближение: сам текст занимает
 * часть пикселей и тянет медиану к своему цвету. Поэтому прибор занижает
 * серьёзность (реальный контраст обычно хуже), но не выдумывает нарушений:
 * там, где он краснеет, глаз краснеет тоже.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const STRAPI = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";
const SITE = process.env.SITE_BASE_URL || "http://localhost:3000";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const LIMIT = Number(arg("--limit", 0));
const THEME = arg("--theme", "");
const OUT = arg("--out", "contrast-over-media.json");
const VIEWPORT = { width: 1366, height: 900 };

const COLLECT = () => {
  const parse = (s) => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const visible = (el) => { const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
  const ownText = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3)
    .map((n) => n.textContent.trim()).join(" ").trim();
  /* берём только те узлы, которые второй прибор пропускает */
  const skipped = (el) => { let n = el;
    while (n && n !== document.documentElement) { const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") return true;
      const c = parse(s.backgroundColor);
      if (c && c.a >= 0.95) return false;
      if (c && c.a > 0) return true;
      n = n.parentElement; }
    return false; };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const t = ownText(el);
    if (!t || !visible(el)) continue;
    /* Иконочные глифы пропускаем: их коробка почти целиком занята самим глифом,
       медиана по пикселям равна цвету текста и даёт ровно 1.00 — это артефакт
       прибора, а не дефект. К тому же они aria-hidden и текстом не являются. */
    if (/material-symbols/.test(String(el.className))) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 24 || box.height < 12) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    if (!fg || fg.a < 0.95) continue;
    if (!skipped(el)) continue;
    const r = el.getBoundingClientRect();
    out.push({ x: Math.round(r.x + window.scrollX), y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width), h: Math.round(r.height),
      fg: [fg.r, fg.g, fg.b], size: parseFloat(s.fontSize), weight: Number(s.fontWeight) || 400,
      tag: el.tagName.toLowerCase(), text: t.slice(0, 50) });
  }
  return out;
};

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [a, b].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

async function slugs() {
  const res = await fetch(`${STRAPI}/api/pages?pagination[pageSize]=500&status=published&fields[0]=slug`);
  const list = ((await res.json())?.data ?? []).map((p) => p.slug).filter(Boolean).sort();
  return LIMIT > 0 ? list.slice(0, LIMIT) : list;
}

const list = await slugs();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
const bad = [];
let checked = 0, pagesOk = 0;
for (const slug of list) {
  try {
    const url = `${SITE}/${slug}` + (THEME ? `?theme=${THEME}` : "");
    const r = await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
    if (!r || r.status() >= 400) throw new Error(`код ${r?.status()}`);
    const nodes = await page.evaluate(COLLECT);
    if (!nodes.length) { pagesOk++; continue; }
    const shot = PNG.sync.read(await page.screenshot({ fullPage: true }));
    for (const n of nodes) {
      /* Фон берём КОЛЬЦОМ вокруг коробки, а не изнутри. Внутри мелкой надписи
         пиксели текста в большинстве — и медиана, и мода показывают цвет самого
         текста, контраст выходит 1.00 и прибор врёт (проверено дважды 19.08).
         Снаружи — то, на чём надпись лежит. */
      const PAD = 8;
      const lums = [];
      const x1 = Math.max(0, n.x - PAD), y1 = Math.max(0, n.y - PAD);
      const x2 = Math.min(shot.width, n.x + n.w + PAD), y2 = Math.min(shot.height, n.y + n.h + PAD);
      const step = 2;
      for (let y = y1; y < y2; y += step) for (let x = x1; x < x2; x += step) {
        const inside = x >= n.x && x < n.x + n.w && y >= n.y && y < n.y + n.h;
        if (inside) continue;
        const i = (shot.width * y + x) << 2;
        lums.push(lum(shot.data[i], shot.data[i + 1], shot.data[i + 2]));
      }
      if (lums.length < 20) continue;
      const bins = new Array(24).fill(0);
      for (const L of lums) bins[Math.min(23, Math.floor(L * 24))]++;
      let best = 0; for (let i = 1; i < bins.length; i++) if (bins[i] > bins[best]) best = i;
      const inBin = lums.filter((L) => Math.min(23, Math.floor(L * 24)) === best);
      const bg = inBin.reduce((a, b) => a + b, 0) / inBin.length;
      checked++;
      const large = n.size >= 24 || (n.size >= 18.66 && n.weight >= 700);
      const need = large ? 3 : 4.5;
      const cr = ratio(lum(...n.fg), bg);
      if (cr + 0.005 < need) bad.push({ slug, tag: n.tag, text: n.text,
        fg: `rgb(${n.fg.join(", ")})`, bgLum: Number(bg.toFixed(3)),
        ratio: Number(cr.toFixed(2)), need, size: Math.round(n.size) });
    }
    pagesOk++;
  } catch (e) { console.error(`  ✗ ${slug}: ${e.message}`); }
}
await browser.close();
bad.sort((a, b) => a.ratio - b.ratio);
const report = { theme: THEME || "dark", pages: pagesOk, nodesOverMedia: checked,
  belowAA: bad.length, pagesAffected: new Set(bad.map((b) => b.slug)).size, worst: bad.slice(0, 25) };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`страниц ......................... ${report.pages}`);
console.log(`узлов поверх картинок ........... ${report.nodesOverMedia}`);
console.log(`из них ниже AA .................. ${report.belowAA} на ${report.pagesAffected} страницах`);
for (const b of report.worst.slice(0, 10)) console.log(`   ${b.ratio}  ${b.slug}  ${b.tag} «${b.text}» ${b.fg}`);
console.log(`→ ${OUT}`);
if (process.argv.includes("--gate") && bad.length) process.exit(1);

/**
 * Приборы дизайн-ревью (спринт Ф1.5).
 *
 * Отчёты Claude Design — это суждение. Суждение без прибора превращается
 * в «стало лучше» (К-05: формальный признак принят за результат). Поэтому
 * рядом с каждым отчётом должно лежать число, снятое машиной, и снятое
 * ДВАЖДЫ — до темы и после неё. Разница чисел и есть доказательство.
 *
 *   node scripts/design-metrics.mjs --limit 30 --out ../docs/design-review/metrics-before.json
 *
 * Что меряется на живых страницах (Playwright, реальные вычисленные стили):
 *   - пары «текст на фоне» с контрастом ниже AA;
 *   - интерактивные цели меньше 44×44 CSS-px (не-строчные, WCAG 2.5.8);
 *   - страницы, где в шапке/навигации нет ни одного фокусируемого элемента;
 *   - изображения без alt.
 * Что меряется по исходникам (без браузера):
 *   - число `!important`;
 *   - число литеральных цветов вне файла токенов.
 *
 * 🔴 Граница честности. Контраст считается по вычисленному цвету текста и
 * ближайшему непрозрачному фону предка. Текст поверх картинки, градиента или
 * полупрозрачного слоя прибор НЕ видит — там он молча берёт фон предка и может
 * показать «норма» там, где глазом нечитаемо. Это К-04, и он не закрыт.
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { chromium } from "playwright";

const STRAPI = process.env.NEXT_PUBLIC_STRAPI_BASE_URL || "http://localhost:1337";
const SITE = process.env.SITE_BASE_URL || "http://localhost:3000";
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : dflt; };
const LIMIT = Number(arg("--limit", 0));
const OUT = arg("--out", "");
const VIEWPORT = { width: Number(arg("--vw", 1366)), height: Number(arg("--vh", 900)) };

/* ── статика: !important и литеральные цвета ─────────────────────────── */

const SRC_ROOTS = ["src", "../design/tailwind", "../design/assets/css"];
const TOKEN_FILE = "src/app/globals.css"; // единственное место, где цвет разрешён литералом
const CODE_EXT = /\.(css|ts|tsx|js|jsx)$/;
const SKIP_DIR = /node_modules|\.next|\.visual|dist|build/;

function walk(dir, acc = []) {
  if (!existsSync(dir) || SKIP_DIR.test(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (SKIP_DIR.test(p)) continue;
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (CODE_EXT.test(p)) acc.push(p);
  }
  return acc;
}

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
/* разнобой значений: сколько РАЗЛИЧНЫХ решений принято по одному вопросу */
const TYPE_SCALE = /font-size:\s*[^;]+|\btext-\[[^\]]+\]|\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/g;
const RADIUS = /border-radius:\s*[^;]+|\brounded(?:-[a-z0-9\[\]%.]+)?\b/g;
const SHADOW = /box-shadow:\s*[^;]+|\bshadow-[a-z0-9\[\]%.\/]+/g;
const FONT_DECL = /font-family:\s*[^;]+/g;

function staticMetrics() {
  const files = SRC_ROOTS.flatMap((r) => walk(r));
  let important = 0;
  const importantBy = {};
  let literals = 0;
  const literalsBy = {};
  const scale = new Set(), radii = new Set(), shadows = new Set(), fonts = new Set();
  let focusVisible = 0;
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const imp = (text.match(/!important/g) || []).length;
    if (imp) { important += imp; importantBy[f] = imp; }
    focusVisible += (text.match(/:focus-visible/g) || []).length;
    for (const x of text.match(TYPE_SCALE) || []) scale.add(x.trim());
    for (const x of text.match(RADIUS) || []) radii.add(x.trim());
    for (const x of text.match(SHADOW) || []) shadows.add(x.trim().slice(0, 60));
    for (const x of text.match(FONT_DECL) || []) fonts.add(x.replace(/\s+/g, " ").trim().slice(0, 60));
    if (f.endsWith(TOKEN_FILE) || f === TOKEN_FILE) continue; // токенам литералы положены
    const col = (text.match(COLOR) || []).length;
    if (col) { literals += col; literalsBy[f] = col; }
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return { filesScanned: files.length, important, importantTop: top(importantBy),
    literals, literalsTop: top(literalsBy),
    typeScaleValues: scale.size, radiusValues: radii.size, shadowValues: shadows.size,
    fontFamilyDeclarations: fonts.size, focusVisibleRules: focusVisible };
}

/* ── в браузере: контраст, цели, навигация, alt ──────────────────────── */

const IN_PAGE = () => {
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const ownText = (el) => Array.from(el.childNodes)
    .filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();

  /* фон: ближайший непрозрачный предок. Картинка/градиент = прибор не смотрит */
  const backdrop = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") return { skip: true };
      const c = parse(s.backgroundColor);
      if (c && c.a >= 0.95) return { color: c };
      if (c && c.a > 0) return { skip: true }; // полупрозрачный слой — не наш случай
      n = n.parentElement;
    }
    return { color: { r: 255, g: 255, b: 255, a: 1 } };
  };

  const pairs = new Map();
  let skipped = 0, checked = 0;
  for (const el of document.querySelectorAll("body *")) {
    const t = ownText(el);
    if (!t || !visible(el)) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    if (!fg || fg.a < 0.95) { skipped++; continue; }
    const bg = backdrop(el);
    if (bg.skip) { skipped++; continue; }
    checked++;
    const size = parseFloat(s.fontSize), weight = Number(s.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const cr = ratio(fg, bg.color);
    if (cr + 0.005 < need) {
      const key = `${s.color} / rgb(${bg.color.r}, ${bg.color.g}, ${bg.color.b}) @${Math.round(size)}px${large ? " large" : ""}`;
      const prev = pairs.get(key);
      if (prev) prev.n++;
      else pairs.set(key, { key, n: 1, ratio: Number(cr.toFixed(2)), need, sample: t.slice(0, 60), tag: el.tagName.toLowerCase() });
    }
  }

  /* тач-цели. Строчные ссылки внутри текста WCAG 2.5.8 не считает — исключаем */
  const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
  const targets = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    if (s.display === "inline") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) {
      targets.push({
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width), h: Math.round(r.height),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
      });
    }
  }

  /* фокусируемая навигация */
  /* Считаем ССЫЛКИ и кнопки, а не «что угодно фокусируемое»: поле поиска
     в шапке фокус берёт, но никуда не ведёт — на мутации M2 первая версия
     прибора из-за него осталась зелёной (К-04, поймано мутацией 19.08). */
  const NAV_SEL = 'a[href], button, [role="link"], [role="button"]';
  const navRoots = document.querySelectorAll('header, nav, [role="navigation"]');
  let navFocusable = 0;
  for (const n of navRoots) navFocusable += Array.from(n.querySelectorAll(NAV_SEL)).filter(visible).length;

  /* alt у картинок */
  const imgs = Array.from(document.querySelectorAll("img")).filter(visible);
  const noAlt = imgs.filter((i) => !i.hasAttribute("alt")).length;

  /* переполнение по горизонтали: документ шире окна = боковая прокрутка */
  const de = document.documentElement;
  const overflowPx = Math.max(0, de.scrollWidth - de.clientWidth);
  const widest = [];
  if (overflowPx > 0) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > de.clientWidth + 1 && r.width > 0) widest.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || "").slice(0, 50), right: Math.round(r.right) });
    }
    widest.sort((a, b) => b.right - a.right);
  }

  /* шаблонный текст, доехавший до продакшена как содержимое */
  const TPL = [/^Страница услуги/i, /^Подробная информация об услугах для/i, /^Описание услуги$/i, /Lorem ipsum/i];
  let templateCopy = 0;
  const templateSamples = [];
  for (const el of document.querySelectorAll("p, li, h1, h2, h3, h4")) {
    const t2 = ownText(el);
    if (t2 && TPL.some((re) => re.test(t2))) { templateCopy++; if (templateSamples.length < 3) templateSamples.push(t2.slice(0, 70)); }
  }

  /* иконки: сколько слотов получило картинку из CMS, а сколько ушло
     в аварийный шрифтовой путь Material Symbols */
  const iconImgs = Array.from(document.querySelectorAll("img")).filter((i) => !/logo/i.test(i.currentSrc || i.src)).length;
  const iconGlyphs = document.querySelectorAll(".material-symbols-outlined").length;
  const glyphNames = {};
  for (const g of document.querySelectorAll(".material-symbols-outlined")) {
    const k = g.textContent.trim(); glyphNames[k] = (glyphNames[k] || 0) + 1;
  }

  /* заголовки */
  const h1 = document.querySelectorAll("h1").length;
  const lang = document.documentElement.getAttribute("lang") || "";

  return {
    contrast: { checked, skipped, pairs: Array.from(pairs.values()).sort((a, b) => a.ratio - b.ratio) },
    targets, navRoots: navRoots.length, navFocusable,
    images: imgs.length, imagesNoAlt: noAlt, h1, lang,
    overflowPx, overflowTop: widest.slice(0, 3), templateCopy, templateSamples,
    iconImgs, iconGlyphs, glyphNames,
  };
};

/* ── обход страниц ───────────────────────────────────────────────────── */

async function slugs() {
  const res = await fetch(`${STRAPI}/api/pages?pagination[pageSize]=500&status=published&fields[0]=slug`);
  const json = await res.json();
  const list = (json?.data ?? []).map((p) => p.slug).filter(Boolean).sort();
  return LIMIT > 0 ? list.slice(0, LIMIT) : list;
}

const list = await slugs();
if (!list.length) { console.error("страниц не получено — Strapi на " + STRAPI + " отвечает?"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
const perPage = [];
let errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => errs.push("pageerror: " + String(e.message).slice(0, 160)));
for (const slug of list) {
  errs = [];
  try {
    const r = await page.goto(`${SITE}/${slug}`, { waitUntil: "networkidle", timeout: 25000 });
    if (!r || r.status() >= 400) throw new Error(`код ${r?.status()}`);
    const m = await page.evaluate(IN_PAGE);
    perPage.push({ slug, ok: true, ...m, consoleErrors: errs.length, consoleSamples: errs.slice(0, 2) });
  } catch (e) {
    perPage.push({ slug, ok: false, error: e.message });
    console.error(`  ✗ ${slug}: ${e.message}`);
  }
}
await browser.close();

const ok = perPage.filter((p) => p.ok);
const uniqPairs = new Map();
for (const p of ok) for (const c of p.contrast.pairs) {
  const e = uniqPairs.get(c.key) || { ...c, n: 0, pages: 0 };
  e.n += c.n; e.pages++; uniqPairs.set(c.key, e);
}
const uniqTargets = new Map();
for (const p of ok) for (const t of p.targets) {
  const k = `${t.tag} ${t.w}×${t.h} ${t.label}`;
  uniqTargets.set(k, (uniqTargets.get(k) || 0) + 1);
}
const st = staticMetrics();

const report = {
  measuredAt: new Date().toISOString(),
  site: SITE, viewport: VIEWPORT,
  pages: { requested: list.length, opened: ok.length, failed: perPage.length - ok.length },
  contrastPairsBelowAA: uniqPairs.size,
  contrastNodesBelowAA: Array.from(uniqPairs.values()).reduce((s, c) => s + c.n, 0),
  contrastWorst: Array.from(uniqPairs.values()).sort((a, b) => a.ratio - b.ratio).slice(0, 15),
  contrastNodesChecked: ok.reduce((s, p) => s + p.contrast.checked, 0),
  contrastNodesSkipped: ok.reduce((s, p) => s + p.contrast.skipped, 0),
  smallTargetsUnique: uniqTargets.size,
  smallTargetsTop: Array.from(uniqTargets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15),
  pagesWithoutFocusableNav: ok.filter((p) => p.navFocusable === 0).map((p) => p.slug),
  pagesWithoutH1: ok.filter((p) => p.h1 === 0).map((p) => p.slug),
  pagesWithMultipleH1: ok.filter((p) => p.h1 > 1).map((p) => p.slug),
  imagesWithoutAlt: ok.reduce((s, p) => s + p.imagesNoAlt, 0),
  pagesWithHorizontalOverflow: ok.filter((p) => p.overflowPx > 0).length,
  overflowWorst: ok.filter((p) => p.overflowPx > 0).sort((a, b) => b.overflowPx - a.overflowPx).slice(0, 10)
    .map((p) => ({ slug: p.slug, px: p.overflowPx, culprits: p.overflowTop })),
  templateCopyBlocks: ok.reduce((s, p) => s + p.templateCopy, 0),
  templateCopyPages: ok.filter((p) => p.templateCopy > 0).length,
  templateCopySamples: Array.from(new Set(ok.flatMap((p) => p.templateSamples))).slice(0, 8),
  iconSlots: ok.reduce((s, p) => s + p.iconImgs + p.iconGlyphs, 0),
  iconFromCms: ok.reduce((s, p) => s + p.iconImgs, 0),
  iconFallback: ok.reduce((s, p) => s + p.iconGlyphs, 0),
  iconGlyphTop: (() => { const m = {}; for (const p of ok) for (const [k, v] of Object.entries(p.glyphNames || {})) m[k] = (m[k] || 0) + v;
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12); })(),
  consoleErrors: ok.reduce((s, p) => s + (p.consoleErrors || 0), 0),
  consoleErrorPages: ok.filter((p) => (p.consoleErrors || 0) > 0).length,
  consoleErrorSamples: Array.from(new Set(ok.flatMap((p) => p.consoleSamples || []))).slice(0, 8),
  langAttr: Array.from(new Set(ok.map((p) => p.lang))),
  important: st.important, importantTop: st.importantTop,
  colorLiterals: st.literals, colorLiteralsTop: st.literalsTop,
  typeScaleValues: st.typeScaleValues,
  radiusValues: st.radiusValues,
  shadowValues: st.shadowValues,
  fontFamilyDeclarations: st.fontFamilyDeclarations,
  focusVisibleRules: st.focusVisibleRules,
  filesScanned: st.filesScanned,
  failedPages: perPage.filter((p) => !p.ok).map((p) => ({ slug: p.slug, error: p.error })),
};

const out = OUT || "design-metrics.json";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`страниц открыто ................ ${report.pages.opened} из ${report.pages.requested}`);
console.log(`узлов текста ниже AA ........... ${report.contrastNodesBelowAA}`);
console.log(`пар «цвет/фон» ниже AA ......... ${report.contrastPairsBelowAA}  (узлов проверено ${report.contrastNodesChecked}, пропущено ${report.contrastNodesSkipped})`);
console.log(`целей меньше 44×44 (видов) ..... ${report.smallTargetsUnique}`);
console.log(`страниц без фокус. навигации ... ${report.pagesWithoutFocusableNav.length}`);
console.log(`страниц без h1 ................. ${report.pagesWithoutH1.length}`);
console.log(`картинок без alt ............... ${report.imagesWithoutAlt}`);
console.log(`страниц с боковой прокруткой ... ${report.pagesWithHorizontalOverflow}`);
console.log(`блоков шаблонного текста ....... ${report.templateCopyBlocks} на ${report.templateCopyPages} страницах`);
console.log(`иконок из CMS / аварийных ...... ${report.iconFromCms} / ${report.iconFallback}`);
console.log(`ошибок в консоли ............... ${report.consoleErrors} на ${report.consoleErrorPages} страницах`);
console.log(`!important ..................... ${report.important}`);
console.log(`литеральных цветов вне токенов . ${report.colorLiterals}`);
console.log(`различных кеглей / скруглений .. ${report.typeScaleValues} / ${report.radiusValues}`);
console.log(`различных теней / гарнитур ..... ${report.shadowValues} / ${report.fontFamilyDeclarations}`);
console.log(`правил :focus-visible .......... ${report.focusVisibleRules}`);
console.log(`→ ${out}`);

/* ── ворота (К-10: обещание без носителя) ────────────────────────────
 * `--gate` включается ЯВНО, как и у check-stubs: приборы, которые сами
 * решают, когда им краснеть, краснеют не тогда. Пока Ф1 не закрыта,
 * ворота красные — это правильное состояние, а не поломка.
 */
if (process.argv.includes("--gate")) {
  const LIMITS = [
    ["узлов текста ниже AA", report.contrastNodesBelowAA, 0],
    ["!important", report.important, 0],
    ["страниц с боковой прокруткой", report.pagesWithHorizontalOverflow, 0],
    ["видов целей меньше 44×44", report.smallTargetsUnique, 0],
    ["страниц без h1", report.pagesWithoutH1.length, 0],
    ["страниц с несколькими h1", report.pagesWithMultipleH1.length, 0],
    ["изображений без alt", report.imagesWithoutAlt, 0],
    ["страниц без фокусируемой навигации", report.pagesWithoutFocusableNav.length, 0],
    ["литеральных цветов вне токенов", report.colorLiterals, 100],
  ];
  const bad = LIMITS.filter(([, v, lim]) => v > lim);
  console.log("");
  for (const [name, v, lim] of LIMITS) console.log(`${v > lim ? "✗" : "✓"} ${name}: ${v} при пороге ${lim}`);
  if (bad.length) { console.error(`\nворота закрыты: не уложились по ${bad.length} показателям`); process.exit(1); }
  console.log("\nворота открыты");
}

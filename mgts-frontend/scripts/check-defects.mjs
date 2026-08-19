/**
 * Ворота реестра дефектов дизайна (Ф1.5 → Ф1…Ф7).
 *
 * Отчёт превращается в план только тогда, когда у каждого пункта есть носитель:
 * прибор с числом либо номер коммита. Иначе «учтём в следующей итерации» — и это
 * **К-10**, обещание без носителя. Здесь машина не даёт закрыть дефект словом.
 *
 *   node scripts/check-defects.mjs
 *
 * Что проверяется:
 *   1. у каждой строки Д-NN заполнены все восемь колонок;
 *   2. машинный дефект ссылается на существующее поле замера;
 *   3. статус ✅ у машинного дефекта требует, чтобы условие выполнялось
 *      в metrics-after.json (а сам файл — существовал);
 *   4. статус ✅ у ручного дефекта требует `коммит:<sha>`, и sha обязан
 *      находиться в истории репозитория;
 *   5. статус ⏸ требует слов «потому что».
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const REG = "../docs/design-review/defects.md";
const AFTER = { "design-metrics": "../docs/design-review/metrics-after.json",
                "design-metrics-mobile": "../docs/design-review/metrics-after-mobile.json" };

const red = [], warn = [];
const rows = [];
for (const line of readFileSync(REG, "utf8").split("\n")) {
  if (!/^\|\s*Д-\d+\s*\|/.test(line)) continue;
  const c = line.split("|").slice(1, -1).map((s) => s.trim());
  rows.push(c);
}
if (!rows.length) { console.error("в реестре нет ни одной строки Д-NN — проверять нечего"); process.exit(2); }

const num = (v) => (Array.isArray(v) ? v.length : v);
const cache = {};
const metrics = (kind) => {
  if (kind in cache) return cache[kind];
  const p = AFTER[kind];
  cache[kind] = p && existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
  return cache[kind];
};

for (const c of rows) {
  const [id, what, check, now, goal, phase, klass, status] = c;
  if (c.length < 8 || [what, check, now, goal, phase, klass, status].some((x) => !x || x === "—")) {
    red.push(`${id}: не заполнена одна из восьми колонок`); continue;
  }
  const closed = status.startsWith("✅");
  const paused = status.startsWith("⏸");
  if (paused && !/потому что/i.test(status)) { red.push(`${id}: отложен без «потому что»`); continue; }

  const m = check.match(/^`?(design-metrics(?:-mobile)?)\s*·\s*([A-Za-z0-9_]+)\s*(≤|≥)\s*(-?\d+)`?$/);
  if (m) {
    const [, kind, field, op, limRaw] = m;
    const lim = Number(limRaw);
    const data = metrics(kind);
    if (!data) {
      if (closed) red.push(`${id}: закрыт, но замера ${AFTER[kind]} нет — закрывать нечем`);
      else warn.push(`${id}: повторного замера ещё нет (${kind})`);
      continue;
    }
    if (!(field in data)) { red.push(`${id}: поля «${field}» нет в ${AFTER[kind]}`); continue; }
    const v = num(data[field]);
    const ok = op === "≤" ? v <= lim : v >= lim;
    if (closed && !ok) red.push(`${id}: закрыт, но ${field} = ${v} при условии ${op} ${lim}`);
    if (!closed && ok) warn.push(`${id}: условие уже выполнено (${field} = ${v} ${op} ${lim}) — статус пора менять`);
    continue;
  }

  /* \b в JS считает словом только ASCII: после кириллической «я» границы нет,
     и первая версия этой строки красила все 18 ручных дефектов. Проверять
     приходится по разделителю, а не по границе слова. */
  if (/^`?ручная\s*·/.test(check)) {
    if (!closed) continue;
    const sha = status.match(/коммит:\s*([0-9a-f]{7,40})/i);
    if (!sha) { red.push(`${id}: ручной дефект закрыт без «коммит:<sha>»`); continue; }
    try { execSync(`git cat-file -e ${sha[1]}^{commit}`, { stdio: "ignore" }); }
    catch { red.push(`${id}: коммита ${sha[1]} нет в истории`); }
    continue;
  }

  red.push(`${id}: колонка «Проверка» не разобрана: ${check}`);
}

console.log(`строк в реестре: ${rows.length}`);
const open = rows.filter((c) => c[7].startsWith("⬜")).length;
const done = rows.filter((c) => c[7].startsWith("✅")).length;
console.log(`открыто ${open} · в работе ${rows.length - open - done - rows.filter((c) => c[7].startsWith("⏸")).length} · закрыто ${done} · отложено ${rows.filter((c) => c[7].startsWith("⏸")).length}`);
for (const w of warn) console.log(`  ! ${w}`);
for (const r of red) console.error(`  ✗ ${r}`);
if (red.length) { console.error(`\nреестр дефектов не в порядке: ${red.length} нарушений`); process.exit(1); }
console.log("реестр в порядке");

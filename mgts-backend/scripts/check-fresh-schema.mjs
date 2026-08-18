/**
 * Разворачивается ли проект с нуля (B-03, спринт Ф0).
 *
 * B-03 говорил «ноль миграций, проект не разворачивается с нуля». Проверять это
 * рассуждением бессмысленно: Strapi строит схему из файлов типов контента,
 * и вопрос не в том, есть ли каталог migrations, а в том, СОВПАДЁТ ЛИ схема,
 * которую он построит на пустой базе, с той, что работает сейчас.
 *
 * Скрипт поднимает Strapi на отдельном порту с пустым файлом SQLite, ждёт
 * старта, гасит и сравнивает списки таблиц.
 *
 *   node scripts/check-fresh-schema.mjs
 *
 * Код возврата 1, если наборы таблиц расходятся.
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = join(ROOT, ".tmp", "data.db");
const FRESH_REL = ".tmp/fresh-check.db";
const FRESH = join(ROOT, FRESH_REL);
const PORT = process.env.FRESH_PORT || "1339";
const TIMEOUT_MS = 120_000;

function tables(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  const rows = db
    .prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name")
    .all();
  db.close();
  return new Set(rows.map((r) => r.name));
}

async function bootFresh() {
  for (const f of [FRESH, FRESH + "-journal", FRESH + "-wal", FRESH + "-shm"]) {
    if (existsSync(f)) rmSync(f);
  }
  mkdirSync(join(ROOT, ".tmp"), { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "develop"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_FILENAME: FRESH_REL, PORT, BROWSER: "none" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    const done = (err) => {
      clearTimeout(timer);
      try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
      setTimeout(() => (err ? reject(err) : resolve(log)), 2500);
    };
    const timer = setTimeout(() => done(new Error(`Strapi не поднялся за ${TIMEOUT_MS / 1000} с`)), TIMEOUT_MS);
    const onData = (b) => {
      log += b.toString();
      if (log.includes("Strapi started successfully")) done(null);
      if (/Error:|error TS/.test(log) && !log.includes("Strapi started successfully")) done(new Error("Strapi упал на старте"));
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (e) => done(e));
  });
}

if (!existsSync(LIVE)) {
  console.error(`❌ Нет рабочей базы ${LIVE} — не с чем сравнивать`);
  process.exit(1);
}

console.log(`поднимаю Strapi на пустой базе (порт ${PORT})…`);
try {
  await bootFresh();
} catch (e) {
  console.error(`❌ ${e.message}`);
  process.exit(1);
}

const live = tables(LIVE);
const fresh = tables(FRESH);
const missing = [...live].filter((t) => !fresh.has(t)).sort();
const extra = [...fresh].filter((t) => !live.has(t)).sort();

console.log(`таблиц в рабочей базе : ${live.size}`);
console.log(`таблиц на чистой      : ${fresh.size}`);
console.log(`совпало               : ${[...live].filter((t) => fresh.has(t)).length}`);

if (missing.length) {
  console.error(`\n❌ есть в рабочей, не создалось на чистой (${missing.length}):`);
  for (const t of missing) console.error(`   ${t}`);
}
if (extra.length) {
  console.error(`\n❌ создалось на чистой, нет в рабочей (${extra.length}):`);
  for (const t of extra) console.error(`   ${t}`);
}

rmSync(FRESH, { force: true });

if (missing.length || extra.length) {
  console.error("\nСхема с нуля не совпадает с рабочей — проект не разворачивается воспроизводимо.");
  process.exit(1);
}
console.log("\n✅ схема с нуля совпадает с рабочей — проект разворачивается воспроизводимо");
console.log("⚠️  Совпадает СХЕМА, но не контент: на чистой базе 0 страниц.");

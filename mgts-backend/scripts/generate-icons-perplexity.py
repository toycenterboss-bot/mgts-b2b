#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import sys
import threading
import time
from pathlib import Path

import requests

PPLX_KEY = os.environ.get("PERPLEXITY_API_KEY", "")
PPLX_MODEL = os.environ.get("LLM_MODEL", "sonar")


def slugify(text):
    value = re.sub(r"[^\w\s-]", "", text, flags=re.U).strip().lower()
    value = re.sub(r"[\s_-]+", "-", value)
    return value or "icon"


def parse_audit_entries(path):
    content = Path(path).read_text("utf-8")
    marker = "## Иконки без заполнения (Strapi контент)"
    entries = []

    if marker in content:
        _, tail = content.split(marker, 1)
        lines = tail.splitlines()
    else:
        lines = content.splitlines()

    for line in lines:
        if line.startswith("## ") and marker in content:
            break
        if not line.startswith("- **"):
            continue
        if "— путь `" not in line or "— промпт:" not in line:
            continue
        if "icon=" in line:
            continue
        match = re.match(
            r"^- \*\*(?P<scope>.*?)\*\* — (?P<context>.*?) — (?P<label>.*?) — путь `(?P<path>[^`]+)` — промпт: `(?P<prompt>.+)`$",
            line,
        )
        if not match:
            continue
        data = match.groupdict()
        data["line"] = line
        entries.append(data)
    return entries


def extract_meaning(prompt_text):
    match = re.search(r"Смысл:\s*(.+?)(?:\.\s*$|$)", prompt_text.strip())
    if match:
        return match.group(1).strip()
    return prompt_text.strip()


def build_messages(label, meaning, strict=False):
    label_clean = (label or "").strip()
    label_lower = label_clean.lower()
    is_step = bool(re.fullmatch(r"\d+", label_lower)) or bool(re.fullmatch(r"шаг\\s*\\d+", label_lower))
    system = (
        "You are a vector icon designer. Return ONLY valid SVG markup. "
        "No markdown, no explanations, no JSON."
    )
    strict_block = ""
    if strict:
        strict_block = (
            "- Только контур, без заливок (fill=\"none\")\n"
            "- Без фонового прямоугольника\n"
            "- Без текста и цифр (не использовать <text>)\n"
        )
    step_block = ""
    if is_step:
        step_block = (
            "Это маркер шага. НЕ использовать цифры или буквы. "
            "Используй нейтральный индикатор шага (круг/точка/шеврон).\n"
        )
    user = (
        "Сгенерируй монохромную контурную иконку (SVG) для web UI.\n"
        "Обязательные требования:\n"
        f"- Смысл: {meaning}\n"
        "- Монохромная\n"
        "- Размер: 1:1, 24x24\n"
        "- ViewBox: 0 0 24 24\n"
        "- Прозрачный фон\n"
        "- Без текста\n"
        "- Минимализм\n"
        "- 1–3 простые формы, без мелкой детализации\n"
        "- Без градиентов/теней/фильтров/эффектов\n"
        "- Только контуры, без заливок\n"
        "- Stroke width 2px, round cap/join\n"
        "- Стиль: Material Symbols Outlined (enterprise/minimal)\n"
        f"{strict_block}"
        f"{step_block}"
        f"Контекст: {label_clean}"
    )
    return system, user


class Heartbeat:
    def __init__(self, log, label, interval_sec=8):
        self._log = log
        self._label = label
        self._interval = interval_sec
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self):
        self._thread.start()

    def stop(self):
        self._stop.set()
        self._thread.join(timeout=1)

    def _run(self):
        start = time.monotonic()
        while not self._stop.wait(self._interval):
            elapsed = time.monotonic() - start
            self._log(f"⏳ ожидание ответа для «{self._label}» ({elapsed:.0f}s)")


def call_perplexity_svg(label, meaning, timeout_sec, retries, log, strict=False):
    if not PPLX_KEY:
        raise RuntimeError("PERPLEXITY_API_KEY is not set")

    system, user = build_messages(label, meaning, strict=strict)
    payload = {"model": PPLX_MODEL, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    headers = {"Authorization": f"Bearer {PPLX_KEY}", "Content-Type": "application/json"}
    last_error = None

    for attempt in range(retries + 1):
        hb = Heartbeat(log, label)
        try:
            log(f"➡️  запрос Perplexity ({attempt + 1}/{retries + 1}) для «{label}»")
            hb.start()
            t0 = time.monotonic()
            resp = requests.post(
                "https://api.perplexity.ai/chat/completions",
                json=payload,
                headers=headers,
                timeout=(10, timeout_sec),
            )
            resp.raise_for_status()
            elapsed = time.monotonic() - t0
            hb.stop()
            log(f"✅ ответ за {elapsed:.1f}s")
            content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            break
        except Exception as exc:
            hb.stop()
            last_error = exc
            log(f"⚠️  ошибка запроса: {exc}")
            if attempt < retries:
                continue
            raise last_error

    if not content:
        return None
    match = re.search(r"<svg[^>]*>.*?</svg>", content, re.S | re.I)
    if not match:
        return None
    svg = match.group(0)
    if "<script" in svg.lower():
        return None
    return svg


def build_output_path(out_dir, scope, label, line):
    scope_slug = slugify(scope.lstrip("/"))
    label_slug = slugify(label)[:60]
    line_hash = hashlib.md5(line.encode("utf-8")).hexdigest()[:8]
    out_subdir = Path(out_dir) / scope_slug
    out_subdir.mkdir(parents=True, exist_ok=True)
    return out_subdir / f"{label_slug}__{line_hash}.svg"


def main():
    parser = argparse.ArgumentParser(description="Generate SVG icons from icon_audit_strapi.md using Perplexity API")
    parser.add_argument("--source", default="/Users/andrey_efremov/Downloads/runs/design/icon_audit_strapi.md")
    parser.add_argument("--out-dir", default="/Users/andrey_efremov/Downloads/runs/design/generated_icons/perplexity")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--sleep", type=float, default=0.6)
    parser.add_argument("--log-file", default="/Users/andrey_efremov/Downloads/runs/mgts-backend/temp/perplexity-icons.log")
    parser.add_argument("--issues-file", default="")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    log_fp = None
    if args.log_file:
        Path(args.log_file).parent.mkdir(parents=True, exist_ok=True)
        log_fp = open(args.log_file, "a", encoding="utf-8")

    def log(msg):
        ts = time.strftime("%H:%M:%S")
        line = f"[{ts}] {msg}"
        print(line, flush=True)
        if log_fp:
            log_fp.write(line + "\n")
            log_fp.flush()

    if not PPLX_KEY:
        log("PERPLEXITY_API_KEY не задан в окружении.")
        if log_fp:
            log_fp.close()
        return 1

    entries = parse_audit_entries(args.source)
    if not entries:
        log("Не найдено строк для генерации.")
        return 1

    issues_set = set()
    if args.issues_file:
        try:
            issues_data = json.loads(Path(args.issues_file).read_text("utf-8"))
            if isinstance(issues_data, dict):
                if isinstance(issues_data.get("issues"), list):
                    issues_list = issues_data["issues"]
                elif isinstance(issues_data.get("issues_sample"), list):
                    issues_list = issues_data["issues_sample"]
                else:
                    issues_list = []
            elif isinstance(issues_data, list):
                issues_list = issues_data
            else:
                issues_list = []

            for item in issues_list:
                fpath = item.get("file")
                if fpath:
                    issues_set.add(str(Path(fpath)))
        except Exception as exc:
            log(f"Не удалось прочитать issues-file: {exc}")
            return 1

    if issues_set:
        filtered = []
        for item in entries:
            out_file = build_output_path(args.out_dir, item["scope"].strip(), item["label"].strip(), item["line"])
            if str(out_file) in issues_set:
                filtered.append(item)
        entries = filtered
    else:
        entries = entries[args.offset :]
        if args.limit and args.limit > 0:
            entries = entries[: args.limit]

    total = len(entries)
    log(f"Всего к обработке: {total}")

    for idx, item in enumerate(entries, 1):
        scope = item["scope"].strip()
        label = item["label"].strip()
        prompt = item["prompt"].strip()
        meaning = extract_meaning(prompt)

        out_file = build_output_path(out_dir, scope, label, item["line"])

        log(f"[{idx}/{total}] {scope} — {label}")
        if out_file.exists() and not args.force:
            log(f"⏭️  уже есть, пропуск: {out_file}")
            continue

        try:
            svg = call_perplexity_svg(label, meaning, args.timeout, args.retries, log, strict=args.strict)
            if not svg:
                log("❌ SVG не получен, пропуск")
                continue
            out_file.write_text(svg, encoding="utf-8")
            log(f"💾 сохранено: {out_file}")
        except Exception as exc:
            log(f"❌ ошибка: {exc}")

        time.sleep(args.sleep)

    log("Готово.")
    if log_fp:
        log_fp.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

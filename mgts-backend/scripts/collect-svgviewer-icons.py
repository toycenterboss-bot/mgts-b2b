#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
import json
import re
import time
from pathlib import Path

import requests

SVGVIEWER_API = "https://www.svgviewer.dev/api/svg"


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
    return ""


def load_overrides(path):
    if not path or not Path(path).exists():
        return {}
    return json.loads(Path(path).read_text("utf-8"))


def normalize(text):
    text = text.lower()
    text = re.sub(r"[^\w\s-]+", " ", text, flags=re.U)
    return re.sub(r"\s+", " ", text).strip()


def keyword_matches(hay, kw):
    if not kw or len(kw) < 3:
        return False
    return re.search(rf"\b{re.escape(kw)}\w*", hay) is not None


KEYWORD_RULES = [
    (["видеонаблюдение", "камера", "объектив", "фото", "видео", "наблюдение"], "camera"),
    (["щит", "безопасность", "охрана", "безопасный"], "shield"),
    (["замок", "доступ", "допуск", "дверь", "контроль доступа"], "lock"),
    (["подключение", "подключить", "разъем", "кабель", "вилка", "розетка"], "plug"),
    (["документ", "регламент", "инструкция", "паспорт"], "document"),
    (["обслужив", "эксплуатац", "ремонт"], "maintenance"),
    (["данных", "данные", "передача", "обмен"], "data"),
    (["инфраструктура", "сеть", "сетей", "сети", "сервер", "узлы", "маршрут"], "network"),
    (["связь", "связанные", "объединение", "link"], "link"),
    (["телефон", "связаться", "звонок"], "phone"),
    (["гарнитура", "поддержка", "support", "служба поддержки"], "headset"),
    (["шестерня", "настройка"], "settings"),
    (["гаечный", "инструмент", "ремонт"], "wrench"),
    (["документ", "лист", "договор", "акт", "сертификат", "реестр"], "document"),
    (["здание", "банк", "офис"], "building"),
    (["монета", "оплата", "платеж", "стоимость", "тариф", "цена"], "coin"),
    (["корзина", "закупки", "покупка"], "cart"),
    (["трофей"], "trophy"),
    (["звезда", "рейтинг", "преимущество"], "star"),
    (["молния"], "bolt"),
    (["глаз"], "eye"),
    (["печать", "штамп"], "stamp"),
    (["пазл"], "puzzle"),
    (["чип"], "chip"),
    (["модуль"], "module"),
    (["проектирование", "дизайн"], "design"),
    (["строительство"], "construction"),
    (["календарь"], "calendar"),
    (["часы", "срок"], "clock"),
    (["ключ"], "key"),
    (["стрелка", "стрелки", "направление"], "arrow"),
    (["партнер", "партнеры", "взаимодействие"], "handshake"),
    (["поиск", "подобрать", "поиска"], "search"),
    (["компенсация", "возврат"], "refund"),
]


def derive_term(label, meaning, prompt, overrides):
    label_clean = (label or "").strip()
    meaning_clean = (meaning or "").strip()
    prompt_clean = (prompt or "").strip()

    override = overrides.get(label_clean) or overrides.get(prompt_clean)
    if override:
        return override

    lower_label = label_clean.lower()
    if re.fullmatch(r"\d+", lower_label) or "шаг" in lower_label or "этап" in lower_label:
        return "circle"

    hay = normalize(f"{label_clean} {meaning_clean}")
    for keywords, term in KEYWORD_RULES:
        for kw in keywords:
            if keyword_matches(hay, kw):
                return term
    # Fallback: use first latin word in prompt/label
    m = re.search(r"[a-z]{3,}", (label_clean + " " + meaning_clean).lower())
    if m:
        return m.group(0)
    return ""


def fetch_candidates(term, collection_id=None, limit=3, timeout=30, retries=2):
    params = {"search": term, "page": 0, "limit": max(limit, 3)}
    if collection_id:
        params["collectionId"] = collection_id
    last_exc = None
    for _ in range(retries + 1):
        try:
            resp = requests.get(SVGVIEWER_API, params=params, timeout=timeout)
            resp.raise_for_status()
            data = resp.json().get("data", [])
            out = []
            for item in data[:limit]:
                out.append(
                    {
                        "id": item.get("id"),
                        "title": item.get("title") or "",
                        "slug": item.get("slug") or "",
                        "author": item.get("author") or "",
                        "collectionId": item.get("collectionId") or "",
                        "pageUrl": f"https://www.svgviewer.dev/s/{item.get('id')}/{item.get('slug')}",
                        "svgUrl": f"https://www.svgviewer.dev/static-svgs/{item.get('id')}/{item.get('slug')}.svg",
                    }
                )
            return out
        except Exception as exc:
            last_exc = exc
            time.sleep(0.4)
    raise last_exc


def main():
    parser = argparse.ArgumentParser(description="Collect SVGViewer candidates for missing icons")
    parser.add_argument("--source", default="/Users/andrey_efremov/Downloads/runs/design/icon_audit_strapi.md")
    parser.add_argument(
        "--overrides",
        default="/Users/andrey_efremov/Downloads/runs/design/svgviewer_term_overrides.json",
    )
    parser.add_argument(
        "--out-json",
        default="/Users/andrey_efremov/Downloads/runs/design/icon_svgviewer_candidates.json",
    )
    parser.add_argument(
        "--out-md",
        default="/Users/andrey_efremov/Downloads/runs/design/icon_svgviewer_candidates.md",
    )
    parser.add_argument("--collection-id", type=int, default=0)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--max-candidates", type=int, default=3)
    parser.add_argument("--sleep", type=float, default=0.4)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument(
        "--log-file",
        default="/Users/andrey_efremov/Downloads/runs/mgts-backend/temp/svgviewer-candidates.log",
    )
    args = parser.parse_args()

    entries = parse_audit_entries(args.source)
    if not entries:
        print("No entries found.")
        return 1

    entries = entries[args.offset :]
    if args.limit and args.limit > 0:
        entries = entries[: args.limit]

    overrides = load_overrides(args.overrides)
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

    out = []
    total = len(entries)
    log(f"Всего к обработке: {total}")

    for idx, entry in enumerate(entries, 1):
        label = entry["label"].strip()
        meaning = extract_meaning(entry["prompt"])
        term = derive_term(label, meaning, entry["prompt"], overrides)
        if not term:
            log(f"[{idx}/{total}] {label} — пропуск (не найден термин)")
            out.append(
                {
                    "label": label,
                    "scope": entry["scope"].strip(),
                    "context": entry["context"].strip(),
                    "path": entry["path"].strip(),
                    "prompt": entry["prompt"].strip(),
                    "meaning": meaning,
                    "term": "",
                    "candidates": [],
                }
            )
            continue

        log(f"[{idx}/{total}] {label} — поиск: {term}")
        try:
            candidates = fetch_candidates(
                term,
                collection_id=args.collection_id or None,
                limit=args.max_candidates,
                timeout=args.timeout,
                retries=args.retries,
            )
            log(f"  найдено: {len(candidates)}")
        except Exception as exc:
            log(f"  ошибка поиска: {exc}")
            candidates = []

        out.append(
            {
                "label": label,
                "scope": entry["scope"].strip(),
                "context": entry["context"].strip(),
                "path": entry["path"].strip(),
                "prompt": entry["prompt"].strip(),
                "meaning": meaning,
                "term": term,
                "candidates": candidates,
            }
        )
        time.sleep(args.sleep)

    Path(args.out_json).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    md_lines = ["# SVGViewer кандидаты", ""]
    for item in out:
        md_lines.append(
            f"- **{item['label']}** — термин `{item['term']}` — путь `{item['path']}`"
        )
        if not item["candidates"]:
            md_lines.append("  - _нет кандидатов_")
            continue
        for cand in item["candidates"]:
            md_lines.append(
                f"  - {cand['title']} | {cand['author']} | {cand['collectionId']} | {cand['pageUrl']} | {cand['svgUrl']}"
            )
        md_lines.append("")

    Path(args.out_md).write_text("\n".join(md_lines).rstrip() + "\n", encoding="utf-8")

    log(f"Готово. JSON: {args.out_json}")
    log(f"Готово. MD: {args.out_md}")
    if log_fp:
        log_fp.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

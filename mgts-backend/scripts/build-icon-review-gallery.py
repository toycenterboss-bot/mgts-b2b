#!/usr/bin/env python3
import argparse
import hashlib
import json
import re
from pathlib import Path


def slugify(text):
    value = re.sub(r"[^\w\s-]", "", text, flags=re.U).strip().lower()
    value = re.sub(r"[\s_-]+", "-", value)
    return value or "icon"


def parse_audit_entries(path):
    content = Path(path).read_text("utf-8")
    entries = []
    for line in content.splitlines():
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


def build_output_path(out_root, scope, label, line):
    scope_slug = slugify(scope.lstrip("/"))
    label_slug = slugify(label)[:60]
    line_hash = hashlib.md5(line.encode("utf-8")).hexdigest()[:8]
    return out_root / scope_slug / f"{label_slug}__{line_hash}.svg"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--icon-root",
        default="/Users/andrey_efremov/Downloads/runs/design/generated_icons/perplexity",
        help="Absolute path to generated icons root",
    )
    args = parser.parse_args()

    root = Path("/Users/andrey_efremov/Downloads/runs")
    source = root / "design" / "icon_audit_strapi.md"
    icon_root = Path(args.icon_root)
    review_dir = icon_root / "_review"
    review_dir.mkdir(parents=True, exist_ok=True)
    base_path = icon_root.relative_to(root).as_posix()

    entries = parse_audit_entries(source)
    items = []
    missing = []
    for entry in entries:
        scope = entry["scope"].strip()
        label = entry["label"].strip()
        meaning = extract_meaning(entry["prompt"])
        out_file = build_output_path(icon_root, scope, label, entry["line"])
        rel_path = out_file.relative_to(icon_root) if out_file.exists() else None
        if not rel_path:
            missing.append(
                {
                    "scope": scope,
                    "label": label,
                    "meaning": meaning,
                    "expected_path": str(out_file),
                }
            )
            continue
        items.append(
            {
                "scope": scope,
                "label": label,
                "meaning": meaning,
                "path": str(rel_path),
                "source": entry["path"],
            }
        )

    data_path = review_dir / "review-data.json"
    data_path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")

    missing_path = review_dir / "review-missing.json"
    missing_path.write_text(json.dumps(missing, ensure_ascii=False, indent=2), encoding="utf-8")

    html_path = review_dir / "index.html"
    html_path.write_text(
        """<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Icon Review</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: #0b1020; color: #e6edf3; }
    header { position: sticky; top: 0; background: #0f172a; padding: 12px 16px; box-shadow: 0 1px 0 rgba(255,255,255,0.08); z-index: 10; }
    input { width: 280px; max-width: 70vw; padding: 8px 10px; border-radius: 8px; border: 1px solid #334155; background: #111827; color: #e6edf3; }
    .meta { font-size: 12px; color: #94a3b8; margin-left: 12px; }
    .actions { margin-left: auto; display: flex; gap: 8px; }
    button { padding: 8px 12px; border-radius: 8px; border: 1px solid #334155; background: #111827; color: #e6edf3; cursor: pointer; }
    main { padding: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .card { background: #0f172a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; }
    .icon { width: 96px; height: 96px; margin-bottom: 8px; color: #f8fafc; }
    .label { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .meaning { font-size: 12px; color: #94a3b8; }
    .scope { font-size: 11px; color: #64748b; margin-top: 6px; }
    .flag { margin-top: 8px; font-size: 12px; }
    .flag input { margin-right: 6px; }
    .bad { outline: 2px solid #ef4444; }
  </style>
</head>
<body>
  <header>
    <div style="display:flex; align-items:center; gap:12px;">
      <input id="search" placeholder="Фильтр по тексту…" />
      <div class="meta" id="meta"></div>
      <div class="actions">
        <button id="copyBad">Скопировать список слабых</button>
        <button id="clearBad">Очистить метки</button>
      </div>
    </div>
  </header>
  <main>
    <div class="grid" id="grid"></div>
  </main>
  <script>
    const ITEMS = __ITEMS__;
    const BASE_PATH = __BASE_PATH__;
    const grid = document.getElementById('grid');
    const meta = document.getElementById('meta');
    const search = document.getElementById('search');
    const badKey = 'icon-review-bad';

    function getBadSet() {
      try { return new Set(JSON.parse(localStorage.getItem(badKey) || '[]')); } catch { return new Set(); }
    }
    function saveBadSet(set) {
      localStorage.setItem(badKey, JSON.stringify(Array.from(set)));
    }

    const bad = getBadSet();
    function render(filter = '') {
      const q = filter.trim().toLowerCase();
      grid.innerHTML = '';
      let shown = 0;
      for (const item of ITEMS) {
        const hay = (item.label + ' ' + item.meaning + ' ' + item.scope).toLowerCase();
        if (q && !hay.includes(q)) continue;
        shown += 1;
        const card = document.createElement('div');
        card.className = 'card' + (bad.has(item.path) ? ' bad' : '');
        const img = document.createElement('img');
        img.src = '../' + item.path;
        img.className = 'icon';
        img.alt = item.label;
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = item.label;
        const meaning = document.createElement('div');
        meaning.className = 'meaning';
        meaning.textContent = item.meaning;
        const scope = document.createElement('div');
        scope.className = 'scope';
        scope.textContent = item.scope;
        const flag = document.createElement('label');
        flag.className = 'flag';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = bad.has(item.path);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) bad.add(item.path);
          else bad.delete(item.path);
          saveBadSet(bad);
          card.classList.toggle('bad', checkbox.checked);
        });
        flag.appendChild(checkbox);
        flag.appendChild(document.createTextNode('Слабая/на переработку'));
        card.appendChild(img);
        card.appendChild(label);
        card.appendChild(meaning);
        card.appendChild(scope);
        card.appendChild(flag);
        grid.appendChild(card);
      }
      meta.textContent = `Показано: ${shown} / ${ITEMS.length}`;
    }
    render();
    search.addEventListener('input', () => render(search.value));
    document.getElementById('copyBad').addEventListener('click', () => {
      const list = Array.from(getBadSet()).map(p => `${BASE_PATH}/${p}`);
      navigator.clipboard.writeText(list.join('\\n'));
      alert(`Скопировано: ${list.length}`);
    });
    document.getElementById('clearBad').addEventListener('click', () => {
      localStorage.removeItem(badKey);
      render(search.value);
    });
  </script>
</body>
</html>
"""
        .replace("__ITEMS__", json.dumps(items, ensure_ascii=False))
        .replace("__BASE_PATH__", json.dumps(base_path, ensure_ascii=False)),
        encoding="utf-8",
    )

    print("review html:", html_path)
    print("review data:", data_path)
    print("missing data:", missing_path)


if __name__ == "__main__":
    main()

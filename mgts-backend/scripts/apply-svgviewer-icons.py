#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
import json
import os
import re
import time
from collections import Counter, defaultdict
from pathlib import Path

import requests
try:
    from svgpathtools import svg2paths2
except Exception:  # pragma: no cover - optional dependency
    svg2paths2 = None


SYSTEM_FIELDS = {"id", "documentId", "createdAt", "updatedAt", "publishedAt", "locale"}
LABEL_KEYS = ("title", "label", "name", "text", "value", "heading")


def normalize_label(text):
    raw = re.sub(r"[^\w\s-]+", " ", str(text or "").lower(), flags=re.U)
    return re.sub(r"\s+", " ", raw).strip()


def get_label(obj):
    if not isinstance(obj, dict):
        return ""
    for key in LABEL_KEYS:
        val = obj.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def parse_path(path):
    if not path:
        return []
    parts = [p.strip() for p in path.split(".") if p.strip()]
    out = []
    for part in parts:
        out.append(part.replace("[]", ""))
    if out and out[0] == "navigation":
        out = out[1:]
    return out


def apply_icon_by_path(root, path, target_label, icon_id, force=False):
    tokens = parse_path(path)
    if not tokens:
        return False
    target_norm = normalize_label(target_label)
    changed = False

    def walk(node, idx, label_ctx):
        nonlocal changed
        if node is None:
            return
        if isinstance(node, dict):
            label = get_label(node)
            if label:
                label_ctx = label
            if idx == len(tokens) - 1:
                field = tokens[idx]
                current = node.get(field)
                if normalize_label(label_ctx) != target_norm:
                    return
                if not force:
                    if isinstance(current, dict) and current.get("id"):
                        return
                    if isinstance(current, int) and current:
                        return
                node[field] = icon_id
                changed = True
                return
            field = tokens[idx]
            child = node.get(field)
            if isinstance(child, list):
                for item in child:
                    walk(item, idx + 1, label_ctx)
            else:
                walk(child, idx + 1, label_ctx)
        elif isinstance(node, list):
            for item in node:
                walk(item, idx, label_ctx)

    walk(root, 0, "")
    return changed


def load_token():
    token = os.environ.get("STRAPI_API_TOKEN", "").strip()
    if token:
        return token
    env_path = Path("/Users/andrey_efremov/Downloads/runs/mgts-backend/.env")
    if env_path.exists():
        for line in env_path.read_text("utf-8").splitlines():
            if line.startswith("STRAPI_API_TOKEN="):
                return line.split("=", 1)[1].strip()
    return ""


def api_get(url, params=None, headers=None, timeout=40):
    resp = requests.get(url, params=params, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def api_post(url, payload=None, headers=None, timeout=40):
    resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
    if not resp.ok:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text}")
    return resp.json()


def api_put(url, payload=None, headers=None, timeout=60):
    resp = requests.put(url, json=payload, headers=headers, timeout=timeout)
    if not resp.ok:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text}")
    return resp.json()


def normalize_icon_relations(node):
    if isinstance(node, dict):
        for key, value in list(node.items()):
            if key == "icon":
                if isinstance(value, dict) and value.get("id"):
                    node[key] = value["id"]
                elif isinstance(value, list):
                    node[key] = [v.get("id") if isinstance(v, dict) else v for v in value]
            else:
                normalize_icon_relations(value)
    elif isinstance(node, list):
        for item in node:
            normalize_icon_relations(item)


def normalize_relations(node):
    if isinstance(node, dict):
        if "__component" not in node and "id" in node and len(node.keys()) <= 3:
            return node.get("id")
        for key, value in list(node.items()):
            node[key] = normalize_relations(value)
        return node
    if isinstance(node, list):
        return [normalize_relations(item) for item in node]
    return node


def strip_ids(node):
    if isinstance(node, dict):
        node.pop("id", None)
        node.pop("documentId", None)
        for value in node.values():
            strip_ids(value)
    elif isinstance(node, list):
        for item in node:
            strip_ids(item)


def download_svg(svg_url, out_path, timeout=40):
    if out_path.exists():
        return out_path
    resp = requests.get(svg_url, timeout=timeout)
    resp.raise_for_status()
    out_path.write_text(resp.text, encoding="utf-8")
    return out_path


def collect_svg_colors(svg_text):
    if not svg_text:
        return set()
    if re.search(r"<(linearGradient|radialGradient|pattern)", svg_text, re.I):
        return {"__gradient__"}
    colors = set()
    for attr in re.findall(r'\b(?:fill|stroke)\s*=\s*"([^"]+)"', svg_text, re.I):
        val = attr.strip().lower()
        if val in ("none", "transparent", "currentcolor"):
            continue
        colors.add(val)
    for style in re.findall(r'\b(?:fill|stroke)\s*:\s*([^;"]+)', svg_text, re.I):
        val = style.strip().lower()
        if val in ("none", "transparent", "currentcolor"):
            continue
        colors.add(val)
    return colors


def is_monochrome_svg(svg_text):
    colors = collect_svg_colors(svg_text)
    if "__gradient__" in colors:
        return False
    return len(colors) <= 1


def recolor_svg_white(svg_text):
    def repl_attr(match):
        attr = match.group(1)
        value = match.group(2).strip().lower()
        if value in ("none", "transparent"):
            return f'{attr}="none"'
        return f'{attr}="#ffffff"'

    def repl_style(match):
        attr = match.group(1)
        value = match.group(2).strip().lower()
        if value in ("none", "transparent"):
            return f"{attr}: none"
        return f"{attr}: #ffffff"

    svg_text = svg_text.replace("currentColor", "#ffffff")
    svg_text = re.sub(r'\b(stroke|fill)\s*=\s*"([^"]+)"', repl_attr, svg_text)
    svg_text = re.sub(r'\b(stroke|fill)\s*:\s*([^;"]+)', repl_style, svg_text)
    return svg_text


def normalize_svg_viewbox(svg_text, target=24):
    if not svg_text or not target:
        return svg_text
    m = re.search(r'viewBox\s*=\s*"([^"]+)"', svg_text, re.I)
    if not m:
        return svg_text
    parts = re.split(r"[ ,]+", m.group(1).strip())
    if len(parts) != 4:
        return svg_text
    try:
        minx, miny, w, h = [float(p) for p in parts]
    except ValueError:
        return svg_text
    if w <= 0 or h <= 0:
        return svg_text
    scale = float(target) / max(w, h)
    new_w = w * scale
    new_h = h * scale
    dx = (float(target) - new_w) / 2.0
    dy = (float(target) - new_h) / 2.0
    transform = f"translate({dx:g} {dy:g}) scale({scale:g}) translate({-minx:g} {-miny:g})"

    svg_text = re.sub(
        r'viewBox\s*=\s*"[^"]+"',
        f'viewBox="0 0 {int(target)} {int(target)}"',
        svg_text,
        count=1,
        flags=re.I,
    )

    m_open = re.search(r"<svg\b[^>]*>", svg_text, re.I)
    if not m_open:
        return svg_text
    open_tag = m_open.group(0)
    if "data-mgts-normalized" in open_tag:
        return svg_text
    new_open = open_tag
    new_open = re.sub(r'\s(width|height)\s*=\s*"[^"]*"', "", new_open, flags=re.I)
    new_open = re.sub(r"\s(width|height)\s*=\s*'[^']*'", "", new_open, flags=re.I)
    if new_open.endswith("/>"):
        new_open = new_open[:-2] + ">"
    new_open = new_open[:-1] + ' data-mgts-normalized="1">'
    svg_text = svg_text[: m_open.start()] + new_open + svg_text[m_open.end() :]
    insert_pos = m_open.start() + len(new_open)
    svg_text = svg_text[:insert_pos] + f'<g transform="{transform}">' + svg_text[insert_pos:]
    svg_text = re.sub(r"</svg>\s*$", "</g></svg>", svg_text, flags=re.I)
    return svg_text


def normalize_svg_bbox(svg_text, target=24, padding=2):
    if not svg_text or not target or svg2paths2 is None:
        return None
    try:
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp.write(svg_text.encode("utf-8"))
            tmp_path = tmp.name
        try:
            paths, _, _ = svg2paths2(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
        if not paths:
            return None
        minx = miny = float("inf")
        maxx = maxy = float("-inf")
        for p in paths:
            try:
                xmin, xmax, ymin, ymax = p.bbox()
            except Exception:
                continue
            minx = min(minx, xmin)
            miny = min(miny, ymin)
            maxx = max(maxx, xmax)
            maxy = max(maxy, ymax)
        if minx == float("inf"):
            return None
        width = maxx - minx
        height = maxy - miny
        if width <= 0 or height <= 0:
            return None
        pad = max(0.0, float(padding))
        inner = float(target) - 2.0 * pad
        if inner <= 0:
            inner = float(target)
            pad = 0.0
        scale = inner / max(width, height)
        new_w = width * scale
        new_h = height * scale
        dx = (float(target) - new_w) / 2.0
        dy = (float(target) - new_h) / 2.0
        transform = f"translate({dx:g} {dy:g}) scale({scale:g}) translate({-minx:g} {-miny:g})"

        m_open = re.search(r"<svg\b[^>]*>", svg_text, re.I)
        if not m_open:
            return None
        open_tag = m_open.group(0)
        if "data-mgts-normalized" in open_tag:
            return svg_text
        if re.search(r'viewBox\s*=\s*"[^"]+"', open_tag, re.I):
            open_tag = re.sub(
                r'viewBox\s*=\s*"[^"]+"',
                f'viewBox="0 0 {int(target)} {int(target)}"',
                open_tag,
                count=1,
                flags=re.I,
            )
        else:
            open_tag = open_tag[:-1] + f' viewBox="0 0 {int(target)} {int(target)}">'
        open_tag = re.sub(r'\s(width|height)\s*=\s*"[^"]*"', "", open_tag, flags=re.I)
        open_tag = re.sub(r"\s(width|height)\s*=\s*'[^']*'", "", open_tag, flags=re.I)
        if open_tag.endswith("/>"):
            open_tag = open_tag[:-2] + ">"
        new_open = open_tag[:-1] + ' data-mgts-normalized="1">'
        svg_text = svg_text[: m_open.start()] + new_open + svg_text[m_open.end() :]
        insert_pos = svg_text.find(new_open) + len(new_open)
        svg_text = svg_text[:insert_pos] + f'<g transform="{transform}">' + svg_text[insert_pos:]
        svg_text = re.sub(r"</svg>\s*$", "</g></svg>", svg_text, flags=re.I)
        return svg_text
    except Exception:
        return None


def normalize_svg(svg_text, target=24, mode="auto", padding=2):
    if not svg_text or not target:
        return svg_text
    mode = (mode or "auto").strip().lower()
    if mode == "bbox":
        out = normalize_svg_bbox(svg_text, target=target, padding=padding)
        return out or normalize_svg_viewbox(svg_text, target=target)
    if mode == "viewbox":
        return normalize_svg_viewbox(svg_text, target=target)
    if svg2paths2 is not None:
        out = normalize_svg_bbox(svg_text, target=target, padding=padding)
        if out:
            return out
    return normalize_svg_viewbox(svg_text, target=target)


def find_uploaded_file(base, name, headers):
    params = {"filters[name][$eq]": name}
    res = api_get(f"{base}/api/upload/files", params=params, headers=headers)
    if isinstance(res, list) and res:
        return res[0].get("id")
    return None


def upload_file(base, path, headers):
    name = path.name
    existing = find_uploaded_file(base, name, headers)
    if existing:
        return existing
    with open(path, "rb") as fh:
        files = {"files": (name, fh, "image/svg+xml")}
        resp = requests.post(f"{base}/api/upload", headers=headers, files=files, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data[0].get("id")


def find_icon(base, name, headers):
    params = {"filters[name][$eq]": name}
    res = api_get(f"{base}/api/icons", params=params, headers=headers)
    data = res.get("data", []) if isinstance(res, dict) else []
    if data:
        return data[0].get("id")
    return None


def create_icon(base, name, label, preview_id, headers):
    payload = {"data": {"name": name, "label": label, "preview": preview_id}}
    res = api_post(f"{base}/api/icons", payload=payload, headers=headers)
    return res.get("data", {}).get("id")


def choose_collection(entries):
    coverage = Counter()
    for entry in entries:
        cids = {c.get("collectionId") for c in entry.get("candidates", []) if c.get("collectionId")}
        for cid in cids:
            coverage[cid] += 1
    if not coverage:
        return None, coverage
    chosen = max(coverage.items(), key=lambda kv: kv[1])[0]
    return chosen, coverage


def select_candidate(entry, preferred_collection):
    candidates = entry.get("candidates") or []
    if not candidates:
        return None
    if preferred_collection:
        for cand in candidates:
            if cand.get("collectionId") == preferred_collection:
                return cand
    return candidates[0]


def select_candidate_for_nav(entry, preferred_collection, download_dir, timeout=40):
    candidates = entry.get("candidates") or []
    if not candidates:
        return None, None
    Path(download_dir).mkdir(parents=True, exist_ok=True)
    ordered = candidates[:]
    if preferred_collection:
        ordered = sorted(
            candidates,
            key=lambda c: 0 if c.get("collectionId") == preferred_collection else 1,
        )
    best = None
    best_path = None
    for cand in ordered:
        cid = cand.get("id")
        slug = cand.get("slug") or "icon"
        file_name = f"svgviewer_{cid}_{slug}.svg"
        local_path = Path(download_dir) / file_name
        try:
            download_svg(cand.get("svgUrl"), local_path, timeout=timeout)
            svg_text = local_path.read_text("utf-8", errors="ignore")
            if is_monochrome_svg(svg_text):
                return cand, local_path
            if not best:
                best = cand
                best_path = local_path
        except Exception:
            continue
    return best, best_path


def main():
    parser = argparse.ArgumentParser(description="Apply SVGViewer icons into Strapi content")
    parser.add_argument(
        "--candidates",
        default="/Users/andrey_efremov/Downloads/runs/design/icon_svgviewer_candidates.json",
    )
    parser.add_argument(
        "--selected-json",
        default="/Users/andrey_efremov/Downloads/runs/design/icon_svgviewer_selected.json",
    )
    parser.add_argument(
        "--selected-md",
        default="/Users/andrey_efremov/Downloads/runs/design/icon_svgviewer_selected.md",
    )
    parser.add_argument(
        "--download-dir",
        default="/Users/andrey_efremov/Downloads/runs/design/svgviewer_selected",
    )
    parser.add_argument("--base", default="http://localhost:1337")
    parser.add_argument("--collection-id", type=int, default=0)
    parser.add_argument("--nav-only", action="store_true")
    parser.add_argument("--pages-only", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--normalize-viewbox", type=int, default=24)
    parser.add_argument("--normalize-mode", type=str, default="auto")
    parser.add_argument("--bbox-padding", type=float, default=2.0)
    parser.add_argument("--name-suffix", type=str, default="")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--log-file", default="/Users/andrey_efremov/Downloads/runs/mgts-backend/temp/svgviewer-apply.log")
    args = parser.parse_args()

    token = load_token()
    if not token:
        print("STRAPI_API_TOKEN not found in env or .env")
        return 1
    headers = {"Authorization": f"Bearer {token}"}

    entries = json.loads(Path(args.candidates).read_text("utf-8"))
    if args.offset:
        entries = entries[args.offset :]
    if args.limit and args.limit > 0:
        entries = entries[: args.limit]

    preferred_collection = args.collection_id or None
    auto_collection = None
    coverage = Counter()
    if not preferred_collection:
        auto_collection, coverage = choose_collection(entries)
        preferred_collection = auto_collection

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

    log(f"Всего к обработке: {len(entries)}")
    if preferred_collection:
        log(f"Коллекция (стиль) выбрана: {preferred_collection}")
    elif coverage:
        log(f"Коллекция (стиль) не определена, доступно: {dict(coverage)}")

    if args.nav_only and args.pages_only:
        print("Use only one of --nav-only or --pages-only.")
        return 1

    selected = []
    for entry in entries:
        if args.nav_only and entry.get("scope") != "navigation":
            continue
        if args.pages_only and entry.get("scope") == "navigation":
            continue
        if entry.get("scope") == "navigation":
            cand, local_path = select_candidate_for_nav(
                entry, preferred_collection, args.download_dir
            )
            payload = {**entry, "selected": cand}
            if local_path:
                payload["selectedPath"] = str(local_path)
            selected.append(payload)
        else:
            cand = select_candidate(entry, preferred_collection)
            selected.append({**entry, "selected": cand})

    Path(args.selected_json).write_text(json.dumps(selected, ensure_ascii=False, indent=2), encoding="utf-8")

    md_lines = ["# SVGViewer выбранные кандидаты", ""]
    for item in selected:
        cand = item.get("selected")
        md_lines.append(
            f"- **{item['label']}** — путь `{item['path']}` — термин `{item.get('term')}`"
        )
        if not cand:
            md_lines.append("  - _нет кандидата_")
            continue
        md_lines.append(
            f"  - {cand.get('title')} | {cand.get('author')} | {cand.get('collectionId')} | {cand.get('pageUrl')} | {cand.get('svgUrl')}"
        )
    Path(args.selected_md).write_text("\n".join(md_lines).rstrip() + "\n", encoding="utf-8")

    download_dir = Path(args.download_dir)
    download_dir.mkdir(parents=True, exist_ok=True)

    candidate_to_icon = {}
    candidate_to_file = {}
    size_tag = str(args.normalize_viewbox).strip() if args.normalize_viewbox else ""
    suffix = (args.name_suffix or "").strip()
    base_prefix = (
        f"svgviewer_{size_tag}{suffix}_"
        if size_tag
        else f"svgviewer_{suffix}_" if suffix else "svgviewer_"
    )
    nav_prefix = (
        f"svgviewer_nav{size_tag}{suffix}_"
        if size_tag
        else f"svgviewer_nav{suffix}_" if suffix else "svgviewer_nav_"
    )
    file_tag = f"{size_tag}{suffix}" if (size_tag or suffix) else ""
    file_tag = f"{file_tag}_" if file_tag else ""

    for idx, item in enumerate(selected, 1):
        cand = item.get("selected")
        if not cand:
            continue
        cid = cand.get("id")
        slug = cand.get("slug") or "icon"
        file_name = f"svgviewer_{cid}_{slug}.svg"
        local_path = (
            Path(item["selectedPath"])
            if item.get("selectedPath")
            else download_dir / file_name
        )
        if cid not in candidate_to_file:
            log(f"[DL {idx}/{len(selected)}] {item['label']} — {cand.get('title')} ({cid})")
            try:
                download_svg(cand.get("svgUrl"), local_path)
            except Exception as exc:
                log(f"  ошибка загрузки: {exc}")
                continue
            candidate_to_file[cid] = local_path

    # Upload + create icons
    for idx, item in enumerate(selected, 1):
        cand = item.get("selected")
        if not cand:
            continue
        cid = cand.get("id")
        nav_white = item.get("scope") == "navigation"
        icon_key = f"{cid}:{'nav' if nav_white else 'page'}"
        if icon_key in candidate_to_icon:
            continue
        local_path = candidate_to_file.get(cid)
        if not local_path:
            continue
        icon_name = f"{base_prefix}{cid}_{cand.get('slug') or 'icon'}"
        if nav_white:
            icon_name = f"{nav_prefix}{cid}_{cand.get('slug') or 'icon'}"
        existing_icon_id = find_icon(args.base, icon_name, headers)
        if existing_icon_id:
            candidate_to_icon[icon_key] = existing_icon_id
            continue
        log(f"[UP {idx}/{len(selected)}] {item['label']} — {icon_name}")
        try:
            svg_text = local_path.read_text("utf-8", errors="ignore")
            if nav_white:
                svg_text = recolor_svg_white(svg_text)
            svg_text = normalize_svg(
                svg_text,
                target=args.normalize_viewbox,
                mode=args.normalize_mode,
                padding=args.bbox_padding,
            )
            if nav_white or args.normalize_viewbox:
                prefix = f"nav{file_tag}" if nav_white else f"norm{file_tag}"
                upload_path = local_path.with_name(f"{prefix}{local_path.name}")
                upload_path.write_text(svg_text, encoding="utf-8")
                upload_id = upload_file(args.base, upload_path, headers)
            else:
                upload_id = upload_file(args.base, local_path, headers)
            icon_id = create_icon(args.base, icon_name, cand.get("title") or icon_name, upload_id, headers)
            candidate_to_icon[icon_key] = icon_id
        except Exception as exc:
            log(f"  ошибка загрузки/создания иконки: {exc}")

    # Build assignments
    assignments = []
    for item in selected:
        cand = item.get("selected")
        if not cand:
            continue
        scope_key = "nav" if item.get("scope") == "navigation" else "page"
        icon_id = candidate_to_icon.get(f"{cand.get('id')}:{scope_key}")
        if not icon_id:
            continue
        assignments.append(
            {
                "scope": item["scope"],
                "label": item["label"],
                "path": item["path"],
                "icon_id": icon_id,
            }
        )

    # Update navigation
    nav_assignments = [a for a in assignments if a["scope"] == "navigation"]
    if nav_assignments:
        log(f"Навигация: {len(nav_assignments)}")
        nav_params = {
            "populate[mainMenuItems][populate]": "*",
            "populate[megaMenus][populate]": "*",
            "populate[deepNavTrees][populate]": "*",
            "populate[megaMenuCta][populate]": "*",
        }
        try:
            nav = api_get(f"{args.base}/api/navigation", params=nav_params, headers=headers).get("data")
            nav_changed = False
            for item in nav_assignments:
                nav_changed |= apply_icon_by_path(
                    nav, item["path"], item["label"], item["icon_id"], force=args.force
                )
            if nav_changed:
                payload = {
                    "data": {
                        "mainMenuItems": nav.get("mainMenuItems"),
                        "megaMenus": nav.get("megaMenus"),
                        "megaMenuCta": nav.get("megaMenuCta"),
                        "deepNavTrees": nav.get("deepNavTrees"),
                    }
                }
                normalize_icon_relations(payload)
                payload = normalize_relations(payload)
                strip_ids(payload)
                api_put(f"{args.base}/api/navigation", payload=payload, headers=headers)
                log("Навигация обновлена.")
            else:
                log("Навигация: изменений нет.")
        except Exception as exc:
            log(f"Навигация: ошибка обновления: {exc}")

    # Update pages
    page_assignments = defaultdict(list)
    for item in assignments:
        scope = item["scope"]
        if scope == "navigation":
            continue
        slug = scope.lstrip("/")
        page_assignments[slug].append(item)

    for slug, items in page_assignments.items():
        log(f"Страница {slug}: {len(items)}")
        params = {
            "filters[slug][$eq]": slug,
            "populate[sections][populate]": "*",
        }
        res = api_get(f"{args.base}/api/pages", params=params, headers=headers)
        data = res.get("data", [])
        if not data:
            log(f"  страница не найдена: {slug}")
            continue
        page = data[0]
        page_id = page.get("documentId") or page.get("id")
        changed = False
        for item in items:
            changed |= apply_icon_by_path(
                page, item["path"], item["label"], item["icon_id"], force=args.force
            )
        if not changed:
            log("  изменений нет.")
            continue
        payload = {"data": {"sections": page.get("sections")}}
        normalize_icon_relations(payload)
        payload = normalize_relations(payload)
        strip_ids(payload)
        try:
            api_put(f"{args.base}/api/pages/{page_id}", payload=payload, headers=headers)
            log("  обновлено.")
        except Exception as exc:
            log(f"  ошибка обновления: {exc}")

    log(f"Готово. Выбор: {args.selected_json}")
    log(f"Готово. Список: {args.selected_md}")
    if log_fp:
        log_fp.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

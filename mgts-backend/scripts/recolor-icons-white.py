#!/usr/bin/env python3
import re
from pathlib import Path


def recolor_svg(svg_text):
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


def main():
    src_root = Path("/Users/andrey_efremov/Downloads/runs/design/generated_icons/perplexity")
    out_root = Path("/Users/andrey_efremov/Downloads/runs/design/generated_icons/perplexity_white")
    out_root.mkdir(parents=True, exist_ok=True)

    total = 0
    changed = 0
    for svg_path in src_root.rglob("*.svg"):
        total += 1
        rel = svg_path.relative_to(src_root)
        out_path = out_root / rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        original = svg_path.read_text("utf-8", errors="ignore")
        recolored = recolor_svg(original)
        if recolored != original:
            changed += 1
        out_path.write_text(recolored, encoding="utf-8")

    print(f"total: {total}")
    print(f"changed: {changed}")
    print(f"output: {out_root}")


if __name__ == "__main__":
    main()

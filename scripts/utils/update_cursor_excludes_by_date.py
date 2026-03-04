#!/usr/bin/env python3
"""
Update .cursorignore and .vscode/settings.json with auto-excludes
for directories that have not changed since a cutoff date.
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Iterable


AUTO_BEGIN = "# BEGIN AUTO EXCLUDE BY DATE"
AUTO_END = "# END AUTO EXCLUDE BY DATE"
AUTO_HINT = "# (managed by scripts/utils/update_cursor_excludes_by_date.py)"

PRUNE_DIR_NAMES = {
    "node_modules",
    "dist",
    "build",
    ".next",
    "out",
    "coverage",
    ".cache",
    ".turbo",
    ".git",
    ".dev",
    "tmp",
    "backups",
    "strapi-backups",
}

IGNORE_FILE_SUFFIXES = (".log", ".pid", ".tmp")
IGNORE_FILE_NAMES = {".DS_Store"}


def parse_args() -> argparse.Namespace:
    default_cutoff = f"{datetime.now().year}-01-12"
    parser = argparse.ArgumentParser(description="Update Cursor excludes by date.")
    parser.add_argument(
        "--cutoff",
        default=default_cutoff,
        help="Cutoff date (YYYY-MM-DD). Default: %(default)s",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=3,
        help="Max directory depth to consider (relative to repo root). Default: %(default)s",
    )
    return parser.parse_args()


def is_real_file(path: Path) -> bool:
    if path.name in IGNORE_FILE_NAMES:
        return False
    if path.suffix in IGNORE_FILE_SUFFIXES:
        return False
    return True


def should_prune(dir_path: Path) -> bool:
    return dir_path.name in PRUNE_DIR_NAMES


def iter_candidate_dirs(root: Path, max_depth: int) -> Iterable[Path]:
    for dirpath, dirnames, _filenames in os.walk(root):
        current = Path(dirpath)
        rel = current.relative_to(root)
        depth = len(rel.parts)
        if depth == 0:
            # root
            pass
        if depth > max_depth:
            dirnames[:] = []
            continue
        dirnames[:] = [d for d in dirnames if d not in PRUNE_DIR_NAMES]
        if depth > 0:
            yield current


def is_stale_dir(dir_path: Path, cutoff_ts: float) -> bool:
    has_files = False
    for dirpath, dirnames, filenames in os.walk(dir_path):
        current = Path(dirpath)
        dirnames[:] = [d for d in dirnames if d not in PRUNE_DIR_NAMES]
        for name in filenames:
            fpath = current / name
            if not is_real_file(fpath):
                continue
            has_files = True
            try:
                if fpath.stat().st_mtime > cutoff_ts:
                    return False
            except FileNotFoundError:
                continue
    return has_files


def normalize_glob(path: Path, root: Path) -> str:
    rel = path.relative_to(root).as_posix()
    return f"{rel}/**"


def update_cursorignore(root: Path, globs: list[str]) -> None:
    cursorignore = root / ".cursorignore"
    text = cursorignore.read_text(encoding="utf-8")
    block = "\n".join([AUTO_BEGIN, AUTO_HINT] + globs + [AUTO_END])
    if AUTO_BEGIN in text and AUTO_END in text:
        prefix = text.split(AUTO_BEGIN)[0].rstrip("\n")
        suffix = text.split(AUTO_END)[1].lstrip("\n")
        new_text = f"{prefix}\n{block}\n{suffix}".rstrip() + "\n"
    else:
        new_text = text.rstrip() + "\n\n" + block + "\n"
    cursorignore.write_text(new_text, encoding="utf-8")


def update_settings_json(root: Path, globs: list[str]) -> None:
    settings_path = root / ".vscode" / "settings.json"
    data = json.loads(settings_path.read_text(encoding="utf-8"))

    prev_globs = data.get("cursor.autoExcludeByDate", [])
    for key in ("search.exclude", "files.watcherExclude", "files.exclude"):
        mapping = data.get(key, {})
        for g in prev_globs:
            mapping.pop(g, None)
        for g in globs:
            mapping[g] = True
        data[key] = mapping

    data["cursor.autoExcludeByDate"] = globs
    settings_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    cutoff = datetime.strptime(args.cutoff, "%Y-%m-%d")
    cutoff_ts = cutoff.timestamp()

    root = Path(__file__).resolve().parents[2]
    candidates = list(iter_candidate_dirs(root, args.max_depth))
    stale_dirs = [d for d in candidates if is_stale_dir(d, cutoff_ts)]
    globs = sorted({normalize_glob(d, root) for d in stale_dirs})

    update_cursorignore(root, globs)
    update_settings_json(root, globs)

    print(f"Updated excludes: {len(globs)} paths (cutoff {args.cutoff})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


#!/usr/bin/env python3
"""
Create a clean, versioned snapshot of page-analysis-llm outputs.

We keep the original directory intact (it may contain large chrome profiles, caches, etc).
Snapshot includes only:
- *_spec.json
- *_tabs_content.json
- *_extracted_file_links.json
- *_files/ directories (downloaded files)
- COLLECTION_*.{md,json}, HOME_MENU.{md,json}, _spec_slugs.txt (if present)

Usage:
  python3 scripts/page_analysis/create_snapshot.py \
    --src mgts-backend/temp/page-analysis-llm \
    --dst mgts-backend/data/page-analysis-llm/branches/2026-01-22
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


KEEP_FILENAMES = {
    "_spec_slugs.txt",
    "COLLECTION_SUMMARY.md",
    "COLLECTION_TREE.md",
    "COLLECTION_TREE.json",
    "HOME_MENU.md",
    "HOME_MENU.json",
}


def should_copy_file(p: Path) -> bool:
    name = p.name
    if name in KEEP_FILENAMES:
        return True
    if name.endswith("_spec.json"):
        return True
    if name.endswith("_tabs_content.json"):
        return True
    if name.endswith("_extracted_file_links.json"):
        return True
    return False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="Source directory (page-analysis-llm)")
    ap.add_argument("--dst", required=True, help="Destination snapshot directory")
    args = ap.parse_args()

    src = Path(args.src).resolve()
    dst = Path(args.dst).resolve()

    if not src.exists() or not src.is_dir():
        raise SystemExit(f"Source dir not found: {src}")

    dst.mkdir(parents=True, exist_ok=True)

    copied_files = 0
    copied_dirs = 0

    # Copy selected files
    for p in src.iterdir():
        if p.is_file() and should_copy_file(p):
            shutil.copy2(p, dst / p.name)
            copied_files += 1

    # Copy *_files directories (downloaded assets)
    for p in src.iterdir():
        if p.is_dir() and p.name.endswith("_files"):
            target = dst / p.name
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(p, target)
            copied_dirs += 1

    print("✅ Snapshot created")
    print("  src:", src)
    print("  dst:", dst)
    print("  copied_files:", copied_files)
    print("  copied_dirs:", copied_dirs)
    print("\nNext:")
    print(f'  export MGTS_PAGE_ANALYSIS_DIR="{dst}"')


if __name__ == "__main__":
    main()


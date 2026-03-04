#!/usr/bin/env python3
"""
Optional semantic cross-check using Perplexity API.

Writes: docs/project/PERPLEXITY_CROSSCHECK.md

Notes:
- Will read PERPLEXITY_API_KEY from env if available.
- Keys must NOT be stored in the repository. Use env only.
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import urllib.request


ROOT = Path(__file__).resolve().parents[2]
DOCS_PROJECT_DIR = ROOT / "docs" / "project"
_page_analysis_env = os.environ.get("MGTS_PAGE_ANALYSIS_DIR", "").strip()
PAGE_ANALYSIS_DIR = Path(_page_analysis_env).expanduser() if _page_analysis_env else None
if PAGE_ANALYSIS_DIR is None or not PAGE_ANALYSIS_DIR.exists():
    candidate = ROOT / "mgts-backend" / "data" / "page-analysis-llm"
    if candidate.exists():
        branches = candidate / "branches"
        if branches.exists():
            branch_dirs = sorted([p for p in branches.iterdir() if p.is_dir()], key=lambda p: p.name)
            PAGE_ANALYSIS_DIR = branch_dirs[-1] if branch_dirs else candidate
        else:
            PAGE_ANALYSIS_DIR = candidate
    else:
        PAGE_ANALYSIS_DIR = ROOT / "mgts-backend" / "temp" / "page-analysis-llm"

OUT_MD = DOCS_PROJECT_DIR / "PERPLEXITY_CROSSCHECK.md"


@dataclass(frozen=True)
class CrosscheckTarget:
    route: str
    spec_path: Optional[Path]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_json(path: Path) -> Any:
    return json.loads(read_text(path))


def extract_key_from_context_md(context_md: str) -> Optional[str]:
    # The file contains:
    # ## Perplexity API Token
    # ```
    # pplx-....
    # ```
    m = re.search(r"##\s+Perplexity API Token[\s\S]*?```[\r\n]+([^`\r\n]+)[\r\n]+```", context_md)
    if not m:
        return None
    key = m.group(1).strip()
    if key.startswith("pplx-"):
        return key
    return None


def get_api_key() -> str:
    env = os.getenv("PERPLEXITY_API_KEY")
    if env and env.strip():
        return env.strip()
    raise RuntimeError("PERPLEXITY_API_KEY not found in env. Set it before running this script.")


def summarize_spec(spec: Dict[str, Any]) -> Dict[str, Any]:
    page = spec.get("page", {}) or {}
    meta = spec.get("metadata", {}) or {}
    sections = spec.get("sections", []) or []
    types: List[str] = []
    for s in sections:
        t = (s or {}).get("type")
        if isinstance(t, str):
            types.append(t)
    hero = None
    for s in sections:
        if (s or {}).get("type") == "hero":
            hero = {
                "title": s.get("title"),
                "subtitle": s.get("subtitle"),
                "text": s.get("text"),
            }
            break
    return {
        "pathname": page.get("pathname"),
        "slug": page.get("slug"),
        "title": meta.get("title"),
        "hero": hero,
        "sectionTypes": types[:20],
    }


def call_perplexity(model: str, messages: List[Dict[str, str]], api_key: str) -> str:
    url = "https://api.perplexity.ai/chat/completions"
    body = json.dumps(
        {
            "model": model,
            "messages": messages,
            "temperature": 0,
            "max_tokens": 400,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return (((data.get("choices") or [{}])[0].get("message") or {}).get("content")) or ""


def main() -> None:
    api_key = get_api_key()

    targets: List[CrosscheckTarget] = [
        CrosscheckTarget("/virtual_ate", PAGE_ANALYSIS_DIR / "virtual_ate_spec.json"),
        CrosscheckTarget("/partners/creating_work_order", PAGE_ANALYSIS_DIR / "partners_creating_work_order_spec.json"),
        CrosscheckTarget("/partners/all_services", PAGE_ANALYSIS_DIR / "developers_all_services_spec.json"),
    ]

    template_options = {
        "TPL_Service": "страница услуги (hero + преимущества/тарифы/FAQ + лид-форма)",
        "TPL_Form_Page": "страница формы (опрос/обратная связь/заявка + file upload)",
        "TPL_Segment_Landing": "страница сегмента/каталога услуг (hero сегмента + карточки/сценарии)",
        "TPL_Doc_Page": "контентная/документная страница (текст, файлы, табы документов, сайдбар)",
        "TPL_News_List": "листинг новостей/акций (карточки + пагинация/фильтры)",
        "UNKNOWN": "не подходит ни один / требуется новый шаблон",
    }

    lines: List[str] = []
    lines.append("# Perplexity cross-check (spot check)\n\n")
    lines.append("Это **опциональная** проверка: Perplexity подсказывает вероятный шаблон по структуре `*_spec.json`.\n\n")
    lines.append("| Route | Spec | Suggested template | Rationale |\n")
    lines.append("|---|---|---|---|\n")

    for t in targets:
        spec_name = ""
        spec_summary = None
        if t.spec_path and t.spec_path.exists():
            spec_name = t.spec_path.name
            spec_summary = summarize_spec(load_json(t.spec_path))

        system = (
            "Ты помощник по информационной архитектуре сайта. "
            "Нужно выбрать ОДИН наиболее подходящий шаблон из списка для данной страницы."
        )
        user = {
            "route": t.route,
            "templateOptions": template_options,
            "specSummary": spec_summary,
            "outputFormat": {
                "template": "one of keys in templateOptions",
                "rationale": "one short sentence in Russian",
            },
        }

        content = call_perplexity(
            model="sonar",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
            ],
            api_key=api_key,
        ).strip()

        # Best-effort parse: look for `template: ...`
        suggested = "UNKNOWN"
        rationale = content.replace("\n", " ").strip()
        m = re.search(r'"template"\s*:\s*"([^"]+)"', content)
        if m:
            suggested = m.group(1)
        else:
            # fallback: search for any known template token in free-form output
            for key in template_options.keys():
                if key != "UNKNOWN" and key in content:
                    suggested = key
                    break
        lines.append(f"| `{t.route}` | `{spec_name}` | `{suggested}` | {rationale} |\n")

    OUT_MD.write_text("".join(lines), encoding="utf-8")
    print(OUT_MD.relative_to(ROOT))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


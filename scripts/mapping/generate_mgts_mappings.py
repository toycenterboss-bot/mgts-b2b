#!/usr/bin/env python3
"""
Generate mapping docs for MGTS new site:
1) PAGE_BLOCK_MAPPING.md: routes/templates -> ordered Stitch HTML blocks
2) PAGE_CONTENT_MAPPING.md: routes -> content source (old page spec) -> suggested CMS fields
3) STRAPI_SCHEMA_GAP_ANALYSIS.md: compare desired model vs current Strapi schemas (legacy)
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


ROOT = Path(__file__).resolve().parents[2]

DOCS_PROJECT_DIR = ROOT / "docs" / "project"
DESIGN_PAGES_DIR = ROOT / "design" / "html_pages"

_page_analysis_env = os.environ.get("MGTS_PAGE_ANALYSIS_DIR", "").strip()
PAGE_ANALYSIS_DIR = Path(_page_analysis_env).expanduser() if _page_analysis_env else None

if PAGE_ANALYSIS_DIR is None or not PAGE_ANALYSIS_DIR.exists():
    # Prefer versioned snapshots if present, otherwise fall back to legacy temp dir
    candidate = ROOT / "mgts-backend" / "data" / "page-analysis-llm"
    if candidate.exists():
        # If we have branches/, pick the latest YYYY-MM-DD directory by name
        branches = candidate / "branches"
        if branches.exists():
            branch_dirs = sorted([p for p in branches.iterdir() if p.is_dir()], key=lambda p: p.name)
            PAGE_ANALYSIS_DIR = branch_dirs[-1] if branch_dirs else candidate
        else:
            PAGE_ANALYSIS_DIR = candidate
    else:
        PAGE_ANALYSIS_DIR = ROOT / "mgts-backend" / "temp" / "page-analysis-llm"
STRAPI_API_DIR = ROOT / "mgts-backend" / "src" / "api"

STITCH_MISSING_PAGES = DOCS_PROJECT_DIR / "STITCH_MISSING_PAGES.md"
STITCH_TEMPLATE_MAPPING = DOCS_PROJECT_DIR / "STITCH_TEMPLATE_MAPPING.md"
TECHNICAL_TASK = DOCS_PROJECT_DIR / "TECHNICAL_TASK_NEW_SITE.md"

OUT_BLOCK_MAPPING = DOCS_PROJECT_DIR / "PAGE_BLOCK_MAPPING.md"
OUT_CONTENT_MAPPING = DOCS_PROJECT_DIR / "PAGE_CONTENT_MAPPING.md"
OUT_SCHEMA_GAP = DOCS_PROJECT_DIR / "STRAPI_SCHEMA_GAP_ANALYSIS.md"


DATA_STITCH_BLOCK_RE = re.compile(r'data-stitch-block="([^"]+)"')
TPL_HEADER_RE = re.compile(r"^###\s+(TPL_[A-Za-z0-9_]+)\s*$")
ROUTE_BULLET_RE = re.compile(r"^-\s+`(/[^`]+)`\s*$")
READY_PAGE_RE = re.compile(r"^-\s+`(/[^`]+)`\s+→\s+`([^`]+)`\s*$")

# Manual semantic overrides after LLM review (route -> template).
# These routes are present in TECHNICAL_TASK or STITCH_MISSING_PAGES as unclassified/unknown,
# but their intent is clear enough to pre-assign.
MANUAL_TEMPLATE_OVERRIDES: Dict[str, str] = {
    "/virtual_ate": "TPL_Service",
    "/partners/creating_work_order": "TPL_Form_Page",
    "/sitemap": "TPL_Doc_Page",
    "/about": "TPL_Doc_Page",
    "/affiliated_persons": "TPL_Doc_Page",
    "/emission": "TPL_Doc_Page",
    "/essential_facts": "TPL_Doc_Page",
    "/reports": "TPL_Doc_Page",
    "/stocks_reports": "TPL_Doc_Page",
}

SECTION_HINTS = ["business", "operators", "government", "developers", "partners"]


@dataclass(frozen=True)
class RouteInfo:
    route: str
    template: str  # e.g. TPL_Service


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def slugify_route_to_spec_key(route: str) -> str:
    """
    Route -> expected spec key. Example:
      /business/access_internet -> business_access_internet
      / -> home
      /partners/documents -> documents (spec file uses documents_spec.json with pathname /partners/documents)
    """
    if route == "/":
        return "home"
    key = route.strip("/").replace("-", "_").replace("/", "_")
    return key


def parse_stitch_missing_pages(md: str) -> Tuple[Dict[str, List[str]], Dict[str, str]]:
    """
    Returns:
      - routes_by_tpl: TPL_* -> [routes]
      - ready_pages: route -> stitch_page_id (block/page name)
      - unclassified_routes: routes from section "Неклассифицированные страницы"
    """
    routes_by_tpl: Dict[str, List[str]] = {}
    ready_pages: Dict[str, str] = {}
    unclassified: List[str] = []

    lines = md.splitlines()
    section = None
    current_tpl: Optional[str] = None

    for raw in lines:
        line = raw.strip()
        if line.startswith("## "):
            section = line
            current_tpl = None
            continue

        # Section 1: ready full pages
        if section and section.startswith("## 1"):
            # - `/ai-chat` → `ai_assistant_landing_page`
            m = READY_PAGE_RE.match(line)
            if m:
                ready_pages[m.group(1)] = m.group(2)
            continue

        m_tpl = TPL_HEADER_RE.match(line)
        if m_tpl:
            current_tpl = m_tpl.group(1)
            routes_by_tpl.setdefault(current_tpl, [])
            continue

        if current_tpl:
            m_route = ROUTE_BULLET_RE.match(line)
            if m_route:
                routes_by_tpl[current_tpl].append(m_route.group(1))
                continue

        # Section 4: unclassified
        if section and section.startswith("## 4"):
            m_route = ROUTE_BULLET_RE.match(line)
            if m_route:
                unclassified.append(m_route.group(1))

    return routes_by_tpl, ready_pages, unclassified


def extract_routes_from_technical_task(md: str) -> List[str]:
    """
    Best-effort extractor: any backticked `/path` is treated as a route candidate.
    We keep it conservative (must start with `/` and contain only allowed chars).
    """
    candidates = set()
    for m in re.finditer(r"`(/[^`]+)`", md):
        route = m.group(1).strip()
        if not route.startswith("/"):
            continue
        # strip query/hash
        route = route.split("?")[0].split("#")[0]
        if not re.match(r"^/[a-z0-9_/\-]+$", route):
            continue
        candidates.add(route)
    # also pick bare bullets "- /path"
    for line in md.splitlines():
        s = line.strip()
        m2 = re.match(r"^-\s+(/[-a-z0-9_/]+)\s*$", s)
        if m2:
            candidates.add(m2.group(1))
    return sorted(candidates)


def blocks_in_html(path: Path) -> List[str]:
    txt = read_text(path)
    found = DATA_STITCH_BLOCK_RE.findall(txt)
    # keep order, drop immediate duplicates
    ordered: List[str] = []
    for b in found:
        if not ordered or ordered[-1] != b:
            ordered.append(b)
    # de-dupe across page while preserving order
    seen = set()
    uniq: List[str] = []
    for b in ordered:
        if b not in seen:
            uniq.append(b)
            seen.add(b)
    return uniq


def get_tpl_filename(tpl: str) -> str:
    return "tpl_" + tpl.lower().replace("tpl_", "") + ".html"


def index_specs_by_pathname(spec_dir: Path) -> Dict[str, Path]:
    """
    Build pathname -> spec.json path mapping from *_spec.json files.
    """
    out: Dict[str, Path] = {}
    for p in sorted(spec_dir.glob("*_spec.json")):
        try:
            data = json.loads(read_text(p))
        except Exception:
            continue
        pathname = (((data or {}).get("page") or {}).get("pathname")) or None
        if isinstance(pathname, str) and pathname:
            out[pathname] = p
    return out


def summarize_spec_for_mapping(spec_path: Path) -> Dict[str, Any]:
    """
    Extract minimal, stable fields we can safely include in mapping doc.
    """
    data = json.loads(read_text(spec_path))
    page = data.get("page", {}) or {}
    meta = data.get("metadata", {}) or {}
    sections = data.get("sections", []) or []

    section_types: List[str] = []
    for s in sections:
        t = (s or {}).get("type")
        if isinstance(t, str):
            section_types.append(t)

    hero_title = None
    hero_subtitle = None
    for s in sections:
        if (s or {}).get("type") == "hero":
            hero_title = s.get("title") or hero_title
            hero_subtitle = s.get("subtitle") or hero_subtitle
            break

    return {
        "slug": page.get("slug"),
        "pathname": page.get("pathname"),
        "title": meta.get("title"),
        "heroTitle": hero_title,
        "heroSubtitle": hero_subtitle,
        "sectionTypes": section_types,
    }


def read_strapi_schema(path: Path) -> Dict[str, Any]:
    return json.loads(read_text(path))


def schema_fields(schema: Dict[str, Any]) -> Dict[str, str]:
    attrs = schema.get("attributes", {}) or {}
    out: Dict[str, str] = {}
    for k, v in attrs.items():
        if isinstance(v, dict) and "type" in v:
            out[k] = str(v.get("type"))
        else:
            out[k] = "unknown"
    return out


def write_block_mapping(
    routes_by_tpl: Dict[str, List[str]],
    ready_pages: Dict[str, str],
    unclassified_routes: List[str],
    blocks_by_file: Dict[str, List[str]],
    task_routes: List[str],
) -> None:
    lines: List[str] = []
    lines.append("# Маппинг страниц → HTML-блоки (Stitch)\n\n")
    lines.append("Источники:\n")
    lines.append("- `design/html_pages/*.html` (атрибут `data-stitch-block`)\n")
    lines.append("- `docs/project/STITCH_MISSING_PAGES.md` (routes → шаблоны)\n\n")

    lines.append("## 0) Канонический каркас страницы (обязательные элементы) и опциональные обвязки\n\n")
    lines.append("Мы разделяем **layout‑каркас** и **контентные блоки**:\n\n")
    lines.append("- **Канонические (обязательные на каждой странице):**\n")
    lines.append("  - `header` (верхнее меню) + `mega-menu`\n")
    lines.append("  - `breadcrumbs`\n")
    lines.append("  - `footer`\n")
    lines.append("- **Опциональные (обвязки вокруг контента):**\n")
    lines.append("  - `sidebarNav` — всегда **слева**, влияет на всю область контента\n")
    lines.append("  - `ctaForm` — если есть, то **под контентом** и **перед футером**\n\n")
    lines.append("Правило компоновки (инвариант):\n\n")
    lines.append("- Сверху контентная область ограничена `hero` (если у страницы есть hero).\n")
    lines.append("- Слева контентная область может быть ограничена `sidebarNav`.\n")
    lines.append("- Снизу контентная область ограничена `footer`, либо `ctaForm + footer`.\n\n")
    lines.append("Важно: внутри **контентной области справа** допускается **любое количество** блоков (например, для страниц типа `page_ceo_feedback` это может быть hero + контент + видео + форма и т.п.).\n\n")

    lines.append("## 1) Шаблоны (TPL_*) → какие блоки входят\n\n")
    tpl_order = [
        "TPL_Home",
        "TPL_Segment_Landing",
        "TPL_Scenario",
        "TPL_Service",
        "TPL_DeepNav",
        "TPL_News_List",
        "TPL_Contact_Hub",
        "TPL_Form_Page",
        "TPL_Doc_Page",
    ]
    for tpl in tpl_order:
        fn = get_tpl_filename(tpl)
        blocks = blocks_by_file.get(fn, [])
        lines.append(f"### {tpl}\n")
        lines.append(f"- **assembled page**: `{fn}`\n")
        lines.append("- **blocks (order)**:\n")
        if blocks:
            for b in blocks:
                lines.append(f"  - `{b}`\n")
        else:
            lines.append("  - (нет данных — файл не найден или не содержит `data-stitch-block`)\n")

        routes = routes_by_tpl.get(tpl, [])
        if routes:
            lines.append("- **routes**:\n")
            for r in routes:
                lines.append(f"  - `{r}`\n")
        lines.append("\n")

    lines.append("## 2) Готовые полноэкранные страницы (page_*)\n\n")
    # Ready pages from Stitch (not necessarily present as page_*.html, but we should list both)
    for route, stitch_id in sorted(ready_pages.items(), key=lambda x: x[0]):
        # assembled naming convention in our repo
        assembled = {
            "/ai-chat": "tpl_ai_chat.html",
            "/career": "page_career.html",
            "/general_director_message": "page_ceo_feedback.html",
            "/search": "tpl_search_results.html",
            "/contact": "tpl_contact_hub.html",
        }.get(route)
        lines.append(f"### `{route}`\n")
        lines.append(f"- **stitch source**: `{stitch_id}`\n")
        if assembled:
            blocks = blocks_by_file.get(assembled, [])
            lines.append(f"- **assembled page**: `{assembled}`\n")
            lines.append("- **blocks (order)**:\n")
            for b in blocks:
                lines.append(f"  - `{b}`\n")
        else:
            lines.append("- **assembled page**: (не определено)\n")
        lines.append("\n")

    lines.append("## 3) Собранные страницы (файлы в `design/html_pages/`)\n\n")
    for fn in sorted(blocks_by_file.keys()):
        lines.append(f"### `{fn}`\n")
        blocks = blocks_by_file[fn]
        lines.append("- **blocks (order)**:\n")
        for b in blocks:
            lines.append(f"  - `{b}`\n")
        lines.append("\n")

    if unclassified_routes:
        lines.append("## 4) Неклассифицированные страницы (требуют ручной привязки)\n\n")
        for r in sorted(unclassified_routes):
            lines.append(f"- `{r}`\n")
        lines.append("\n")

    if task_routes:
        lines.append("## 5) Все routes из TECHNICAL_TASK_NEW_SITE.md (coverage check)\n\n")
        lines.append("> Это автоматический список для контроля покрытия. Он может содержать routes, которые ещё не собраны/не описаны в Stitch.\n\n")
        for r in task_routes:
            # keep list compact-ish; but still useful
            lines.append(f"- `{r}`\n")
        lines.append("\n")

    OUT_BLOCK_MAPPING.write_text("".join(lines), encoding="utf-8")


def suggested_cms_entity(template: str, route: str) -> str:
    """
    Coarse suggestion only. Final model will likely become block-based Page + dedicated collections.
    """
    if template == "TPL_Service":
        return "api::product.product (или api::page.page + sections)"
    if template == "TPL_News_List":
        return "api::page.page (листинг) + api::news.news (элементы)"
    if template in {"TPL_Home", "TPL_Segment_Landing", "TPL_Scenario", "TPL_Doc_Page", "TPL_Form_Page", "TPL_Contact_Hub"}:
        return "api::page.page"
    return "api::page.page"


def required_fields_by_template() -> Dict[str, List[str]]:
    """
    Human-readable desired fields (not strict schema).
    """
    return {
        "TPL_Home": [
            "seo.title / seo.description",
            "hero.title / hero.subtitle / hero.cta",
            "servicesTabs (категории + карточки)",
            "newsPreview (заголовок, список карточек/слайдер)",
            "footer CTA (если не глобальный)",
        ],
        "TPL_Segment_Landing": [
            "seo.*",
            "segmentHero (variant)",
            "serviceCards / scenarioCards",
            "filters (если есть)",
        ],
        "TPL_Scenario": [
            "seo.*",
            "hero.*",
            "sidebar switcher (menu items)",
            "content panels (per menu item)",
            "FAQ (accordion)",
            "CTA/form",
        ],
        "TPL_Service": [
            "seo.*",
            "hero.*",
            "benefits/cards",
            "tariffs/pricing table + billing toggle",
            "FAQ (accordion)",
            "lead form",
        ],
        "TPL_News_List": [
            "seo.*",
            "hero.title",
            "news list query (category/year/tag)",
            "pagination state (page/perPage)",
        ],
        "TPL_Contact_Hub": [
            "seo.*",
            "locations[] (id, category, title, address, lat, lng, phones, hours)",
        ],
        "TPL_Form_Page": [
            "seo.*",
            "form definition (fields + validation + consent)",
            "submit behavior (integration endpoint)",
        ],
        "TPL_Doc_Page": [
            "seo.*",
            "content header",
            "sidebar menu (optional)",
            "tabs + file list items (name, url, type, size, updatedAt)",
            "document preview (modal or inline) hook",
        ],
        "TPL_DeepNav": [
            "seo.*",
            "hero.* (если применимо)",
            "sidebarNavKey (about|documents|disclosure|...)",
            "contentBlocks[] (упорядоченный список блоков справа от sidebar)",
            "ctaForm (опционально, перед footer)",
        ],
    }


def write_content_mapping(
    routes_by_tpl: Dict[str, List[str]],
    ready_pages: Dict[str, str],
    unclassified_routes: List[str],
    blocks_by_file: Dict[str, List[str]],
    specs_by_pathname: Dict[str, Path],
    task_routes: List[str],
) -> None:
    lines: List[str] = []
    lines.append("# Маппинг страниц → контент → поля CMS (draft)\n\n")
    lines.append("Этот документ **не** полагается на текущие Strapi `schema.json` как на истину.\n")
    lines.append(
        "Источник требований: `docs/project/TECHNICAL_TASK_NEW_SITE.md` + `MGTS_PAGE_ANALYSIS_DIR/*_spec.json` "
        f"(текущее значение: `{PAGE_ANALYSIS_DIR.as_posix()}`).\n\n"
    )
    lines.append("См. также (опционально): `docs/project/PERPLEXITY_CROSSCHECK.md`.\n\n")
    lines.append("## 0) Правила группировки (layout vs content)\n\n")
    lines.append("Для маппинга важно разделять:\n\n")
    lines.append("- **Layout‑каркас (канонический):** header+mega, breadcrumbs, footer.\n")
    lines.append("- **Опциональные обвязки:** `sidebarNav` (слева) и `ctaForm` (снизу перед footer).\n")
    lines.append("- **Контент справа** — это **массив блоков** (`contentBlocks[]`), их может быть сколько угодно.\n\n")
    lines.append("Итого: даже если страница “богатая” (например, как `page_ceo_feedback`), она всё равно описывается как hero + `contentBlocks[]` внутри одного layout‑контейнера (с optional `sidebarNav`/`ctaForm`).\n\n")

    lines.append("## 1) Ожидаемые поля по шаблонам (целевой контракт)\n\n")
    for tpl, fields in required_fields_by_template().items():
        lines.append(f"### {tpl}\n")
        for f in fields:
            lines.append(f"- `{f}`\n")
        lines.append("\n")

    # Build route list (union of Stitch mapping + ready pages + unclassified + technical task)
    template_by_route: Dict[str, str] = {}
    for tpl, routes in routes_by_tpl.items():
        for r in routes:
            template_by_route[r] = tpl
    for r in ready_pages.keys():
        template_by_route.setdefault(r, "READY")
    for r in unclassified_routes:
        template_by_route.setdefault(r, "UNCLASSIFIED")
    for r in task_routes:
        template_by_route.setdefault(r, "UNKNOWN")

    # Apply manual overrides last
    for r, tpl in MANUAL_TEMPLATE_OVERRIDES.items():
        if r in template_by_route:
            template_by_route[r] = tpl

    route_infos: List[RouteInfo] = [RouteInfo(route=r, template=t) for r, t in template_by_route.items()]

    route_infos.sort(key=lambda x: x.route)

    lines.append("## 2) Постраничный маппинг (route → шаблон → источник контента)\n\n")
    lines.append("> Столбец **Status**: `OK` — spec найден; `MISSING_SPEC` — нет *_spec.json; `NEEDS_REVIEW` — вероятно не тот шаблон/контент.\n\n")
    lines.append("| Route | Template | Assembled HTML | Spec source | Status | Suggested CMS entity |\n")
    lines.append("|---|---|---|---|---|---|\n")

    for ri in route_infos:
        route = ri.route
        tpl = ri.template

        assembled = None
        if tpl.startswith("TPL_"):
            assembled = get_tpl_filename(tpl)
        # ready pages we already have assembled under different names
        if route == "/ai-chat":
            assembled = "tpl_ai_chat.html"
        elif route == "/career":
            assembled = "page_career.html"
        elif route == "/general_director_message":
            assembled = "page_ceo_feedback.html"
        elif route == "/search":
            assembled = "tpl_search_results.html"
        elif route == "/contact":
            assembled = "tpl_contact_hub.html"

        spec = specs_by_pathname.get(route)
        status = "OK" if spec else "MISSING_SPEC"
        if tpl in {"UNKNOWN", "UNCLASSIFIED"}:
            status = "NEEDS_REVIEW" if spec else "NEEDS_REVIEW"
        if spec:
            try:
                # If spec filename hints at a different top-level section, mark NEEDS_REVIEW.
                # This catches known misnamed specs (e.g. partners route pointing to developers_* spec file).
                top = route.strip("/").split("/", 1)[0] if route != "/" else "home"
                name = spec.name
                hinted = None
                for h in SECTION_HINTS:
                    if h in name:
                        hinted = h
                        break
                if hinted and top in SECTION_HINTS and hinted != top:
                    status = "NEEDS_REVIEW"
            except Exception:
                status = "NEEDS_REVIEW"
        cms_entity = suggested_cms_entity(tpl, route)

        lines.append(
            f"| `{route}` | `{tpl}` | `{assembled or ''}` | `{spec.name if spec else ''}` | **{status}** | `{cms_entity}` |\n"
        )

    lines.append("\n")

    lines.append("## 3) Краткие выжимки по spec (для контроля семантики)\n\n")
    lines.append("> Это авто‑выжимка. Она помогает увидеть, что мы действительно подцепили нужный spec для route.\n\n")

    for ri in route_infos:
        spec = specs_by_pathname.get(ri.route)
        if not spec:
            continue
        s = summarize_spec_for_mapping(spec)
        stypes = ", ".join(s.get("sectionTypes") or [])
        lines.append(f"### `{ri.route}`\n")
        lines.append(f"- **spec**: `{spec.name}`\n")
        lines.append(f"- **title**: {s.get('title')!r}\n")
        if s.get("heroTitle"):
            lines.append(f"- **heroTitle**: {s.get('heroTitle')!r}\n")
        if s.get("heroSubtitle"):
            lines.append(f"- **heroSubtitle**: {s.get('heroSubtitle')!r}\n")
        lines.append(f"- **sectionTypes**: `{stypes}`\n")
        lines.append("\n")

    OUT_CONTENT_MAPPING.write_text("".join(lines), encoding="utf-8")


def write_schema_gap_analysis() -> None:
    lines: List[str] = []
    lines.append("# Gap analysis: Strapi schema (legacy) vs new Stitch-first блоки\n\n")
    lines.append("Цель: показать, **чего не хватает** текущим Strapi `schema.json` для новой block‑based структуры.\n\n")

    page_schema = read_strapi_schema(STRAPI_API_DIR / "page" / "content-types" / "page" / "schema.json")
    news_schema = read_strapi_schema(STRAPI_API_DIR / "news" / "content-types" / "news" / "schema.json")
    product_schema = read_strapi_schema(STRAPI_API_DIR / "product" / "content-types" / "product" / "schema.json")
    nav_schema = read_strapi_schema(STRAPI_API_DIR / "navigation" / "content-types" / "navigation" / "schema.json")
    footer_schema = read_strapi_schema(STRAPI_API_DIR / "footer" / "content-types" / "footer" / "schema.json")

    lines.append("## 1) Что есть сейчас (кратко)\n\n")
    for name, schema in [
        ("api::page.page", page_schema),
        ("api::news.news", news_schema),
        ("api::product.product", product_schema),
        ("api::navigation.navigation", nav_schema),
        ("api::footer.footer", footer_schema),
    ]:
        fields = schema_fields(schema)
        lines.append(f"### {name}\n")
        lines.append("- **fields**:\n")
        for k in sorted(fields.keys()):
            lines.append(f"  - `{k}`: `{fields[k]}`\n")
        lines.append("\n")

    lines.append("## 2) Главные несоответствия (high-signal)\n\n")
    lines.append("- **Нет block-based модели страниц**: `api::page.page` хранит один `content: richtext` + немного SEO/hero. Для Stitch нужны *секции/блоки* (repeatable components или dynamic zone).\n")
    lines.append("- **Нет структурированных секций**: карточки, тарифы, FAQ, табы, таблицы документов, списки файлов — всё должно быть *структурой*, а не richtext.\n")
    lines.append("- **Документы и файлы**: нужен паттерн `fileList[]` (название, URL/Media, тип, размер, дата, действие), плюс хук предпросмотра (modal/inline).\n")
    lines.append("- **Контакты/карта**: нужен контент‑тип/компонент для `locations[]` (lat/lng, категория, адреса, телефоны, часы) — сейчас этого нет.\n")
    lines.append("- **Карьера**: вакансии — отдельная коллекция (`vacancy`) или JSON/relations; сейчас в схемах нет.\n")
    lines.append("- **Сценарии/сайдбар‑переключатель**: требуется `menuItems[]` + `panels[]` с привязкой ключей — сейчас нет.\n")
    lines.append("- **News/Offers**: `/news` и `/offers` делят листинг‑шаблон, но в Strapi есть только `news`. Нужна либо вторая коллекция `offer`, либо поле `type`/`category`.\n\n")

    lines.append("## 3) Рекомендация целевой модели (черновик)\n\n")
    lines.append("- **Page**: добавить `sections` как `dynamiczone` (или `components` repeatable) с компонентами:\n")
    lines.append("  - `hero`, `ctaBanner`, `cardsGrid`, `tabs`, `accordion`, `pricingTable`, `docTabs`, `fileList`, `contactHub`, `form`, `pagination`\n")
    lines.append("- **Product/Service**: либо расширить `api::product.product` секциями (как Page), либо хранить услуги в `api::page.page` с `section=...` и отдельным индексом/категориями.\n")
    lines.append("- **News/Offer**: унифицировать модель публикаций: `post` (type=news|offer|video) или 2 коллекции + общий листинг.\n")
    lines.append("- **Navigation/Footer**: оставить single types, но заменить `json` на структурированные компоненты, если понадобится редакторская валидация.\n\n")

    lines.append("## 4) Что делать дальше (практически)\n\n")
    lines.append("- Сначала утвердить **PAGE_CONTENT_MAPPING.md** (что за поля реально нужны по шаблонам).\n")
    lines.append("- Затем обновлять Strapi схемы: добавить `sections` и компоненты, и только потом начинать массовое наполнение.\n")

    OUT_SCHEMA_GAP.write_text("".join(lines), encoding="utf-8")


def main() -> None:
    missing_md = read_text(STITCH_MISSING_PAGES)
    routes_by_tpl, ready_pages, unclassified_routes = parse_stitch_missing_pages(missing_md)

    task_routes: List[str] = []
    if TECHNICAL_TASK.exists():
        task_routes = extract_routes_from_technical_task(read_text(TECHNICAL_TASK))

    blocks_by_file: Dict[str, List[str]] = {}
    for p in sorted(DESIGN_PAGES_DIR.glob("*.html")):
        blocks_by_file[p.name] = blocks_in_html(p)

    specs_by_pathname = index_specs_by_pathname(PAGE_ANALYSIS_DIR)

    write_block_mapping(routes_by_tpl, ready_pages, unclassified_routes, blocks_by_file, task_routes)
    write_content_mapping(routes_by_tpl, ready_pages, unclassified_routes, blocks_by_file, specs_by_pathname, task_routes)
    write_schema_gap_analysis()

    print("Wrote:")
    print(f"- {OUT_BLOCK_MAPPING.relative_to(ROOT)}")
    print(f"- {OUT_CONTENT_MAPPING.relative_to(ROOT)}")
    print(f"- {OUT_SCHEMA_GAP.relative_to(ROOT)}")


if __name__ == "__main__":
    main()


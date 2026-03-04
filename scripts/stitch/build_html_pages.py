#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import os
import re


ROOT = Path(__file__).resolve().parents[2]  # /.../runs
BLOCKS_ROOT = ROOT / "design" / "html_blocks"
OUT_ROOT = ROOT / "design" / "html_pages"


PAGES: dict[str, list[str]] = {
    "_canonical_shell": [
        "header_and_mega_menu",
        "breadcrumbs",
        "footer_and_contact_form",
    ],
    "tpl_home": [
        "header_and_mega_menu",
        "breadcrumbs",
        "hero_section_and_cta_banner_1",
        "service_and_scenario_cards_1",
        "news_and_documents_list_1",
        "footer_and_contact_form",
    ],
    "tpl_service": [
        "header_and_mega_menu",
        "breadcrumbs",
        "hero_section_and_cta_banner_2",
        "pricing_and_specs_table",
        "service_faq_section",
        "service_consultation_card",
        "service_customization_panel",
        "service_stats_card",
        "footer_and_contact_form",
    ],
    "tpl_segment_landing": [
        "header_and_mega_menu",
        "breadcrumbs",
        "developers_industry_hero",
        "service_and_scenario_cards_2",
        "footer_and_contact_form",
    ],
    "tpl_scenario": [
        "header_and_mega_menu",
        "breadcrumbs",
        "connectivity_hero_variant",
        "service_and_scenario_cards_1",
        "accordions_and_sidebar_ui_2",
        "footer_and_contact_form",
    ],
    "tpl_news_list": [
        "header_and_mega_menu",
        "breadcrumbs",
        "news_and_documents_list_2",
        "pagination_and_display_controls",
        "footer_and_contact_form",
    ],
    "tpl_news_archive": [
        "header_and_mega_menu",
        "breadcrumbs",
        "news_and_documents_list_2",
        "footer_and_contact_form",
    ],
    "tpl_news_detail": [
        "header_and_mega_menu",
        "breadcrumbs",
        "news_detail_page",
        "footer_and_contact_form",
    ],
    "tpl_cms_page": [
        "header_and_mega_menu",
        "breadcrumbs",
        "cms_page_renderer",
        "footer_and_contact_form",
    ],
    # NOTE: All tpl_* pages must include the canonical header/footer blocks.
    # Canonical header/footer reference: `tpl_doc_page.html` (i.e. `header_and_mega_menu` + `footer_and_contact_form`).
    "tpl_contact_hub": [
        "header_and_mega_menu",
        "breadcrumbs",
        "contacts_with_interactive_3d_map",
        "footer_and_contact_form",
    ],
    "tpl_form_page": [
        "header_and_mega_menu",
        "breadcrumbs",
        "b2b_survey_and_feedback_form",
        "footer_and_contact_form",
    ],
    "tpl_doc_page": [
        "header_and_mega_menu",
        "breadcrumbs",
        "news_and_documents_list_1",
        "footer_and_contact_form",
    ],
    "tpl_search_results": [
        "header_and_mega_menu",
        "breadcrumbs",
        "search_results_layout",
        "footer_and_contact_form",
    ],
    "tpl_ai_chat": [
        "header_and_mega_menu",
        "breadcrumbs",
        "ai_assistant_landing_page",
        "footer_and_contact_form",
    ],
    # QA/demo pages for interactive components (not part of site tree)
    "page_tabs_demo": [
        "header_and_mega_menu",
        "breadcrumbs",
        "carousel_and_tab_components",
        "footer_and_contact_form",
    ],
    "page_dropdown_demo": [
        "header_and_mega_menu",
        "breadcrumbs",
        "dropdown_and_menu_states",
        "footer_and_contact_form",
    ],
    "page_modal_demo": [
        "header_and_mega_menu",
        "breadcrumbs",
        "document_preview_modal_overlay",
        "footer_and_contact_form",
    ],
    "page_career": [
        "header_and_mega_menu",
        "breadcrumbs",
        "careers_and_recruitment_page",
        "footer_and_contact_form",
    ],
    "page_ceo_feedback": [
        "header_and_mega_menu",
        "breadcrumbs",
        "ceo_address_and_feedback_page",
        "footer_and_contact_form",
    ],
}


# NOTE: For template assembly we do NOT extract only <main>, because many Stitch blocks
# rely on wrappers outside <main> for background/alignment. Instead we strip embedded
# <header> and <footer> tags from blocks, while keeping the rest of the structure.
ROOT_SECTION_OPEN_RE = re.compile(
    r'^(\s*<section\b[^>]*\bdata-stitch-block\s*=\s*"[^"]+"[^>]*>)',
    re.S | re.I,
)
CLASS_ATTR_RE = re.compile(r'\bclass\s*=\s*"([^"]*)"', re.I)

FOOTER_BLOCK_RE = re.compile(r"<footer\b[\s\S]*?</footer>", re.I)
HEADER_BLOCK_RE = re.compile(r"<header\b[\s\S]*?</header>", re.I)
# Breadcrumbs inside some full-page blocks (e.g. CEO page) must be removed when we add canonical breadcrumbs.
BREADCRUMBS_INLINE_RE = re.compile(
    r'<!--\s*Breadcrumbs\s*-->[\s\S]*?(?=<section\b|<div\b[^>]*class="[^"]*[^"]*mb-\d+|<h\d\b|<form\b|</main>)',
    re.I,
)
# Some pages include breadcrumbs as a simple "slash" trail (no `<!-- Breadcrumbs -->` marker).
# Remove this exact pattern when canonical breadcrumbs are present.
BREADCRUMBS_SLASH_DIV_RE = re.compile(
    r'<div\b[^>]*class="[^"]*\bflex\b[^"]*\bflex-wrap\b[^"]*\bgap-2\b[^"]*\bmb-8\b[^"]*"[^>]*>[\s\S]*?</div>\s*',
    re.I,
)
# Another common breadcrumbs variant: a <nav> with chevrons and reduced opacity (e.g. news list page).
BREADCRUMBS_NAV_OPACITY_RE = re.compile(
    r'<nav\b[^>]*class="[^"]*\bmb-10\b[^"]*\bopacity-50\b[^"]*"[^>]*>[\s\S]*?</nav>\s*',
    re.I,
)

LINK_RE = re.compile(r"<link[^>]+>", re.I)
STYLE_RE = re.compile(r"<style[^>]*>.*?</style>", re.S | re.I)

# In html_blocks, asset links are typically `../../assets/...`.
# When assembling into `design/html_pages/*.html`, they must become `../assets/...`.
ASSETS_PATH_RE = re.compile(r"\.\./\.\./assets/")


def dedupe_keep_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


HREF_RE = re.compile(r'\\bhref\\s*=\\s*\"([^\"]+)\"', re.I)


def link_href(tag: str) -> str | None:
    m = HREF_RE.search(tag)
    return m.group(1) if m else None


def build_pages() -> None:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    for page_name, blocks in PAGES.items():
        head_links: list[str] = []
        head_styles: list[str] = []
        body_parts: list[str] = []

        final_footer_block = blocks[-1] if (blocks and blocks[-1] == "footer_and_contact_form") else None

        for block in blocks:
            dep_path = BLOCKS_ROOT / block / "deps.html"
            block_path = BLOCKS_ROOT / block / "block.html"
            if not dep_path.exists() or not block_path.exists():
                raise SystemExit(f"Missing block files for {block}")

            dep_text = dep_path.read_text()
            head_links.extend(LINK_RE.findall(dep_text))
            head_styles.extend(STYLE_RE.findall(dep_text))

            block_text = block_path.read_text().strip()

            # For shell-assembled pages: ensure only the canonical header/footer exist.
            is_shell_page = "header_and_mega_menu" in blocks
            if page_name.startswith("tpl_") or is_shell_page:
                # All blocks except the global header must not contribute their own headers.
                if block != "header_and_mega_menu":
                    block_text = HEADER_BLOCK_RE.sub("", block_text)
                # Only the final footer block may contribute a footer.
                if final_footer_block and block != final_footer_block:
                    block_text = FOOTER_BLOCK_RE.sub("", block_text)
                # Only the canonical breadcrumbs block should render breadcrumbs.
                if block != "breadcrumbs":
                    block_text = BREADCRUMBS_INLINE_RE.sub("", block_text)
                    block_text = BREADCRUMBS_SLASH_DIV_RE.sub("", block_text)
                    block_text = BREADCRUMBS_NAV_OPACITY_RE.sub("", block_text)

            # Fix asset paths for html_pages output
            block_text = ASSETS_PATH_RE.sub("../assets/", block_text)
            body_parts.append(block_text)

        # Dedupe link tags by href (string-equality is too fragile).
        fixed_links = [ASSETS_PATH_RE.sub("../assets/", x) for x in head_links]
        by_href: dict[str, str] = {}
        ordered_hrefs: list[str] = []
        for tag in fixed_links:
            href = link_href(tag)
            if not href:
                continue
            if href in by_href:
                continue
            by_href[href] = tag
            ordered_hrefs.append(href)
        head_links = [by_href[h] for h in ordered_hrefs]

        head_styles = dedupe_keep_order([ASSETS_PATH_RE.sub("../assets/", x) for x in head_styles])

        # Ensure critical deps are always present and stable.
        required_hrefs = [
            "../assets/css/stitch-tailwind.css",
            "../assets/fonts/material-symbols-outlined/material-symbols-outlined.css",
        ]
        for href in reversed(required_hrefs):
            if href not in by_href:
                head_links.insert(0, f'<link href="{href}" rel="stylesheet"/>')

        head = [
            '<meta charset="utf-8"/>',
            '<meta content="width=device-width, initial-scale=1.0" name="viewport"/>',
            f"<title>{page_name}</title>",
            *head_links,
            *head_styles,
        ]

        include_adapter = os.environ.get("MGTS_INCLUDE_CMS_ADAPTER", "1") == "1"

        html = [
            "<!DOCTYPE html>",
            '<html class="dark" lang="ru">',
            "<head>",
            *head,
            "</head>",
            f'<body data-page="{page_name}">',
            '<script src="../cms_loader/cms-loader.js" defer></script>',
            # Local-only helper: demonstrates CMS integration via `mgts:open`.
            # Disable for real CMS builds with: MGTS_INCLUDE_CMS_ADAPTER=0
            *(
                ['<script src="../cms_loader/cms-adapter-example.js" defer></script>']
                if include_adapter
                else []
            ),
            *body_parts,
            "</body>",
            "</html>",
            "",
        ]

        (OUT_ROOT / f"{page_name}.html").write_text("\n".join(html))


if __name__ == "__main__":
    build_pages()

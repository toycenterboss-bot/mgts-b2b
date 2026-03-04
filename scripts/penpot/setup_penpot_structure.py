#!/usr/bin/env python3
import json
import os
import re
import ssl
import sys
import uuid
from http.cookiejar import CookieJar
from urllib import request, error


BASE_URL = os.environ.get("PENPOT_URL", "https://localhost:3449").rstrip("/")
EMAIL = os.environ.get("PENPOT_EMAIL")
PASSWORD = os.environ.get("PENPOT_PASSWORD")
TOKEN = os.environ.get("PENPOT_TOKEN")
TEAM_NAME = os.environ.get("PENPOT_TEAM_NAME", "MGTS")
PROJECT_NAME = os.environ.get("PENPOT_PROJECT_NAME", "MGTS")
RESET_COMPONENTS = os.environ.get("PENPOT_RESET_COMPONENTS") == "1"
STRUCTURE_PATH = os.environ.get(
    "PENPOT_STRUCTURE_PATH",
    "/Users/andrey_efremov/Downloads/runs/docs/project/PENPOT_STRUCTURE.md",
)
ROOT_FRAME_ID = "00000000-0000-0000-0000-000000000000"

TEMPLATES_FILE = "MGTS_Templates"
TEMPLATES_PAGES = [
    "TPL_Home",
    "TPL_Segment_Landing",
    "TPL_Service",
    "TPL_Scenario",
    "TPL_News_List",
    "TPL_News_Detail",
    "TPL_Contact_Hub",
    "TPL_Career_List",
    "TPL_Career_Detail",
    "TPL_Doc_Page",
    "TPL_Form_Page",
    "TPL_Search_Results",
    "TPL_AI_Chat",
]

UI_KIT_FILE = "MGTS_UI_Kit"
UI_KIT_PAGES = [
    "Tokens",
    "Components",
]

TEMPLATE_SECTIONS = {
    "TPL_Home": [
        ("Header", 120),
        ("Hero", 520),
        ("Segments", 320),
        ("Key Services", 360),
        ("Proof/Trust", 300),
        ("Cases/Scenarios", 320),
        ("News", 280),
        ("AI Chat Teaser", 260),
        ("CTA", 220),
        ("Footer", 320),
    ],
    "TPL_Service": [
        ("Breadcrumbs", 80),
        ("Hero", 360),
        ("Service Overview", 320),
        ("Benefits", 280),
        ("Specs", 280),
        ("Pricing/Packages", 260),
        ("Use Cases", 300),
        ("SLA/Docs", 240),
        ("FAQ", 280),
        ("Related Services", 260),
        ("CTA", 220),
        ("Footer", 320),
    ],
    "TPL_Segment_Landing": [
        ("Header", 120),
        ("Hero", 420),
        ("Segment Intro", 280),
        ("Filters/Search", 200),
        ("Services Grid", 480),
        ("Proof/Trust", 280),
        ("CTA", 220),
        ("Footer", 320),
    ],
    "TPL_Scenario": [
        ("Header", 120),
        ("Breadcrumbs", 80),
        ("Hero", 320),
        ("Problem", 260),
        ("Solution", 300),
        ("Steps", 320),
        ("Results", 240),
        ("Related Services", 260),
        ("CTA", 220),
        ("Footer", 320),
    ],
    "TPL_News_List": [
        ("Header", 120),
        ("Hero", 260),
        ("Filters", 200),
        ("News Grid", 520),
        ("Subscribe", 220),
        ("Footer", 320),
    ],
    "TPL_News_Detail": [
        ("Header", 120),
        ("Breadcrumbs", 80),
        ("Article Hero", 260),
        ("Content", 600),
        ("Related News", 280),
        ("Subscribe", 220),
        ("Footer", 320),
    ],
    "TPL_Contact_Hub": [
        ("Header", 120),
        ("Hero", 260),
        ("Contact Cards", 320),
        ("Map", 360),
        ("Forms", 360),
        ("CTA", 220),
        ("Footer", 320),
    ],
    "TPL_Career_List": [
        ("Header", 120),
        ("Hero", 260),
        ("Filters", 200),
        ("Vacancies", 520),
        ("EVP", 300),
        ("CTA", 220),
        ("Footer", 320),
    ],
    "TPL_Career_Detail": [
        ("Header", 120),
        ("Breadcrumbs", 80),
        ("Vacancy Hero", 260),
        ("Responsibilities", 260),
        ("Requirements", 260),
        ("Benefits", 260),
        ("Apply Form", 320),
        ("CTA", 220),
        ("Footer", 320),
    ],
    "TPL_Doc_Page": [
        ("Header", 120),
        ("Breadcrumbs", 80),
        ("Title", 180),
        ("Document List/Content", 520),
        ("Sidebar", 260),
        ("Footer", 320),
    ],
    "TPL_Form_Page": [
        ("Header", 120),
        ("Breadcrumbs", 80),
        ("Title", 180),
        ("Form", 420),
        ("Consent/Info", 200),
        ("Footer", 320),
    ],
    "TPL_Search_Results": [
        ("Header", 120),
        ("Search Bar", 200),
        ("Filters", 200),
        ("Results", 520),
        ("Footer", 320),
    ],
    "TPL_AI_Chat": [
        ("Header", 120),
        ("Hero", 260),
        ("Chat Panel", 600),
        ("FAQ", 260),
        ("CTA", 220),
        ("Footer", 320),
    ],
}

TEMPLATE_SECTION_NOTES = {
    "TPL_Home": {
        "Header": "Components: Header/Desktop, Menu/Top, Button/Primary",
        "Hero": "Components: Hero, Button/Primary, Search/Input",
        "Segments": "Components: Card/Service (x3), Menu/Mega (as ref)",
        "Key Services": "Components: Card/Service grid, CTA/Banner",
        "Proof/Trust": "Components: Logo Wall, Table/Base (SLA/цифры)",
        "Cases/Scenarios": "Components: Card/Scenario",
        "News": "Components: Card/News",
        "AI Chat Teaser": "Components: AI/Chat Widget",
        "CTA": "Components: CTA/Banner, Button/Primary",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_Service": {
        "Breadcrumbs": "Components: Breadcrumbs",
        "Hero": "Components: Hero, Button/Primary",
        "Service Overview": "Components: Text + List/Check",
        "Benefits": "Components: List/Check",
        "Specs": "Components: Table/Base",
        "Pricing/Packages": "Components: Card/Service, Table/Base",
        "Use Cases": "Components: Card/Scenario",
        "SLA/Docs": "Components: List/Bulleted, Accordion/Item",
        "FAQ": "Components: Accordion/Item",
        "Related Services": "Components: Card/Service",
        "CTA": "Components: CTA/Banner, Button/Primary",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_Segment_Landing": {
        "Header": "Components: Header/Desktop, Menu/Top, Search/Input",
        "Hero": "Components: Hero, Button/Primary",
        "Segment Intro": "Components: Text + List/Bulleted",
        "Filters/Search": "Components: Search/Input, Dropdown/Select",
        "Services Grid": "Components: Card/Service grid",
        "Proof/Trust": "Components: Logo Wall",
        "CTA": "Components: CTA/Banner",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_Scenario": {
        "Header": "Components: Header/Desktop",
        "Breadcrumbs": "Components: Breadcrumbs",
        "Hero": "Components: Hero",
        "Problem": "Components: Text + List/Bulleted",
        "Solution": "Components: Text + List/Check",
        "Steps": "Components: List/Numbered",
        "Results": "Components: Table/Base or Cards",
        "Related Services": "Components: Card/Service",
        "CTA": "Components: CTA/Banner",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_News_List": {
        "Header": "Components: Header/Desktop",
        "Hero": "Components: Hero",
        "Filters": "Components: Dropdown/Select, Search/Input",
        "News Grid": "Components: Card/News grid",
        "Subscribe": "Components: Form/Input + Button/Primary",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_News_Detail": {
        "Header": "Components: Header/Desktop",
        "Breadcrumbs": "Components: Breadcrumbs",
        "Article Hero": "Components: Hero",
        "Content": "Components: Text, List/Bulleted, Table/Base",
        "Related News": "Components: Card/News",
        "Subscribe": "Components: Form/Input + Button/Primary",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_Contact_Hub": {
        "Header": "Components: Header/Desktop",
        "Hero": "Components: Hero",
        "Contact Cards": "Components: Card/Service (as contact card)",
        "Map": "Components: Placeholder frame",
        "Forms": "Components: Form/Input, Form/Textarea, Form/Checkbox, Button/Primary",
        "CTA": "Components: CTA/Banner",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_Career_List": {
        "Header": "Components: Header/Desktop",
        "Hero": "Components: Hero",
        "Filters": "Components: Dropdown/Select, Search/Input",
        "Vacancies": "Components: List/Check or Card/Service",
        "EVP": "Components: Text + List/Bulleted",
        "CTA": "Components: CTA/Banner",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_Career_Detail": {
        "Header": "Components: Header/Desktop",
        "Breadcrumbs": "Components: Breadcrumbs",
        "Vacancy Hero": "Components: Hero",
        "Responsibilities": "Components: List/Bulleted",
        "Requirements": "Components: List/Check",
        "Benefits": "Components: List/Check",
        "Apply Form": "Components: Form/Input, Form/Textarea, Form/Checkbox, Button/Primary",
        "CTA": "Components: CTA/Banner",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_Doc_Page": {
        "Header": "Components: Header/Desktop",
        "Breadcrumbs": "Components: Breadcrumbs",
        "Title": "Components: H1 + subtitle",
        "Document List/Content": "Components: List/Bulleted, Table/Base",
        "Sidebar": "Components: Menu/Sidebar",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_Form_Page": {
        "Header": "Components: Header/Desktop",
        "Breadcrumbs": "Components: Breadcrumbs",
        "Title": "Components: H1 + subtitle",
        "Form": "Components: Form/Input, Form/Textarea, Form/Checkbox, Button/Primary",
        "Consent/Info": "Components: Text + List/Bulleted",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_Search_Results": {
        "Header": "Components: Header/Desktop",
        "Search Bar": "Components: Search/Input, Button/Secondary",
        "Filters": "Components: Dropdown/Select",
        "Results": "Components: Card/Service, Card/News",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
    "TPL_AI_Chat": {
        "Header": "Components: Header/Desktop",
        "Hero": "Components: Hero",
        "Chat Panel": "Components: AI/Chat Panel",
        "FAQ": "Components: Accordion/Item",
        "CTA": "Components: CTA/Banner",
        "Footer": "Components: Footer/Desktop, Menu/Footer",
    },
}

DOC_PAGE_SLUGS = {
    "/about_mgts",
    "/mgts_values",
    "/general_director_message",
    "/mgts_compliance_policies",
    "/interaction_with_partners",
    "/single_hotline",
    "/principles_corporate_manage",
    "/corporate_documents",
    "/decisions_meetings_shareholders",
    "/infoformen",
    "/about_registrar",
    "/bank_details",
    "/licenses",
    "/labor_safety",
    "/timing_malfunctions",
    "/wca",
    "/data_processing",
    "/cookie_processing",
    "/forms_doc",
    "/operinfo",
}

SEGMENT_ROOTS = {
    "/services",
    "/developers",
    "/operators",
    "/government",
    "/business",
    "/partners",
}

SEGMENT_CATEGORIES = {
    "/developers/connecting_objects",
    "/developers/digital_solutions",
    "/operators/infrastructure",
    "/government/digital_services",
    "/government/communications_infrastructure",
    "/business/equipment_setup",
    "/business/payment_methods",
    "/partners/documents",
}
COMPONENT_PLACEHOLDERS = [
    ("Header/Desktop", 1440, 96),
    ("Header/Mobile", 375, 64),
    ("Footer/Desktop", 1440, 320),
    ("Footer/Mobile", 375, 420),
    ("Hero", 1440, 480),
    ("CTA/Banner", 1200, 200),
    ("Button/Primary", 200, 48),
    ("Button/Secondary", 200, 48),
    ("Card/Service", 360, 220),
    ("Card/Scenario", 360, 220),
    ("Card/News", 360, 220),
    ("Form/Input", 360, 56),
    ("Form/Textarea", 360, 120),
    ("Form/Checkbox", 200, 24),
    ("Form/Radio", 240, 220),
    ("Form/FileUpload", 520, 300),
    ("Breadcrumbs", 600, 32),
    ("Badge/Chip", 520, 160),
    ("Tabs", 600, 56),
    ("Accordion/Item", 600, 80),
    ("Pagination", 400, 40),
    ("Search/Input", 360, 48),
    ("Logo Wall", 1200, 200),
    ("AI/Chat Widget", 360, 480),
    ("AI/Chat Panel", 1200, 700),
    ("Slider/Hero", 1440, 520),
    ("Slider/Logo Wall", 1200, 220),
    ("Table/Base", 1200, 360),
    ("List/Bulleted", 600, 220),
    ("List/Numbered", 600, 220),
    ("List/Check", 600, 220),
    ("Menu/Top", 1200, 80),
    ("Menu/Mega", 1200, 360),
    ("Menu/Footer", 1200, 240),
    ("Menu/Sidebar", 360, 480),
    ("Dropdown/Select", 360, 56),
    ("Dropdown/Menu", 280, 220),
    ("Modal/Base", 720, 420),
    ("Modal/Confirm", 520, 280),
]
SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48, 64]
RADIUS_SCALE = [2, 4, 6, 8, 12, 16, 24]
COLOR_TOKENS = [
    ("Brand/Primary", "#0066CC"),
    ("Brand/Primary-Dark", "#0052A3"),
    ("Brand/Primary-Darker", "#003D7A"),
    ("Brand/Primary-Light", "#4A90E2"),
    ("Brand/Secondary", "#E30611"),
    ("Brand/Secondary-Dark", "#B8050E"),
    ("Brand/Secondary-Light", "#FF4D5A"),
    ("Brand/Accent", "#00A651"),
    ("Brand/Accent-Dark", "#008040"),
    ("Neutral/900", "#111827"),
    ("Neutral/800", "#1F2937"),
    ("Neutral/700", "#374151"),
    ("Neutral/600", "#4B5563"),
    ("Neutral/500", "#6B7280"),
    ("Neutral/400", "#9CA3AF"),
    ("Neutral/300", "#D1D5DB"),
    ("Neutral/200", "#E5E7EB"),
    ("Neutral/100", "#F3F4F6"),
    ("Neutral/50", "#F9FAFB"),
    ("Surface/White", "#FFFFFF"),
    ("Surface/Black", "#000000"),
    ("State/Success", "#10B981"),
    ("State/Warning", "#F59E0B"),
    ("State/Error", "#EF4444"),
    ("State/Info", "#3B82F6"),
]

TYPOGRAPHY_TOKENS = [
    {"name": "H1", "family": "MTS Sans", "size": "48", "weight": "700", "line": "1.2"},
    {"name": "H2", "family": "MTS Sans", "size": "36", "weight": "700", "line": "1.25"},
    {"name": "H3", "family": "MTS Sans", "size": "30", "weight": "700", "line": "1.3"},
    {"name": "H4", "family": "MTS Sans", "size": "24", "weight": "600", "line": "1.35"},
    {"name": "H5", "family": "MTS Sans", "size": "20", "weight": "600", "line": "1.4"},
    {"name": "H6", "family": "MTS Sans", "size": "18", "weight": "600", "line": "1.4"},
    {"name": "Body/L", "family": "MTS Text", "size": "16", "weight": "400", "line": "1.5"},
    {"name": "Body/M", "family": "MTS Text", "size": "14", "weight": "400", "line": "1.5"},
    {"name": "Body/S", "family": "MTS Text", "size": "12", "weight": "400", "line": "1.5"},
    {"name": "Caption", "family": "MTS Text", "size": "11", "weight": "400", "line": "1.4"},
    {"name": "Button", "family": "MTS Text", "size": "14", "weight": "600", "line": "1.2"},
]

SSL_CONTEXT = ssl._create_unverified_context()


class PenpotClient:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token
        self.cookie_jar = CookieJar()
        https_handler = request.HTTPSHandler(context=SSL_CONTEXT)
        self.opener = request.build_opener(
            https_handler, request.HTTPCookieProcessor(self.cookie_jar)
        )

    def _headers(self):
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.token:
            headers["Authorization"] = f"Token {self.token}"
        return headers

    def rpc(self, method, params):
        url = f"{self.base_url}/api/main/methods/{method}"
        body = json.dumps(params).encode("utf-8")
        req = request.Request(url, data=body, headers=self._headers(), method="POST")
        try:
            with self.opener.open(req) as resp:
                data = resp.read()
        except error.HTTPError as exc:
            payload = exc.read().decode("utf-8", "ignore")
            raise RuntimeError(f"RPC {method} failed: {exc.code} {payload}") from exc

        if not data:
            return None
        text = data.decode("utf-8", "ignore")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            raise RuntimeError(f"RPC {method} returned non-JSON: {text[:200]}")

    def login(self, email, password):
        self.rpc("login-with-password", {"email": email, "password": password})


def parse_structure(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Structure file not found: {path}")

    with open(path, "r", encoding="utf-8") as handle:
        lines = handle.readlines()

    in_section = False
    current_file = None
    result = {}

    for raw in lines:
        line = raw.strip()
        if line.startswith("### 1)"):
            in_section = True
            continue
        if line.startswith("### 2)"):
            break
        if not in_section:
            continue

        match = re.match(r"^\*\*(.+)\*\*$", line)
        if match:
            current_file = match.group(1).strip()
            result[current_file] = []
            continue

        if line.startswith("- "):
            if not current_file:
                continue
            page_name = line[2:].strip()
            if page_name:
                result[current_file].append(page_name)

    return result


def pick_by_name(items, name):
    for item in items:
        if item.get("name") == name:
            return item
    return None


def get_pages_from_file(file_data):
    data = file_data.get("data") or {}
    pages_order = data.get("pages") or []
    pages_index = data.get("pagesIndex") or {}

    pages = []
    for page_id in pages_order:
        page = pages_index.get(page_id)
        if not page:
            continue
        pages.append({"id": page_id, "name": page.get("name", "")})
    return pages


def build_rect_points(x, y, width, height):
    return [
        {"x": float(x), "y": float(y)},
        {"x": float(x + width), "y": float(y)},
        {"x": float(x + width), "y": float(y + height)},
        {"x": float(x), "y": float(y + height)},
    ]


def build_selrect(x, y, width, height):
    return {
        "x": float(x),
        "y": float(y),
        "width": float(width),
        "height": float(height),
        "x1": float(x),
        "y1": float(y),
        "x2": float(x + width),
        "y2": float(y + height),
    }


def build_transform():
    return {"a": 1.0, "b": 0.0, "c": 0.0, "d": 1.0, "e": 0.0, "f": 0.0}


def build_text_shape(
    name,
    text,
    x,
    y,
    width,
    height,
    parent_id,
    frame_id,
    text_color=None,
    font_size=None,
    font_family=None,
    font_weight=None,
    font_style=None,
    text_align=None,
):
    shape_id = str(uuid.uuid4())
    content = {
        "type": "root",
        "children": [
            {
                "type": "paragraph-set",
                "children": [
                    {
                        "type": "paragraph",
                        "children": [{"text": text}],
                    }
                ],
            }
        ],
    }
    if font_size:
        content["children"][0]["children"][0]["fontSize"] = str(font_size)
        content["children"][0]["children"][0]["children"][0]["fontSize"] = str(font_size)
    if font_family:
        content["children"][0]["children"][0]["fontFamily"] = font_family
        content["children"][0]["children"][0]["children"][0]["fontFamily"] = font_family
    if font_weight:
        content["children"][0]["children"][0]["fontWeight"] = str(font_weight)
        content["children"][0]["children"][0]["children"][0]["fontWeight"] = str(font_weight)
    if font_style:
        content["children"][0]["children"][0]["fontStyle"] = font_style
        content["children"][0]["children"][0]["children"][0]["fontStyle"] = font_style
    if text_align:
        content["children"][0]["children"][0]["text-align"] = text_align
        content["children"][0]["children"][0]["children"][0]["text-align"] = text_align

    shape = {
        "id": shape_id,
        "name": name,
        "type": "text",
        "x": float(x),
        "y": float(y),
        "width": float(width),
        "height": float(height),
        "rotation": 0,
        "selrect": build_selrect(x, y, width, height),
        "points": build_rect_points(x, y, width, height),
        "transform": build_transform(),
        "transformInverse": build_transform(),
        "parentId": parent_id,
        "frameId": frame_id,
        "content": content,
    }
    if text_color:
        shape["fills"] = [{"fillColor": text_color, "fillOpacity": 1}]
    return shape


def extract_slug(page_name):
    match = re.search(r"`([^`]+)`", page_name or "")
    if match:
        return match.group(1).strip()
    return None


def normalize_note_text(note_text):
    if not note_text:
        return ""
    prefix = "Components:"
    if note_text.startswith(prefix):
        return note_text[len(prefix) :].strip()
    return note_text


def apply_font_settings(content, font_family, font_weight, font_style, default_size):
    if not content:
        return content
    for paragraph_set in content.get("children", []):
        paragraph_set["fontFamily"] = font_family
        paragraph_set["fontStyle"] = font_style
        if "fontWeight" not in paragraph_set:
            paragraph_set["fontWeight"] = font_weight
        if "fontSize" not in paragraph_set:
            paragraph_set["fontSize"] = str(default_size)
        for paragraph in paragraph_set.get("children", []):
            paragraph["fontFamily"] = font_family
            paragraph["fontStyle"] = font_style
            if "fontWeight" not in paragraph:
                paragraph["fontWeight"] = font_weight
            if "fontSize" not in paragraph:
                paragraph["fontSize"] = str(default_size)
            for text_node in paragraph.get("children", []):
                text_node["fontFamily"] = font_family
                text_node["fontStyle"] = font_style
                if "fontWeight" not in text_node:
                    text_node["fontWeight"] = font_weight
                if "fontSize" not in text_node:
                    text_node["fontSize"] = str(default_size)
    return content


def parse_component_list(note_text):
    if not note_text:
        return []
    text = normalize_note_text(note_text)
    parts = []
    for chunk in text.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        parts.extend([part.strip() for part in chunk.split("+") if part.strip()])
    return parts


def ensure_text_fonts(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    pages_index = data.get("pagesIndex") or {}

    changes = []

    for page_id, page in pages_index.items():
        objects = page.get("objects") or {}
        for obj in objects.values():
            if obj.get("type") != "text":
                continue
            name = obj.get("name") or ""
            if name.startswith("Label:") or "/Title" in name:
                font_family = "MTS Sans"
                font_weight = "600"
                default_size = 14
            else:
                font_family = "MTS Text"
                font_weight = "400"
                default_size = 14
            new_content = json.loads(json.dumps(obj.get("content"))) if obj.get("content") else None
            new_content = apply_font_settings(
                new_content, font_family, font_weight, "normal", default_size
            )
            if new_content:
                changes.append(
                    {
                        "type": "mod-obj",
                        "id": obj["id"],
                        "pageId": page_id,
                        "operations": [
                            {"type": "set", "attr": "content", "val": new_content}
                        ],
                    }
                )

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_section_frame_transparency(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    pages_index = data.get("pagesIndex") or {}

    changes = []
    transparent_fill = [{"fillColor": "#FFFFFF", "fillOpacity": 0}]

    for page_id, page in pages_index.items():
        objects = page.get("objects") or {}
        for obj in objects.values():
            if obj.get("type") != "frame":
                continue
            name = obj.get("name") or ""
            if not name.startswith("Section/"):
                continue
            if obj.get("fills") == transparent_fill:
                continue
            changes.append(
                {
                    "type": "mod-obj",
                    "id": obj["id"],
                    "pageId": page_id,
                    "operations": [
                        {"type": "set", "attr": "fills", "val": transparent_fill}
                    ],
                }
            )

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def pick_template_for_page(page_name):
    name_lower = (page_name or "").lower()
    slug = extract_slug(page_name)

    if "поиск" in name_lower:
        return "TPL_Search_Results"
    if ("ai" in name_lower and "чат" in name_lower) or ("ai-chat" in name_lower):
        return "TPL_AI_Chat"

    if slug == "/":
        return "TPL_Home"
    if slug in {"/contact", "/contact_details", "/operators/contact_for_operators"}:
        return "TPL_Contact_Hub"
    if slug == "/career":
        return "TPL_Career_List"
    if slug == "/partners_feedback_form":
        return "TPL_Form_Page"
    if slug in {"/news", "/offers"}:
        return "TPL_News_List"
    if slug and (slug.startswith("/news/") or slug.startswith("/offers/")):
        return "TPL_News_Detail"
    if slug and slug.startswith("/services/scenario-"):
        return "TPL_Scenario"
    if slug in SEGMENT_ROOTS or (slug and slug.endswith("/all_services")):
        return "TPL_Segment_Landing"
    if slug in SEGMENT_CATEGORIES:
        return "TPL_Segment_Landing"
    if slug in DOC_PAGE_SLUGS:
        return "TPL_Doc_Page"
    if slug and "/forms" in slug:
        return "TPL_Form_Page"
    if slug and slug.count("/") >= 2:
        return "TPL_Service"
    return None


def ensure_pages(client, file_id, file_name, desired_names):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    if revn is None or vern is None:
        raise RuntimeError(f"Missing revn/vern for file {file_name}")

    pages = get_pages_from_file(file_data)
    existing = {page["name"]: page["id"] for page in pages}
    changes = []

    if desired_names:
        first_name = desired_names[0]
        if first_name not in existing and pages:
            if len(pages) == 1:
                changes.append(
                    {"type": "mod-page", "id": pages[0]["id"], "name": first_name}
                )
                existing[first_name] = pages[0]["id"]

        for name in desired_names:
            if name in existing:
                continue
            changes.append(
                {"type": "add-page", "id": str(uuid.uuid4()), "name": name}
            )

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_form_states(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Components")
    if not page_id or not page:
        return

    objects = page.get("objects") or {}
    frames_by_name = {
        obj.get("name"): obj for obj in objects.values() if obj.get("type") == "frame"
    }
    existing_names = {obj.get("name") for obj in objects.values()}

    changes = []

    def add_obj(shape, frame_id):
        return {
            "type": "add-obj",
            "id": shape["id"],
            "obj": shape,
            "pageId": page_id,
            "frameId": frame_id,
            "parentId": frame_id,
        }

    def add_input_states(frame_name, placeholder, is_textarea=False):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        base_marker = f"{frame_name}/States"
        if base_marker in existing_names:
            return

        height = 44 if not is_textarea else 90
        y = 24
        x = 20
        width = 300
        gap = 20
        states = [
            ("Default", "#D1D5DB", "#FFFFFF"),
            ("Focus", "#0066CC", "#FFFFFF"),
            ("Error", "#EF4444", "#FFFFFF"),
            ("Success", "#10B981", "#FFFFFF"),
            ("Disabled", "#E5E7EB", "#F3F4F6"),
        ]

        marker = build_text_shape(
            base_marker,
            "States",
            x=20,
            y=0,
            width=120,
            height=20,
            parent_id=frame["id"],
            frame_id=frame["id"],
        )
        changes.append(add_obj(marker, frame["id"]))

        for label, stroke, fill in states:
            rect = build_rect_shape(
                f"{frame_name}/{label}",
                x=x,
                y=y,
                width=width,
                height=height,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=8,
                fill_color=fill,
                stroke_color=stroke,
                stroke_width=1,
            )
            text = build_text_shape(
                f"{frame_name}/{label}/Placeholder",
                placeholder,
                x=x + 16,
                y=y + 10,
                width=width - 32,
                height=24,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            label_text = build_text_shape(
                f"{frame_name}/{label}/Label",
                label,
                x=x + width + 16,
                y=y + 10,
                width=120,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend(
                [add_obj(rect, frame["id"]), add_obj(text, frame["id"]), add_obj(label_text, frame["id"])]
            )

            if label == "Error":
                err = build_text_shape(
                    f"{frame_name}/{label}/Hint",
                    "Ошибка: обязательное поле",
                    x=x,
                    y=y + height + 6,
                    width=width + 200,
                    height=18,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.append(add_obj(err, frame["id"]))
                y += 18

            y += height + gap

    def add_checkbox_states(frame_name):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        base_marker = f"{frame_name}/States"
        if base_marker in existing_names:
            return
        marker = build_text_shape(
            base_marker,
            "States",
            x=20,
            y=0,
            width=120,
            height=20,
            parent_id=frame["id"],
            frame_id=frame["id"],
        )
        changes.append(add_obj(marker, frame["id"]))

        states = [
            ("Default", "#D1D5DB", "#FFFFFF"),
            ("Checked", "#0066CC", "#0066CC"),
            ("Error", "#EF4444", "#FFFFFF"),
            ("Disabled", "#E5E7EB", "#F3F4F6"),
        ]
        y = 24
        for label, stroke, fill in states:
            box = build_rect_shape(
                f"{frame_name}/{label}",
                x=20,
                y=y,
                width=20,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=4,
                fill_color=fill,
                stroke_color=stroke,
                stroke_width=1,
            )
            text = build_text_shape(
                f"{frame_name}/{label}/Label",
                label,
                x=48,
                y=y,
                width=120,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(box, frame["id"]), add_obj(text, frame["id"])])
            y += 32

    add_input_states("Form/Input", "Введите текст")
    add_input_states("Form/Textarea", "Введите сообщение", is_textarea=True)
    add_input_states("Dropdown/Select", "Выберите значение")
    add_checkbox_states("Form/Checkbox")

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)

def ensure_placeholders(client, file_id, labels_by_page):
    if not labels_by_page:
        return

    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    pages_index = data.get("pagesIndex") or {}

    changes = []
    root_frame_id = "00000000-0000-0000-0000-000000000000"

    for page_id, label in labels_by_page.items():
        page = pages_index.get(page_id)
        if not page:
            continue
        objects = page.get("objects") or {}
        existing_names = {obj.get("name") for obj in objects.values()}
        marker_name = f"AUTO: {label}"
        if marker_name in existing_names:
            continue

        shape = build_text_shape(
            marker_name,
            label,
            x=80,
            y=80,
            width=900,
            height=60,
            parent_id=root_frame_id,
            frame_id=root_frame_id,
        )
        changes.append(
            {
                "type": "add-obj",
                "id": shape["id"],
                "obj": shape,
                "pageId": page_id,
                "frameId": root_frame_id,
                "parentId": root_frame_id,
            }
        )

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_ui_tokens(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    existing_colors = data.get("colors") or {}
    existing_typographies = data.get("typographies") or {}

    existing_color_names = {c.get("name"): c for c in existing_colors.values()}
    existing_typo_names = {t.get("name"): t for t in existing_typographies.values()}

    changes = []
    for name, value in COLOR_TOKENS:
        existing = existing_color_names.get(name)
        if existing:
            if existing.get("color") != value:
                changes.append(
                    {
                        "type": "mod-color",
                        "color": {"id": existing["id"], "name": name, "color": value},
                    }
                )
            continue
        changes.append(
            {
                "type": "add-color",
                "color": {"id": str(uuid.uuid4()), "name": name, "color": value},
            }
        )

    for token in TYPOGRAPHY_TOKENS:
        name = token["name"]
        family = token["family"]
        size = token["size"]
        weight = token["weight"]
        line_height = token["line"]
        existing = existing_typo_names.get(name)
        typography_payload = {
            "name": name,
            "fontId": family,
            "fontFamily": family,
            "fontVariantId": "regular",
            "fontSize": size,
            "fontWeight": weight,
            "fontStyle": "normal",
            "lineHeight": line_height,
            "letterSpacing": "0",
            "textTransform": "none",
        }
        if existing:
            needs_update = any(existing.get(k) != v for k, v in typography_payload.items())
            if needs_update:
                typography_payload["id"] = existing["id"]
                changes.append(
                    {"type": "mod-typography", "typography": typography_payload}
                )
            continue
        typography_payload["id"] = str(uuid.uuid4())
        changes.append({"type": "add-typography", "typography": typography_payload})

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def find_page_by_name(file_data, page_name):
    pages_index = file_data.get("data", {}).get("pagesIndex") or {}
    for page_id, page in pages_index.items():
        if page.get("name") == page_name:
            return page_id, page
    return None, None


def build_frame_shape(name, x, y, width, height, parent_id):
    frame_id = str(uuid.uuid4())
    shape = {
        "id": frame_id,
        "name": name,
        "type": "frame",
        "x": float(x),
        "y": float(y),
        "width": float(width),
        "height": float(height),
        "rotation": 0,
        "selrect": build_selrect(x, y, width, height),
        "points": build_rect_points(x, y, width, height),
        "transform": build_transform(),
        "transformInverse": build_transform(),
        "parentId": parent_id,
        "frameId": frame_id,
        "fills": [{"fillColor": "#FFFFFF", "fillOpacity": 1}],
        "strokes": [
            {
                "strokeStyle": "solid",
                "strokeAlignment": "inner",
                "strokeWidth": 1,
                "strokeColor": "#D1D5DB",
                "strokeOpacity": 1,
            }
        ],
        "shapes": [],
        "hideFillOnExport": False,
    }
    return frame_id, shape


def build_rect_shape(
    name,
    x,
    y,
    width,
    height,
    parent_id,
    frame_id,
    radius=0,
    fill_color="#E5E7EB",
    fill_opacity=1,
    stroke_color=None,
    stroke_width=1,
    stroke_style="solid",
    stroke_opacity=1,
):
    rect_id = str(uuid.uuid4())
    strokes = []
    if stroke_color:
        strokes = [
            {
                "strokeStyle": stroke_style,
                "strokeAlignment": "inner",
                "strokeWidth": stroke_width,
                "strokeColor": stroke_color,
                "strokeOpacity": stroke_opacity,
            }
        ]
    return {
        "id": rect_id,
        "name": name,
        "type": "rect",
        "x": float(x),
        "y": float(y),
        "width": float(width),
        "height": float(height),
        "rotation": 0,
        "selrect": build_selrect(x, y, width, height),
        "points": build_rect_points(x, y, width, height),
        "transform": build_transform(),
        "transformInverse": build_transform(),
        "parentId": parent_id,
        "frameId": frame_id,
        "fills": [{"fillColor": fill_color, "fillOpacity": fill_opacity}],
        "strokes": strokes,
        "r1": radius,
        "r2": radius,
        "r3": radius,
        "r4": radius,
    }


def ensure_tokens_visuals(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Tokens")
    if not page_id or not page:
        return

    root_frame_id = "00000000-0000-0000-0000-000000000000"
    objects = page.get("objects") or {}
    existing_names = {obj.get("name") for obj in objects.values()}

    sections = [
        ("Tokens/Spacing", 80, 120, 1200, 220),
        ("Tokens/Radius", 80, 380, 1200, 220),
        ("Tokens/Shadows", 80, 640, 1200, 180),
        ("Tokens/Grid", 80, 860, 1200, 220),
    ]

    changes = []

    for section_name, x, y, w, h in sections:
        if section_name in existing_names:
            continue

        frame_id, frame_shape = build_frame_shape(section_name, x, y, w, h, root_frame_id)
        changes.append(
            {
                "type": "add-obj",
                "id": frame_id,
                "obj": frame_shape,
                "pageId": page_id,
                "frameId": root_frame_id,
                "parentId": root_frame_id,
            }
        )

        title_shape = build_text_shape(
            f"Label: {section_name}",
            section_name,
            x=16,
            y=12,
            width=w - 32,
            height=24,
            parent_id=frame_id,
            frame_id=frame_id,
        )
        changes.append(
            {
                "type": "add-obj",
                "id": title_shape["id"],
                "obj": title_shape,
                "pageId": page_id,
                "frameId": frame_id,
                "parentId": frame_id,
            }
        )

        if section_name == "Tokens/Spacing":
            cx = 16
            cy = 60
            for value in SPACING_SCALE:
                bar_width = value * 6
                rect = build_rect_shape(
                    f"Spacing/{value}",
                    cx,
                    cy,
                    bar_width,
                    16,
                    parent_id=frame_id,
                    frame_id=frame_id,
                )
                label = build_text_shape(
                    f"SpacingLabel/{value}",
                    f"{value}px",
                    x=cx,
                    y=cy + 22,
                    width=80,
                    height=20,
                    parent_id=frame_id,
                    frame_id=frame_id,
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": rect["id"],
                        "obj": rect,
                        "pageId": page_id,
                        "frameId": frame_id,
                        "parentId": frame_id,
                    }
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": label["id"],
                        "obj": label,
                        "pageId": page_id,
                        "frameId": frame_id,
                        "parentId": frame_id,
                    }
                )
                cx += bar_width + 24
        elif section_name == "Tokens/Radius":
            cx = 16
            cy = 60
            for value in RADIUS_SCALE:
                rect = build_rect_shape(
                    f"Radius/{value}",
                    cx,
                    cy,
                    80,
                    56,
                    parent_id=frame_id,
                    frame_id=frame_id,
                    radius=value,
                )
                label = build_text_shape(
                    f"RadiusLabel/{value}",
                    f"{value}px",
                    x=cx,
                    y=cy + 64,
                    width=80,
                    height=20,
                    parent_id=frame_id,
                    frame_id=frame_id,
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": rect["id"],
                        "obj": rect,
                        "pageId": page_id,
                        "frameId": frame_id,
                        "parentId": frame_id,
                    }
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": label["id"],
                        "obj": label,
                        "pageId": page_id,
                        "frameId": frame_id,
                        "parentId": frame_id,
                    }
                )
                cx += 96
        elif section_name == "Tokens/Shadows":
            shadow_notes = [
                "Shadow/SM: 0 1px 2px rgba(0,0,0,0.05)",
                "Shadow/MD: 0 4px 6px -1px rgba(0,0,0,0.1)",
                "Shadow/LG: 0 10px 15px -3px rgba(0,0,0,0.1)",
                "Shadow/XL: 0 20px 25px -5px rgba(0,0,0,0.1)",
            ]
            cy = 60
            for note in shadow_notes:
                label = build_text_shape(
                    f"ShadowNote/{note}",
                    note,
                    x=16,
                    y=cy,
                    width=w - 32,
                    height=20,
                    parent_id=frame_id,
                    frame_id=frame_id,
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": label["id"],
                        "obj": label,
                        "pageId": page_id,
                        "frameId": frame_id,
                        "parentId": frame_id,
                    }
                )
                cy += 28
        elif section_name == "Tokens/Grid":
            grid_notes = [
                "Grid/Desktop: 12 columns, container 1200px, gutter 24px",
                "Grid/Tablet: 8 columns, container 720px, gutter 20px",
                "Grid/Mobile: 4 columns, container 343px, gutter 16px",
            ]
            cy = 60
            for note in grid_notes:
                label = build_text_shape(
                    f"GridNote/{note}",
                    note,
                    x=16,
                    y=cy,
                    width=w - 32,
                    height=20,
                    parent_id=frame_id,
                    frame_id=frame_id,
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": label["id"],
                        "obj": label,
                        "pageId": page_id,
                        "frameId": frame_id,
                        "parentId": frame_id,
                    }
                )
                cy += 28

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_template_sections(client, file_id, sections_by_template):
    if not sections_by_template:
        return
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    pages_index = data.get("pagesIndex") or {}
    root_frame_id = "00000000-0000-0000-0000-000000000000"

    changes = []

    for page_id, page in pages_index.items():
        page_name = page.get("name", "")
        sections = sections_by_template.get(page_name)
        if not sections:
            continue
        objects = page.get("objects") or {}
        existing_names = {obj.get("name") for obj in objects.values()}
        x = 80
        y = 80
        width = 1200
        gap = 40
        for section_name, height in sections:
            frame_name = f"Section/{section_name}"
            if frame_name in existing_names:
                y += height + gap
                continue
            frame_id, frame_shape = build_frame_shape(
                frame_name, x, y, width, height, root_frame_id
            )
            changes.append(
                {
                    "type": "add-obj",
                    "id": frame_id,
                    "obj": frame_shape,
                    "pageId": page_id,
                    "frameId": root_frame_id,
                    "parentId": root_frame_id,
                }
            )
            label = build_text_shape(
                f"Label: {frame_name}",
                section_name,
                x=16,
                y=12,
                width=width - 32,
                height=24,
                parent_id=frame_id,
                frame_id=frame_id,
            )
            changes.append(
                {
                    "type": "add-obj",
                    "id": label["id"],
                    "obj": label,
                    "pageId": page_id,
                    "frameId": frame_id,
                    "parentId": frame_id,
                }
            )
            y += height + gap

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_template_content_notes(client, file_id, notes_by_template):
    if not notes_by_template:
        return
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    pages_index = data.get("pagesIndex") or {}

    changes = []

    for page_id, page in pages_index.items():
        page_name = page.get("name", "")
        notes_map = notes_by_template.get(page_name)
        if not notes_map:
            continue
        objects = page.get("objects") or {}
        existing_names = {obj.get("name") for obj in objects.values()}
        frames_by_name = {
            obj.get("name"): obj for obj in objects.values() if obj.get("type") == "frame"
        }
        # Cleanup legacy notes inside sections
        for obj in list(objects.values()):
            name = obj.get("name") or ""
            if "/Content/Note" in name or "/Content/Banner" in name:
                if name.startswith("PageNote/") or name.startswith("Section/"):
                    changes.append(
                        {
                            "type": "del-obj",
                            "id": obj["id"],
                            "pageId": page_id,
                        }
                    )

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_template_component_stubs(client, file_id, notes_by_template):
    if not notes_by_template:
        return
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    pages_index = data.get("pagesIndex") or {}
    changes = []

    for page_id, page in pages_index.items():
        page_name = page.get("name", "")
        notes_map = notes_by_template.get(page_name)
        if not notes_map:
            continue
        objects = page.get("objects") or {}
        existing_names = {obj.get("name") for obj in objects.values()}
        # Cleanup legacy stubs inside sections
        for obj in list(objects.values()):
            name = obj.get("name") or ""
            if "/Stub/" in name and (name.startswith("Section/") or name.startswith("PageStub/")):
                changes.append(
                    {
                        "type": "del-obj",
                        "id": obj["id"],
                        "pageId": page_id,
                    }
                )
        frames_by_name = {
            obj.get("name"): obj for obj in objects.values() if obj.get("type") == "frame"
        }
        for section_name, note_text in notes_map.items():
            frame_name = f"Section/{section_name}"
            frame = frames_by_name.get(frame_name)
            if not frame:
                continue
            components = parse_component_list(note_text)
            if not components:
                continue
            section_x = float(frame.get("x", 80))
            section_y = float(frame.get("y", 80))
            section_w = float(frame.get("width", 1200))
            stub_x = section_x + 16
            stub_y = section_y + 48
            stub_width = max(240, min(420, section_w - 32))
            for idx, label in enumerate(components):
                stub_name = f"PageStub/{frame_name}/Stub/{label}"
                y = stub_y + idx * 32
                rect = build_rect_shape(
                    stub_name,
                    x=stub_x,
                    y=y,
                    width=stub_width,
                    height=24,
                    parent_id="00000000-0000-0000-0000-000000000000",
                    frame_id="00000000-0000-0000-0000-000000000000",
                    radius=4,
                    fill_color="#F3F4F6",
                    stroke_color="#D1D5DB",
                    stroke_width=1,
                )
                text = build_text_shape(
                    f"{stub_name}/Text",
                    label,
                    x=stub_x + 8,
                    y=y + 4,
                    width=stub_width - 16,
                    height=16,
                    parent_id="00000000-0000-0000-0000-000000000000",
                    frame_id="00000000-0000-0000-0000-000000000000",
                    text_color="#111827",
                    font_size=12,
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": rect["id"],
                        "obj": rect,
                        "pageId": page_id,
                        "frameId": "00000000-0000-0000-0000-000000000000",
                        "parentId": "00000000-0000-0000-0000-000000000000",
                    }
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": text["id"],
                        "obj": text,
                        "pageId": page_id,
                        "frameId": "00000000-0000-0000-0000-000000000000",
                        "parentId": "00000000-0000-0000-0000-000000000000",
                    }
                )

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_page_component_stubs(client, file_id, sections_by_template, notes_by_template):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    pages_index = data.get("pagesIndex") or {}
    changes = []

    for page_id, page in pages_index.items():
        page_name = page.get("name", "")
        template = pick_template_for_page(page_name)
        if not template or template not in notes_by_template:
            continue
        objects = page.get("objects") or {}
        existing_names = {obj.get("name") for obj in objects.values()}
        frames_by_name = {
            obj.get("name"): obj for obj in objects.values() if obj.get("type") == "frame"
        }
        # Cleanup existing page stubs
        for obj in list(objects.values()):
            name = obj.get("name") or ""
            if name.startswith("PageStub/"):
                changes.append(
                    {
                        "type": "del-obj",
                        "id": obj["id"],
                        "pageId": page_id,
                    }
                )
        notes_map = notes_by_template.get(template) or {}
        for section_name, note_text in notes_map.items():
            frame_name = f"Section/{section_name}"
            frame = frames_by_name.get(frame_name)
            if not frame:
                continue
            components = parse_component_list(note_text)
            if not components:
                continue
            stub_x = 16
            stub_y = 48
            stub_width = max(240, min(420, float(frame.get("width", 1200)) - 32))
            for idx, label in enumerate(components):
                stub_name = f"PageStub/{frame_name}/Stub/{label}"
                if stub_name in existing_names:
                    continue
                y = stub_y + idx * 32
                rect = build_rect_shape(
                    stub_name,
                    x=stub_x,
                    y=y,
                    width=stub_width,
                    height=24,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                    radius=4,
                    fill_color="#F3F4F6",
                    stroke_color="#D1D5DB",
                    stroke_width=1,
                )
                text = build_text_shape(
                    f"{stub_name}/Text",
                    label,
                    x=stub_x + 8,
                    y=y + 4,
                    width=stub_width - 16,
                    height=16,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                    text_color="#111827",
                    font_size=12,
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": rect["id"],
                        "obj": rect,
                        "pageId": page_id,
                        "frameId": frame["id"],
                        "parentId": frame["id"],
                    }
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": text["id"],
                        "obj": text,
                        "pageId": page_id,
                        "frameId": frame["id"],
                        "parentId": frame["id"],
                    }
                )

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_page_template_notes(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    pages_index = data.get("pagesIndex") or {}
    root_frame_id = "00000000-0000-0000-0000-000000000000"

    changes = []

    for page_id, page in pages_index.items():
        page_name = page.get("name", "")
        template = pick_template_for_page(page_name)
        if not template:
            continue
        objects = page.get("objects") or {}
        existing_names = {obj.get("name") for obj in objects.values()}
        marker_name = f"AUTO:TEMPLATE:{template}"
        if marker_name in existing_names:
            continue
        shape = build_text_shape(
            marker_name,
            f"TEMPLATE: {template}",
            x=80,
            y=140,
            width=800,
            height=30,
            parent_id=root_frame_id,
            frame_id=root_frame_id,
        )
        changes.append(
            {
                "type": "add-obj",
                "id": shape["id"],
                "obj": shape,
                "pageId": page_id,
                "frameId": root_frame_id,
                "parentId": root_frame_id,
            }
        )

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_page_sections(client, file_id, sections_by_template, notes_by_template=None):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    pages_index = data.get("pagesIndex") or {}
    root_frame_id = "00000000-0000-0000-0000-000000000000"

    changes = []

    for page_id, page in pages_index.items():
        page_name = page.get("name", "")
        template = pick_template_for_page(page_name)
        sections = sections_by_template.get(template) if template else None
        if not sections:
            continue
        objects = page.get("objects") or {}
        existing_names = {obj.get("name") for obj in objects.values()}
        # Clean up any legacy note artifacts (both PageNote/* and Section/* variants)
        for obj in list(objects.values()):
            name = obj.get("name") or ""
            if "/Content/Note" in name or "/Content/Banner" in name:
                if name.startswith("PageNote/") or name.startswith("Section/"):
                    changes.append(
                        {
                            "type": "del-obj",
                            "id": obj["id"],
                            "pageId": page_id,
                        }
                    )
            # Extra cleanup only for Home page Header/Hero where legacy names had spaced slashes
            if page_name.startswith("Главная") and ("Header" in name or "Hero" in name):
                if "PageNote" in name and "Content" in name and "Note" in name:
                    changes.append(
                        {
                            "type": "del-obj",
                            "id": obj["id"],
                            "pageId": page_id,
                        }
                    )
        x = 80
        y = 220
        width = 1200
        gap = 40
        for section_name, height in sections:
            frame_name = f"Section/{section_name}"
            if frame_name in existing_names:
                frame = next(
                    (obj for obj in objects.values() if obj.get("name") == frame_name), None
                )
            else:
                frame_id, frame_shape = build_frame_shape(
                    frame_name, x, y, width, height, root_frame_id
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": frame_id,
                        "obj": frame_shape,
                        "pageId": page_id,
                        "frameId": root_frame_id,
                        "parentId": root_frame_id,
                    }
                )
                label = build_text_shape(
                    f"Label: {frame_name}",
                    section_name,
                    x=16,
                    y=12,
                    width=width - 32,
                    height=24,
                    parent_id=frame_id,
                    frame_id=frame_id,
                )
                changes.append(
                    {
                        "type": "add-obj",
                        "id": label["id"],
                        "obj": label,
                        "pageId": page_id,
                        "frameId": frame_id,
                        "parentId": frame_id,
                    }
                )
                frame = {"id": frame_id}
            if notes_by_template and template in notes_by_template:
                note_text = notes_by_template[template].get(section_name)
                if note_text:
                    note_name = f"PageNote/{frame_name}/Content/Note"
                    box_name = f"PageNote/{frame_name}/Content/Note/Box"
                    text_name = f"PageNote/{frame_name}/Content/Note/Text"
                    title_name = f"PageNote/{frame_name}/Content/Note/Title"
                    note_text_clean = normalize_note_text(note_text)
                    note_obj = next(
                        (obj for obj in objects.values() if obj.get("name") == note_name), None
                    )
                    if note_obj:
                        changes.append(
                            {
                                "type": "del-obj",
                                "id": note_obj["id"],
                                "pageId": page_id,
                            }
                        )
                    text_obj = next(
                        (obj for obj in objects.values() if obj.get("name") == text_name), None
                    )
                    if text_obj:
                        changes.append(
                            {
                                "type": "del-obj",
                                "id": text_obj["id"],
                                "pageId": page_id,
                            }
                        )
                    title_obj = next(
                        (obj for obj in objects.values() if obj.get("name") == title_name), None
                    )
                    if title_obj:
                        changes.append(
                            {
                                "type": "del-obj",
                                "id": title_obj["id"],
                                "pageId": page_id,
                            }
                        )
                    box_obj = next(
                        (obj for obj in objects.values() if obj.get("name") == box_name), None
                    )
                    if box_obj:
                        changes.append(
                            {
                                "type": "del-obj",
                                "id": box_obj["id"],
                                "pageId": page_id,
                            }
                        )
                    frame_obj = next(
                        (obj for obj in objects.values() if obj.get("name") == frame_name),
                        None,
                    )
                    section_x = float(frame_obj.get("x", x)) if frame_obj else float(x)
                    section_y = float(frame_obj.get("y", y)) if frame_obj else float(y)
                    section_w = float(frame_obj.get("width", width)) if frame_obj else float(width)
                    note_x = section_x + 12
                    note_y = section_y + 12
                    if True:
                        box = build_rect_shape(
                            box_name,
                            x=note_x,
                            y=note_y,
                            width=section_w - 24,
                            height=92,
                            parent_id=root_frame_id,
                            frame_id=root_frame_id,
                            radius=6,
                            fill_color="#FFF7D6",
                            fill_opacity=0.6,
                            stroke_color="#F1D98C",
                            stroke_width=1,
                        )
                        changes.append(
                            {
                                "type": "add-obj",
                                "id": box["id"],
                                "obj": box,
                                "pageId": page_id,
                                "frameId": root_frame_id,
                                "parentId": root_frame_id,
                            }
                        )
                    note = build_text_shape(
                        text_name,
                        note_text_clean,
                        x=note_x + 8,
                        y=note_y + 26,
                        width=section_w - 40,
                        height=64,
                        parent_id=root_frame_id,
                        frame_id=root_frame_id,
                        text_color="#111827",
                        font_size=14,
                    )
                    changes.append(
                        {
                            "type": "add-obj",
                            "id": note["id"],
                            "obj": note,
                            "pageId": page_id,
                            "frameId": root_frame_id,
                            "parentId": root_frame_id,
                        }
                    )
                    title = build_text_shape(
                        title_name,
                        "Components:",
                        x=note_x + 8,
                        y=note_y + 8,
                        width=400,
                        height=20,
                        parent_id=root_frame_id,
                        frame_id=root_frame_id,
                        text_color="#111827",
                        font_size=14,
                    )
                    changes.append(
                        {
                            "type": "add-obj",
                            "id": title["id"],
                            "obj": title,
                            "pageId": page_id,
                            "frameId": root_frame_id,
                            "parentId": root_frame_id,
                        }
                    )
            y += height + gap

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_component_placeholders(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Components")
    if not page_id or not page:
        return

    root_frame_id = ROOT_FRAME_ID
    objects = page.get("objects") or {}
    existing_names = {obj.get("name") for obj in objects.values()}

    changes = []
    x = 80
    y = 120
    max_row_width = 1600
    row_height = 0
    gap = 80

    for name, width, height in COMPONENT_PLACEHOLDERS:
        if name in existing_names:
            continue

        if x + width > max_row_width:
            x = 80
            y += row_height + gap
            row_height = 0

        frame_id, frame_shape = build_frame_shape(
            name, x, y, width, height, root_frame_id
        )
        label_shape = build_text_shape(
            f"Label: {name}",
            name,
            x=12,
            y=12,
            width=max(200, width - 24),
            height=24,
            parent_id=frame_id,
            frame_id=frame_id,
        )

        changes.append(
            {
                "type": "add-obj",
                "id": frame_id,
                "obj": frame_shape,
                "pageId": page_id,
                "frameId": root_frame_id,
                "parentId": root_frame_id,
            }
        )
        changes.append(
            {
                "type": "add-obj",
                "id": label_shape["id"],
                "obj": label_shape,
                "pageId": page_id,
                "frameId": frame_id,
                "parentId": frame_id,
            }
        )

        x += width + gap
        row_height = max(row_height, height)

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def reset_components_page(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Components")
    if not page_id or not page:
        return

    objects = page.get("objects") or {}
    changes = []
    for obj in objects.values():
        if obj.get("id") == ROOT_FRAME_ID:
            continue
        changes.append({"type": "del-obj", "id": obj["id"], "pageId": page_id})

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_component_basics(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Components")
    if not page_id or not page:
        return

    objects = page.get("objects") or {}
    frames_by_name = {
        obj.get("name"): obj for obj in objects.values() if obj.get("type") == "frame"
    }
    existing_names = {obj.get("name") for obj in objects.values()}

    def add_obj(shape, frame_id):
        return {
            "type": "add-obj",
            "id": shape["id"],
            "obj": shape,
            "pageId": page_id,
            "frameId": frame_id,
            "parentId": frame_id,
        }

    changes = []

    def abs_xy(frame, x, y):
        return float(frame.get("x", 0)) + float(x), float(frame.get("y", 0)) + float(y)

    def clear_children(frame, prefixes):
        if not frame:
            return
        for obj in list(objects.values()):
            if obj.get("frameId") != frame.get("id"):
                continue
            name = obj.get("name") or ""
            if any(name.startswith(prefix) for prefix in prefixes):
                changes.append({"type": "del-obj", "id": obj["id"], "pageId": page_id})
                existing_names.discard(name)

    def add_button(frame_name, label, fill, stroke=None):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        is_primary = frame_name.endswith("/Primary")
        states = [
            ("Default", fill, stroke),
            ("Hover", "#0052A3" if is_primary else "#F3F4F6", stroke or "#E5E7EB"),
            ("Active", "#003D7A" if is_primary else "#E5E7EB", stroke or "#D1D5DB"),
            ("Disabled", "#E5E7EB", "#E5E7EB"),
        ]
        start_y = 20
        gap = 14
        for idx, (state, state_fill, state_stroke) in enumerate(states):
            rect_name = f"{frame_name}/State/{state}"
            text_name = f"{frame_name}/Text/{state}"
            if rect_name in existing_names or text_name in existing_names:
                continue
            y = start_y + idx * (44 + gap)
            rect = build_rect_shape(
                rect_name,
                x=20,
                y=y,
                width=160,
                height=44,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=8,
                fill_color=state_fill,
                stroke_color=state_stroke,
                stroke_width=1,
            )
            text = build_text_shape(
                text_name,
                label,
                x=36,
                y=y + 12,
                width=120,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            tag = build_text_shape(
                f"{frame_name}/Tag/{state}",
                state,
                x=200,
                y=y + 12,
                width=80,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(rect, frame["id"]), add_obj(text, frame["id"]), add_obj(tag, frame["id"])])

    def add_input(frame_name, placeholder, height):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        base_name = f"{frame_name}/Base"
        if base_name in existing_names:
            return
        states = [
            ("Default", "#D1D5DB", "#FFFFFF", None),
            ("Focus", "#0066CC", "#FFFFFF", None),
            ("Error", "#EF4444", "#FFFFFF", "Ошибка: поле обязательно"),
            ("Disabled", "#E5E7EB", "#F3F4F6", None),
        ]
        start_y = 20
        gap = 18
        for idx, (label, stroke, fill, error_text) in enumerate(states):
            y = start_y + idx * (height + gap)
            rect = build_rect_shape(
                f"{frame_name}/Base/{label}",
                x=20,
                y=y,
                width=300,
                height=height,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=8,
                fill_color=fill,
                stroke_color=stroke,
            )
            text = build_text_shape(
                f"{frame_name}/Placeholder/{label}",
                placeholder if label != "Disabled" else "Недоступно",
                x=36,
                y=y + 12,
                width=240,
                height=24,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            tag = build_text_shape(
                f"{frame_name}/State/{label}",
                label,
                x=330,
                y=y + 12,
                width=80,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(rect, frame["id"]), add_obj(text, frame["id"]), add_obj(tag, frame["id"])])
            if error_text:
                err = build_text_shape(
                    f"{frame_name}/Error/{label}",
                    error_text,
                    x=24,
                    y=y + height + 4,
                    width=280,
                    height=18,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.append(add_obj(err, frame["id"]))

    def add_select_states():
        frame = frames_by_name.get("Dropdown/Select")
        if not frame:
            return
        hover_name = "Dropdown/Select/Base/Hover"
        if hover_name not in existing_names:
            rect = build_rect_shape(
                hover_name,
                x=20,
                y=240,
                width=300,
                height=44,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=8,
                fill_color="#F3F4F6",
                stroke_color="#D1D5DB",
            )
            text = build_text_shape(
                "Dropdown/Select/Placeholder/Hover",
                "Выберите значение (hover)",
                x=36,
                y=252,
                width=240,
                height=24,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            tag = build_text_shape(
                "Dropdown/Select/State/Hover",
                "Hover",
                x=330,
                y=252,
                width=80,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(rect, frame["id"]), add_obj(text, frame["id"]), add_obj(tag, frame["id"])])
        active_name = "Dropdown/Select/Base/Active"
        if active_name not in existing_names:
            rect = build_rect_shape(
                active_name,
                x=20,
                y=302,
                width=300,
                height=44,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=8,
                fill_color="#FFFFFF",
                stroke_color="#0066CC",
            )
            text = build_text_shape(
                "Dropdown/Select/Placeholder/Active",
                "Выбрано: вариант 1",
                x=36,
                y=314,
                width=240,
                height=24,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            tag = build_text_shape(
                "Dropdown/Select/State/Active",
                "Active",
                x=330,
                y=314,
                width=80,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(rect, frame["id"]), add_obj(text, frame["id"]), add_obj(tag, frame["id"])])

    def add_field_coverage_notes():
        notes = [
            ("Form/Input", "Типы: text, email, tel"),
            ("Form/Textarea", "Тип: textarea"),
            ("Form/Checkbox", "Тип: checkbox (required)"),
            ("Form/Radio", "Тип: radio"),
            ("Form/FileUpload", "Тип: file"),
            ("Dropdown/Select", "Тип: select"),
        ]
        for frame_name, text in notes:
            frame = frames_by_name.get(frame_name)
            if not frame:
                continue
            note_name = f"{frame_name}/Coverage/Note"
            if note_name in existing_names:
                continue
            note = build_text_shape(
                note_name,
                text,
                x=20,
                y=4,
                width=260,
                height=18,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.append(add_obj(note, frame["id"]))

    def add_checkbox(frame_name):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        box_name = f"{frame_name}/Box/Default"
        if box_name in existing_names:
            return
        variants = [
            ("Default", "#FFFFFF", "#D1D5DB", "Согласие"),
            ("Checked", "#0066CC", "#0066CC", "Согласие"),
            ("Error", "#FFFFFF", "#EF4444", "Согласие (ошибка)"),
        ]
        y = 24
        for label, fill, stroke, text_label in variants:
            x_abs, y_abs = abs_xy(frame, 20, y)
            rect = build_rect_shape(
                f"{frame_name}/Box/{label}",
                x=x_abs,
                y=y_abs,
                width=20,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=4,
                fill_color=fill,
                stroke_color=stroke,
            )
            text = build_text_shape(
                f"{frame_name}/Label/{label}",
                text_label,
                x=x_abs + 28,
                y=y_abs,
                width=200,
                height=24,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            tag = build_text_shape(
                f"{frame_name}/State/{label}",
                label,
                x=x_abs + 240,
                y=y_abs,
                width=80,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(rect, frame["id"]), add_obj(text, frame["id"]), add_obj(tag, frame["id"])])
            y += 36

    def add_radio_states(frame_name):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        marker_name = f"{frame_name}/State/Default"
        if marker_name in existing_names:
            return
        states = [
            ("Default", "#D1D5DB", "#FFFFFF", False, "#6B7280"),
            ("Hover", "#4A90E2", "#E6F0FA", False, "#4A90E2"),
            ("Checked", "#0066CC", "#FFFFFF", True, "#0066CC"),
            ("Disabled", "#E5E7EB", "#F3F4F6", False, "#9CA3AF"),
            ("Error", "#EF4444", "#FFFFFF", False, "#EF4444"),
        ]
        y = 24
        for label, stroke, fill, checked, text_color in states:
            x_abs, y_abs = abs_xy(frame, 20, y)
            outer = build_rect_shape(
                f"{frame_name}/State/{label}",
                x=x_abs,
                y=y_abs,
                width=20,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=10,
                fill_color=fill,
                stroke_color=stroke,
                stroke_width=2,
            )
            changes.append(add_obj(outer, frame["id"]))
            if checked:
                inner = build_rect_shape(
                    f"{frame_name}/State/{label}/Dot",
                    x=x_abs + 5,
                    y=y_abs + 5,
                    width=10,
                    height=10,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                    radius=5,
                    fill_color="#0066CC",
                    stroke_color=None,
                    stroke_width=0,
                )
                changes.append(add_obj(inner, frame["id"]))
            label_text = build_text_shape(
                f"{frame_name}/Label/{label}",
                label,
                x=x_abs + 28,
                y=y_abs,
                width=160,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
                text_color=text_color,
                font_size=12,
                font_weight=600 if label in {"Checked", "Error"} else 500,
            )
            changes.append(add_obj(label_text, frame["id"]))
            y += 32

    def add_file_upload_states(frame_name):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        marker_name = f"{frame_name}/State/Empty"
        if marker_name in existing_names:
            return
        x = 20
        y = 20
        width = frame.get("width", 520) - 40
        primary = "#1173D4"
        slate_700 = "#334155"
        slate_500 = "#64748B"
        slate_400 = "#94A3B8"
        slate_200 = "#E2E8F0"
        slate_100 = "#F1F5F9"
        slate_800 = "#1E293B"
        red_500 = "#EF4444"
        red_400 = "#F87171"
        font_main = "Inter"
        font_icons = "Material Symbols Outlined"

        def approx_width(text, size, scale=0.55):
            return len(text) * size * scale

        x_abs, y_abs = abs_xy(frame, x, y)
        empty = build_rect_shape(
            f"{frame_name}/State/Empty",
            x=x_abs,
            y=y_abs,
            width=width,
            height=136,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=12,
            fill_color="#FFFFFF",
            fill_opacity=0,
            stroke_color=slate_700,
            stroke_width=2,
            stroke_style="dashed",
        )
        empty_icon = build_text_shape(
            f"{frame_name}/State/Empty/Icon",
            "upload_file",
            x=x_abs + width / 2 - 20,
            y=y_abs + 24,
            width=40,
            height=40,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=slate_400,
            font_size=36,
            font_family=font_icons,
            font_weight=400,
            text_align="center",
        )
        line_left = "Перетащите файл или"
        line_right = "выберите на диске"
        line_size = 14
        total_width = approx_width(line_left, line_size) + approx_width(line_right, line_size) + 6
        line_x = x_abs + width / 2 - total_width / 2
        empty_text_left = build_text_shape(
            f"{frame_name}/State/Empty/Text",
            line_left,
            x=line_x,
            y=y_abs + 72,
            width=approx_width(line_left, line_size),
            height=20,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=slate_400,
            font_size=line_size,
            font_weight=500,
            font_family=font_main,
        )
        empty_text_right = build_text_shape(
            f"{frame_name}/State/Empty/Link",
            line_right,
            x=line_x + approx_width(line_left, line_size) + 6,
            y=y_abs + 72,
            width=approx_width(line_right, line_size),
            height=20,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=primary,
            font_size=line_size,
            font_weight=500,
            font_family=font_main,
        )
        empty_hint = build_text_shape(
            f"{frame_name}/State/Empty/Hint",
            "PDF, DOCX до 10 МБ",
            x=x_abs + 24,
            y=y_abs + 96,
            width=width - 48,
            height=18,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=slate_500,
            font_size=12,
            font_weight=400,
            font_family=font_main,
            text_align="center",
        )
        changes.extend(
            [
                add_obj(empty, frame["id"]),
                add_obj(empty_icon, frame["id"]),
                add_obj(empty_text_left, frame["id"]),
                add_obj(empty_text_right, frame["id"]),
                add_obj(empty_hint, frame["id"]),
            ]
        )
        y += 152
        x_abs, y_abs = abs_xy(frame, x, y)
        drag = build_rect_shape(
            f"{frame_name}/State/Drag",
            x=x_abs,
            y=y_abs,
            width=width,
            height=96,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=12,
            fill_color=primary,
            fill_opacity=0.1,
            stroke_color=primary,
            stroke_width=2,
        )
        drag_icon = build_text_shape(
            f"{frame_name}/State/Drag/Icon",
            "add_circle",
            x=x_abs + width / 2 - 20,
            y=y_abs + 16,
            width=40,
            height=40,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=primary,
            font_size=36,
            font_family=font_icons,
            font_weight=400,
            text_align="center",
        )
        drag_text = build_text_shape(
            f"{frame_name}/State/Drag/Text",
            "Отпустите, чтобы загрузить",
            x=x_abs + 16,
            y=y_abs + 60,
            width=width - 32,
            height=20,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=primary,
            font_size=14,
            font_weight=700,
            font_family=font_main,
            text_align="center",
        )
        changes.extend(
            [
                add_obj(drag, frame["id"]),
                add_obj(drag_icon, frame["id"]),
                add_obj(drag_text, frame["id"]),
            ]
        )
        y += 112
        x_abs, y_abs = abs_xy(frame, x, y)
        uploaded = build_rect_shape(
            f"{frame_name}/State/Uploaded",
            x=x_abs,
            y=y_abs,
            width=width,
            height=72,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=12,
            fill_color=slate_800,
            stroke_color=slate_700,
            stroke_width=1,
        )
        uploaded_text = build_text_shape(
            f"{frame_name}/State/Uploaded/Text",
            "dogovor_service_v2.pdf",
            x=x_abs + 52,
            y=y_abs + 16,
            width=width - 32,
            height=20,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=slate_100,
            font_size=14,
            font_weight=500,
            font_family=font_main,
        )
        uploaded_hint = build_text_shape(
            f"{frame_name}/State/Uploaded/Hint",
            "452 KB • Загружено",
            x=x_abs + 52,
            y=y_abs + 36,
            width=width - 32,
            height=18,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=slate_500,
            font_size=10,
            font_weight=700,
            font_family=font_main,
        )
        uploaded_icon = build_text_shape(
            f"{frame_name}/State/Uploaded/Icon",
            "description",
            x=x_abs + 20,
            y=y_abs + 18,
            width=24,
            height=24,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=primary,
            font_size=24,
            font_family=font_icons,
            font_weight=400,
        )
        uploaded_close = build_text_shape(
            f"{frame_name}/State/Uploaded/Close",
            "close",
            x=x_abs + width - 32,
            y=y_abs + 18,
            width=24,
            height=16,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=slate_400,
            font_size=20,
            font_family=font_icons,
            font_weight=400,
            text_align="center",
        )
        changes.extend([add_obj(uploaded, frame["id"]), add_obj(uploaded_text, frame["id"])])
        changes.extend(
            [
                add_obj(uploaded_hint, frame["id"]),
                add_obj(uploaded_icon, frame["id"]),
                add_obj(uploaded_close, frame["id"]),
            ]
        )
        y += 88
        x_abs, y_abs = abs_xy(frame, x, y)
        error = build_rect_shape(
            f"{frame_name}/State/Error",
            x=x_abs,
            y=y_abs,
            width=width,
            height=72,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=12,
            fill_color=red_500,
            fill_opacity=0.05,
            stroke_color=red_500,
            stroke_width=2,
            stroke_opacity=0.5,
        )
        error_text = build_text_shape(
            f"{frame_name}/State/Error/Text",
            "Ошибка загрузки",
            x=x_abs + 52,
            y=y_abs + 16,
            width=width - 32,
            height=20,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=red_500,
            font_size=14,
            font_weight=700,
            font_family=font_main,
        )
        error_hint = build_text_shape(
            f"{frame_name}/State/Error/Hint",
            "Файл слишком велик (макс. 10 МБ)",
            x=x_abs + 52,
            y=y_abs + 36,
            width=width - 160,
            height=18,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=red_400,
            font_size=12,
            font_weight=400,
            font_family=font_main,
        )
        error_action = build_text_shape(
            f"{frame_name}/State/Error/Action",
            "Повторить",
            x=x_abs + width - 120,
            y=y_abs + 36,
            width=100,
            height=18,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=red_500,
            font_size=12,
            font_weight=700,
            font_family=font_main,
        )
        error_icon = build_text_shape(
            f"{frame_name}/State/Error/Icon",
            "error",
            x=x_abs + 20,
            y=y_abs + 18,
            width=24,
            height=24,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=red_500,
            font_size=24,
            font_family=font_icons,
            font_weight=400,
        )
        changes.extend([add_obj(error, frame["id"]), add_obj(error_text, frame["id"])])
        changes.extend(
            [
                add_obj(error_hint, frame["id"]),
                add_obj(error_action, frame["id"]),
                add_obj(error_icon, frame["id"]),
            ]
        )

    def add_badges(frame_name):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        marker_name = f"{frame_name}/Badge/Primary"
        if marker_name in existing_names:
            return
        badges = [
            ("НОВОЕ", "#0066CC", "#0066CC", "#FFFFFF", True),
            ("АКТИВНО", "#00A651", "#00A651", "#FFFFFF", True),
            ("ПОПУЛЯРНОЕ", "#F59E0B", "#F59E0B", "#FFFFFF", True),
            ("КЛАУД", "#FFFFFF", "#0066CC", "#0066CC", False),
            ("АРХИВ", "#FFFFFF", "#9CA3AF", "#6B7280", False),
            ("СРОЧНО", "#FFFFFF", "#E30611", "#E30611", False),
        ]
        x = 20
        y = 24
        max_width = frame.get("width", 520) - 20
        row_height = 28
        for label, fill, stroke, text_color, filled in badges:
            width = max(72, len(label) * 8 + 28)
            if x + width > max_width:
                x = 20
                y += row_height + 12
            x_abs, y_abs = abs_xy(frame, x, y)
            rect = build_rect_shape(
                f"{frame_name}/Badge/{label}",
                x=x_abs,
                y=y_abs,
                width=width,
                height=24,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=999,
                fill_color=fill if filled else "#FFFFFF",
                stroke_color=stroke,
                stroke_width=1,
            )
            text = build_text_shape(
                f"{frame_name}/Badge/{label}/Text",
                label,
                x=x_abs + 12,
                y=y_abs + 4,
                width=width - 24,
                height=16,
                parent_id=frame["id"],
                frame_id=frame["id"],
                text_color=text_color,
                font_size=10,
                font_weight=700,
            )
            changes.extend([add_obj(rect, frame["id"]), add_obj(text, frame["id"])])
            x += width + 12

    def add_breadcrumbs(frame_name):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        marker_name = f"{frame_name}/Item/1"
        if marker_name in existing_names:
            return
        items = [
            ("Главная", "#6B7280", 500),
            ("/", "#9CA3AF", 500),
            ("Услуги", "#6B7280", 500),
            ("/", "#9CA3AF", 500),
            ("Облачное хранилище", "#0066CC", 600),
        ]
        x = 20
        y = 8
        for idx, (label, color, weight) in enumerate(items, start=1):
            width = max(24, len(label) * 7 + 6)
            x_abs, y_abs = abs_xy(frame, x, y)
            text = build_text_shape(
                f"{frame_name}/Item/{idx}",
                label,
                x=x_abs,
                y=y_abs,
                width=width,
                height=16,
                parent_id=frame["id"],
                frame_id=frame["id"],
                text_color=color,
                font_size=12,
                font_weight=weight,
            )
            changes.append(add_obj(text, frame["id"]))
            x += width + 6

    def add_card(frame_name):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        image_name = f"{frame_name}/Image"
        title_name = f"{frame_name}/Title"
        text_name = f"{frame_name}/Text"
        if image_name in existing_names:
            return
        image = build_rect_shape(
            image_name,
            x=20,
            y=20,
            width=320,
            height=120,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=8,
            fill_color="#E5E7EB",
        )
        title = build_text_shape(
            title_name,
            "Заголовок",
            x=20,
            y=150,
            width=320,
            height=22,
            parent_id=frame["id"],
            frame_id=frame["id"],
        )
        text = build_text_shape(
            text_name,
            "Краткое описание",
            x=20,
            y=178,
            width=320,
            height=20,
            parent_id=frame["id"],
            frame_id=frame["id"],
        )
        changes.extend(
            [add_obj(image, frame["id"]), add_obj(title, frame["id"]), add_obj(text, frame["id"])]
        )

    def add_text_slot(frame_name, text, y=28):
        frame = frames_by_name.get(frame_name)
        if not frame:
            return
        slot_name = f"{frame_name}/Slot"
        if slot_name in existing_names:
            return
        slot = build_text_shape(
            slot_name,
            text,
            x=24,
            y=y,
            width=frame.get("width", 600) - 48,
            height=24,
            parent_id=frame["id"],
            frame_id=frame["id"],
        )
        changes.append(add_obj(slot, frame["id"]))

    def add_tabs():
        frame = frames_by_name.get("Tabs")
        if not frame:
            return
        item_name = "Tabs/Item/1"
        if item_name not in existing_names:
            x = 20
            for idx, label in enumerate(["Вкладка 1", "Вкладка 2", "Вкладка 3"], start=1):
                rect = build_rect_shape(
                    f"Tabs/Item/{idx}",
                    x=x,
                    y=48,
                    width=160,
                    height=36,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                    radius=6,
                    fill_color="#FFFFFF",
                    stroke_color="#E5E7EB",
                    stroke_width=1,
                )
                text = build_text_shape(
                    f"Tabs/Text/{idx}",
                    label,
                    x=x + 16,
                    y=58,
                    width=130,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.extend([add_obj(rect, frame["id"]), add_obj(text, frame["id"])])
                x += 180
        active_name = "Tabs/Item/Active"
        if active_name not in existing_names:
            active = build_rect_shape(
                active_name,
                x=20,
                y=92,
                width=160,
                height=36,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#D1D5DB",
                stroke_color="#E5E7EB",
                stroke_width=1,
            )
            active_text = build_text_shape(
                "Tabs/Text/Active",
                "Вкладка 1 (active)",
                x=36,
                y=102,
                width=140,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(active, frame["id"]), add_obj(active_text, frame["id"])])
        hover_name = "Tabs/Item/Hover"
        if hover_name not in existing_names:
            hover = build_rect_shape(
                hover_name,
                x=200,
                y=92,
                width=160,
                height=36,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#F3F4F6",
                stroke_color="#E5E7EB",
                stroke_width=1,
            )
            hover_text = build_text_shape(
                "Tabs/Text/Hover",
                "Вкладка 2 (hover)",
                x=216,
                y=102,
                width=140,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(hover, frame["id"]), add_obj(hover_text, frame["id"])])

    def add_pagination():
        frame = frames_by_name.get("Pagination")
        if not frame:
            return
        item_name = "Pagination/Item/1"
        if item_name not in existing_names:
            x = 20
            for idx in range(1, 6):
                rect = build_rect_shape(
                    f"Pagination/Item/{idx}",
                    x=x,
                    y=48,
                    width=40,
                    height=32,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                    radius=6,
                    fill_color="#FFFFFF",
                    stroke_color="#E5E7EB",
                    stroke_width=1,
                )
                text = build_text_shape(
                    f"Pagination/Text/{idx}",
                    str(idx),
                    x=x + 12,
                    y=56,
                    width=16,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.extend([add_obj(rect, frame["id"]), add_obj(text, frame["id"])])
                x += 56
        active_name = "Pagination/Item/Active"
        if active_name not in existing_names:
            active = build_rect_shape(
                active_name,
                x=20,
                y=88,
                width=40,
                height=32,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#D1D5DB",
                stroke_color="#E5E7EB",
                stroke_width=1,
            )
            active_text = build_text_shape(
                "Pagination/Text/Active",
                "1",
                x=32,
                y=96,
                width=16,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(active, frame["id"]), add_obj(active_text, frame["id"])])
        hover_name = "Pagination/Item/Hover"
        if hover_name not in existing_names:
            hover = build_rect_shape(
                hover_name,
                x=76,
                y=88,
                width=40,
                height=32,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#F3F4F6",
                stroke_color="#E5E7EB",
                stroke_width=1,
            )
            hover_text = build_text_shape(
                "Pagination/Text/Hover",
                "2",
                x=88,
                y=96,
                width=16,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(hover, frame["id"]), add_obj(hover_text, frame["id"])])

    def add_dropdown_menu():
        frame = frames_by_name.get("Dropdown/Menu")
        if not frame:
            return
        first_item = "Dropdown/Menu/Item/1"
        if first_item not in existing_names:
            y = 24
            for idx, label in enumerate(["Пункт 1", "Пункт 2", "Пункт 3"], start=1):
                rect = build_rect_shape(
                    f"Dropdown/Menu/Item/{idx}",
                    x=20,
                    y=y,
                    width=240,
                    height=40,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                    radius=6,
                    fill_color="#FFFFFF",
                    stroke_color="#E5E7EB",
                    stroke_width=1,
                )
                text = build_text_shape(
                    f"Dropdown/Menu/Text/{idx}",
                    label,
                    x=32,
                    y=y + 10,
                    width=200,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.extend([add_obj(rect, frame["id"]), add_obj(text, frame["id"])])
                y += 44
        hover_name = "Dropdown/Menu/Item/Hover"
        if hover_name not in existing_names:
            hover_y = 24 + 3 * 44
            hover = build_rect_shape(
                hover_name,
                x=20,
                y=hover_y,
                width=240,
                height=40,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#E5E7EB",
                stroke_color="#E5E7EB",
                stroke_width=1,
            )
            hover_text = build_text_shape(
                "Dropdown/Menu/Text/Hover",
                "Пункт 2 (hover)",
                x=32,
                y=hover_y + 10,
                width=200,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(hover, frame["id"]), add_obj(hover_text, frame["id"])])
        active_name = "Dropdown/Menu/Item/Active"
        if active_name not in existing_names:
            active_y = 24 + 4 * 44
            active = build_rect_shape(
                active_name,
                x=20,
                y=active_y,
                width=240,
                height=40,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#D1D5DB",
                stroke_color="#D1D5DB",
                stroke_width=1,
            )
            active_text = build_text_shape(
                "Dropdown/Menu/Text/Active",
                "Пункт 3 (active)",
                x=32,
                y=active_y + 10,
                width=200,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(active, frame["id"]), add_obj(active_text, frame["id"])])

    def add_table():
        frame = frames_by_name.get("Table/Base")
        if not frame:
            return
        header_name = "Table/Base/Header"
        if header_name in existing_names:
            return
        header = build_rect_shape(
            header_name,
            x=20,
            y=20,
            width=1160,
            height=48,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=6,
            fill_color="#F3F4F6",
            stroke_color="#E5E7EB",
            stroke_width=1,
        )
        changes.append(add_obj(header, frame["id"]))
        for idx, title in enumerate(["Услуга", "Срок", "Цена"], start=1):
            text = build_text_shape(
                f"Table/Base/Header/Text/{idx}",
                title,
                x=32 + (idx - 1) * 320,
                y=34,
                width=280,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.append(add_obj(text, frame["id"]))
        y = 72
        for row in range(1, 4):
            rect = build_rect_shape(
                f"Table/Base/Row/{row}",
                x=20,
                y=y,
                width=1160,
                height=44,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#FFFFFF",
                stroke_color="#E5E7EB",
                stroke_width=1,
            )
            changes.append(add_obj(rect, frame["id"]))
            for idx, value in enumerate(["Позиция", "10 дней", "от 100 000"], start=1):
                text = build_text_shape(
                    f"Table/Base/Row/{row}/Text/{idx}",
                    value,
                    x=32 + (idx - 1) * 320,
                    y=y + 12,
                    width=280,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.append(add_obj(text, frame["id"]))
            y += 48
        hover_name = "Table/Base/Row/Hover"
        if hover_name not in existing_names:
            hover_y = 72 + 48
            hover = build_rect_shape(
                hover_name,
                x=20,
                y=hover_y,
                width=1160,
                height=44,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#F3F4F6",
                stroke_color="#E5E7EB",
                stroke_width=1,
            )
            hover_text = build_text_shape(
                "Table/Base/Row/Hover/Text/1",
                "Позиция (hover)",
                x=32,
                y=hover_y + 12,
                width=280,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(hover, frame["id"]), add_obj(hover_text, frame["id"])])

    def add_menu_top():
        frame = frames_by_name.get("Menu/Top")
        if not frame:
            return
        item_name = "Menu/Top/Item/1"
        if item_name not in existing_names:
            x = 140
            for idx, label in enumerate(
                ["О компании", "Застройщикам", "Операторам", "Госзаказчикам"], start=1
            ):
                text = build_text_shape(
                    f"Menu/Top/Item/{idx}",
                    label,
                    x=x,
                    y=28,
                    width=140,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.append(add_obj(text, frame["id"]))
                x += 170
        hover_name = "Menu/Top/Hover"
        if hover_name not in existing_names:
            hover_x = 140
            hover = build_rect_shape(
                hover_name,
                x=hover_x - 10,
                y=48,
                width=150,
                height=24,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#E5E7EB",
            )
            hover_text = build_text_shape(
                "Menu/Top/Hover/Text",
                "Застройщикам (hover)",
                x=hover_x,
                y=52,
                width=140,
                height=18,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(hover, frame["id"]), add_obj(hover_text, frame["id"])])
        active_name = "Menu/Top/Active"
        if active_name not in existing_names:
            active_x = 310
            active = build_rect_shape(
                active_name,
                x=active_x - 10,
                y=74,
                width=150,
                height=24,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#D1D5DB",
            )
            active_text = build_text_shape(
                "Menu/Top/Active/Text",
                "Операторам (active)",
                x=active_x,
                y=78,
                width=140,
                height=18,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(active, frame["id"]), add_obj(active_text, frame["id"])])

    def add_menu_mega():
        frame = frames_by_name.get("Menu/Mega")
        if not frame:
            return
        col_name = "Menu/Mega/Col/1/Title"
        if col_name not in existing_names:
            for col, title in enumerate(["Решения", "Застройщикам", "Операторам"], start=1):
                tx = 24 + (col - 1) * 360
                title_text = build_text_shape(
                    f"Menu/Mega/Col/{col}/Title",
                    title,
                    x=tx,
                    y=24,
                    width=300,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.append(add_obj(title_text, frame["id"]))
                for idx, item in enumerate(["Пункт 1", "Пункт 2", "Пункт 3"], start=1):
                    item_text = build_text_shape(
                        f"Menu/Mega/Col/{col}/Item/{idx}",
                        item,
                        x=tx,
                        y=24 + idx * 28,
                        width=300,
                        height=20,
                        parent_id=frame["id"],
                        frame_id=frame["id"],
                    )
                    changes.append(add_obj(item_text, frame["id"]))
        hover_name = "Menu/Mega/Col/1/Item/Hover"
        if hover_name not in existing_names:
            hover = build_rect_shape(
                hover_name,
                x=18,
                y=24 + 2 * 28 - 6,
                width=320,
                height=28,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#E5E7EB",
            )
            hover_text = build_text_shape(
                "Menu/Mega/Col/1/Item/Hover/Text",
                "Пункт 2 (hover)",
                x=24,
                y=24 + 2 * 28,
                width=300,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(hover, frame["id"]), add_obj(hover_text, frame["id"])])
        active_name = "Menu/Mega/Col/1/Item/Active"
        if active_name not in existing_names:
            active = build_rect_shape(
                active_name,
                x=18,
                y=24 + 3 * 28 - 6,
                width=320,
                height=28,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#D1D5DB",
            )
            active_text = build_text_shape(
                "Menu/Mega/Col/1/Item/Active/Text",
                "Пункт 3 (active)",
                x=24,
                y=24 + 3 * 28,
                width=300,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(active, frame["id"]), add_obj(active_text, frame["id"])])

    def add_menu_sidebar():
        frame = frames_by_name.get("Menu/Sidebar")
        if not frame:
            return
        item_name = "Menu/Sidebar/Item/1"
        if item_name not in existing_names:
            y = 24
            for idx, label in enumerate(
                ["Раздел 1", "Раздел 2", "Раздел 3", "Раздел 4"], start=1
            ):
                text = build_text_shape(
                    f"Menu/Sidebar/Item/{idx}",
                    label,
                    x=24,
                    y=y,
                    width=260,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.append(add_obj(text, frame["id"]))
                y += 28
        hover_name = "Menu/Sidebar/Hover"
        if hover_name not in existing_names:
            hover = build_rect_shape(
                hover_name,
                x=16,
                y=140,
                width=280,
                height=32,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#E5E7EB",
            )
            hover_text = build_text_shape(
                "Menu/Sidebar/Hover/Text",
                "Раздел 2 (hover)",
                x=24,
                y=146,
                width=260,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(hover, frame["id"]), add_obj(hover_text, frame["id"])])
        active_name = "Menu/Sidebar/Active"
        if active_name not in existing_names:
            active = build_rect_shape(
                active_name,
                x=16,
                y=168,
                width=280,
                height=32,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#D1D5DB",
            )
            active_text = build_text_shape(
                "Menu/Sidebar/Active/Text",
                "Раздел 3 (active)",
                x=24,
                y=174,
                width=260,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(active, frame["id"]), add_obj(active_text, frame["id"])])

    def add_menu_footer():
        frame = frames_by_name.get("Menu/Footer")
        if not frame:
            return
        item_name = "Menu/Footer/Col/1/Title"
        if item_name not in existing_names:
            for col, title in enumerate(["О компании", "Услуги", "Контакты"], start=1):
                tx = 24 + (col - 1) * 360
                title_text = build_text_shape(
                    f"Menu/Footer/Col/{col}/Title",
                    title,
                    x=tx,
                    y=24,
                    width=300,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.append(add_obj(title_text, frame["id"]))
                for idx, item in enumerate(["Пункт 1", "Пункт 2", "Пункт 3"], start=1):
                    item_text = build_text_shape(
                        f"Menu/Footer/Col/{col}/Item/{idx}",
                        item,
                        x=tx,
                        y=24 + idx * 26,
                        width=300,
                        height=20,
                        parent_id=frame["id"],
                        frame_id=frame["id"],
                    )
                    changes.append(add_obj(item_text, frame["id"]))
        hover_name = "Menu/Footer/Col/1/Item/Hover"
        if hover_name not in existing_names:
            hover = build_rect_shape(
                hover_name,
                x=18,
                y=24 + 2 * 26 - 6,
                width=320,
                height=28,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#E5E7EB",
            )
            hover_text = build_text_shape(
                "Menu/Footer/Col/1/Item/Hover/Text",
                "Пункт 2 (hover)",
                x=24,
                y=24 + 2 * 26,
                width=300,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(hover, frame["id"]), add_obj(hover_text, frame["id"])])
        active_name = "Menu/Footer/Col/1/Item/Active"
        if active_name not in existing_names:
            active = build_rect_shape(
                active_name,
                x=18,
                y=24 + 3 * 26 - 6,
                width=320,
                height=28,
                parent_id=frame["id"],
                frame_id=frame["id"],
                radius=6,
                fill_color="#D1D5DB",
            )
            active_text = build_text_shape(
                "Menu/Footer/Col/1/Item/Active/Text",
                "Пункт 3 (active)",
                x=24,
                y=24 + 3 * 26,
                width=300,
                height=20,
                parent_id=frame["id"],
                frame_id=frame["id"],
            )
            changes.extend([add_obj(active, frame["id"]), add_obj(active_text, frame["id"])])

    def add_modal():
        frame = frames_by_name.get("Modal/Base")
        if frame:
            overlay_name = "Modal/Base/Overlay"
            if overlay_name not in existing_names:
                overlay = build_rect_shape(
                    overlay_name,
                    x=20,
                    y=20,
                    width=680,
                    height=380,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                    radius=12,
                    fill_color="#FFFFFF",
                    stroke_color="#E5E7EB",
                )
                title = build_text_shape(
                    "Modal/Base/Title",
                    "Заголовок",
                    x=40,
                    y=40,
                    width=400,
                    height=24,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                body = build_text_shape(
                    "Modal/Base/Body",
                    "Текст модального окна",
                    x=40,
                    y=76,
                    width=500,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.extend([add_obj(overlay, frame["id"]), add_obj(title, frame["id"]), add_obj(body, frame["id"])])
            cta_name = "Modal/Base/CTA/Primary"
            if cta_name not in existing_names:
                primary = build_rect_shape(
                    cta_name,
                    x=40,
                    y=320,
                    width=160,
                    height=40,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                    radius=8,
                    fill_color="#0066CC",
                )
                primary_text = build_text_shape(
                    "Modal/Base/CTA/Primary/Text",
                    "Отправить",
                    x=60,
                    y=330,
                    width=120,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                secondary = build_rect_shape(
                    "Modal/Base/CTA/Secondary",
                    x=220,
                    y=320,
                    width=140,
                    height=40,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                    radius=8,
                    fill_color="#F3F4F6",
                    stroke_color="#E5E7EB",
                    stroke_width=1,
                )
                secondary_text = build_text_shape(
                    "Modal/Base/CTA/Secondary/Text",
                    "Отмена",
                    x=244,
                    y=330,
                    width=100,
                    height=20,
                    parent_id=frame["id"],
                    frame_id=frame["id"],
                )
                changes.extend(
                    [
                        add_obj(primary, frame["id"]),
                        add_obj(primary_text, frame["id"]),
                        add_obj(secondary, frame["id"]),
                        add_obj(secondary_text, frame["id"]),
                    ]
                )
        confirm = frames_by_name.get("Modal/Confirm")
        if confirm:
            confirm_name = "Modal/Confirm/Body"
            if confirm_name not in existing_names:
                panel = build_rect_shape(
                    "Modal/Confirm/Panel",
                    x=20,
                    y=20,
                    width=480,
                    height=240,
                    parent_id=confirm["id"],
                    frame_id=confirm["id"],
                    radius=12,
                    fill_color="#FFFFFF",
                    stroke_color="#E5E7EB",
                )
                title = build_text_shape(
                    "Modal/Confirm/Title",
                    "Подтвердить действие?",
                    x=40,
                    y=40,
                    width=380,
                    height=24,
                    parent_id=confirm["id"],
                    frame_id=confirm["id"],
                )
                changes.extend([add_obj(panel, confirm["id"]), add_obj(title, confirm["id"])])
            cta_name = "Modal/Confirm/CTA/Primary"
            if cta_name not in existing_names:
                primary = build_rect_shape(
                    cta_name,
                    x=40,
                    y=180,
                    width=140,
                    height=40,
                    parent_id=confirm["id"],
                    frame_id=confirm["id"],
                    radius=8,
                    fill_color="#0066CC",
                )
                primary_text = build_text_shape(
                    "Modal/Confirm/CTA/Primary/Text",
                    "Да",
                    x=90,
                    y=190,
                    width=60,
                    height=20,
                    parent_id=confirm["id"],
                    frame_id=confirm["id"],
                )
                secondary = build_rect_shape(
                    "Modal/Confirm/CTA/Secondary",
                    x=200,
                    y=180,
                    width=140,
                    height=40,
                    parent_id=confirm["id"],
                    frame_id=confirm["id"],
                    radius=8,
                    fill_color="#F3F4F6",
                    stroke_color="#E5E7EB",
                    stroke_width=1,
                )
                secondary_text = build_text_shape(
                    "Modal/Confirm/CTA/Secondary/Text",
                    "Нет",
                    x=250,
                    y=190,
                    width=60,
                    height=20,
                    parent_id=confirm["id"],
                    frame_id=confirm["id"],
                )
                changes.extend(
                    [
                        add_obj(primary, confirm["id"]),
                        add_obj(primary_text, confirm["id"]),
                        add_obj(secondary, confirm["id"]),
                        add_obj(secondary_text, confirm["id"]),
                    ]
                )

    clear_children(frames_by_name.get("Badge/Chip"), ["Badge/Chip/Badge/"])
    clear_children(frames_by_name.get("Form/Radio"), ["Form/Radio/"])
    clear_children(frames_by_name.get("Form/FileUpload"), ["Form/FileUpload/"])
    add_button("Button/Primary", "Primary", "#0066CC")
    add_button("Button/Secondary", "Secondary", "#FFFFFF", stroke="#0066CC")
    add_input("Form/Input", "Введите текст", 44)
    add_input("Form/Textarea", "Введите сообщение", 90)
    add_checkbox("Form/Checkbox")
    add_radio_states("Form/Radio")
    add_file_upload_states("Form/FileUpload")
    add_badges("Badge/Chip")
    add_card("Card/Service")
    add_card("Card/Scenario")
    add_card("Card/News")
    add_text_slot("Header/Desktop", "Logo | Меню | CTA")
    add_text_slot("Header/Mobile", "Logo | Burger | CTA")
    add_text_slot("Footer/Desktop", "Колонки | Контакты | CTA", y=40)
    add_text_slot("Footer/Mobile", "Колонки | Контакты | CTA", y=40)
    add_text_slot("Hero", "H1 + подзаголовок + CTA", y=40)
    add_text_slot("CTA/Banner", "CTA Banner", y=40)
    add_breadcrumbs("Breadcrumbs")
    add_text_slot("Tabs", "Tab 1 | Tab 2 | Tab 3", y=12)
    add_text_slot("Accordion/Item", "Вопрос →", y=12)
    add_text_slot("Pagination", "1 2 3 …", y=8)
    add_input("Search/Input", "Поиск", 40)
    add_input("Dropdown/Select", "Выберите значение", 44)
    add_select_states()
    add_field_coverage_notes()
    add_text_slot("Logo Wall", "Logos x12", y=40)
    add_text_slot("AI/Chat Widget", "AI чат: виджет", y=32)
    add_text_slot("AI/Chat Panel", "AI чат: панель", y=32)
    add_text_slot("Slider/Hero", "Слайдер: Hero", y=40)
    add_text_slot("Slider/Logo Wall", "Слайдер: Лого", y=40)
    add_text_slot("Table/Base", "Таблица: заголовки + строки", y=24)
    add_text_slot("List/Bulleted", "• Пункт списка 1\n• Пункт списка 2\n• Пункт списка 3", y=24)
    add_text_slot("List/Numbered", "1. Пункт 1\n2. Пункт 2\n3. Пункт 3", y=24)
    add_text_slot("List/Check", "✓ Пункт 1\n✓ Пункт 2\n✓ Пункт 3", y=24)
    add_text_slot("Menu/Top", "Логотип | Разделы | Поиск | CTA", y=24)
    add_text_slot("Menu/Mega", "Мега‑меню: колонки + CTA", y=24)
    add_text_slot("Menu/Footer", "Футер: колонки ссылок", y=24)
    add_text_slot("Menu/Sidebar", "Сайдбар: список ссылок", y=24)
    add_input("Dropdown/Select", "Выберите значение", 44)
    add_text_slot("Dropdown/Menu", "Dropdown items…", y=24)
    add_text_slot("Modal/Base", "Модальное окно: заголовок + контент + CTA", y=24)
    add_text_slot("Modal/Confirm", "Подтверждение: текст + 2 кнопки", y=24)
    add_tabs()
    add_pagination()
    add_dropdown_menu()
    add_table()
    add_menu_top()
    add_menu_mega()
    add_menu_sidebar()
    add_menu_footer()
    add_modal()

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_component_designs(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Components")
    if not page_id or not page:
        return

    objects = page.get("objects") or {}
    existing_names = {obj.get("name") for obj in objects.values()}
    frames_by_name = {
        obj.get("name"): obj for obj in objects.values() if obj.get("type") == "frame"
    }

    changes = []

    def add_obj(shape, frame_id):
        return {
            "type": "add-obj",
            "id": shape["id"],
            "obj": shape,
            "pageId": page_id,
            "frameId": frame_id,
            "parentId": frame_id,
        }

    def add_rect(frame, name, x, y, w, h, fill, stroke=None, radius=8, opacity=1):
        if name in existing_names:
            return
        rect = build_rect_shape(
            name,
            x=x,
            y=y,
            width=w,
            height=h,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=radius,
            fill_color=fill,
            fill_opacity=opacity,
            stroke_color=stroke,
            stroke_width=1,
        )
        changes.append(add_obj(rect, frame["id"]))

    def add_text(frame, name, text, x, y, w, h, size=14, weight=400, family="MTS Text", color="#111827"):
        if name in existing_names:
            return
        text_shape = build_text_shape(
            name,
            text,
            x=x,
            y=y,
            width=w,
            height=h,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color=color,
            font_size=size,
            font_family=family,
            font_weight=weight,
            font_style="normal",
        )
        changes.append(add_obj(text_shape, frame["id"]))

    header = frames_by_name.get("Header/Desktop")
    if header:
        w = float(header.get("width", 1440))
        add_rect(header, "Design/Header/BG", 0, 0, w, 96, "#FFFFFF", stroke="#E5E7EB", radius=0)
        add_text(header, "Design/Header/Logo", "MGTS B2B", 24, 28, 140, 24, size=16, weight=600, family="MTS Sans")
        add_text(header, "Design/Header/Menu/1", "Застройщикам", 200, 28, 140, 24, size=14)
        add_text(header, "Design/Header/Menu/2", "Операторам", 360, 28, 120, 24, size=14)
        add_text(header, "Design/Header/Menu/3", "Госзаказчикам", 500, 28, 140, 24, size=14)
        add_rect(header, "Design/Header/CTA", w - 180, 22, 156, 36, "#0066CC", radius=8)
        add_text(header, "Design/Header/CTA/Text", "Подключить", w - 160, 30, 120, 20, size=14, weight=600, family="MTS Text", color="#FFFFFF")

    hero = frames_by_name.get("Hero")
    if hero:
        w = float(hero.get("width", 1440))
        h = float(hero.get("height", 480))
        add_rect(hero, "Design/Hero/BG", 0, 0, w, h, "#F3F4F6", radius=0)
        add_text(hero, "Design/Hero/Heading", "Единые B2B‑решения для города и бизнеса", 48, 60, w - 96, 80, size=32, weight=700, family="MTS Sans")
        add_text(hero, "Design/Hero/Subheading", "Инфраструктура, безопасность, связь и сервисы от МГТС", 48, 150, w - 96, 40, size=16, weight=400, family="MTS Text", color="#374151")
        add_rect(hero, "Design/Hero/CTA", 48, 210, 180, 44, "#0066CC", radius=8)
        add_text(hero, "Design/Hero/CTA/Text", "Подобрать решение", 64, 222, 160, 20, size=14, weight=600, family="MTS Text", color="#FFFFFF")

    cta = frames_by_name.get("CTA/Banner")
    if cta:
        w = float(cta.get("width", 1200))
        h = float(cta.get("height", 200))
        add_rect(cta, "Design/CTA/BG", 0, 0, w, h, "#0066CC", radius=12)
        add_text(cta, "Design/CTA/Text", "Нужна консультация? Подберем решение под задачу.", 32, 40, w - 64, 40, size=20, weight=600, family="MTS Sans", color="#FFFFFF")
        add_rect(cta, "Design/CTA/Button", 32, 110, 180, 44, "#FFFFFF", radius=8)
        add_text(cta, "Design/CTA/Button/Text", "Оставить заявку", 48, 122, 160, 20, size=14, weight=600, family="MTS Text", color="#0066CC")

    card_service = frames_by_name.get("Card/Service")
    if card_service:
        add_rect(card_service, "Design/Card/Service/Image", 16, 16, 320, 120, "#E5E7EB", radius=8)
        add_text(card_service, "Design/Card/Service/Title", "Видеонаблюдение", 16, 148, 320, 24, size=16, weight=600, family="MTS Sans")
        add_text(card_service, "Design/Card/Service/Text", "Комплексное решение для безопасности объекта", 16, 176, 320, 40, size=12, weight=400, family="MTS Text", color="#4B5563")

    card_scenario = frames_by_name.get("Card/Scenario")
    if card_scenario:
        add_rect(card_scenario, "Design/Card/Scenario/Image", 16, 16, 320, 120, "#E5E7EB", radius=8)
        add_text(card_scenario, "Design/Card/Scenario/Title", "Сценарий: Безопасный объект", 16, 148, 320, 24, size=14, weight=600, family="MTS Sans")
        add_text(card_scenario, "Design/Card/Scenario/Text", "Подборка услуг под задачу строительства", 16, 176, 320, 40, size=12, weight=400, family="MTS Text", color="#4B5563")

    card_news = frames_by_name.get("Card/News")
    if card_news:
        add_rect(card_news, "Design/Card/News/Image", 16, 16, 320, 120, "#E5E7EB", radius=8)
        add_text(card_news, "Design/Card/News/Date", "12.03.2026", 16, 148, 120, 20, size=12, weight=400, family="MTS Text", color="#6B7280")
        add_text(card_news, "Design/Card/News/Title", "МГТС запустил новый сервис для бизнеса", 16, 172, 320, 32, size=14, weight=600, family="MTS Sans")

    footer = frames_by_name.get("Footer/Desktop")
    if footer:
        w = float(footer.get("width", 1440))
        h = float(footer.get("height", 320))
        add_rect(footer, "Design/Footer/BG", 0, 0, w, h, "#111827", radius=0)
        add_text(footer, "Design/Footer/Col1", "О компании", 32, 40, 200, 20, size=12, weight=600, family="MTS Sans", color="#FFFFFF")
        add_text(footer, "Design/Footer/Col2", "Услуги", 320, 40, 200, 20, size=12, weight=600, family="MTS Sans", color="#FFFFFF")
        add_text(footer, "Design/Footer/Col3", "Контакты", 600, 40, 200, 20, size=12, weight=600, family="MTS Sans", color="#FFFFFF")
        add_text(footer, "Design/Footer/Note", "© МГТС, 2026", 32, h - 40, 200, 20, size=12, weight=400, family="MTS Text", color="#D1D5DB")

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)

def ensure_component_grid_layout(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Components")
    if not page_id or not page:
        return

    objects = page.get("objects") or {}
    frames_by_name = {
        obj.get("name"): obj for obj in objects.values() if obj.get("type") == "frame"
    }
    order = [name for name, _, _ in COMPONENT_PLACEHOLDERS]
    changes = []

    def shift_obj(obj, dx, dy):
        updates = {}
        if "x" in obj:
            updates["x"] = float(obj.get("x", 0)) + dx
        if "y" in obj:
            updates["y"] = float(obj.get("y", 0)) + dy
        selrect = obj.get("selrect")
        if selrect:
            updates["selrect"] = {
                "x": float(selrect.get("x", 0)) + dx,
                "y": float(selrect.get("y", 0)) + dy,
                "width": float(selrect.get("width", 0)),
                "height": float(selrect.get("height", 0)),
                "x1": float(selrect.get("x1", 0)) + dx,
                "y1": float(selrect.get("y1", 0)) + dy,
                "x2": float(selrect.get("x2", 0)) + dx,
                "y2": float(selrect.get("y2", 0)) + dy,
            }
        points = obj.get("points")
        if points:
            updates["points"] = [
                {"x": float(pt.get("x", 0)) + dx, "y": float(pt.get("y", 0)) + dy}
                for pt in points
            ]
        return updates

    x = 80
    y = 120
    gap_x = 80
    gap_y = 80
    max_width = 1800
    row_height = 0

    for name in order:
        frame = frames_by_name.get(name)
        if not frame:
            continue
        width = float(frame.get("width", 600))
        height = float(frame.get("height", 200))

        if x + width > max_width:
            x = 80
            y += row_height + gap_y
            row_height = 0

        new_x = float(x)
        new_y = float(y)
        old_x = float(frame.get("x", 0))
        old_y = float(frame.get("y", 0))
        dx = new_x - old_x
        dy = new_y - old_y
        if dx or dy:
            changes.append(
                {
                    "type": "mod-obj",
                    "id": frame["id"],
                    "pageId": page_id,
                    "operations": [{"type": "assign", "value": {"x": new_x, "y": new_y}}],
                }
            )
            for obj in objects.values():
                if obj.get("frameId") != frame.get("id"):
                    continue
                if obj.get("id") == frame.get("id"):
                    continue
                updates = shift_obj(obj, dx, dy)
                if not updates:
                    continue
                changes.append(
                    {
                        "type": "mod-obj",
                        "id": obj["id"],
                        "pageId": page_id,
                        "operations": [{"type": "assign", "value": updates}],
                    }
                )

        x += width + gap_x
        row_height = max(row_height, height)

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_component_frame_transparency(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Components")
    if not page_id or not page:
        return

    objects = page.get("objects") or {}
    transparent_fill = [{"fillColor": "#FFFFFF", "fillOpacity": 0}]
    component_names = {name for name, _, _ in COMPONENT_PLACEHOLDERS}

    changes = []
    for obj in objects.values():
        if obj.get("type") != "frame":
            continue
        name = obj.get("name") or ""
        if name not in component_names:
            continue
        needs_fill = obj.get("fills") != transparent_fill
        needs_unclip = obj.get("clipContent", True) is True
        if not needs_fill and not needs_unclip:
            continue
        changes.append(
            {
                "type": "mod-obj",
                "id": obj["id"],
                "pageId": page_id,
                "operations": [
                    {"type": "set", "attr": "fills", "val": transparent_fill},
                    {"type": "set", "attr": "clipContent", "val": False},
                ],
            }
        )

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_component_deduplicate(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Components")
    if not page_id or not page:
        return

    objects = page.get("objects") or {}
    seen = {}
    changes = []

    for obj in objects.values():
        name = obj.get("name")
        if not name:
            continue
        if obj.get("type") == "frame":
            continue
        key = (name, obj.get("frameId"))
        if key in seen:
            changes.append({"type": "del-obj", "id": obj["id"], "pageId": page_id})
        else:
            seen[key] = obj["id"]

    if not changes:
        return
    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)


def ensure_visual_design_samples(client, file_id):
    file_data = client.rpc("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")

    page_id, page = find_page_by_name(file_data, "Components")
    if not page_id or not page:
        return

    objects = page.get("objects") or {}
    frames_by_name = {
        obj.get("name"): obj for obj in objects.values() if obj.get("type") == "frame"
    }
    existing_names = {obj.get("name") for obj in objects.values()}

    changes = []

    def add_obj(shape, frame_id):
        return {
            "type": "add-obj",
            "id": shape["id"],
            "obj": shape,
            "pageId": page_id,
            "frameId": frame_id,
            "parentId": frame_id,
        }

    def add_header_design():
        frame = frames_by_name.get("Header/Desktop")
        if not frame:
            return
        base_name = "Design/Header/Desktop/Base"
        if base_name in existing_names:
            return
        base = build_rect_shape(
            base_name,
            x=0,
            y=0,
            width=frame.get("width", 1440),
            height=frame.get("height", 96),
            parent_id=frame["id"],
            frame_id=frame["id"],
            fill_color="#FFFFFF",
            stroke_color="#E5E7EB",
            stroke_width=1,
        )
        logo = build_text_shape(
            "Design/Header/Desktop/Logo",
            "MGTS",
            x=24,
            y=28,
            width=120,
            height=32,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#111827",
            font_size=20,
        )
        menu = build_text_shape(
            "Design/Header/Desktop/Menu",
            "Застройщикам  •  Операторам  •  Госзаказчикам",
            x=200,
            y=34,
            width=600,
            height=24,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#111827",
            font_size=14,
        )
        cta = build_rect_shape(
            "Design/Header/Desktop/CTA",
            x=1180,
            y=24,
            width=200,
            height=48,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=8,
            fill_color="#0066CC",
        )
        cta_text = build_text_shape(
            "Design/Header/Desktop/CTA/Text",
            "Связаться",
            x=1220,
            y=36,
            width=140,
            height=24,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#FFFFFF",
            font_size=14,
        )
        changes.extend(
            [
                add_obj(base, frame["id"]),
                add_obj(logo, frame["id"]),
                add_obj(menu, frame["id"]),
                add_obj(cta, frame["id"]),
                add_obj(cta_text, frame["id"]),
            ]
        )

    def add_hero_design():
        frame = frames_by_name.get("Hero")
        if not frame:
            return
        base_name = "Design/Hero/Base"
        if base_name in existing_names:
            return
        base = build_rect_shape(
            base_name,
            x=0,
            y=0,
            width=frame.get("width", 1440),
            height=frame.get("height", 480),
            parent_id=frame["id"],
            frame_id=frame["id"],
            fill_color="#F3F4F6",
        )
        title = build_text_shape(
            "Design/Hero/Title",
            "Цифровая инфраструктура для города и бизнеса",
            x=64,
            y=80,
            width=720,
            height=80,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#111827",
            font_size=36,
        )
        subtitle = build_text_shape(
            "Design/Hero/SubTitle",
            "Надежные решения связи, безопасности и эксплуатации для крупных объектов.",
            x=64,
            y=170,
            width=640,
            height=60,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#374151",
            font_size=16,
        )
        cta = build_rect_shape(
            "Design/Hero/CTA",
            x=64,
            y=250,
            width=200,
            height=48,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=8,
            fill_color="#0066CC",
        )
        cta_text = build_text_shape(
            "Design/Hero/CTA/Text",
            "Подобрать решение",
            x=78,
            y=262,
            width=180,
            height=24,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#FFFFFF",
            font_size=14,
        )
        image = build_rect_shape(
            "Design/Hero/Image",
            x=820,
            y=60,
            width=520,
            height=320,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=12,
            fill_color="#E5E7EB",
        )
        changes.extend(
            [
                add_obj(base, frame["id"]),
                add_obj(title, frame["id"]),
                add_obj(subtitle, frame["id"]),
                add_obj(cta, frame["id"]),
                add_obj(cta_text, frame["id"]),
                add_obj(image, frame["id"]),
            ]
        )

    def add_cta_design():
        frame = frames_by_name.get("CTA/Banner")
        if not frame:
            return
        base_name = "Design/CTA/Banner/Base"
        if base_name in existing_names:
            return
        base = build_rect_shape(
            base_name,
            x=0,
            y=0,
            width=frame.get("width", 1200),
            height=frame.get("height", 200),
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=12,
            fill_color="#E30611",
        )
        text = build_text_shape(
            "Design/CTA/Banner/Text",
            "Обсудим ваш проект и подберем оптимальное решение",
            x=32,
            y=60,
            width=720,
            height=40,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#FFFFFF",
            font_size=20,
        )
        button = build_rect_shape(
            "Design/CTA/Banner/Button",
            x=900,
            y=60,
            width=220,
            height=56,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=10,
            fill_color="#FFFFFF",
        )
        button_text = build_text_shape(
            "Design/CTA/Banner/Button/Text",
            "Оставить заявку",
            x=920,
            y=78,
            width=180,
            height=24,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#111827",
            font_size=14,
        )
        changes.extend(
            [
                add_obj(base, frame["id"]),
                add_obj(text, frame["id"]),
                add_obj(button, frame["id"]),
                add_obj(button_text, frame["id"]),
            ]
        )

    def add_service_card_design():
        frame = frames_by_name.get("Card/Service")
        if not frame:
            return
        base_name = "Design/Card/Service/Base"
        if base_name in existing_names:
            return
        base = build_rect_shape(
            base_name,
            x=0,
            y=0,
            width=frame.get("width", 360),
            height=frame.get("height", 220),
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=12,
            fill_color="#FFFFFF",
            stroke_color="#E5E7EB",
            stroke_width=1,
        )
        icon = build_rect_shape(
            "Design/Card/Service/Icon",
            x=20,
            y=20,
            width=40,
            height=40,
            parent_id=frame["id"],
            frame_id=frame["id"],
            radius=20,
            fill_color="#E5E7EB",
        )
        title = build_text_shape(
            "Design/Card/Service/Title",
            "Системы безопасности",
            x=20,
            y=72,
            width=300,
            height=24,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#111827",
            font_size=16,
        )
        desc = build_text_shape(
            "Design/Card/Service/Desc",
            "Проектирование и обслуживание комплексных систем.",
            x=20,
            y=100,
            width=300,
            height=48,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#4B5563",
            font_size=12,
        )
        cta = build_text_shape(
            "Design/Card/Service/Link",
            "Подробнее →",
            x=20,
            y=160,
            width=120,
            height=20,
            parent_id=frame["id"],
            frame_id=frame["id"],
            text_color="#0066CC",
            font_size=12,
        )
        changes.extend(
            [
                add_obj(base, frame["id"]),
                add_obj(icon, frame["id"]),
                add_obj(title, frame["id"]),
                add_obj(desc, frame["id"]),
                add_obj(cta, frame["id"]),
            ]
        )

    add_header_design()
    add_hero_design()
    add_cta_design()
    add_service_card_design()

    if not changes:
        return

    payload = {
        "id": file_id,
        "sessionId": str(uuid.uuid4()),
        "revn": revn,
        "vern": vern,
        "changes": changes,
    }
    client.rpc("update-file", payload)
def main():
    if not TOKEN and (not EMAIL or not PASSWORD):
        raise RuntimeError(
            "Provide PENPOT_TOKEN or PENPOT_EMAIL/PENPOT_PASSWORD environment variables."
        )

    structure = parse_structure(STRUCTURE_PATH)
    client = PenpotClient(BASE_URL, token=TOKEN)
    if not TOKEN:
        client.login(EMAIL, PASSWORD)

    teams = client.rpc("get-teams", {}) or []
    team = pick_by_name(teams, TEAM_NAME)
    if not team:
        team_names = ", ".join([t.get("name", "?") for t in teams]) or "none"
        raise RuntimeError(f"Team '{TEAM_NAME}' not found. Available: {team_names}")

    projects = client.rpc("get-projects", {"teamId": team["id"]}) or []
    project = pick_by_name(projects, PROJECT_NAME)
    if not project:
        project_names = ", ".join([p.get("name", "?") for p in projects]) or "none"
        raise RuntimeError(
            f"Project '{PROJECT_NAME}' not found. Available: {project_names}"
        )

    project_id = project["id"]
    files = client.rpc("get-project-files", {"projectId": project_id}) or []
    files_by_name = {f.get("name"): f for f in files}

    created_files = []
    for file_name, page_names in structure.items():
        file_data = files_by_name.get(file_name)
        if not file_data:
            file_data = client.rpc(
                "create-file", {"name": file_name, "projectId": project_id}
            )
            files_by_name[file_name] = file_data
            created_files.append(file_data["id"])

        ensure_pages(client, file_data["id"], file_name, page_names)

    # Templates file
    templates_file = files_by_name.get(TEMPLATES_FILE)
    if not templates_file:
        templates_file = client.rpc(
            "create-file", {"name": TEMPLATES_FILE, "projectId": project_id}
        )
        files_by_name[TEMPLATES_FILE] = templates_file
    ensure_pages(client, templates_file["id"], TEMPLATES_FILE, TEMPLATES_PAGES)

    # UI Kit file
    ui_kit_file = files_by_name.get(UI_KIT_FILE)
    if not ui_kit_file:
        ui_kit_file = client.rpc(
            "create-file", {"name": UI_KIT_FILE, "projectId": project_id}
        )
        files_by_name[UI_KIT_FILE] = ui_kit_file
    ensure_pages(client, ui_kit_file["id"], UI_KIT_FILE, UI_KIT_PAGES)
    ensure_ui_tokens(client, ui_kit_file["id"])
    reset_components_page(client, ui_kit_file["id"])
    ensure_component_placeholders(client, ui_kit_file["id"])
    ensure_component_grid_layout(client, ui_kit_file["id"])
    ensure_tokens_visuals(client, ui_kit_file["id"])
    ensure_component_basics(client, ui_kit_file["id"])
    ensure_component_designs(client, ui_kit_file["id"])
    ensure_component_frame_transparency(client, ui_kit_file["id"])
    ensure_component_deduplicate(client, ui_kit_file["id"])
    ensure_form_states(client, ui_kit_file["id"])

    # Placeholders in templates
    template_data = client.rpc("get-file", {"id": templates_file["id"]})
    template_pages = template_data.get("data", {}).get("pagesIndex", {})
    labels = {}
    for page_id, page in template_pages.items():
        name = page.get("name", "")
        labels[page_id] = f"TEMPLATE: {name}"
    ensure_placeholders(client, templates_file["id"], labels)
    ensure_template_sections(client, templates_file["id"], TEMPLATE_SECTIONS)
    ensure_template_content_notes(client, templates_file["id"], TEMPLATE_SECTION_NOTES)
    ensure_template_component_stubs(client, templates_file["id"], TEMPLATE_SECTION_NOTES)

    # Placeholders in UI Kit
    ui_data = client.rpc("get-file", {"id": ui_kit_file["id"]})
    ui_pages = ui_data.get("data", {}).get("pagesIndex", {})
    ui_labels = {}
    for page_id, page in ui_pages.items():
        name = page.get("name", "")
        if name == "Tokens":
            ui_labels[page_id] = "TOKENS: colors, typography, grid, breakpoints"
        elif name == "Components":
            ui_labels[page_id] = "COMPONENTS: header, footer, buttons, cards, forms"
    ensure_placeholders(client, ui_kit_file["id"], ui_labels)

    # Link all files to UI Kit library (skip self)
    library_id = ui_kit_file["id"]
    for file_name, file_data in files_by_name.items():
        file_id = file_data["id"]
        if file_id == library_id:
            continue
        client.rpc("link-file-to-library", {"fileId": file_id, "libraryId": library_id})

    # Apply template mapping labels to site pages
    for file_name in structure.keys():
        file_data = files_by_name.get(file_name)
        if not file_data:
            continue
        ensure_page_template_notes(client, file_data["id"])
        ensure_page_sections(
            client, file_data["id"], TEMPLATE_SECTIONS, TEMPLATE_SECTION_NOTES
        )
        ensure_text_fonts(client, file_data["id"])
        ensure_section_frame_transparency(client, file_data["id"])
        ensure_page_component_stubs(
            client, file_data["id"], TEMPLATE_SECTIONS, TEMPLATE_SECTION_NOTES
        )

    ensure_text_fonts(client, templates_file["id"])
    ensure_text_fonts(client, ui_kit_file["id"])
    ensure_section_frame_transparency(client, templates_file["id"])
    ensure_visual_design_samples(client, ui_kit_file["id"])

    print("Penpot structure applied successfully.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)

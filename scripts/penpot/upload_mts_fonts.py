#!/usr/bin/env python3
import io
import json
import os
import ssl
import uuid
from http.cookiejar import CookieJar
from urllib import request, error

import base64
import transit.writer
import transit.reader
from transit.transit_types import Keyword


BASE_URL = os.environ.get("PENPOT_URL", "https://localhost:3449").rstrip("/")
EMAIL = os.environ.get("PENPOT_EMAIL")
PASSWORD = os.environ.get("PENPOT_PASSWORD")
TEAM_NAME = os.environ.get("PENPOT_TEAM_NAME", "MGTS")
PROJECT_NAME = os.environ.get("PENPOT_PROJECT_NAME", "MGTS")
FONTS_DIR = os.environ.get(
    "PENPOT_FONTS_DIR",
    "/Users/andrey_efremov/Downloads/runs/SiteMGTS/fonts",
)

TARGET_FAMILIES = {
    "MTSSans": "MTS Sans",
    "MTSText": "MTS Text",
}

WEIGHTS = {
    "Regular": 400,
    "Medium": 500,
    "Bold": 700,
    "Black": 900,
}


SSL_CONTEXT = ssl._create_unverified_context()


class PenpotClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.cookie_jar = CookieJar()
        self.opener = request.build_opener(
            request.HTTPSHandler(context=SSL_CONTEXT),
            request.HTTPCookieProcessor(self.cookie_jar),
        )
        self.transit_writer = transit.writer.Writer(io.BytesIO(), "json")

    def _headers_json(self):
        return {"Content-Type": "application/json", "Accept": "application/json"}

    def _headers_transit(self):
        return {
            "Content-Type": "application/transit+json",
            "Accept": "application/transit+json",
        }

    def rpc_json(self, method, params):
        url = f"{self.base_url}/api/main/methods/{method}"
        body = json.dumps(params).encode("utf-8")
        req = request.Request(url, data=body, headers=self._headers_json(), method="POST")
        try:
            with self.opener.open(req) as resp:
                data = resp.read()
        except error.HTTPError as exc:
            payload = exc.read().decode("utf-8", "ignore")
            raise RuntimeError(f"RPC {method} failed: {exc.code} {payload}") from exc
        if not data:
            return None
        return json.loads(data.decode("utf-8", "ignore"))

    def rpc_transit(self, method, params):
        url = f"{self.base_url}/api/main/methods/{method}"
        buffer = io.StringIO()
        writer = transit.writer.Writer(buffer, "json")
        writer.write(params)
        body = buffer.getvalue().encode("utf-8")
        req = request.Request(
            url, data=body, headers=self._headers_transit(), method="POST"
        )
        try:
            with self.opener.open(req) as resp:
                data = resp.read()
                ctype = resp.headers.get("content-type", "")
        except error.HTTPError as exc:
            payload = exc.read().decode("utf-8", "ignore")
            raise RuntimeError(f"RPC {method} failed: {exc.code} {payload}") from exc
        if not data:
            return None
        if "application/transit+json" in ctype:
            reader = transit.reader.Reader("json")
            return reader.read(io.BytesIO(data))
        return json.loads(data.decode("utf-8", "ignore"))

    def login(self, email, password):
        self.rpc_json("login-with-password", {"email": email, "password": password})


def pick_by_name(items, name):
    for item in items:
        if item.get("name") == name:
            return item
    return None


def parse_font_filename(filename):
    if not filename.endswith(".otf"):
        return None
    for prefix, family in TARGET_FAMILIES.items():
        if not filename.startswith(prefix + "-"):
            continue
        weight_name = filename.replace(prefix + "-", "").replace(".otf", "")
        weight = WEIGHTS.get(weight_name)
        if not weight:
            return None
        return {
            "family_key": prefix,
            "family": family,
            "weight": weight,
            "style": "normal",
        }
    return None


def load_fonts():
    fonts = []
    for name in os.listdir(FONTS_DIR):
        meta = parse_font_filename(name)
        if not meta:
            continue
        path = os.path.join(FONTS_DIR, name)
        with open(path, "rb") as handle:
            data = handle.read()
        fonts.append({**meta, "path": path, "data": data, "filename": name})
    return fonts


def update_typographies(client, file_id, family_to_font_id):
    file_data = client.rpc_json("get-file", {"id": file_id})
    revn = file_data.get("revn")
    vern = file_data.get("vern")
    data = file_data.get("data") or {}
    typographies = data.get("typographies") or {}

    changes = []
    for typo_id, typo in typographies.items():
        name = typo.get("name")
        if name and name.startswith("H"):
            family = "MTS Sans"
        else:
            family = "MTS Text"

        font_id = family_to_font_id.get(family)
        if not font_id:
            continue
        target_font_id = f"custom-{font_id}"

        if typo.get("fontFamily") == family and typo.get("fontId") == target_font_id:
            continue

        updated = dict(typo)
        updated["fontFamily"] = family
        updated["fontId"] = target_font_id
        changes.append({"type": "mod-typography", "typography": updated})

    if not changes:
        return

    client.rpc_json(
        "update-file",
        {
            "id": file_id,
            "sessionId": str(uuid.uuid4()),
            "revn": revn,
            "vern": vern,
            "changes": changes,
        },
    )


def main():
    if not EMAIL or not PASSWORD:
        raise RuntimeError("Provide PENPOT_EMAIL and PENPOT_PASSWORD.")

    client = PenpotClient(BASE_URL)
    client.login(EMAIL, PASSWORD)

    teams = client.rpc_json("get-teams", {}) or []
    team = pick_by_name(teams, TEAM_NAME)
    if not team:
        raise RuntimeError(f"Team '{TEAM_NAME}' not found.")

    team_id = team["id"]
    fonts = load_fonts()
    if not fonts:
        raise RuntimeError(f"No fonts found in {FONTS_DIR}.")

    existing = client.rpc_json("get-font-variants", {"teamId": team_id}) or []
    existing_key = {
        (f.get("font-family"), str(f.get("font-weight")), f.get("font-style")): f
        for f in existing
    }
    family_to_font_id = {
        f.get("font-family"): f.get("font-id")
        for f in existing
        if f.get("font-family") and f.get("font-id")
    }

    for font in fonts:
        key = (font["family"], str(font["weight"]), font["style"])
        if key in existing_key:
            continue
        font_id = family_to_font_id.get(font["family"]) or str(uuid.uuid4())
        family_to_font_id[font["family"]] = font_id
        font_uuid = uuid.UUID(font_id)

        payload = {
            Keyword("team-id"): team_id,
            Keyword("data"): {
                "font/otf": transit.writer.TaggedValue(
                    "b", base64.b64encode(font["data"]).decode("ascii")
                )
            },
            Keyword("font-id"): font_uuid,
            Keyword("font-family"): font["family"],
            Keyword("font-weight"): font["weight"],
            Keyword("font-style"): font["style"],
        }
        client.rpc_transit("create-font-variant", payload)

    # Update UI kit typographies to use the custom fonts
    projects = client.rpc_json("get-projects", {"teamId": team_id}) or []
    project = pick_by_name(projects, PROJECT_NAME)
    if not project:
        raise RuntimeError(f"Project '{PROJECT_NAME}' not found.")

    files = client.rpc_json("get-project-files", {"projectId": project["id"]}) or []
    ui_kit = pick_by_name(files, "MGTS_UI_Kit")
    if ui_kit:
        update_typographies(client, ui_kit["id"], family_to_font_id)

    print("Fonts uploaded and typography tokens updated.")


if __name__ == "__main__":
    main()

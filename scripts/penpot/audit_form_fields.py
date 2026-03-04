#!/usr/bin/env python3
import os
import re
from html.parser import HTMLParser


ROOT = "/Users/andrey_efremov/Downloads/runs/SiteMGTS"
OUT = "/Users/andrey_efremov/Downloads/runs/docs/project/FIELD_COVERAGE.md"


class FormParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.forms = []
        self.current_form = None
        self.last_select = None
        self.in_form = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "form":
            self.in_form = True
            self.current_form = {
                "action": attrs.get("action", ""),
                "method": attrs.get("method", ""),
                "id": attrs.get("id", ""),
                "class": attrs.get("class", ""),
                "fields": [],
            }
            self.forms.append(self.current_form)
            return

        if tag in ("input", "textarea", "select"):
            field = {
                "tag": tag,
                "type": attrs.get("type", "text") if tag == "input" else tag,
                "name": attrs.get("name", ""),
                "id": attrs.get("id", ""),
                "class": attrs.get("class", ""),
                "placeholder": attrs.get("placeholder", ""),
                "required": "required" in attrs or attrs.get("required") == "required",
                "aria": attrs.get("aria-label", ""),
            }
            if self.current_form:
                self.current_form["fields"].append(field)
            else:
                # inputs outside forms (CTA blocks)
                self.forms.append({"action": "", "method": "", "id": "", "class": "", "fields": [field]})

            if tag == "select":
                self.last_select = field
            return

        if tag == "option" and self.last_select is not None:
            option = attrs.get("value", "")
            if option:
                self.last_select.setdefault("options", []).append(option)

    def handle_endtag(self, tag):
        if tag == "form":
            self.in_form = False
            self.current_form = None
        if tag == "select":
            self.last_select = None


def iter_html_files(root):
    for base, _, files in os.walk(root):
        for name in files:
            if not name.endswith(".html"):
                continue
            yield os.path.join(base, name)


def summarize_field(field):
    parts = [field["tag"]]
    if field.get("type"):
        parts.append(f"type={field['type']}")
    if field.get("name"):
        parts.append(f"name={field['name']}")
    if field.get("id"):
        parts.append(f"id={field['id']}")
    if field.get("placeholder"):
        parts.append(f'placeholder="{field["placeholder"]}"')
    if field.get("required"):
        parts.append("required")
    if field.get("aria"):
        parts.append(f'aria="{field["aria"]}"')
    if field.get("options"):
        parts.append(f"options={len(field['options'])}")
    return ", ".join(parts)


def main():
    rows = []
    all_types = set()

    for path in iter_html_files(ROOT):
        with open(path, "r", encoding="utf-8", errors="ignore") as handle:
            content = handle.read()
        parser = FormParser()
        parser.feed(content)
        if not parser.forms:
            continue
        rel_path = os.path.relpath(path, ROOT)
        for idx, form in enumerate(parser.forms, start=1):
            fields = form.get("fields", [])
            if not fields:
                continue
            rows.append((rel_path, idx, form, fields))
            for field in fields:
                all_types.add(field["type"])

    with open(OUT, "w", encoding="utf-8") as out:
        out.write("# Покрытие полей форм (текущий сайт)\n\n")
        out.write("Источник: HTML страницы из `SiteMGTS/`.\n\n")
        if not rows:
            out.write("Формы не найдены.\n")
            return

        for rel_path, idx, form, fields in rows:
            out.write(f"## {rel_path} — форма {idx}\n")
            meta = []
            if form.get("action"):
                meta.append(f"action={form['action']}")
            if form.get("method"):
                meta.append(f"method={form['method']}")
            if form.get("id"):
                meta.append(f"id={form['id']}")
            if form.get("class"):
                meta.append(f"class={form['class']}")
            if meta:
                out.write(f"Метаданные: {', '.join(meta)}\n\n")
            out.write("Поля:\n")
            for field in fields:
                out.write(f"- {summarize_field(field)}\n")
            out.write("\n")

        out.write("## Сводка типов полей\n")
        for ftype in sorted(all_types):
            out.write(f"- {ftype}\n")


if __name__ == "__main__":
    main()

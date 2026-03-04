#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import random
import re
import sys
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw

STRAPI_URL = os.environ.get("STRAPI_URL", "http://localhost:1337")
STRAPI_TOKEN = os.environ.get("STRAPI_API_TOKEN", "")
PPLX_KEY = os.environ.get("PERPLEXITY_API_KEY", "")
PPLX_MODEL = os.environ.get("LLM_MODEL", "sonar")

OUT_DIR = Path(__file__).resolve().parent.parent / "temp" / "mgts-values-card-backgrounds"

FALLBACK_PALETTES = [
    ["#0F172A", "#1E293B", "#38BDF8"],
    ["#111827", "#1F2937", "#A855F7"],
    ["#0B1020", "#1D3557", "#F59E0B"],
    ["#0F172A", "#0EA5E9", "#22C55E"],
    ["#1F2937", "#0F172A", "#E11D48"],
    ["#111827", "#334155", "#F97316"],
]


def fetch_page(slug):
    params = {"slug": slug, "populate[sections][populate]": "*"}
    resp = requests.get(f"{STRAPI_URL}/api/pages/by-slug", params=params, timeout=30)
    resp.raise_for_status()
    return resp.json().get("data") or {}


def wait_for_strapi(max_wait_sec=60, interval_sec=2):
    start = time.monotonic()
    while time.monotonic() - start < max_wait_sec:
        try:
            resp = requests.get(
                f"{STRAPI_URL}/api/pages?pagination[pageSize]=1", timeout=5
            )
            if resp.status_code < 500:
                return True
        except Exception:
            pass
        time.sleep(interval_sec)
    return False


def hex_to_rgb(value):
    value = value.lstrip("#")
    if len(value) != 6:
        return (15, 23, 42)
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return int(a + (b - a) * t)


def lerp_color(c1, c2, t):
    return (lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t))


def generate_background(size, colors, seed):
    w, h = size
    c1, c2, c3 = [hex_to_rgb(c) for c in colors]
    base = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(base)

    for y in range(h):
        t = y / max(1, h - 1)
        draw.line([(0, y), (w, y)], fill=lerp_color(c1, c2, t))

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    rng = random.Random(seed)

    for _ in range(3):
        r = rng.randint(int(w * 0.18), int(w * 0.35))
        cx = rng.randint(int(w * 0.1), int(w * 0.9))
        cy = rng.randint(int(h * 0.1), int(h * 0.9))
        alpha = rng.randint(40, 90)
        odraw.ellipse(
            [(cx - r, cy - r), (cx + r, cy + r)],
            fill=(c3[0], c3[1], c3[2], alpha),
        )

    for _ in range(2):
        r = rng.randint(int(w * 0.12), int(w * 0.25))
        cx = rng.randint(int(w * 0.1), int(w * 0.9))
        cy = rng.randint(int(h * 0.1), int(h * 0.9))
        alpha = rng.randint(25, 60)
        odraw.ellipse(
            [(cx - r, cy - r), (cx + r, cy + r)],
            fill=(255, 255, 255, alpha),
        )

    out = Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")
    return out


def call_perplexity_for_palette(card, timeout_sec=45, retries=0):
    if not PPLX_KEY:
        return None

    titles = [
        {
            "title": card.get("title", ""),
            "text": (card.get("description") or card.get("text") or "")[:400],
        }
    ]

    system = (
        "You are a design assistant. "
        "Return JSON only. Provide a compact color palette for each card."
    )
    user = (
        "Generate a JSON object with key 'cards'. Each item must contain:\n"
        "- title (exactly as provided)\n"
        "- palette: array of 3 hex colors (dark-friendly)\n"
        "- motif: 2-4 word theme\n\n"
        f"Cards:\n{json.dumps(titles, ensure_ascii=False, indent=2)}"
    )

    payload = {"model": PPLX_MODEL, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    headers = {"Authorization": f"Bearer {PPLX_KEY}", "Content-Type": "application/json"}
    last_error = None
    for attempt in range(retries + 1):
        try:
            print(
                f"Perplexity request attempt {attempt + 1}/{retries + 1}...",
                flush=True,
            )
            t0 = time.monotonic()
            resp = requests.post(
                "https://api.perplexity.ai/chat/completions",
                json=payload,
                headers=headers,
                timeout=(10, timeout_sec),
            )
            resp.raise_for_status()
            elapsed = time.monotonic() - t0
            print(f"Perplexity response in {elapsed:.1f}s", flush=True)
            content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            break
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                continue
            raise last_error
    if not content:
        return None

    match = re.search(r"\{.*\}", content, re.S)
    if not match:
        return None

    try:
        data = json.loads(match.group(0))
    except Exception:
        return None

    if isinstance(data, dict):
        if isinstance(data.get("cards"), list) and data["cards"]:
            return data["cards"][0]
        if data.get("palette"):
            return data
    return None


def call_perplexity_for_svg(card, width, height, style, timeout_sec=45, retries=0):
    if not PPLX_KEY:
        return None

    system = (
        "You are a vector illustrator. Return ONLY valid SVG markup. "
        "No markdown, no explanations."
    )
    user = (
        "Generate a non-realistic image: a symbolic, high-tech visual representation "
        "without any text, for a corporate value principle. "
        "This image must be adapted for a web portal.\n"
        "Requirements:\n"
        f"- Size: {width}x{height}\n"
        f"- Style: {style}\n"
        "- Non-realistic, symbolic, high-tech, abstract\n"
        "- No text, no external images, no embedded raster images\n"
        "- No scripts or animation\n"
        "- Use a limited palette, but keep contrast suitable for white text overlay\n"
        "- Return a single <svg>...</svg>\n\n"
        f'Principle: "{card.get("title","")}"\n'
        f'Meaning: "{(card.get("description") or card.get("text") or "")[:400]}"'
    )
    payload = {"model": PPLX_MODEL, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    headers = {"Authorization": f"Bearer {PPLX_KEY}", "Content-Type": "application/json"}
    last_error = None
    for attempt in range(retries + 1):
        try:
            print(
                f"Perplexity request attempt {attempt + 1}/{retries + 1}...",
                flush=True,
            )
            t0 = time.monotonic()
            resp = requests.post(
                "https://api.perplexity.ai/chat/completions",
                json=payload,
                headers=headers,
                timeout=(10, timeout_sec),
            )
            resp.raise_for_status()
            elapsed = time.monotonic() - t0
            print(f"Perplexity response in {elapsed:.1f}s", flush=True)
            content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            break
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                continue
            raise last_error

    if not content:
        return None
    match = re.search(r"<svg[^>]*>.*?</svg>", content, re.S | re.I)
    if not match:
        return None
    svg = match.group(0)
    if "<script" in svg.lower():
        return None
    return svg


def resolve_palette(palette_override, fallback_index):
    if isinstance(palette_override, list) and len(palette_override) >= 3:
        return palette_override[:3]
    return FALLBACK_PALETTES[fallback_index % len(FALLBACK_PALETTES)]


def upload_image(
    path,
    mime_type="image/png",
    timeout_sec=180,
    retries=2,
    retry_delay=5,
    wait_timeout=60,
):
    if not STRAPI_TOKEN:
        raise RuntimeError("STRAPI_API_TOKEN is not set.")
    last_error = None
    for attempt in range(retries + 1):
        try:
            if retries:
                print(f"    upload attempt {attempt + 1}/{retries + 1} ...", flush=True)
            with open(path, "rb") as f:
                files = {"files": (path.name, f, mime_type)}
                headers = {"Authorization": f"Bearer {STRAPI_TOKEN}"}
                resp = requests.post(
                    f"{STRAPI_URL}/api/upload",
                    files=files,
                    headers=headers,
                    timeout=(10, timeout_sec),
                )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and data:
                return data[0]
            return None
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                print("    upload failed, waiting for Strapi...", flush=True)
                wait_for_strapi(max_wait_sec=wait_timeout)
                time.sleep(retry_delay)
                continue
            raise last_error


def sanitize_media(value):
    if value is None:
        return None
    if isinstance(value, dict):
        return value.get("id")
    return value


def load_cache(path):
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text()) or {}
    except Exception:
        return {}


def save_cache(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", default="mgts_values")
    parser.add_argument("--width", type=int, default=1600)
    parser.add_argument("--height", type=int, default=900)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-perplexity", action="store_true")
    parser.add_argument("--perplexity-timeout", type=int, default=45)
    parser.add_argument("--perplexity-retries", type=int, default=0)
    parser.add_argument("--perplexity-delay", type=float, default=0.0)
    parser.add_argument("--perplexity-mode", choices=["svg", "palette"], default="svg")
    parser.add_argument(
        "--perplexity-style",
        default="symbolic high-tech, abstract geometric shapes, soft gradients, "
        "clean minimal composition, futuristic glow",
    )
    parser.add_argument("--upload-timeout", type=int, default=180)
    parser.add_argument("--upload-retries", type=int, default=2)
    parser.add_argument("--upload-retry-delay", type=int, default=5)
    parser.add_argument("--strapi-wait", type=int, default=60)
    parser.add_argument("--force-upload", action="store_true")
    args = parser.parse_args()

    page = fetch_page(args.slug)
    if not page:
        print("Page not found.")
        sys.exit(1)

    sections = page.get("sections") or []
    card_sections = [s for s in sections if s.get("__component") == "page.section-cards"]
    if not card_sections:
        print("No section-cards found.")
        return

    cards = []
    for s in card_sections:
        for c in s.get("cards") or []:
            cards.append(c)

    print(f"Found {len(cards)} cards to update.", flush=True)
    if args.no_perplexity:
        print("Perplexity disabled, using fallback palettes.", flush=True)
    elif not PPLX_KEY:
        print("Perplexity key not set, using fallback palettes.", flush=True)
    else:
        print(
            f"Perplexity enabled: sequential per-card requests (mode={args.perplexity_mode}).",
            flush=True,
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = OUT_DIR / f"cache_{args.slug}.json"
    cache = load_cache(cache_path)
    uploads = {}

    total = len(cards)
    start_all = time.monotonic()
    for idx, card in enumerate(cards):
        title = card.get("title") or f"card_{idx+1}"
        card_id = str(card.get("id"))
        cached_media_id = cache.get(card_id)
        if cached_media_id and not args.force_upload:
            uploads[card.get("id")] = cached_media_id
            print(
                f"[{idx + 1}/{total}] using cached media id={cached_media_id} for {title}",
                flush=True,
            )
            continue

        svg_markup = None
        palette_override = None
        if not args.no_perplexity and PPLX_KEY:
            if args.perplexity_mode == "svg":
                print(f"    requesting SVG for card {idx + 1}/{total}...", flush=True)
                try:
                    svg_markup = call_perplexity_for_svg(
                        card,
                        width=args.width,
                        height=args.height,
                        style=args.perplexity_style,
                        timeout_sec=args.perplexity_timeout,
                        retries=args.perplexity_retries,
                    )
                    if svg_markup:
                        print("    SVG received.", flush=True)
                    else:
                        print("    no SVG parsed, using fallback.", flush=True)
                except Exception as exc:
                    print(f"    Perplexity error: {exc}. Using fallback.", flush=True)
            else:
                print(f"    requesting palette for card {idx + 1}/{total}...", flush=True)
                try:
                    theme_item = call_perplexity_for_palette(
                        card,
                        timeout_sec=args.perplexity_timeout,
                        retries=args.perplexity_retries,
                    )
                    if theme_item and isinstance(theme_item.get("palette"), list):
                        palette_override = theme_item["palette"]
                        print("    palette received.", flush=True)
                    else:
                        print("    no palette parsed, using fallback.", flush=True)
                except Exception as exc:
                    print(f"    Perplexity error: {exc}. Using fallback.", flush=True)
            if args.perplexity_delay:
                time.sleep(args.perplexity_delay)

        palette = resolve_palette(palette_override, idx)
        seed = int(hashlib.md5(title.encode("utf-8")).hexdigest(), 16) % (2**32)
        print(f"[{idx + 1}/{total}] generating background for: {title}", flush=True)
        filename = f"mgts_values_card_{idx+1}.png"
        file_path = OUT_DIR / filename
        mime_type = "image/png"
        if svg_markup:
            filename = f"mgts_values_card_{idx+1}.svg"
            file_path = OUT_DIR / filename
            file_path.write_text(svg_markup)
            mime_type = "image/svg+xml"
            print(f"    generated: {filename} ({args.width}x{args.height})", flush=True)
        else:
            img = generate_background((args.width, args.height), palette, seed)
            img.save(file_path, format="PNG")
            print(f"    generated: {filename} ({args.width}x{args.height})", flush=True)

        if not args.dry_run:
            t0 = time.monotonic()
            print("    uploading to Strapi...", flush=True)
            uploaded = upload_image(
                file_path,
                mime_type=mime_type,
                timeout_sec=args.upload_timeout,
                retries=args.upload_retries,
                retry_delay=args.upload_retry_delay,
                wait_timeout=args.strapi_wait,
            )
            if not uploaded or "id" not in uploaded:
                raise RuntimeError(f"Upload failed for {filename}")
            elapsed = time.monotonic() - t0
            print(f"    uploaded media id={uploaded['id']} in {elapsed:.1f}s", flush=True)
            uploads[card.get("id")] = uploaded["id"]
            cache[card_id] = uploaded["id"]
            save_cache(cache_path, cache)

    if args.dry_run:
        print("Dry run complete. Skipping Strapi update.")
        return

    updated_sections = []
    for section in sections:
        if section.get("__component") != "page.section-cards":
            section_payload = {k: v for k, v in section.items() if k != "id"}
            updated_sections.append(section_payload)
            continue

        cards_payload = []
        for card in section.get("cards") or []:
            card_id = card.get("id")
            bg_id = uploads.get(card_id)
            card_payload = {
                "title": card.get("title"),
                "description": card.get("description"),
                "link": card.get("link"),
                "cardType": card.get("cardType"),
                "subtitle": card.get("subtitle"),
                "disclaimerHtml": card.get("disclaimerHtml"),
                "tag": card.get("tag"),
                "image": sanitize_media(card.get("image")),
                "backgroundImage": bg_id if bg_id else sanitize_media(card.get("backgroundImage")),
            }
            cards_payload.append(card_payload)

        updated_sections.append(
            {
                "__component": section.get("__component"),
                "title": section.get("title"),
                "subtitle": section.get("subtitle"),
                "isVisible": section.get("isVisible"),
                "columns": section.get("columns"),
                "cards": cards_payload,
            }
        )

    headers = {"Authorization": f"Bearer {STRAPI_TOKEN}", "Content-Type": "application/json"}
    payload = {"data": {"sections": updated_sections}}
    wait_for_strapi(max_wait_sec=args.strapi_wait)
    page_id = page.get("documentId") or page.get("id")
    resp = requests.put(
        f"{STRAPI_URL}/api/pages/{page_id}",
        headers=headers,
        json=payload,
        timeout=120,
    )
    resp.raise_for_status()
    total_time = time.monotonic() - start_all
    print(f"Updated page sections with background images in {total_time:.1f}s.")


if __name__ == "__main__":
    main()

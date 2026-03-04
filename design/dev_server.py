#!/usr/bin/env python3
"""
Minimal static server with pretty-route rewrites for MGTS demo pages.

Serves the `design/` directory and maps:
- /news/archive(/)        -> /html_pages/tpl_news_archive.html
- /news/<slug>(/)         -> /html_pages/tpl_news_detail.html
- /news(/)                -> /html_pages/tpl_news_list.html
- /<any-slug>(/)          -> /html_pages/tpl_cms_page.html   (DeepNav / CMS pages)

All other paths fall back to normal static file serving.
"""

from __future__ import annotations

import http.server
import os
import socketserver
import sys
from urllib.parse import unquote, urlsplit


ROOT = os.path.dirname(os.path.abspath(__file__))


def _map_path(path: str) -> str | None:
    parsed = urlsplit(path or "")
    p = unquote(parsed.path or "")
    if "?" in p:
        p = p.split("?", 1)[0]
    if not p.startswith("/"):
        p = "/" + p

    # Keep assets working as-is.
    if p.startswith("/assets/") or p.startswith("/cms_loader/") or p.startswith("/html_pages/") or p.startswith("/html_blocks/"):
        return None

    # News routes
    if p == "/news" or p == "/news/":
        return "/html_pages/tpl_news_list.html"
    if p == "/news/archive" or p == "/news/archive/":
        return "/html_pages/tpl_news_archive.html"
    if p.startswith("/news/"):
        # /news/<slug> or /news/<slug>/ -> detail template
        rest = p[len("/news/") :]
        if rest and rest not in ("archive", "archive/"):
            return "/html_pages/tpl_news_detail.html"

    # Home route
    if p == "/" or p == "/index.html":
        return "/html_pages/tpl_home.html"

    # Generic pretty routes: /<slug>/ or /a/b/c/
    if p.endswith("/") and p != "/":
        return "/html_pages/tpl_cms_page.html"
    # Also allow /<slug> without trailing slash
    if p != "/" and "." not in p.rsplit("/", 1)[-1]:
        return "/html_pages/tpl_cms_page.html"

    return None


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        mapped = _map_path(path)
        if mapped:
            path = mapped
        # Serve from design/ root
        out = http.server.SimpleHTTPRequestHandler.translate_path(self, path)
        # Force root to be `design/` even if CWD differs.
        rel = os.path.relpath(out, os.getcwd())
        return os.path.join(ROOT, rel)

    def log_message(self, fmt: str, *args) -> None:
        # Keep logs concise
        sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), fmt % args))


def main() -> None:
    port = 8080
    if len(sys.argv) >= 2:
        port = int(sys.argv[1])

    os.chdir(ROOT)
    class ThreadingServer(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True

    with ThreadingServer(("", port), Handler) as httpd:
        print(f"Serving {ROOT} on http://localhost:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()


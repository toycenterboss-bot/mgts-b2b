#!/usr/bin/env python3
import argparse
import os
import posixpath
import socket
import socketserver
import urllib.parse
from http.server import SimpleHTTPRequestHandler


def build_target(original_path: str) -> str:
    """
    Map pretty routes to Stitch html_pages templates.
    Slugs are derived client-side from window.location.pathname when needed.
    """
    path = original_path.rstrip("/") or "/"

    # Core routes
    if path == "/" or path == "/home":
        return "/html_pages/tpl_home.html"
    if path == "/services":
        return "/html_pages/tpl_segment_landing.html"
    if path == "/contact":
        return "/html_pages/tpl_contact_hub.html"
    if path == "/career":
        return "/html_pages/page_career.html"
    if path == "/ai-chat":
        return "/html_pages/tpl_ai_chat.html"
    if path == "/search":
        return "/html_pages/tpl_search_results.html"
    if path == "/news":
        return "/html_pages/tpl_news_list.html"
    if path == "/news/archive":
        return "/html_pages/tpl_news_archive.html"
    if path.startswith("/news/"):
        return "/html_pages/tpl_news_detail.html"
    if path == "/offers":
        return "/html_pages/tpl_news_list.html"
    if path == "/offers/archive":
        return "/html_pages/tpl_news_archive.html"
    if path.startswith("/offers/"):
        return "/html_pages/tpl_news_detail.html"
    if path == "/virtual_ate":
        return "/html_pages/tpl_service.html"

    # Scenario pages
    if path.startswith("/services/scenario-"):
        return "/html_pages/tpl_scenario.html"

    # Segment roots
    for seg in ("/developers", "/operators", "/government", "/partners", "/business"):
        if path == seg:
            return "/html_pages/tpl_segment_landing.html"

    # Segment services: use last segment as slug (matches imported page slugs)
    for seg in ("/developers/", "/operators/", "/government/", "/business/"):
        if path.startswith(seg):
            return "/html_pages/tpl_service.html"

    # Partners doc pages
    if path.startswith("/partners/"):
        return "/html_pages/tpl_doc_page.html"

    # Default for top-level CMS pages (/about_mgts, /mgts_values, etc.)
    if path.count("/") == 1:
        return "/html_pages/tpl_cms_page.html"

    return original_path


class RewritingHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        target = build_target(parsed.path)
        if target != parsed.path:
            # Keep query from target (template needs it)
            self.path = target
        return super().do_GET()

    def end_headers(self):
        # Avoid aggressive caching during local development.
        path = urllib.parse.urlparse(self.path).path
        if path.endswith(".html") or path.startswith("/cms_loader/"):
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("Pragma", "no-cache")
        return super().end_headers()

    def translate_path(self, path):
        # Ensure query is ignored when resolving file
        path = urllib.parse.urlparse(path).path
        path = posixpath.normpath(urllib.parse.unquote(path))
        words = filter(None, path.split("/"))
        fullpath = self.directory
        for word in words:
            if os.path.dirname(word) or word in (os.curdir, os.pardir):
                continue
            fullpath = os.path.join(fullpath, word)
        return fullpath


class ReuseAddrTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


class DualStackServer(ReuseAddrTCPServer):
    """
    Serve on IPv6 and accept IPv4 via v4-mapped addresses where supported.
    This prevents `curl http://localhost:PORT/...` from stalling on ::1.
    """

    address_family = socket.AF_INET6

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except Exception:
            # Some platforms / Python builds may not support toggling this.
            pass
        return super().server_bind()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=int(os.environ.get("STATIC_PORT", "8002")))
    ap.add_argument("--directory", default=os.path.join(os.getcwd(), "design"))
    args = ap.parse_args()

    directory = os.path.abspath(args.directory)
    if not os.path.isdir(directory):
        raise SystemExit(f"design directory not found: {directory}")

    handler = lambda *h_args, **h_kwargs: RewritingHandler(*h_args, directory=directory, **h_kwargs)
    # Prefer dual-stack bind on ::, fallback to IPv4 if needed.
    try:
        with DualStackServer(("::", args.port), handler) as httpd:
            print(f"✅ Static server with routing on :{args.port}")
            print(f"   - root: {directory}")
            httpd.serve_forever()
    except OSError:
        with ReuseAddrTCPServer(("", args.port), handler) as httpd:
            print(f"✅ Static server with routing on :{args.port}")
            print(f"   - root: {directory}")
            httpd.serve_forever()


if __name__ == "__main__":
    main()

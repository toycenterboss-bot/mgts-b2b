import path from "node:path";
import { promises as fs } from "node:fs";

export const runtime = "nodejs";

const ASSETS_ROOT = path.resolve(process.cwd(), "..", "design", "assets");

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

export async function GET(
  _req: Request,
  { params }: { params: { path?: string[] } | Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params;
  const segments = Array.isArray(resolvedParams.path) ? resolvedParams.path : [];
  const targetPath = path.resolve(ASSETS_ROOT, ...segments);

  if (!targetPath.startsWith(ASSETS_ROOT)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    return new Response(data, {
      headers: {
        "content-type": contentType,
        "cache-control": "no-cache",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

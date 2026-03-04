import fs from "node:fs";
import path from "node:path";

type HierarchyItem = {
  slug: string;
  parentSlug: string | null;
  path: string;
  title: string;
};

type HierarchyNode = HierarchyItem & { children: HierarchyNode[] };

const DEFAULT_PATH = path.join(
  process.cwd(),
  "..",
  "mgts-backend",
  "temp",
  "services-extraction",
  "pages-hierarchy.json"
);

export const loadHierarchy = (): HierarchyNode[] => {
  try {
    if (!fs.existsSync(DEFAULT_PATH)) return [];
    const raw = JSON.parse(fs.readFileSync(DEFAULT_PATH, "utf-8"));
    const flat: HierarchyItem[] = Array.isArray(raw?.flat) ? raw.flat : [];
    const map = new Map<string, HierarchyNode>();
    flat.forEach((item) => {
      map.set(item.slug, { ...item, children: [] });
    });
    const roots: HierarchyNode[] = [];
    flat.forEach((item) => {
      const node = map.get(item.slug);
      if (!node) return;
      if (item.parentSlug && map.has(item.parentSlug)) {
        map.get(item.parentSlug)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  } catch {
    return [];
  }
};

export const findNodeBySlug = (nodes: HierarchyNode[], slug: string): HierarchyNode | null => {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const child = findNodeBySlug(node.children || [], slug);
    if (child) return child;
  }
  return null;
};

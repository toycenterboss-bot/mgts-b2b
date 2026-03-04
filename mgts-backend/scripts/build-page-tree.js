const fs = require('fs');
const path = require('path');

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        return null;
    }
}

function normalizePathname(url) {
    try {
        const parsed = new URL(url, 'https://business.mgts.ru');
        const pathname = parsed.pathname || '/';
        return pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    } catch {
        return null;
    }
}

function addPath(tree, pathname, meta) {
    const parts = pathname === '/' ? [''] : pathname.split('/').filter(Boolean);
    let node = tree;
    let currentPath = '';
    if (parts.length === 0) {
        node.meta = meta;
        return;
    }
    for (const part of parts) {
        currentPath += `/${part}`;
        if (!node.children[part]) {
            node.children[part] = { path: currentPath, children: {}, meta: null };
        }
        node = node.children[part];
    }
    node.meta = meta;
}

function toMarkdown(node, level = 0) {
    const lines = [];
    const indent = '  '.repeat(level);
    const title = node.meta?.title || '';
    const slug = node.meta?.slug || '';
    const label = node.path === '/' ? '/' : node.path;
    const meta = [title && `title="${title}"`, slug && `slug="${slug}"`].filter(Boolean).join(' ');
    lines.push(`${indent}- ${label}${meta ? ` (${meta})` : ''}`);
    const children = Object.values(node.children).sort((a, b) => a.path.localeCompare(b.path));
    for (const child of children) {
        lines.push(...toMarkdown(child, level + 1));
    }
    return lines;
}

function main() {
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
    const specs = fs.readdirSync(outputDir).filter(f => f.endsWith('_spec.json'));
    const tree = { path: '/', children: {}, meta: null };

    specs.forEach(file => {
        const filePath = path.join(outputDir, file);
        const spec = readJson(filePath);
        if (!spec || !spec.page || !spec.page.url) return;
        const pathname = normalizePathname(spec.page.url);
        if (!pathname) return;
        const meta = {
            slug: spec.page.slug || file.replace('_spec.json', ''),
            title: spec.metadata?.title || ''
        };
        addPath(tree, pathname, meta);
    });

    const md = toMarkdown(tree).join('\n') + '\n';
    const mdPath = path.join(outputDir, 'COLLECTION_TREE.md');
    fs.writeFileSync(mdPath, md);

    const jsonPath = path.join(outputDir, 'COLLECTION_TREE.json');
    fs.writeFileSync(jsonPath, JSON.stringify(tree, null, 2));

    console.log(`✅ Дерево сохранено: ${mdPath}`);
    console.log(`✅ JSON дерево сохранено: ${jsonPath}`);
}

if (require.main === module) {
    main();
}

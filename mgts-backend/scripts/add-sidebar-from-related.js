const fs = require('fs');
const path = require('path');

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        return null;
    }
}

function normalize(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
}

function toPathname(href) {
    try {
        const u = new URL(href, 'https://business.mgts.ru');
        const pathname = u.pathname || '/';
        return pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    } catch {
        return null;
    }
}

function buildSidebarSectionFromLinks(links) {
    return {
        type: 'sidebar',
        description: 'Боковое навигационное меню, восстановленное по связанной странице',
        title: 'Навигация',
        text: null,
        links: {
            internalLinks: links.map(link => ({
                text: link.text || '',
                href: link.href || '',
                purpose: 'Навигационный пункт бокового меню'
            })),
            externalLinks: [],
            fileLinks: [],
            imageLinks: []
        },
        cards: []
    };
}

function main() {
    const dir = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
    const specs = fs.readdirSync(dir).filter(f => f.endsWith('_spec.json'));

    // Build slug -> file map
    const slugToFile = new Map();
    const slugToPath = new Map();
    specs.forEach(file => {
        const data = readJson(path.join(dir, file));
        if (!data?.page) return;
        const slug = data.page.slug || file.replace('_spec.json', '');
        slugToFile.set(slug, file);
        slugToPath.set(slug, data.page.pathname || toPathname(data.page.url));
    });

    // Collect sidebars from pages that already have them.
    const sidebarTemplates = [];
    specs.forEach(file => {
        const data = readJson(path.join(dir, file));
        if (!data) return;
        const sections = data.sections || [];
        const sidebarSections = sections.filter(s => typeof s.type === 'string' && s.type.toLowerCase().includes('sidebar'));
        if (!sidebarSections.length) return;
        sidebarSections.forEach(section => {
            const links = (section?.links?.internalLinks || []).map(link => ({
                text: normalize(link.text || ''),
                href: link.href || ''
            })).filter(link => link.text || link.href);
            if (!links.length) return;
            const linkPaths = links.map(l => toPathname(l.href)).filter(Boolean);
            sidebarTemplates.push({
                links,
                linkPaths,
                source: data.page?.slug || file.replace('_spec.json', '')
            });
        });
    });

    // For each page without sidebar, find a related sidebar that includes its pathname.
    const updated = [];
    specs.forEach(file => {
        const data = readJson(path.join(dir, file));
        if (!data) return;
        const sections = data.sections || [];
        const hasSidebar = sections.some(s => typeof s.type === 'string' && s.type.toLowerCase().includes('sidebar'));
        if (hasSidebar) return;
        const slug = data.page?.slug || file.replace('_spec.json', '');
        const pathname = slugToPath.get(slug);
        if (!pathname) return;

        const match = sidebarTemplates.find(t => t.linkPaths.includes(pathname));
        if (!match) return;

        const newSection = buildSidebarSectionFromLinks(match.links);
        data.sections = [newSection, ...sections];
        fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2));
        updated.push({ slug, matchedFrom: match.source });
    });

    const reportPath = path.join(dir, 'SIDEBAR_PATCH_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify({ updated }, null, 2));
    console.log(`✅ Updated ${updated.length} pages. Report: ${reportPath}`);
}

if (require.main === module) {
    main();
}

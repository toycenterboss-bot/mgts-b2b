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

function normalizePathname(url) {
    try {
        const parsed = new URL(url, 'https://business.mgts.ru');
        const pathname = parsed.pathname || '/';
        return pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    } catch {
        return null;
    }
}

function collectSidebarLinks(section) {
    const links = section?.links?.internalLinks || [];
    return links
        .map(link => ({
            text: normalize(link.text || ''),
            href: link.href || ''
        }))
        .filter(link => link.text || link.href);
}

function collectSidebarCards(section) {
    const cards = section?.cards || [];
    return cards
        .map(card => ({
            title: normalize(card.title || ''),
            link: card.link || null
        }))
        .filter(card => card.title || card.link);
}

function buildNormalizedItems(sidebar) {
    const items = [];
    sidebar.links.forEach(link => {
        items.push({
            label: link.text || '',
            href: link.href || '',
            slug: link.slug || null,
            kind: 'link'
        });
    });
    sidebar.cards.forEach(card => {
        items.push({
            label: card.title || '',
            href: card.link || '',
            slug: card.slug || null,
            kind: 'card'
        });
    });
    return items.filter(item => item.label || item.href);
}

function isSidebarSection(section) {
    if (!section || !section.type) return false;
    const type = section.type.toLowerCase();
    return type.includes('sidebar');
}

function main() {
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
    const specs = fs.readdirSync(outputDir).filter(f => f.endsWith('_spec.json'));

    const urlToSlug = new Map();
    const slugToUrl = new Map();
    specs.forEach(file => {
        const filePath = path.join(outputDir, file);
        const data = readJson(filePath);
        if (!data?.page) return;
        const pathname = data.page.pathname || normalizePathname(data.page.url);
        if (pathname) {
            urlToSlug.set(pathname, data.page.slug || file.replace('_spec.json', ''));
            slugToUrl.set(data.page.slug || file.replace('_spec.json', ''), data.page.url || '');
        }
    });

    const resolveSlug = (href) => {
        const pathname = normalizePathname(href);
        if (!pathname) return null;
        return urlToSlug.get(pathname) || null;
    };

    const sidebars = [];
    specs.forEach(file => {
        const filePath = path.join(outputDir, file);
        const data = readJson(filePath);
        if (!data) return;
        const sections = data.sections || [];
        const sidebarSections = sections.filter(isSidebarSection);
        if (!sidebarSections.length) return;

        const pageInfo = {
            slug: data.page?.slug || file.replace('_spec.json', ''),
            url: data.page?.url || '',
            title: data.metadata?.title || ''
        };

        const extracted = sidebarSections.map(section => {
            return {
                type: section.type,
                title: normalize(section.title || ''),
                text: normalize(section.text || ''),
                links: collectSidebarLinks(section).map(link => ({
                    ...link,
                    slug: resolveSlug(link.href)
                })),
                cards: collectSidebarCards(section).map(card => ({
                    ...card,
                    slug: resolveSlug(card.link || '')
                }))
            };
        });

        sidebars.push({
            page: pageInfo,
            sidebars: extracted.map(sidebar => ({
                ...sidebar,
                items: buildNormalizedItems(sidebar)
            }))
        });
    });

    const menuIndex = new Map();
    sidebars.forEach(entry => {
        entry.sidebars.forEach(sidebar => {
            const keyParts = [];
            sidebar.links.forEach(link => {
                keyParts.push(`L:${link.text}|${link.href}|${link.slug || ''}`);
            });
            sidebar.cards.forEach(card => {
                keyParts.push(`C:${card.title}|${card.link || ''}|${card.slug || ''}`);
            });
            const key = keyParts.join('||');
            if (!menuIndex.has(key)) {
                menuIndex.set(key, {
                    key,
                    title: sidebar.title,
                    type: sidebar.type,
                    links: sidebar.links,
                    cards: sidebar.cards,
                    items: buildNormalizedItems(sidebar),
                    pages: []
                });
            }
            const item = menuIndex.get(key);
            item.pages.push({
                slug: entry.page.slug,
                url: entry.page.url,
                title: entry.page.title
            });
        });
    });

    const deduped = Array.from(menuIndex.values());
    deduped.forEach(menu => {
        const firstLink = menu.links[0] || null;
        const firstSlug = firstLink?.slug || null;
        const firstUrl = firstSlug ? (slugToUrl.get(firstSlug) || '') : '';
        menu.page = firstSlug ? { slug: firstSlug, url: firstUrl } : null;
    });

    const outJson = path.join(outputDir, 'SIDEbars.json');
    fs.writeFileSync(outJson, JSON.stringify(sidebars, null, 2));

    const outDedupJson = path.join(outputDir, 'SIDEBARS_DEDUPED.json');
    fs.writeFileSync(outDedupJson, JSON.stringify(deduped, null, 2));

    const mdLines = ['# Sidebar Menus Summary', ''];
    sidebars.forEach(entry => {
        mdLines.push(`## ${entry.page.title || entry.page.slug}`);
        mdLines.push(`- url: ${entry.page.url}`);
        entry.sidebars.forEach((sidebar, index) => {
            mdLines.push(`### sidebar_${index + 1} (${sidebar.type})`);
            if (sidebar.title) mdLines.push(`- title: ${sidebar.title}`);
            if (sidebar.text) mdLines.push(`- text: ${sidebar.text}`);
            if (sidebar.links.length) {
                mdLines.push('#### Links');
                sidebar.links.forEach(link => {
                    mdLines.push(`- ${link.text || '(без текста)'} — ${link.href}`);
                });
            }
            if (sidebar.cards.length) {
                mdLines.push('#### Cards');
                sidebar.cards.forEach(card => {
                    mdLines.push(`- ${card.title || '(без заголовка)'} — ${card.link || ''}`);
                });
            }
            mdLines.push('');
        });
        mdLines.push('');
    });

    const outMd = path.join(outputDir, 'SIDEBARS.md');
    fs.writeFileSync(outMd, mdLines.join('\n'));

    const dedupMdLines = ['# Sidebar Menus Deduped', ''];
    deduped.forEach((menu, index) => {
        dedupMdLines.push(`## menu_${index + 1}`);
        if (menu.title) dedupMdLines.push(`- title: ${menu.title}`);
        if (menu.type) dedupMdLines.push(`- type: ${menu.type}`);
        if (menu.items.length) {
            dedupMdLines.push('### Items');
            menu.items.forEach(item => {
                dedupMdLines.push(`- ${item.label || '(без текста)'} — ${item.href || ''} — ${item.slug || ''} — ${item.kind}`);
            });
        }
        if (menu.links.length) {
            dedupMdLines.push('### Links');
            menu.links.forEach(link => {
                dedupMdLines.push(`- ${link.text || '(без текста)'} — ${link.href} — ${link.slug || ''}`);
            });
        }
        if (menu.cards.length) {
            dedupMdLines.push('### Cards');
            menu.cards.forEach(card => {
                dedupMdLines.push(`- ${card.title || '(без заголовка)'} — ${card.link || ''} — ${card.slug || ''}`);
            });
        }
        if (menu.page) {
            dedupMdLines.push(`### Page`);
            dedupMdLines.push(`- ${menu.page.slug || ''} — ${menu.page.url || ''}`);
        }
        if (menu.pages.length) {
            dedupMdLines.push('### Pages');
            menu.pages.forEach(page => {
                dedupMdLines.push(`- ${page.slug || ''} — ${page.url || ''}`);
            });
        }
        dedupMdLines.push('');
    });

    const outDedupMd = path.join(outputDir, 'SIDEBARS_DEDUPED.md');
    fs.writeFileSync(outDedupMd, dedupMdLines.join('\n'));

    console.log(`✅ Sidebars saved: ${outJson}`);
    console.log(`✅ Sidebars (md): ${outMd}`);
    console.log(`✅ Sidebars deduped: ${outDedupJson}`);
    console.log(`✅ Sidebars deduped (md): ${outDedupMd}`);
}

if (require.main === module) {
    main();
}

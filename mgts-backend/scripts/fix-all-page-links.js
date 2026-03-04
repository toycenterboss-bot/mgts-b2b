/**
 * Fix links in all page sections and cards to work on local server.
 * 
 * Usage:
 *   STRAPI_API_TOKEN=... node scripts/fix-all-page-links.js
 */
const axios = require('axios');
const fs = require('fs');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

if (!API_TOKEN) {
    console.error('\n❌ STRAPI_API_TOKEN не установлен.\n');
    process.exit(1);
}

const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
    },
});

// Load slug-template map
const slugMapRaw = JSON.parse(fs.readFileSync('/tmp/slug_template_map.json', 'utf8'));
const slugToTemplate = {};
slugMapRaw.forEach(item => {
    if (item.slug && item.template) {
        slugToTemplate[item.slug] = item.template;
    }
});

const templateToFile = {
    'TPL_DeepNav': 'tpl_deepnav.html',
    'TPL_Service': 'tpl_service.html',
    'TPL_Segment_Landing': 'tpl_segment_landing.html',
    'TPL_Scenario': 'tpl_scenario.html',
    'TPL_News_List': 'tpl_news_list.html',
    'TPL_News_Item': 'tpl_news_item.html',
    'TPL_Contact_Hub': 'tpl_contact_hub.html',
    'TPL_Service_List': 'tpl_service_list.html',
    'TPL_Main': 'index.html', // Or whatever is appropriate
    'TPL_CMS_Page': 'tpl_cms_page.html',
    'TPL_AI_Chat': 'tpl_ai_chat.html'
};

function normalizeSlug(s) {
    return String(s || '').trim().replace(/^\/+|\/+$/g, '').replace(/\//g, '_');
}

function resolveLocalUrl(href) {
    if (!href || typeof href !== 'string' || href.startsWith('http') || href.startsWith('#')) return href;

    const slug = normalizeSlug(href);
    if (!slug) return href;

    // Try to find template for slug or variants
    let template = slugToTemplate[slug];
    let matchedSlug = slug;

    if (!template) {
        // Try without section prefix if matched as /section/slug
        const parts = href.replace(/^\//, '').split('/');
        if (parts.length > 1) {
            const baseSlug = parts.pop();
            if (slugToTemplate[baseSlug]) {
                template = slugToTemplate[baseSlug];
                matchedSlug = baseSlug;
            } else {
                // Try underscored version of full path
                const fullSlug = parts.join('_') + '_' + baseSlug;
                if (slugToTemplate[fullSlug]) {
                    template = slugToTemplate[fullSlug];
                    matchedSlug = fullSlug;
                }
            }
        }
    }

    if (template) {
        const fileName = templateToFile[template] || 'tpl_cms_page.html';
        return `/html_pages/${fileName}?slug=${matchedSlug}`;
    }

    return href;
}

function updateLinks(obj) {
    if (Array.isArray(obj)) {
        return obj.map(updateLinks);
    }
    if (obj && typeof obj === 'object') {
        const next = {};
        for (const [key, val] of Object.entries(obj)) {
            if (key === 'link' && typeof val === 'string' && val.startsWith('/')) {
                next[key] = resolveLocalUrl(val);
                if (next[key] !== val) console.log(`  Fixed: ${val} -> ${next[key]}`);
            } else if (key === 'href' && typeof val === 'string' && val.startsWith('/')) {
                next[key] = resolveLocalUrl(val);
                if (next[key] !== val) console.log(`  Fixed: ${val} -> ${next[key]}`);
            } else if (key === 'id') {
                // Don't strip IDs here, putting back requires them for updates?
                // Actually Strapi PUT with components usually needs no IDs for new ones, 
                // but let's keep them if we are updating existing ones?
                // Actually, existing scripts use stripComponentIds.
                continue;
            } else {
                next[key] = updateLinks(val);
            }
        }
        return next;
    }
    return obj;
}

function stripIds(obj) {
    if (Array.isArray(obj)) return obj.map(stripIds);
    if (obj && typeof obj === 'object') {
        const next = {};
        for (const [key, val] of Object.entries(obj)) {
            if (key === 'documentId') continue; // Always strip documentId
            next[key] = stripIds(val);
        }
        return next;
    }
    return obj;
}

async function main() {
    console.log('Fetching all pages...');
    const pagesRes = await api.get('/pages', {
        params: {
            'populate[sections][populate]': '*',
            'pagination[pageSize]': 1000
        }
    });

    const pages = pagesRes.data?.data || [];
    console.log(`Processing ${pages.length} pages...\n`);

    for (const page of pages) {
        const slug = page.slug;
        const sections = page.sections || [];

        if (!sections.length) continue;

        console.log(`Checking page: ${slug}`);
        const updatedSections = updateLinks(sections);

        // Simple way to check if anything changed
        if (JSON.stringify(sections) !== JSON.stringify(updatedSections)) {
            const pageId = page.documentId || page.id;
            console.log(`  Updating page ${slug} in Strapi...`);

            // Strip documentId and other problematic fields
            const dataToUpdate = stripIds(updatedSections);

            try {
                await api.put(`/pages/${pageId}`, {
                    data: { sections: dataToUpdate }
                });
                console.log(`  ✅ ${slug} updated.`);
            } catch (err) {
                console.error(`  ❌ Failed to update ${slug}:`, JSON.stringify(err.response?.data || err.message, null, 2));
            }
        }
    }

    console.log('\n✅ All page links fixed!');
}

main().catch(err => {
    console.error('\n❌ Ошибка:', err.response?.data || err.message);
    process.exit(1);
});

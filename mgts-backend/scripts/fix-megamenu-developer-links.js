/**
 * Fix developer page links in megaMenus to use correct template.
 * 
 * Usage:
 *   STRAPI_API_TOKEN=... node scripts/fix-megamenu-developer-links.js
 */
const axios = require('axios');

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

function stripComponentIds(value) {
    if (Array.isArray(value)) return value.map(stripComponentIds);
    if (value && typeof value === 'object') {
        const next = {};
        Object.entries(value).forEach(([key, val]) => {
            if (key === 'id') return;
            next[key] = stripComponentIds(val);
        });
        return next;
    }
    return value;
}

function updateLinks(obj) {
    if (Array.isArray(obj)) {
        return obj.map(updateLinks);
    }
    if (obj && typeof obj === 'object') {
        const updated = {};
        for (const [key, val] of Object.entries(obj)) {
            if (key === 'href' && typeof val === 'string') {
                // Fix developer page links
                if (val === '/html_pages/tpl_service.html?slug=developers_connecting_objects') {
                    updated[key] = '/html_pages/tpl_deepnav.html?slug=developers_connecting_objects';
                } else if (val === '/html_pages/tpl_service.html?slug=developers_digital_solutions') {
                    updated[key] = '/html_pages/tpl_deepnav.html?slug=developers_digital_solutions';
                } else {
                    updated[key] = val;
                }
            } else {
                updated[key] = updateLinks(val);
            }
        }
        return updated;
    }
    return obj;
}

async function main() {
    // Fetch current navigation
    const navRes = await api.get('/navigation');
    const navigation = navRes.data?.data;

    if (!navigation) {
        throw new Error('Navigation not found');
    }

    console.log('Updating megaMenus...\n');

    const megaMenus = navigation.megaMenus || [];
    const updatedMegaMenus = updateLinks(megaMenus);

    // Strip component IDs
    const cleanedMegaMenus = stripComponentIds(updatedMegaMenus);

    // Update navigation
    await api.put('/navigation', {
        data: { megaMenus: cleanedMegaMenus },
    });

    console.log('✅ MegaMenus updated successfully!');
    console.log('Fixed links:');
    console.log('  - developers_connecting_objects → tpl_deepnav.html');
    console.log('  - developers_digital_solutions → tpl_deepnav.html');
}

if (require.main === module) {
    main().catch((error) => {
        console.error('\n❌ Ошибка:', error.response?.data || error.message);
        process.exit(1);
    });
}

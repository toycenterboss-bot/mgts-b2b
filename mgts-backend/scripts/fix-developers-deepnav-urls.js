/**
 * Fix broken sidebar URLs in developers Deep Nav tree.
 * 
 * Usage:
 *   STRAPI_API_TOKEN=... node scripts/fix-developers-deepnav-urls.js
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

async function main() {
    // Fetch current navigation
    const navRes = await api.get('/navigation');
    const deepNavTrees = navRes.data?.data?.deepNavTrees || [];

    // Find developers tree
    const developersTree = deepNavTrees.find(t => t.key === 'developers');
    if (!developersTree) {
        throw new Error('developers Deep Nav tree not found');
    }

    console.log('Current developers tree:', JSON.stringify(developersTree, null, 2));

    // Update URLs to use query parameter format for local development
    const updatedItems = developersTree.items.map(item => {
        if (item.href === '/developers/connecting_objects' || item.href === '/developers_connecting_objects') {
            return { ...item, href: '/html_pages/tpl_deepnav.html?slug=developers_connecting_objects' };
        }
        if (item.href === '/developers/digital_solutions' || item.href === '/developers_digital_solutions') {
            return { ...item, href: '/html_pages/tpl_deepnav.html?slug=developers_digital_solutions' };
        }
        if (item.href === '/developers/compensation_for_losses' || item.href === '/developers_compensation_for_losses') {
            return { ...item, href: '/html_pages/tpl_deepnav.html?slug=developers_compensation_for_losses' };
        }
        return item;
    });

    // Create updated tree
    const updatedTree = {
        ...developersTree,
        items: updatedItems
    };

    // Replace in array
    const updatedTrees = deepNavTrees.map(t =>
        t.key === 'developers' ? stripComponentIds(updatedTree) : stripComponentIds(t)
    );

    // Send update
    await api.put('/navigation', { data: { deepNavTrees: updatedTrees } });

    console.log('✅ Deep Nav URLs updated successfully!');
    console.log('Updated tree:', JSON.stringify(updatedTree, null, 2));
}

if (require.main === module) {
    main().catch((error) => {
        console.error('\n❌ Ошибка:', error.response?.data || error.message);
        process.exit(1);
    });
}

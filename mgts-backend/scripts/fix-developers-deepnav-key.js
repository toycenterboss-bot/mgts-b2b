/**
 * Set deepNavKey for developer pages to show sidebar.
 * 
 * Usage:
 *   STRAPI_API_TOKEN=... node scripts/fix-developers-deepnav-key.js
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

async function main() {
    const slugs = ['developers_connecting_objects', 'developers_digital_solutions'];

    for (const slug of slugs) {
        // Fetch page
        const pageRes = await api.get('/pages', {
            params: { 'filters[slug][$eq]': slug },
        });

        const page = Array.isArray(pageRes.data?.data) ? pageRes.data.data[0] : null;
        if (!page) {
            console.log(`⚠️  Page not found: ${slug}`);
            continue;
        }

        const pageId = page.documentId || page.id;
        console.log(`Updating ${slug} (ID: ${pageId})...`);
        console.log(`  Current template: ${page.template || 'null'}`);
        console.log(`  Current deepNavKey: ${page.deepNavKey || 'null'}`);

        // Update both template and deepNavKey
        await api.put(`/pages/${pageId}`, {
            data: {
                template: 'TPL_DeepNav',
                deepNavKey: 'developers'
            },
        });

        console.log(`✅ Updated ${slug}:`);
        console.log(`  - template set to 'TPL_DeepNav'`);
        console.log(`  - deepNavKey set to 'developers'\n`);
    }

    console.log('\n✅ All pages updated successfully!');
}

if (require.main === module) {
    main().catch((error) => {
        console.error('\n❌ Ошибка:', error.response?.data || error.message);
        process.exit(1);
    });
}

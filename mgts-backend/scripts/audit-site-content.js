const axios = require('axios');

const STRAPI_BASE = 'http://localhost:1337';

async function auditSite() {
    try {
        const response = await axios.get(`${STRAPI_BASE}/api/pages?populate=sections`);
        const pages = response.data.data;

        console.log(`Auditing ${pages.length} pages...\n`);

        const auditResults = pages.map(page => {
            const sections = page.sections || [];
            return {
                id: page.id,
                title: page.title,
                slug: page.slug,
                template: page.template,
                sectionCount: sections.length,
                sectionTypes: sections.map(s => s.__component)
            };
        });

        console.log(JSON.stringify(auditResults, null, 2));
    } catch (error) {
        console.error('Audit failed:', error.message);
    }
}

auditSite();

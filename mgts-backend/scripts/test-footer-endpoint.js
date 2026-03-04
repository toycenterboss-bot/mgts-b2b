/**
 * Тест endpoint /pages/footer
 */

const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const api = axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

(async () => {
    try {
        console.log('Testing /pages/footer endpoint...\n');
        const response = await api.get('/pages/footer');
        console.log('Status:', response.status);
        console.log('Sections:', response.data.data?.sections?.length || 0);
        console.log('Copyright:', response.data.data?.copyright || 'N/A');
        
        if (response.data.data?.sections) {
            console.log('\nFooter sections:');
            response.data.data.sections.forEach((s, i) => {
                console.log(`${i+1}. ${s.title}: ${s.links?.length || 0} links`);
                if (s.links && s.links.length > 0 && i < 3) {
                    console.log(`   First links: ${s.links.slice(0, 3).map(l => l.label).join(', ')}`);
                }
            });
        }
        
        console.log('\n✅ Footer endpoint works!');
    } catch (e) {
        console.error('\n❌ Error:', e.response?.status || e.message);
        if (e.response?.data) {
            console.error('Response data:', JSON.stringify(e.response.data, null, 2));
        }
        process.exit(1);
    }
})();

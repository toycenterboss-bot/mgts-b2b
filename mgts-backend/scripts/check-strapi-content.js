/**
 * Скрипт для проверки наличия контента в Strapi для проблемных страниц
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Читаем токен из контекста
function getApiToken() {
    const contextPath = path.join(__dirname, '../../docs/project/CONTEXT.md');
    if (fs.existsSync(contextPath)) {
        const context = fs.readFileSync(contextPath, 'utf-8');
        // Пробуем разные паттерны для извлечения токена
        const patterns = [
            /export STRAPI_API_TOKEN="([^"]+)"/i,
            /STRAPI_API_TOKEN[:\s=]+([a-zA-Z0-9]{200,})/i,
            /STRAPI_API_TOKEN[:\s=]+([^\s\n]+)/i,
        ];
        for (const pattern of patterns) {
            const tokenMatch = context.match(pattern);
            if (tokenMatch && tokenMatch[1]) {
                return tokenMatch[1].trim();
            }
        }
    }
    return process.env.STRAPI_API_TOKEN || '';
}

async function checkPageInStrapi(slug) {
    const apiToken = getApiToken();
    
    if (!apiToken) {
        return { exists: false, error: 'API token not found' };
    }
    
    return new Promise((resolve) => {
        const url = new URL(`http://localhost:1337/api/pages?filters[slug][$eq]=${slug}&populate=*`);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode !== 200) {
                        resolve({ exists: false, error: `HTTP ${res.statusCode}`, response: json });
                        return;
                    }
                    const page = json.data?.[0];
                    if (page) {
                        // Strapi v5: данные находятся напрямую в page, не в page.attributes
                        const slug = page.slug;
                        const title = page.title;
                        const content = page.content;
                        const heroTitle = page.heroTitle;
                        const heroSubtitle = page.heroSubtitle;
                        const publishedAt = page.publishedAt;
                        
                        resolve({
                            exists: true,
                            slug: slug,
                            title: title,
                            hasContent: !!content,
                            contentLength: content?.length || 0,
                            hasHero: !!(heroTitle || heroSubtitle),
                            published: !!publishedAt,
                        });
                    } else {
                        resolve({ exists: false, response: json });
                    }
                } catch (e) {
                    resolve({ exists: false, error: e.message, rawData: data.substring(0, 500) });
                }
            });
        });
        
        req.on('error', (e) => {
            resolve({ exists: false, error: e.message });
        });
        
        req.end();
    });
}

async function main() {
    const problematicPages = [
        'about_registrar',
        'access_internet',
        'corporate_documents',
        'business_all_services',
        'forms_doc',
    ];
    
    console.log('🔍 Проверка контента в Strapi для проблемных страниц\n');
    
    for (const slug of problematicPages) {
        process.stdout.write(`📄 ${slug}... `);
        const result = await checkPageInStrapi(slug);
        
        if (result.exists) {
            if (result.hasContent) {
                console.log(`✅ Контент есть (${result.contentLength} символов)`);
            } else {
                console.log(`❌ Страница есть, но контент пустой`);
            }
            console.log(`   • Заголовок: ${result.title || 'нет'}`);
            console.log(`   • Hero: ${result.hasHero ? 'есть' : 'нет'}`);
            console.log(`   • Опубликована: ${result.published ? 'да' : 'нет'}`);
        } else {
            console.log(`❌ Страница не найдена в Strapi`);
            if (result.error) {
                console.log(`   • Ошибка: ${result.error}`);
            }
        }
        console.log('');
    }
}

main().catch(console.error);

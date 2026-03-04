/**
 * Скрипт для проверки путей к изображениям в контенте из Strapi
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Читаем токен из контекста
function getApiToken() {
    const contextPath = path.join(__dirname, '../../docs/project/CONTEXT.md');
    if (fs.existsSync(contextPath)) {
        const context = fs.readFileSync(contextPath, 'utf-8');
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

async function getPageFromStrapi(slug) {
    const apiToken = getApiToken();
    
    if (!apiToken) {
        return { error: 'API token not found' };
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
                        resolve({ error: `HTTP ${res.statusCode}`, response: json });
                        return;
                    }
                    const page = json.data?.[0];
                    if (page) {
                        resolve({ page });
                    } else {
                        resolve({ error: 'Page not found' });
                    }
                } catch (e) {
                    resolve({ error: e.message, rawData: data.substring(0, 500) });
                }
            });
        });
        
        req.on('error', (e) => {
            resolve({ error: e.message });
        });
        
        req.end();
    });
}

function extractImagePaths(html) {
    if (!html) return [];
    
    // Ищем все img теги
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const images = [];
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
        images.push(match[1]);
    }
    
    return images;
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 ПРОВЕРКА ПУТЕЙ К ИЗОБРАЖЕНИЯМ В STRAPI');
    console.log('═'.repeat(70) + '\n');
    
    const problematicPages = [
        'about_mgts',
        'virtual_ate',
    ];
    
    for (const slug of problematicPages) {
        console.log(`\n📄 Страница: ${slug}`);
        console.log('─'.repeat(70));
        
        const result = await getPageFromStrapi(slug);
        
        if (result.error) {
            console.log(`   ❌ Ошибка: ${result.error}`);
            continue;
        }
        
        const page = result.page;
        const content = page.content || '';
        
        console.log(`   ✅ Контент загружен (${content.length} символов)`);
        
        // Извлекаем пути к изображениям
        const imagePaths = extractImagePaths(content);
        
        console.log(`\n   📸 Найдено изображений в контенте: ${imagePaths.length}`);
        
        if (imagePaths.length > 0) {
            console.log('\n   🔍 Пути к изображениям:');
            imagePaths.forEach((imgPath, index) => {
                const isStrapiUrl = imgPath.includes('localhost:1337') || imgPath.includes('uploads');
                const isLocalPath = imgPath.startsWith('/images/');
                const icon = isStrapiUrl ? '✅' : (isLocalPath ? '⚠️' : '❓');
                console.log(`      ${icon} ${index + 1}. ${imgPath}`);
            });
            
            const strapiUrls = imagePaths.filter(p => p.includes('localhost:1337') || p.includes('uploads'));
            const localPaths = imagePaths.filter(p => p.startsWith('/images/'));
            
            console.log(`\n   📊 Статистика:`);
            console.log(`      ✅ URL из Strapi: ${strapiUrls.length}`);
            console.log(`      ⚠️  Локальные пути (/images/...): ${localPaths.length}`);
            console.log(`      ❓ Другие пути: ${imagePaths.length - strapiUrls.length - localPaths.length}`);
        } else {
            console.log('   ℹ️  Изображения не найдены в HTML-контенте');
        }
    }
    
    console.log('\n' + '═'.repeat(70) + '\n');
}

main().catch(error => {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
});

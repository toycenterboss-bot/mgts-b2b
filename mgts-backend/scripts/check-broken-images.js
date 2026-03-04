/**
 * Скрипт для детальной проверки сломанных изображений на проблемных страницах
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Проблемные страницы из отчета
const problematicPages = [
    'about_mgts',
    'business_equipment_setup',
    'general_director_message',
    'mgts_compliance_policies',
    'principles_corporate_manage',
    'virtual_ate'
];

// Построить путь к странице
function buildPagePath(slug) {
    if (slug === 'home' || slug === 'index') {
        return '/index.html';
    }
    return `/${slug}/index.html`;
}

async function checkBrokenImages(browser, slug, baseUrl = 'http://localhost:8001') {
    const pagePath = buildPagePath(slug);
    const pageUrl = `${baseUrl}${pagePath}`;
    const page = await browser.newPage();
    
    console.log(`\n🔍 Проверка: ${slug}`);
    console.log(`   URL: ${pageUrl}`);
    
    try {
        await page.goto(pageUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 20000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const imageInfo = await page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            const broken = [];
            const working = [];
            
            images.forEach((img, index) => {
                const info = {
                    index: index + 1,
                    src: img.getAttribute('src') || img.src,
                    alt: img.getAttribute('alt') || '',
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    complete: img.complete,
                    width: img.width,
                    height: img.height,
                    className: img.className,
                    parentTag: img.parentElement?.tagName || '',
                    parentClass: img.parentElement?.className || '',
                };
                
                if (!img.complete || img.naturalWidth === 0) {
                    broken.push(info);
                } else {
                    working.push(info);
                }
            });
            
            return { broken, working, total: images.length };
        });
        
        console.log(`   📊 Всего изображений: ${imageInfo.total}`);
        console.log(`   ✅ Работающих: ${imageInfo.working.length}`);
        console.log(`   ❌ Сломанных: ${imageInfo.broken.length}`);
        
        if (imageInfo.broken.length > 0) {
            console.log(`\n   🔴 СЛОМАННЫЕ ИЗОБРАЖЕНИЯ:`);
            imageInfo.broken.forEach(img => {
                console.log(`      ${img.index}. ${img.src}`);
                console.log(`         Размеры: ${img.width}x${img.height}px`);
                console.log(`         Natural: ${img.naturalWidth}x${img.naturalHeight}px`);
                console.log(`         Complete: ${img.complete}`);
                console.log(`         Alt: "${img.alt}"`);
                console.log(`         Родитель: <${img.parentTag} class="${img.parentClass}">`);
                console.log('');
            });
        }
        
        return imageInfo;
        
    } catch (error) {
        console.error(`   ❌ Ошибка: ${error.message}`);
        return null;
    } finally {
        await page.close();
    }
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 ДЕТАЛЬНАЯ ПРОВЕРКА СЛОМАННЫХ ИЗОБРАЖЕНИЙ');
    console.log('═'.repeat(70));
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = {};
    
    for (const slug of problematicPages) {
        const result = await checkBrokenImages(browser, slug);
        if (result) {
            results[slug] = result;
        }
    }
    
    await browser.close();
    
    // Сохранение отчета
    const reportPath = path.join(__dirname, '../../temp/validation/broken-images-report.json');
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Отчет сохранен: ${reportPath}\n`);
    console.log('═'.repeat(70) + '\n');
}

main().catch(error => {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
});

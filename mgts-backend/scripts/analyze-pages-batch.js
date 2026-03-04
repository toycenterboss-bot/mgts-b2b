const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Извлекает все slugs из PAGES_HIERARCHY.md
 */
function getAllSlugs() {
    const hierarchyPath = path.join(__dirname, '../../docs/PAGES_HIERARCHY.md');
    const content = fs.readFileSync(hierarchyPath, 'utf-8');
    
    // Ищем все slug в формате (`slug`)
    const slugRegex = /`([^`]+)`/g;
    const slugs = [];
    let match;
    
    while ((match = slugRegex.exec(content)) !== null) {
        const slug = match[1];
        // Исключаем технические slug и дубликаты
        if (slug && !slug.includes(' ') && !slugs.includes(slug)) {
            slugs.push(slug);
        }
    }
    
    return slugs.sort();
}

/**
 * Получает список уже проанализированных страниц
 */
function getAnalyzedPages() {
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
    if (!fs.existsSync(outputDir)) {
        return [];
    }
    
    const files = fs.readdirSync(outputDir);
    const analyzed = files
        .filter(f => f.endsWith('_spec.json'))
        .map(f => f.replace('_spec.json', ''))
        .filter(slug => slug && slug !== '');
    
    return analyzed;
}

/**
 * Запускает анализ страницы
 */
function analyzePage(slug) {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📄 Анализ страницы: ${slug}`);
        console.log(`${'='.repeat(60)}`);
        
        const result = execSync(
            `node scripts/analyze-page-with-llm.js "${slug}"`,
            { 
                cwd: path.join(__dirname, '..'),
                stdio: 'inherit',
                encoding: 'utf-8'
            }
        );
        
        return { slug, success: true };
    } catch (error) {
        console.error(`\n❌ Ошибка при анализе ${slug}:`, error.message);
        return { slug, success: false, error: error.message };
    }
}

/**
 * Проверяет результаты анализа пачки
 */
function checkBatchResults(slugs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ПРОВЕРКА РЕЗУЛЬТАТОВ ПАЧКИ`);
    console.log(`${'='.repeat(60)}`);
    
    const outputDir = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
    const results = [];
    
    for (const slug of slugs) {
        const safeSlug = slug.replace(/\//g, '_');
        const specPath = path.join(outputDir, `${safeSlug}_spec.json`);
        
        if (fs.existsSync(specPath)) {
            try {
                const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
                const sectionsCount = spec.sections?.length || 0;
                
                // Проверяем наличие табов и их fileLinks
                const tabsSections = spec.sections?.filter(s => s.type === 'tabs' || s.tabs?.length > 0) || [];
                let totalTabs = 0;
                let tabsWithFileLinks = 0;
                
                tabsSections.forEach(section => {
                    if (section.tabs) {
                        totalTabs += section.tabs.length;
                        section.tabs.forEach(tab => {
                            const fileLinksCount = tab.content?.links?.fileLinks?.length || 0;
                            if (fileLinksCount > 0) {
                                tabsWithFileLinks++;
                            }
                        });
                    }
                });
                
                results.push({
                    slug,
                    success: true,
                    sectionsCount,
                    totalTabs,
                    tabsWithFileLinks,
                    hasTabs: totalTabs > 0
                });
            } catch (e) {
                results.push({
                    slug,
                    success: false,
                    error: `Ошибка чтения JSON: ${e.message}`
                });
            }
        } else {
            results.push({
                slug,
                success: false,
                error: 'Файл spec.json не найден'
            });
        }
    }
    
    // Выводим отчет
    console.log(`\n📋 Статистика по пачке:\n`);
    results.forEach(r => {
        if (r.success) {
            const status = r.hasTabs 
                ? `✅ ${r.sectionsCount} секций, ${r.totalTabs} табов (${r.tabsWithFileLinks} с fileLinks)`
                : `✅ ${r.sectionsCount} секций`;
            console.log(`   ${r.slug.padEnd(40)} ${status}`);
        } else {
            console.log(`   ${r.slug.padEnd(40)} ❌ ${r.error}`);
        }
    });
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Итого: ${successCount} успешно, ${failedCount} с ошибками из ${slugs.length}`);
    
    return results;
}

/**
 * Главная функция
 */
function main() {
    const batchNumber = parseInt(process.argv[2]) || 1;
    const batchSize = 5;
    const skipSlugsEnv = process.env.SKIP_SLUGS || '';
    const skipPrefixesEnv = process.env.SKIP_PREFIXES || '';
    const skipSlugs = skipSlugsEnv
        .split(',')
        .map(slug => slug.trim())
        .filter(Boolean);
    const skipPrefixes = skipPrefixesEnv
        .split(',')
        .map(prefix => prefix.trim())
        .filter(Boolean);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📦 ПАКЕТНЫЙ АНАЛИЗ СТРАНИЦ С LLM');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Получаем все slugs
    const allSlugs = getAllSlugs();
    console.log(`\n📋 Всего страниц в иерархии: ${allSlugs.length}`);
    
    // Получаем уже проанализированные
    const analyzed = getAnalyzedPages();
    console.log(`✅ Уже проанализировано: ${analyzed.length}`);
    
    // Исключаем проанализированные и исключения
    const remaining = allSlugs.filter(slug =>
        !analyzed.includes(slug) &&
        !skipSlugs.includes(slug) &&
        !skipPrefixes.some(prefix => slug.startsWith(prefix))
    );
    console.log(`📝 Осталось проанализировать: ${remaining.length}`);
    if (skipSlugs.length > 0) {
        console.log(`⏭️  Исключены из обработки: ${skipSlugs.join(', ')}`);
    }
    if (skipPrefixes.length > 0) {
        console.log(`⏭️  Исключены по префиксу: ${skipPrefixes.join(', ')}`);
    }
    
    if (remaining.length === 0) {
        console.log('\n✅ Все страницы уже проанализированы!');
        return;
    }
    
    // Разбиваем на пачки
    const batches = [];
    for (let i = 0; i < remaining.length; i += batchSize) {
        batches.push(remaining.slice(i, i + batchSize));
    }
    
    console.log(`\n📦 Всего пачек: ${batches.length} (по ${batchSize} страниц)`);
    
    if (batchNumber > batches.length) {
        console.error(`\n❌ Ошибка: Пачка #${batchNumber} не существует. Максимум: ${batches.length}`);
        return;
    }
    
    const currentBatch = batches[batchNumber - 1];
    
    console.log(`\n🚀 Запуск пачки #${batchNumber} из ${batches.length}`);
    console.log(`📄 Страницы в пачке: ${currentBatch.join(', ')}`);
    
    // Анализируем каждую страницу
    const results = [];
    for (const slug of currentBatch) {
        const result = analyzePage(slug);
        results.push(result);
    }
    
    // Проверяем результаты
    checkBatchResults(currentBatch);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Пачка #${batchNumber} завершена!`);
    console.log(`${'='.repeat(60)}`);
    
    if (batchNumber < batches.length) {
        console.log(`\n💡 Для запуска следующей пачки выполните:`);
        console.log(`   node scripts/analyze-pages-batch.js ${batchNumber + 1}`);
    } else {
        console.log(`\n🎉 Все пачки завершены!`);
    }
}

if (require.main === module) {
    main();
}

module.exports = { getAllSlugs, getAnalyzedPages, analyzePage, checkBatchResults };

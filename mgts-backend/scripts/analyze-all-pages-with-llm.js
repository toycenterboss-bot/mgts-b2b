const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Полный список всех страниц для анализа (на основе site-structure-tree.md)
const PAGES = [
    // Главная
    'home',
    
    // О компании
    'about_mgts',
    'about_mgts/ethics',
    'about_mgts/ethics/compliance-policies',
    'about_mgts/ethics/general-director-message',
    'about_mgts/ethics/interaction-partners',
    'about_mgts/ethics/partners-feedback',
    'about_mgts/ethics/single-hotline',
    'about_mgts/governance',
    'about_mgts/governance/documents', // Табы с документами
    'about_mgts/governance/infoformen', // Сложный контент
    'about_mgts/governance/principles',
    'about_mgts/governance/registrar',
    'about_mgts/governance/shareholders',
    'about_mgts/values',
    
    // Услуги - операторам
    'operators',
    
    // Услуги - госзаказчикам
    'government',
    
    // Услуги - застройщикам
    'developers',
    
    // Бизнес услуги
    'business',
    'business/cloud',
    'business/cloud/services',
    'business/cloud/storage',
    'business/cloud/vps',
    'business/internet',
    'business/internet/dedicated',
    'business/internet/gpon',
    'business/internet/office',
    'business/security',
    'business/security/access-control',
    'business/security/alarm',
    'business/security/video-surveillance',
    'business/telephony',
    'business/telephony/fixed',
    'business/telephony/ip',
    'business/telephony/mobile',
    'business/telephony/vpbx',
    'business/tv',
    'business/tv/iptv',
    'business/tv/office',
    
    // Партнеры
    'partners',
    
    // Контакты
    'contacts'
];

const OUTPUT_DIR = path.join(__dirname, '..', 'temp', 'page-analysis-llm');
const REPORT_FILE = path.join(OUTPUT_DIR, 'analysis_report.json');
const ERROR_LOG = path.join(OUTPUT_DIR, 'errors.log');

// Создаем директорию для результатов
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Очищаем лог ошибок
if (fs.existsSync(ERROR_LOG)) {
    fs.unlinkSync(ERROR_LOG);
}

const results = {
    total: PAGES.length,
    successful: 0,
    failed: 0,
    pages: []
};

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

function logError(message) {
    const timestamp = new Date().toISOString();
    const errorMsg = `[${timestamp}] ERROR: ${message}`;
    console.error(errorMsg);
    fs.appendFileSync(ERROR_LOG, errorMsg + '\n');
}

function analyzePage(slug, index, total) {
    log(`\n═══════════════════════════════════════════════════════════`);
    log(`📄 Анализ страницы ${index + 1}/${total}: ${slug}`);
    log(`═══════════════════════════════════════════════════════════`);
    
    const startTime = Date.now();
    
    try {
        // Запускаем скрипт анализа
        const scriptPath = path.join(__dirname, 'analyze-page-with-llm.js');
        const output = execSync(`node "${scriptPath}" "${slug}"`, {
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: 120000 // 2 минуты на страницу
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        // Проверяем, создан ли файл результата (заменяем / на _ для имени файла)
        const safeSlug = slug.replace(/\//g, '_');
        const specFile = path.join(OUTPUT_DIR, `${safeSlug}_spec.json`);
        if (fs.existsSync(specFile)) {
            const spec = JSON.parse(fs.readFileSync(specFile, 'utf-8'));
            const sectionsCount = spec.sections?.length || 0;
            
            // Подсчитываем динамический контент
            let tabsCount = 0;
            let slidersCount = 0;
            let cardsCount = 0;
            
            spec.sections?.forEach(section => {
                if (section.tabs && section.tabs.length > 0) tabsCount += section.tabs.length;
                if (section.type === 'slider' || section.type === 'carousel') slidersCount++;
                if (section.cards && section.cards.length > 0) cardsCount += section.cards.length;
            });
            
            log(`✅ Успешно: ${sectionsCount} секций (${tabsCount} табов, ${slidersCount} слайдеров, ${cardsCount} карточек) за ${duration}с`);
            
            results.successful++;
            results.pages.push({
                slug: slug,
                status: 'success',
                duration: parseFloat(duration),
                sectionsCount: sectionsCount,
                tabsCount: tabsCount,
                slidersCount: slidersCount,
                cardsCount: cardsCount,
                specFile: specFile
            });
            
            return true;
        } else {
            throw new Error('Файл результата не создан');
        }
        
    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logError(`Страница ${slug}: ${error.message}`);
        
        results.failed++;
        results.pages.push({
            slug: slug,
            status: 'failed',
            duration: parseFloat(duration),
            error: error.message
        });
        
        return false;
    }
}

async function main() {
    log('🚀 Начало массового анализа страниц с использованием LLM');
    log(`📋 Всего страниц: ${PAGES.length}`);
    log(`📁 Вывод: ${OUTPUT_DIR}`);
    log('');
    
    const startTime = Date.now();
    
    // Анализируем каждую страницу
    for (let i = 0; i < PAGES.length; i++) {
        const slug = PAGES[i];
        analyzePage(slug, i, PAGES.length);
        
        // Небольшая пауза между запросами, чтобы не перегружать API
        if (i < PAGES.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 секунды между страницами
        }
    }
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Сохраняем отчет
    results.totalDuration = parseFloat(totalDuration);
    results.analyzedAt = new Date().toISOString();
    
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    // Выводим итоговую статистику
    log('');
    log('═══════════════════════════════════════════════════════════');
    log('📊 ИТОГОВАЯ СТАТИСТИКА');
    log('═══════════════════════════════════════════════════════════');
    log(`✅ Успешно: ${results.successful}/${results.total}`);
    log(`❌ Ошибок: ${results.failed}/${results.total}`);
    log(`⏱️  Общее время: ${totalDuration}с (${(parseFloat(totalDuration) / 60).toFixed(1)} минут)`);
    log(`📁 Отчет: ${REPORT_FILE}`);
    
    if (results.failed > 0) {
        log(`⚠️  Лог ошибок: ${ERROR_LOG}`);
    }
    
    log('');
    
    // Выводим список успешных страниц
    if (results.successful > 0) {
        log('✅ Успешно проанализированные страницы:');
        results.pages
            .filter(p => p.status === 'success')
            .forEach(p => {
                const dynamicInfo = [];
                if (p.tabsCount > 0) dynamicInfo.push(`${p.tabsCount} табов`);
                if (p.slidersCount > 0) dynamicInfo.push(`${p.slidersCount} слайдеров`);
                if (p.cardsCount > 0) dynamicInfo.push(`${p.cardsCount} карточек`);
                const dynamicStr = dynamicInfo.length > 0 ? ` (${dynamicInfo.join(', ')})` : '';
                log(`   - ${p.slug} (${p.sectionsCount} секций${dynamicStr}, ${p.duration}с)`);
            });
        log('');
    }
    
    // Выводим список ошибок
    if (results.failed > 0) {
        log('❌ Страницы с ошибками:');
        results.pages
            .filter(p => p.status === 'failed')
            .forEach(p => {
                log(`   - ${p.slug}: ${p.error}`);
            });
        log('');
    }
    
    // Статистика по динамическому контенту
    const totalTabs = results.pages
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + (p.tabsCount || 0), 0);
    const totalSliders = results.pages
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + (p.slidersCount || 0), 0);
    const totalCards = results.pages
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + (p.cardsCount || 0), 0);
    
    log('📈 Статистика динамического контента:');
    log(`   - Всего табов: ${totalTabs}`);
    log(`   - Всего слайдеров: ${totalSliders}`);
    log(`   - Всего карточек: ${totalCards}`);
    log('');
}

main().catch(error => {
    logError(`Критическая ошибка: ${error.message}`);
    process.exit(1);
});

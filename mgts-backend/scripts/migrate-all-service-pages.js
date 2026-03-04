const { processPageContent } = require('./migrate-service-page-content');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

// Интервал для точек останова (каждые N страниц)
const BREAKPOINT_INTERVAL = 3;

// Функция для логирования с немедленным выводом
function log(message) {
    console.log(message);
    // Принудительный flush для stdout
    if (process.stdout.isTTY) {
        process.stdout.write('');
    }
}

// Список всех страниц услуг
const servicePageSlugs = [
    'business/internet/gpon',
    'business/internet/dedicated',
    'business/internet/office',
    'business/telephony/fixed',
    'business/telephony/ip',
    'business/telephony/vpbx',
    'business/telephony/mobile',
    'business/security/video-surveillance',
    'business/security/access-control',
    'business/security/alarm',
    'business/cloud/storage',
    'business/cloud/vps',
    'business/cloud/services',
    'business/tv/iptv',
    'business/tv/office'
];

/**
 * Обработать все страницы услуг
 */
async function migrateAllServicePages() {
    const startTime = Date.now();
    log('🚀 НАЧАЛО МИГРАЦИИ ВСЕХ СТРАНИЦ УСЛУГ');
    log('='.repeat(70));
    log(`📄 Всего страниц для обработки: ${servicePageSlugs.length}`);
    log(`🔗 Strapi URL: ${STRAPI_URL}`);
    log(`⏸️  Точка останова каждые ${BREAKPOINT_INTERVAL} страниц`);
    log('='.repeat(70));
    
    const results = {
        success: [],
        failed: [],
        skipped: []
    };
    
    for (let i = 0; i < servicePageSlugs.length; i++) {
        const slug = servicePageSlugs[i];
        const pageStartTime = Date.now();
        
        log(`\n${'='.repeat(70)}`);
        log(`📄 Обработка страницы ${i + 1} из ${servicePageSlugs.length}: ${slug}`);
        log(`⏱️  Прогресс: ${((i / servicePageSlugs.length) * 100).toFixed(1)}%`);
        log('='.repeat(70));
        
        try {
            await processPageContent(slug);
            const pageDuration = ((Date.now() - pageStartTime) / 1000).toFixed(1);
            results.success.push(slug);
            log(`✅ Страница ${slug} успешно обработана за ${pageDuration}с`);
        } catch (error) {
            const pageDuration = ((Date.now() - pageStartTime) / 1000).toFixed(1);
            log(`❌ Ошибка при обработке страницы ${slug} (${pageDuration}с): ${error.message}`);
            results.failed.push({ slug, error: error.message, stack: error.stack });
        }
        
        // Точка останова каждые N страниц
        if ((i + 1) % BREAKPOINT_INTERVAL === 0 && i < servicePageSlugs.length - 1) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const remaining = servicePageSlugs.length - (i + 1);
            log(`\n⏸️  ТОЧКА ОСТАНОВА после ${i + 1} страниц`);
            log(`   ⏱️  Прошло времени: ${elapsed}с`);
            log(`   📊 Осталось страниц: ${remaining}`);
            log(`   ⏳ Пауза 3 секунды перед продолжением...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Небольшая задержка между запросами, чтобы не перегружать Strapi
        if (i < servicePageSlugs.length - 1) {
            log(`\n⏳ Ожидание 1 секунду перед следующей страницей...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Итоговый отчет
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    log('\n' + '='.repeat(70));
    log('📊 ИТОГОВЫЙ ОТЧЕТ');
    log('='.repeat(70));
    log(`⏱️  Общее время выполнения: ${totalDuration}с`);
    log(`✅ Успешно обработано: ${results.success.length}`);
    log(`❌ Ошибок: ${results.failed.length}`);
    log(`⏭️  Пропущено: ${results.skipped.length}`);
    
    if (results.success.length > 0) {
        log('\n✅ Успешно обработанные страницы:');
        results.success.forEach(slug => log(`   - ${slug}`));
    }
    
    if (results.failed.length > 0) {
        log('\n❌ Страницы с ошибками:');
        results.failed.forEach(({ slug, error }) => {
            log(`   - ${slug}: ${error}`);
        });
    }
    
    if (results.skipped.length > 0) {
        log('\n⏭️  Пропущенные страницы:');
        results.skipped.forEach(slug => log(`   - ${slug}`));
    }
    
    log('\n' + '='.repeat(70));
    log('✅ МИГРАЦИЯ ЗАВЕРШЕНА');
    log('='.repeat(70));
    
    return results;
}

// Запуск скрипта
if (require.main === module) {
    migrateAllServicePages()
        .then((results) => {
            const exitCode = results.failed.length > 0 ? 1 : 0;
            process.exit(exitCode);
        })
        .catch((error) => {
            log('\n❌ Критическая ошибка:', error.message);
            log(error.stack);
            process.exit(1);
        });
}

module.exports = { migrateAllServicePages };



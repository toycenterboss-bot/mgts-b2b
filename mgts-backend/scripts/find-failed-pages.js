/**
 * Найти страницы, которые не загрузились при анализе
 */

const fs = require('fs');
const path = require('path');

const SERVICES_FILE = path.join(__dirname, '../../temp/services-extraction/all-services-all-sections.json');
const CLASSIFICATION_FILE = path.join(__dirname, '../../temp/services-extraction/content-classification.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/failed-pages.json');

function findFailedPages() {
    // Загружаем все страницы
    const servicesData = JSON.parse(fs.readFileSync(SERVICES_FILE, 'utf-8'));
    const allServices = servicesData.allServices || [];
    
    // Загружаем проанализированные страницы
    const classificationData = JSON.parse(fs.readFileSync(CLASSIFICATION_FILE, 'utf-8'));
    const analyzedUrls = new Set(classificationData.classifications.map(c => c.url));
    
    // Находим не загрузившиеся страницы
    const failedPages = allServices.filter(service => !analyzedUrls.has(service.url));
    
    // Группируем по причинам (если есть информация в логе)
    const bySection = {};
    const byError = {
        external: [],
        certificate: [],
        connection: [],
        other: []
    };
    
    failedPages.forEach(page => {
        // Группируем по разделам
        const section = page.section || 'unknown';
        if (!bySection[section]) {
            bySection[section] = [];
        }
        bySection[section].push(page);
        
        // Пытаемся определить тип ошибки по URL
        const url = page.url.toLowerCase();
        if (url.includes('login.mgts.ru') || 
            url.includes('torg.mts.ru') ||
            url.includes('zakupki.gov.ru') ||
            url.includes('roseltorg.ru') ||
            url.includes('rts-tender.ru') ||
            url.includes('tektorg.ru') ||
            url.includes('auto.ru') ||
            url.includes('avito.ru')) {
            byError.external.push(page);
        } else if (url.includes('torg.mts.ru')) {
            byError.certificate.push(page);
        } else {
            byError.other.push(page);
        }
    });
    
    const result = {
        timestamp: new Date().toISOString(),
        totalPages: allServices.length,
        analyzedPages: analyzedUrls.size,
        failedPages: failedPages.length,
        failedPagesList: failedPages,
        bySection: bySection,
        byError: {
            external: byError.external.length,
            certificate: byError.certificate.length,
            other: byError.other.length,
            details: byError
        },
        statistics: {
            successRate: ((analyzedUrls.size / allServices.length) * 100).toFixed(1) + '%',
            failureRate: ((failedPages.length / allServices.length) * 100).toFixed(1) + '%'
        }
    };
    
    // Сохраняем результаты
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    
    // Выводим статистику
    console.log('📊 АНАЛИЗ НЕЗАГРУЗИВШИХСЯ СТРАНИЦ');
    console.log('='.repeat(70));
    console.log(`Всего страниц: ${allServices.length}`);
    console.log(`Проанализировано: ${analyzedUrls.size}`);
    console.log(`Не загрузилось: ${failedPages.length}`);
    console.log(`Успешность: ${result.statistics.successRate}`);
    console.log(`Неудач: ${result.statistics.failureRate}`);
    
    console.log('\n📁 По разделам:');
    for (const [section, pages] of Object.entries(bySection)) {
        console.log(`  ${section}: ${pages.length}`);
    }
    
    console.log('\n❌ По типам ошибок:');
    console.log(`  Внешние ссылки: ${byError.external.length}`);
    console.log(`  Проблемы с сертификатами: ${byError.certificate.length}`);
    console.log(`  Другие: ${byError.other.length}`);
    
    console.log('\n📋 Примеры не загрузившихся страниц:');
    failedPages.slice(0, 10).forEach((page, i) => {
        console.log(`  ${i + 1}. ${page.title}`);
        console.log(`     ${page.url}`);
    });
    
    if (failedPages.length > 10) {
        console.log(`  ... и еще ${failedPages.length - 10} страниц`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
    console.log('='.repeat(70));
    
    return result;
}

if (require.main === module) {
    findFailedPages();
}

module.exports = { findFailedPages };

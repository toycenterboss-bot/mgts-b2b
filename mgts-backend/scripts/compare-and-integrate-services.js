/**
 * Скрипт для сравнения услуг с действующего сайта и нового сайта
 * и создания плана интеграции актуальных услуг
 */

const fs = require('fs');
const path = require('path');

const EXTRACTED_SERVICES_FILE = path.join(__dirname, '../../temp/services-extraction/all-services.json');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const COMPARISON_FILE = path.join(OUTPUT_DIR, 'services-comparison.json');
const INTEGRATION_PLAN_FILE = path.join(OUTPUT_DIR, 'integration-plan.json');

// Структура услуг на новом сайте (из header.html и структуры папок)
const NEW_SITE_SERVICES = {
    internet: [
        { slug: 'gpon', title: 'GPON для бизнеса', path: 'business/internet/gpon' },
        { slug: 'dedicated', title: 'Выделенный интернет', path: 'business/internet/dedicated' },
        { slug: 'office', title: 'Офисный интернет', path: 'business/internet/office' }
    ],
    telephony: [
        { slug: 'fixed', title: 'Фиксированная связь', path: 'business/telephony/fixed' },
        { slug: 'ip', title: 'IP-телефония', path: 'business/telephony/ip' },
        { slug: 'vpbx', title: 'Виртуальная АТС', path: 'business/telephony/vpbx' },
        { slug: 'mobile', title: 'Корпоративная мобильная связь', path: 'business/telephony/mobile' }
    ],
    security: [
        { slug: 'video-surveillance', title: 'Видеонаблюдение', path: 'business/security/video-surveillance' },
        { slug: 'access-control', title: 'Контроль доступа', path: 'business/security/access-control' },
        { slug: 'alarm', title: 'Охранная сигнализация', path: 'business/security/alarm' }
    ],
    cloud: [
        { slug: 'storage', title: 'Облачное хранилище', path: 'business/cloud/storage' },
        { slug: 'vps', title: 'Виртуальные серверы', path: 'business/cloud/vps' },
        { slug: 'services', title: 'Облачные сервисы', path: 'business/cloud/services' }
    ],
    tv: [
        { slug: 'iptv', title: 'IPTV для бизнеса', path: 'business/tv/iptv' },
        { slug: 'office', title: 'Корпоративное ТВ', path: 'business/tv/office' }
    ]
};

/**
 * Нормализовать название услуги для сравнения
 */
function normalizeTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Найти соответствующую услугу на новом сайте
 */
function findMatchingService(extractedService, newSiteServices) {
    const normalizedExtracted = normalizeTitle(extractedService.title);
    
    for (const category of Object.values(newSiteServices)) {
        for (const service of category) {
            const normalizedNew = normalizeTitle(service.title);
            
            // Точное совпадение
            if (normalizedExtracted === normalizedNew) {
                return service;
            }
            
            // Частичное совпадение (если одно название содержит другое)
            if (normalizedExtracted.includes(normalizedNew) || normalizedNew.includes(normalizedExtracted)) {
                // Проверяем, что это не слишком общее совпадение
                if (normalizedExtracted.length > 5 && normalizedNew.length > 5) {
                    return service;
                }
            }
        }
    }
    
    return null;
}

/**
 * Сравнить услуги
 */
function compareServices(extractedServices, newSiteServices) {
    const comparison = {
        matched: [],
        newOnSite: [],
        missingOnNewSite: [],
        needsUpdate: []
    };
    
    // Проверяем каждую услугу с действующего сайта
    for (const extracted of extractedServices) {
        const match = findMatchingService(extracted, newSiteServices);
        
        if (match) {
            comparison.matched.push({
                extracted: extracted,
                newSite: match,
                needsContentUpdate: true // Всегда можно обновить контент
            });
        } else {
            comparison.missingOnNewSite.push(extracted);
        }
    }
    
    // Проверяем услуги на новом сайте, которых нет на действующем
    const extractedTitles = extractedServices.map(s => normalizeTitle(s.title));
    for (const category of Object.values(newSiteServices)) {
        for (const service of category) {
            const normalized = normalizeTitle(service.title);
            if (!extractedTitles.some(ext => ext === normalized || ext.includes(normalized) || normalized.includes(ext))) {
                comparison.newOnSite.push(service);
            }
        }
    }
    
    return comparison;
}

/**
 * Создать план интеграции
 */
function createIntegrationPlan(comparison) {
    const plan = {
        steps: [],
        summary: {
            totalServices: comparison.matched.length + comparison.missingOnNewSite.length,
            toUpdate: comparison.matched.length,
            toAdd: comparison.missingOnNewSite.length,
            newOnSite: comparison.newOnSite.length
        }
    };
    
    // Шаг 1: Обновить существующие услуги
    if (comparison.matched.length > 0) {
        plan.steps.push({
            step: 1,
            action: 'update_existing',
            description: 'Обновить контент существующих услуг актуальными данными',
            services: comparison.matched.map(m => ({
                slug: m.newSite.slug,
                path: m.newSite.path,
                title: m.extracted.title,
                hasNewContent: true,
                hasNewDescription: !!m.extracted.description,
                hasNewFeatures: m.extracted.features.length > 0,
                hasNewTariffs: m.extracted.tariffs.length > 0
            }))
        });
    }
    
    // Шаг 2: Добавить отсутствующие услуги
    if (comparison.missingOnNewSite.length > 0) {
        plan.steps.push({
            step: 2,
            action: 'add_missing',
            description: 'Добавить новые услуги, которых нет на новом сайте',
            services: comparison.missingOnNewSite.map(s => ({
                title: s.title,
                category: s.category,
                slug: s.slug,
                description: s.description,
                features: s.features,
                tariffs: s.tariffs
            }))
        });
    }
    
    // Шаг 3: Проверить услуги, которые есть только на новом сайте
    if (comparison.newOnSite.length > 0) {
        plan.steps.push({
            step: 3,
            action: 'review_new',
            description: 'Проверить услуги, которые есть на новом сайте, но отсутствуют на действующем',
            services: comparison.newOnSite
        });
    }
    
    return plan;
}

/**
 * Основная функция
 */
function main() {
    console.log('🔍 СРАВНЕНИЕ УСЛУГ И СОЗДАНИЕ ПЛАНА ИНТЕГРАЦИИ');
    console.log('='.repeat(70));
    
    // Загрузить собранные услуги
    if (!fs.existsSync(EXTRACTED_SERVICES_FILE)) {
        console.error('❌ Файл с собранными услугами не найден!');
        console.error(`   Запустите сначала: node extract-all-services.js`);
        process.exit(1);
    }
    
    const extractedData = JSON.parse(fs.readFileSync(EXTRACTED_SERVICES_FILE, 'utf-8'));
    const extractedServices = extractedData.services || [];
    
    console.log(`📊 Услуг с действующего сайта: ${extractedServices.length}`);
    console.log(`📊 Услуг на новом сайте: ${Object.values(NEW_SITE_SERVICES).flat().length}`);
    
    // Сравнить услуги
    console.log('\n🔍 Сравнение услуг...');
    const comparison = compareServices(extractedServices, NEW_SITE_SERVICES);
    
    console.log(`✅ Найдено совпадений: ${comparison.matched.length}`);
    console.log(`➕ Новых услуг для добавления: ${comparison.missingOnNewSite.length}`);
    console.log(`🆕 Услуг только на новом сайте: ${comparison.newOnSite.length}`);
    
    // Создать план интеграции
    console.log('\n📋 Создание плана интеграции...');
    const integrationPlan = createIntegrationPlan(comparison);
    
    // Сохранить результаты
    fs.writeFileSync(COMPARISON_FILE, JSON.stringify(comparison, null, 2), 'utf-8');
    fs.writeFileSync(INTEGRATION_PLAN_FILE, JSON.stringify(integrationPlan, null, 2), 'utf-8');
    
    // Вывести план
    console.log('\n' + '='.repeat(70));
    console.log('📋 ПЛАН ИНТЕГРАЦИИ');
    console.log('='.repeat(70));
    console.log(`📊 Всего услуг: ${integrationPlan.summary.totalServices}`);
    console.log(`🔄 К обновлению: ${integrationPlan.summary.toUpdate}`);
    console.log(`➕ К добавлению: ${integrationPlan.summary.toAdd}`);
    console.log(`🆕 Только на новом сайте: ${integrationPlan.summary.newOnSite}`);
    
    console.log('\n📝 Шаги:');
    for (const step of integrationPlan.steps) {
        console.log(`\n${step.step}. ${step.description}`);
        console.log(`   Услуг: ${step.services.length}`);
        if (step.services.length <= 5) {
            step.services.forEach(s => {
                console.log(`   - ${s.title || s.slug}`);
            });
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`📁 Результаты сохранены:`);
    console.log(`   - Сравнение: ${COMPARISON_FILE}`);
    console.log(`   - План интеграции: ${INTEGRATION_PLAN_FILE}`);
    console.log('='.repeat(70));
}

if (require.main === module) {
    main();
}

module.exports = { compareServices, createIntegrationPlan };

/**
 * Анализ документов для миграции и определение безопасных способов хранения
 */

const fs = require('fs');
const path = require('path');

const FAILED_PAGES_FILE = path.join(__dirname, '../../temp/services-extraction/failed-pages.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/documents-migration-plan.json');

/**
 * Анализ документов
 */
function analyzeDocuments() {
    if (!fs.existsSync(FAILED_PAGES_FILE)) {
        console.error('❌ Файл не найден:', FAILED_PAGES_FILE);
        process.exit(1);
    }
    
    const failedPages = JSON.parse(fs.readFileSync(FAILED_PAGES_FILE, 'utf-8'));
    const documents = failedPages.failedPagesList.filter(page => {
        const url = page.url.toLowerCase();
        return url.match(/\.(docx?|xlsx?|pdf|zip|rar)$/i);
    });
    
    // Классифицируем документы
    const byType = {
        docx: [],
        xlsx: [],
        pdf: [],
        other: []
    };
    
    const bySection = {};
    const byCategory = {
        contracts: [],      // Договоры
        applications: [],     // Заявления
        tariffs: [],          // Тарифы
        regulations: [],     // Регламенты
        other: []            // Прочее
    };
    
    documents.forEach(doc => {
        const url = doc.url.toLowerCase();
        const title = doc.title.toLowerCase();
        
        // По типу файла
        if (url.endsWith('.docx') || url.endsWith('.doc')) {
            byType.docx.push(doc);
        } else if (url.endsWith('.xlsx') || url.endsWith('.xls')) {
            byType.xlsx.push(doc);
        } else if (url.endsWith('.pdf')) {
            byType.pdf.push(doc);
        } else {
            byType.other.push(doc);
        }
        
        // По разделу
        const section = doc.section || 'unknown';
        if (!bySection[section]) {
            bySection[section] = [];
        }
        bySection[section].push(doc);
        
        // По категории (по названию)
        if (title.includes('договор') || title.includes('соглашение')) {
            byCategory.contracts.push(doc);
        } else if (title.includes('заявление') || title.includes('заявк')) {
            byCategory.applications.push(doc);
        } else if (title.includes('тариф')) {
            byCategory.tariffs.push(doc);
        } else if (title.includes('регламент') || title.includes('положение') || title.includes('условия')) {
            byCategory.regulations.push(doc);
        } else {
            byCategory.other.push(doc);
        }
    });
    
    return {
        total: documents.length,
        byType: byType,
        bySection: bySection,
        byCategory: byCategory,
        documents: documents
    };
}

/**
 * Генерация плана миграции документов
 */
function generateMigrationPlan(analysis) {
    const plan = {
        timestamp: new Date().toISOString(),
        totalDocuments: analysis.total,
        storageOptions: [
            {
                name: 'Strapi Media Library',
                description: 'Встроенное хранилище Strapi для медиа-файлов',
                pros: [
                    'Интеграция с CMS',
                    'Управление через админ-панель',
                    'Автоматическая обработка',
                    'Метаданные файлов'
                ],
                cons: [
                    'Ограничения по размеру',
                    'Не подходит для больших файлов',
                    'Файлы доступны через API'
                ],
                useCase: 'Небольшие документы (до 10MB), которые нужно отображать на сайте',
                implementation: 'Загрузить через Strapi Admin → Media Library'
            },
            {
                name: 'Cloudinary',
                description: 'Облачное хранилище с CDN',
                pros: [
                    'Безопасное хранение',
                    'CDN для быстрой загрузки',
                    'Автоматическая оптимизация',
                    'Контроль доступа',
                    'Масштабируемость'
                ],
                cons: [
                    'Требует настройки',
                    'Может быть платным при больших объемах'
                ],
                useCase: 'Все типы документов, особенно для публичного доступа',
                implementation: 'Настроить Cloudinary provider в Strapi, загрузить файлы'
            },
            {
                name: 'S3 / Object Storage',
                description: 'Облачное хранилище объектов (AWS S3, Yandex Object Storage, etc.)',
                pros: [
                    'Высокая безопасность',
                    'Масштабируемость',
                    'Контроль доступа',
                    'Надежность'
                ],
                cons: [
                    'Требует настройки',
                    'Может быть платным'
                ],
                useCase: 'Большие файлы, конфиденциальные документы',
                implementation: 'Настроить S3 provider в Strapi, загрузить файлы'
            },
            {
                name: 'Защищенная директория на сервере',
                description: 'Хранение вне публичной директории сайта',
                pros: [
                    'Полный контроль',
                    'Безопасность',
                    'Нет зависимости от внешних сервисов'
                ],
                cons: [
                    'Требует настройки сервера',
                    'Нужен скрипт для доступа'
                ],
                useCase: 'Конфиденциальные документы, внутренние файлы',
                implementation: 'Создать защищенную директорию, настроить доступ через API'
            },
            {
                name: 'Git LFS (Large File Storage)',
                description: 'Хранение больших файлов в Git',
                pros: [
                    'Версионность',
                    'Интеграция с Git',
                    'Бесплатно для небольших объемов'
                ],
                cons: [
                    'Не подходит для больших объемов',
                    'Ограничения GitHub/GitLab'
                ],
                useCase: 'Документы, которые нужно версионировать',
                implementation: 'Настроить Git LFS, добавить файлы'
            }
        ],
        recommendations: {
            publicDocuments: {
                storage: 'Cloudinary или S3',
                reason: 'Безопасность и производительность',
                documents: analysis.byCategory.tariffs.length + analysis.byCategory.regulations.length
            },
            privateDocuments: {
                storage: 'Защищенная директория на сервере',
                reason: 'Конфиденциальность',
                documents: analysis.byCategory.contracts.length + analysis.byCategory.applications.length
            },
            smallDocuments: {
                storage: 'Strapi Media Library',
                reason: 'Простота и интеграция',
                documents: analysis.documents.filter(d => {
                    // Предполагаем, что небольшие документы - это те, что меньше 5MB
                    return true; // В реальности нужно проверить размер
                }).length
            }
        },
        migrationSteps: [
            {
                step: 1,
                action: 'Классифицировать документы по типу доступа (публичные/приватные)',
                details: 'Определить, какие документы должны быть доступны публично, а какие только авторизованным пользователям'
            },
            {
                step: 2,
                action: 'Настроить хранилище (Cloudinary/S3/локальное)',
                details: 'Выбрать и настроить провайдер хранения в зависимости от требований безопасности'
            },
            {
                step: 3,
                action: 'Создать content type для документов в Strapi',
                details: 'Создать тип "Document" с полями: title, slug, file, category, accessLevel, section'
            },
            {
                step: 4,
                action: 'Загрузить документы в выбранное хранилище',
                details: 'Загрузить все документы через Strapi Admin или API'
            },
            {
                step: 5,
                action: 'Настроить контроль доступа',
                details: 'Настроить права доступа для приватных документов'
            },
            {
                step: 6,
                action: 'Обновить ссылки на сайте',
                details: 'Заменить прямые ссылки на файлы на ссылки через API или защищенный endpoint'
            }
        ],
        contentTypeSchema: {
            name: 'Document',
            description: 'Документы и файлы',
            attributes: {
                title: { type: 'string', required: true },
                slug: { type: 'string', required: true, unique: true },
                file: { type: 'media', required: true },
                category: {
                    type: 'enumeration',
                    enum: ['contract', 'application', 'tariff', 'regulation', 'other'],
                    default: 'other'
                },
                section: {
                    type: 'enumeration',
                    enum: ['business', 'operators', 'government', 'developers', 'partners'],
                    default: 'business'
                },
                accessLevel: {
                    type: 'enumeration',
                    enum: ['public', 'authenticated', 'private'],
                    default: 'public'
                },
                description: { type: 'text' },
                originalUrl: { type: 'string' },
                fileSize: { type: 'integer' },
                mimeType: { type: 'string' }
            }
        }
    };
    
    return plan;
}

/**
 * Основная функция
 */
function main() {
    console.log('📄 АНАЛИЗ ДОКУМЕНТОВ ДЛЯ МИГРАЦИИ');
    console.log('='.repeat(70));
    
    // Анализируем документы
    console.log('\n📋 Анализ документов...');
    const analysis = analyzeDocuments();
    
    console.log(`✅ Найдено документов: ${analysis.total}`);
    console.log(`\n📊 По типам файлов:`);
    console.log(`  DOCX: ${analysis.byType.docx.length}`);
    console.log(`  XLSX: ${analysis.byType.xlsx.length}`);
    console.log(`  PDF: ${analysis.byType.pdf.length}`);
    console.log(`  Другие: ${analysis.byType.other.length}`);
    
    console.log(`\n📁 По разделам:`);
    for (const [section, docs] of Object.entries(analysis.bySection)) {
        console.log(`  ${section}: ${docs.length}`);
    }
    
    console.log(`\n🏷️  По категориям:`);
    console.log(`  Договоры: ${analysis.byCategory.contracts.length}`);
    console.log(`  Заявления: ${analysis.byCategory.applications.length}`);
    console.log(`  Тарифы: ${analysis.byCategory.tariffs.length}`);
    console.log(`  Регламенты: ${analysis.byCategory.regulations.length}`);
    console.log(`  Прочее: ${analysis.byCategory.other.length}`);
    
    // Генерируем план миграции
    console.log('\n📋 Генерация плана миграции...');
    const plan = generateMigrationPlan(analysis);
    
    // Сохраняем результаты
    const result = {
        analysis: analysis,
        migrationPlan: plan
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    
    console.log('\n' + '='.repeat(70));
    console.log('💡 РЕКОМЕНДАЦИИ');
    console.log('='.repeat(70));
    console.log(`\n📦 Публичные документы (${plan.recommendations.publicDocuments.documents}):`);
    console.log(`   Хранилище: ${plan.recommendations.publicDocuments.storage}`);
    console.log(`   Причина: ${plan.recommendations.publicDocuments.reason}`);
    
    console.log(`\n🔒 Приватные документы (${plan.recommendations.privateDocuments.documents}):`);
    console.log(`   Хранилище: ${plan.recommendations.privateDocuments.storage}`);
    console.log(`   Причина: ${plan.recommendations.privateDocuments.reason}`);
    
    console.log('\n📋 Варианты хранения:');
    plan.storageOptions.forEach((option, i) => {
        console.log(`\n${i + 1}. ${option.name}`);
        console.log(`   ${option.description}`);
        console.log(`   Использование: ${option.useCase}`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
    console.log('='.repeat(70));
}

if (require.main === module) {
    main();
}

module.exports = { analyzeDocuments, generateMigrationPlan };

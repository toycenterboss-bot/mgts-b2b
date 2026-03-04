const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const NORMALIZED_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const SUB_BLOCKS_FILE = path.join(__dirname, '../../temp/services-extraction/section-sub-blocks-analysis.json');
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized-split');

// Создаем директорию для разделенных секций
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Загрузить анализ sub-blocks
 */
function loadSubBlocksAnalysis() {
    if (!fs.existsSync(SUB_BLOCKS_FILE)) {
        return {};
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(SUB_BLOCKS_FILE, 'utf-8'));
        // Преобразуем в удобный формат: pageSlug -> sectionIndex -> components
        const result = {};
        
        // Проверяем структуру данных
        if (data.pagesAnalysis) {
            // Структура: pagesAnalysis -> sections -> matchedComponents (массив объектов)
            data.pagesAnalysis.forEach(item => {
                const pageSlug = item.slug;
                if (!result[pageSlug]) {
                    result[pageSlug] = {};
                }
                if (item.sections) {
                    item.sections.forEach(section => {
                        if (section.sectionIndex && section.matchedComponents && section.matchedComponents.length > 1) {
                            // Извлекаем имена компонентов из объектов
                            const componentNames = section.matchedComponents.map(comp => {
                                return typeof comp === 'string' ? comp : comp.component || comp.name;
                            });
                            result[pageSlug][section.sectionIndex] = componentNames;
                        }
                    });
                }
            });
        } else if (data.analysis) {
            // Альтернативная структура
            data.analysis.forEach(item => {
                const pageSlug = item.pageSlug || item.slug;
                if (!result[pageSlug]) {
                    result[pageSlug] = {};
                }
                if (item.sections) {
                    item.sections.forEach(section => {
                        if (section.sectionIndex && section.matchedComponents && section.matchedComponents.length > 1) {
                            const componentNames = section.matchedComponents.map(comp => {
                                return typeof comp === 'string' ? comp : comp.component || comp.name;
                            });
                            result[pageSlug][section.sectionIndex] = componentNames;
                        }
                    });
                }
            });
        }
        
        return result;
    } catch (e) {
        console.error('Ошибка при загрузке анализа sub-blocks:', e.message);
        return {};
    }
}

/**
 * Разделить секцию на несколько секций по компонентам
 */
function splitSection(section, components, doc) {
    const sections = [];
    
    // Если компонент один, возвращаем секцию как есть
    if (components.length === 1) {
        return [section];
    }
    
    // Для каждого компонента создаем отдельную секцию
    components.forEach((component, index) => {
        const componentType = component.replace('page.', '');
        const newSection = doc.createElement('section');
        newSection.className = componentType;
        
        // Пока просто копируем всю секцию для каждого компонента
        // В будущем можно улучшить логику, чтобы извлекать только релевантные части
        Array.from(section.childNodes).forEach(node => {
            if (node.nodeType === 1) {
                newSection.appendChild(node.cloneNode(true));
            } else {
                newSection.appendChild(node.cloneNode(true));
            }
        });
        
        sections.push(newSection);
    });
    
    return sections;
}

/**
 * Разделить секции с множественными компонентами
 */
function splitMultiComponentSections(pageData, subBlocksAnalysis) {
    const normalizedHTML = pageData.normalizedHTML || '';
    if (!normalizedHTML) {
        return null;
    }
    
    const dom = new JSDOM(normalizedHTML);
    const doc = dom.window.document;
    
    const pageSlug = pageData.slug;
    const sectionsToSplit = subBlocksAnalysis[pageSlug] || {};
    
    // Находим все секции
    const sections = Array.from(doc.querySelectorAll('section'));
    
    if (sections.length === 0) {
        return normalizedHTML;
    }
    
    // Создаем новый контейнер
    const newContainer = doc.createElement('div');
    newContainer.className = 'normalized-content-split';
    
    sections.forEach((section, index) => {
        const sectionIndex = index + 1;
        
        // Проверяем, нужно ли разделять эту секцию
        if (sectionsToSplit[sectionIndex] && sectionsToSplit[sectionIndex].length > 1) {
            // Разделяем секцию
            const splitSections = splitSection(section, sectionsToSplit[sectionIndex], doc);
            splitSections.forEach(s => newContainer.appendChild(s));
        } else {
            // Оставляем секцию как есть
            newContainer.appendChild(section.cloneNode(true));
        }
    });
    
    return newContainer.innerHTML;
}

/**
 * Основная функция
 */
async function splitAllSections() {
    console.log('🔀 РАЗДЕЛЕНИЕ СЕКЦИЙ С МНОЖЕСТВЕННЫМИ КОМПОНЕНТАМИ');
    console.log('='.repeat(70));
    
    // Загружаем анализ sub-blocks
    const subBlocksAnalysis = loadSubBlocksAnalysis();
    const pagesToSplit = Object.keys(subBlocksAnalysis).length;
    
    console.log(`📚 Найдено страниц с секциями для разделения: ${pagesToSplit}\n`);
    
    // Получаем все нормализованные файлы
    const files = fs.readdirSync(NORMALIZED_DIR)
        .filter(f => f.endsWith('.json') && f !== 'index.json')
        .sort();
    
    console.log(`📄 Всего страниц для обработки: ${files.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        totalPages: files.length,
        pagesWithSplitSections: 0,
        totalSectionsSplit: 0,
        successful: 0,
        failed: 0,
        pages: []
    };
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(NORMALIZED_DIR, file);
        
        try {
            const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const slug = pageData.slug || file.replace('.json', '');
            
            if ((i + 1) % 20 === 0 || i === 0) {
                console.log(`[${i + 1}/${files.length}] Обработка: ${slug}...`);
            }
            
            // Разделяем секции
            const splitHTML = splitMultiComponentSections(pageData, subBlocksAnalysis);
            
            if (!splitHTML) {
                results.failed++;
                continue;
            }
            
            // Подсчитываем разделенные секции
            const originalSections = (pageData.normalizedHTML || '').match(/<section/g) || [];
            const splitSections = splitHTML.match(/<section/g) || [];
            const sectionsSplit = splitSections.length - originalSections.length;
            
            if (sectionsSplit > 0) {
                results.pagesWithSplitSections++;
                results.totalSectionsSplit += sectionsSplit;
                
                if ((i + 1) % 20 === 0 || i === 0) {
                    console.log(`   ✅ Разделено секций: ${sectionsSplit}`);
                }
            }
            
            // Сохраняем результат
            const splitData = {
                ...pageData,
                splitHTML: splitHTML,
                originalSectionsCount: originalSections.length,
                splitSectionsCount: splitSections.length,
                sectionsSplit: sectionsSplit,
                splitAt: new Date().toISOString()
            };
            
            const outputPath = path.join(OUTPUT_DIR, file);
            fs.writeFileSync(outputPath, JSON.stringify(splitData, null, 2), 'utf-8');
            
            results.successful++;
            results.pages.push({
                slug: slug,
                sectionsSplit: sectionsSplit
            });
            
        } catch (error) {
            console.error(`   ❌ Ошибка при обработке ${file}: ${error.message}`);
            results.failed++;
        }
    }
    
    // Сохраняем индекс
    const indexPath = path.join(OUTPUT_DIR, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(results, null, 2), 'utf-8');
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(70));
    console.log(`Всего страниц: ${results.totalPages}`);
    console.log(`✅ Успешно обработано: ${results.successful}`);
    console.log(`❌ Ошибок: ${results.failed}`);
    console.log(`🔀 Страниц с разделенными секциями: ${results.pagesWithSplitSections}`);
    console.log(`📊 Всего разделено секций: ${results.totalSectionsSplit}`);
    console.log(`\n📁 Результаты сохранены в: ${OUTPUT_DIR}`);
    console.log('='.repeat(70));
    
    return results;
}

if (require.main === module) {
    splitAllSections().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { splitAllSections, splitMultiComponentSections };

/**
 * Генерация детального отчета по классификации секций контента
 */

const fs = require('fs');
const path = require('path');

const CLASSIFICATION_FILE = path.join(__dirname, '../../temp/services-extraction/detailed-sections-classification.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/detailed-classification-report.md');

/**
 * Генерация отчета
 */
function generateReport() {
    console.log('📊 ГЕНЕРАЦИЯ ДЕТАЛЬНОГО ОТЧЕТА ПО КЛАССИФИКАЦИИ СЕКЦИЙ');
    console.log('='.repeat(70));
    
    if (!fs.existsSync(CLASSIFICATION_FILE)) {
        console.error('❌ Файл классификации не найден:', CLASSIFICATION_FILE);
        process.exit(1);
    }
    
    const data = JSON.parse(fs.readFileSync(CLASSIFICATION_FILE, 'utf-8'));
    
    // Анализируем результаты
    const analysis = {
        totalPages: data.totalPages,
        totalSections: data.statistics.totalSections,
        matchedSections: data.statistics.matchedSections,
        unmatchedSections: data.statistics.unmatchedSections,
        componentUsage: data.statistics.componentUsage,
        suggestedComponents: data.statistics.suggestedNewComponents || [],
        pagesByStructure: {},
        unmatchedSectionsList: [],
        pagesWithZeroSections: []
    };
    
    // Анализируем каждую страницу
    for (const page of data.pagesAnalysis) {
        // Страницы с 0 секций
        if (page.sectionsCount === 0) {
            analysis.pagesWithZeroSections.push({
                title: page.title,
                slug: page.slug,
                url: page.url
            });
            continue;
        }
        
        // Несовпавшие секции
        for (const sectionData of page.sections || []) {
            const classification = sectionData.classification;
            const section = sectionData.section;
            
            // Если нет совпадений
            if (!classification.matchedComponents || classification.matchedComponents.length === 0) {
                if (!classification.possibleComponents || classification.possibleComponents.length === 0) {
                    analysis.unmatchedSectionsList.push({
                        page: page.title,
                        slug: page.slug,
                        url: page.url,
                        sectionIndex: section.index,
                        sectionTitle: section.title,
                        classes: section.classes,
                        textPreview: section.textPreview.substring(0, 200),
                        hasForm: section.hasForm,
                        hasCards: section.hasCards,
                        hasTable: section.hasTable,
                        hasAccordion: section.hasAccordion,
                        hasTariffs: section.hasTariffs,
                        hasImages: section.hasImages,
                        structure: classification.recommendation?.structure || {},
                        suggestedComponent: classification.recommendation?.suggestedComponent || []
                    });
                }
            }
        }
    }
    
    // Группируем несовпавшие секции по типам
    const unmatchedByType = {};
    for (const sec of analysis.unmatchedSectionsList) {
        const type = sec.structure.type || 'unknown';
        if (!unmatchedByType[type]) {
            unmatchedByType[type] = [];
        }
        unmatchedByType[type].push(sec);
    }
    
    // Генерируем отчет
    let report = `# Детальный отчет: Классификация секций контента внутри страниц

**Дата:** ${new Date().toISOString()}  
**Статус:** ✅ Классификация завершена

## 📊 Итоговая статистика

- **Всего страниц:** ${analysis.totalPages}
- **Всего секций найдено:** ${analysis.totalSections}
- **✅ Совпавших секций:** ${analysis.matchedSections} (${((analysis.matchedSections / analysis.totalSections) * 100).toFixed(1)}%)
- **⚠️ Несовпавших секций:** ${analysis.unmatchedSections} (${((analysis.unmatchedSections / analysis.totalSections) * 100).toFixed(1)}%)
- **❌ Страниц с 0 секций:** ${analysis.pagesWithZeroSections.length}

## 📦 Использование существующих компонентов

`;
    
    // Статистика по компонентам
    const sortedComponents = Object.entries(analysis.componentUsage)
        .sort((a, b) => b[1] - a[1]);
    
    for (const [componentKey, count] of sortedComponents) {
        const componentName = data.existingComponents[componentKey]?.name || componentKey;
        const percentage = ((count / analysis.totalSections) * 100).toFixed(1);
        report += `- **${componentName}** (${componentKey}): ${count} раз (${percentage}%)\n`;
    }
    
    report += `\n## ⚠️ Несовпавшие секции (${analysis.unmatchedSectionsList.length})\n\n`;
    
    // Группировка по типам
    report += `### Группировка по типам структуры:\n\n`;
    for (const [type, sections] of Object.entries(unmatchedByType)) {
        report += `#### ${type}: ${sections.length} секций\n\n`;
        
        // Примеры
        for (const sec of sections.slice(0, 5)) {
            report += `**${sec.page}** (секция #${sec.sectionIndex})\n`;
            report += `- Заголовок: ${sec.sectionTitle || 'нет'}\n`;
            report += `- Классы: ${sec.classes.join(', ') || 'нет'}\n`;
            report += `- Характеристики:`;
            if (sec.hasForm) report += ` форма`;
            if (sec.hasCards) report += ` карточки`;
            if (sec.hasTable) report += ` таблица`;
            if (sec.hasAccordion) report += ` аккордеон`;
            if (sec.hasTariffs) report += ` тарифы`;
            if (sec.hasImages) report += ` изображения`;
            if (!sec.hasForm && !sec.hasCards && !sec.hasTable && !sec.hasAccordion && !sec.hasTariffs) {
                report += ` текстовая`;
            }
            report += `\n- Превью: ${sec.textPreview.substring(0, 150)}...\n\n`;
        }
        
        if (sections.length > 5) {
            report += `\n*... и еще ${sections.length - 5} подобных секций*\n\n`;
        }
    }
    
    // Предложенные новые компоненты
    if (analysis.suggestedComponents.length > 0) {
        report += `## 💡 Предложенные новые компоненты\n\n`;
        
        // Группируем предложения
        const suggestionsByType = {};
        for (const sec of analysis.unmatchedSectionsList) {
            for (const suggestion of sec.suggestedComponent || []) {
                const key = suggestion.component;
                if (!suggestionsByType[key]) {
                    suggestionsByType[key] = {
                        suggestion: suggestion,
                        count: 0,
                        examples: []
                    };
                }
                suggestionsByType[key].count++;
                if (suggestionsByType[key].examples.length < 3) {
                    suggestionsByType[key].examples.push({
                        page: sec.page,
                        sectionTitle: sec.sectionTitle
                    });
                }
            }
        }
        
        for (const [componentKey, data] of Object.entries(suggestionsByType)) {
            const sug = data.suggestion;
            report += `### ${sug.name} (\`${componentKey}\`)\n\n`;
            report += `**Описание:** ${sug.description}\n\n`;
            report += `**Количество использований:** ${data.count} секций\n\n`;
            
            if (sug.fields) {
                report += `**Предлагаемые поля:**\n`;
                for (const field of sug.fields) {
                    report += `- ${field}\n`;
                }
                report += `\n`;
            }
            
            report += `**Примеры использования:**\n`;
            for (const example of data.examples) {
                report += `- ${example.page} (${example.sectionTitle || 'без заголовка'})\n`;
            }
            report += `\n`;
        }
    }
    
    // Страницы с 0 секций
    if (analysis.pagesWithZeroSections.length > 0) {
        report += `## ⚠️ Страницы с 0 секций (${analysis.pagesWithZeroSections.length})\n\n`;
        report += `Эти страницы используют другую структуру HTML и требуют дополнительного анализа:\n\n`;
        
        for (const page of analysis.pagesWithZeroSections) {
            report += `- **${page.title}** (\`${page.slug}\`)\n`;
            report += `  - URL: ${page.url}\n\n`;
        }
        
        report += `**Примечание:** Эти страницы могут использовать структуру \`<article>\` или \`<div>\` вместо \`<section class="main-section">\`.\n\n`;
    }
    
    // Существующие компоненты
    report += `## 📋 Существующие компоненты Strapi\n\n`;
    for (const [key, component] of Object.entries(data.existingComponents)) {
        report += `### ${component.name} (\`${key}\`)\n\n`;
        report += `**Описание:** ${component.description}\n\n`;
        report += `**Селекторы:** ${component.selectors.join(', ')}\n\n`;
    }
    
    // Рекомендации
    report += `## 💡 Рекомендации\n\n`;
    
    if (analysis.unmatchedSections > 0) {
        report += `### 1. Новые компоненты для несовпавших секций\n\n`;
        report += `Рекомендуется создать следующие компоненты:\n\n`;
        
        const suggestedTypes = {};
        for (const sec of analysis.unmatchedSectionsList) {
            const type = sec.structure.type || 'generic-section';
            if (!suggestedTypes[type]) {
                suggestedTypes[type] = {
                    count: 0,
                    examples: []
                };
            }
            suggestedTypes[type].count++;
            if (suggestedTypes[type].examples.length < 2) {
                suggestedTypes[type].examples.push(sec);
            }
        }
        
        for (const [type, data] of Object.entries(suggestedTypes).sort((a, b) => b[1].count - a[1].count)) {
            report += `#### ${type} (${data.count} секций)\n\n`;
            
            // Предлагаем компонент на основе типа
            if (type === 'form-section') {
                report += `**Предлагаемый компонент:** \`page.contact-form-section\` или \`page.request-form-section\`\n\n`;
                report += `Использовать существующий \`page.service-order-form\` или создать специализированный для контактных форм.\n\n`;
            } else if (type === 'cards-section') {
                report += `**Предлагаемый компонент:** Использовать \`page.section-cards\` или \`page.section-grid\`\n\n`;
            } else if (type === 'table-section') {
                report += `**Предлагаемый компонент:** Использовать \`page.section-table\`\n\n`;
            } else if (type === 'text-section') {
                report += `**Предлагаемый компонент:** Использовать \`page.section-text\`\n\n`;
            } else {
                report += `**Предлагаемый компонент:** \`page.custom-content-section\` - универсальная секция для произвольного контента\n\n`;
            }
            
            report += `**Примеры:**\n`;
            for (const example of data.examples) {
                report += `- ${example.page} (${example.sectionTitle || 'без заголовка'})\n`;
            }
            report += `\n`;
        }
    }
    
    if (analysis.pagesWithZeroSections.length > 0) {
        report += `### 2. Страницы с альтернативной структурой\n\n`;
        report += `Рекомендуется:\n`;
        report += `1. Улучшить алгоритм поиска секций для этих страниц\n`;
        report += `2. Или обработать их вручную\n`;
        report += `3. Использовать \`page.section-text\` для простых текстовых страниц\n\n`;
    }
    
    report += `### 3. Маппинг секций на компоненты\n\n`;
    report += `| Тип секции | Существующий компонент | Действие |\n`;
    report += `|------------|------------------------|----------|\n`;
    report += `| Hero секция (первая, только заголовок) | \`page.hero\` | ✅ Использовать |\n`;
    report += `| Секция с карточками преимуществ | \`page.section-cards\` | ✅ Использовать |\n`;
    report += `| Секция с тарифами | \`page.service-tariffs\` | ✅ Использовать |\n`;
    report += `| Секция FAQ (аккордеон) | \`page.service-faq\` | ✅ Использовать |\n`;
    report += `| Секция с формой заказа | \`page.service-order-form\` | ✅ Использовать |\n`;
    report += `| Текстовая секция | \`page.section-text\` | ✅ Использовать |\n`;
    report += `| Секция с таблицей | \`page.section-table\` | ✅ Использовать |\n`;
    report += `| Секция со списком файлов | ❌ Не существует | ⚠️ Создать \`page.files-list\` |\n`;
    report += `| Секция с информацией о регистраторе | ❌ Не существует | ⚠️ Использовать \`page.section-text\` с кастомным контентом |\n`;
    report += `| Секция CEO сообщения | ❌ Не существует | ⚠️ Использовать \`page.section-text\` или создать \`page.ceo-message\` |\n\n`;
    
    // Сохраняем отчет
    fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
    
    console.log(`\n✅ Отчет сохранен в: ${OUTPUT_FILE}`);
    console.log(`\n📊 Статистика:`);
    console.log(`   Всего секций: ${analysis.totalSections}`);
    console.log(`   Совпавших: ${analysis.matchedSections}`);
    console.log(`   Несовпавших: ${analysis.unmatchedSections}`);
    console.log(`   Страниц с 0 секций: ${analysis.pagesWithZeroSections.length}`);
    
    if (analysis.suggestedComponents.length > 0) {
        console.log(`\n💡 Предложено новых компонентов: ${analysis.suggestedComponents.length}`);
    }
}

if (require.main === module) {
    generateReport();
}

module.exports = { generateReport };

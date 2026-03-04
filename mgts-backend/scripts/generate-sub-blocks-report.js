/**
 * Генерация отчета по анализу подблоков секций
 */

const fs = require('fs');
const path = require('path');

const SUB_BLOCKS_FILE = path.join(__dirname, '../../temp/services-extraction/section-sub-blocks-analysis.json');
const OUTPUT_REPORT = path.join(__dirname, '../../docs/SECTION_SUB_BLOCKS_ANALYSIS_REPORT.md');

function generateReport() {
    if (!fs.existsSync(SUB_BLOCKS_FILE)) {
        console.error('❌ Файл анализа подблоков не найден:', SUB_BLOCKS_FILE);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(SUB_BLOCKS_FILE, 'utf-8'));

    let report = `# Анализ подблоков секций с множественными компонентами

**Дата:** ${new Date().toISOString()}  
**Статус:** ✅ Анализ завершен

## 📊 Итоговая статистика

- **Всего страниц:** ${data.totalPages}
- **Страниц с множественными совпадениями:** ${data.pagesWithMultiMatch}
- **Всего секций с множественными совпадениями:** ${data.totalMultiMatchSections}
- **Проанализировано секций:** ${data.analyzedSections}
- **Процент секций с множественными компонентами:** ${((data.totalMultiMatchSections / data.totalPages) * 100).toFixed(1)}%

## 💡 Зачем нужен этот анализ?

Если секция матчится на несколько компонентов одновременно, это означает, что:

1. **В текущем HTML** одна секция содержит контент разных типов
2. **В целевом состоянии (Strapi)** этот контент должен быть разделен на отдельные компоненты/секции
3. **Требуется определить**, какие конкретные HTML блоки относятся к каждому компоненту

## 📦 Популярные комбинации компонентов

`;

    // Подсчитываем комбинации
    const combinations = {};
    for (const page of data.pagesAnalysis) {
        for (const section of page.sections) {
            const combo = section.matchedComponents.map(m => m.componentName).sort().join(' + ');
            combinations[combo] = (combinations[combo] || 0) + 1;
        }
    }

    report += '| Комбинация компонентов | Количество секций |\n';
    report += '|------------------------|-------------------|\n';
    for (const [combo, count] of Object.entries(combinations).sort((a, b) => b[1] - a[1])) {
        report += `| ${combo} | ${count} |\n`;
    }

    report += `\n## 📋 Примеры анализа подблоков\n\n`;

    // Показываем примеры для первых 5 страниц
    for (const page of data.pagesAnalysis.slice(0, 5)) {
        report += `### ${page.title}\n\n`;
        report += `**URL:** ${page.url}\n\n`;

        for (const section of page.sections.slice(0, 3)) {
            report += `#### Секция #${section.sectionIndex}: ${section.sectionTitle || 'Без заголовка'}\n\n`;
            report += `**Компоненты:** ${section.matchedComponents.map(m => m.componentName).join(', ')}\n\n`;

            const subBlocks = section.subBlocks || {};
            if (Object.keys(subBlocks).length > 0) {
                report += '**Разделение на подблоки:**\n\n';
                
                for (const [compKey, blocksData] of Object.entries(subBlocks)) {
                    const compName = blocksData.component;
                    report += `- **${compName}**:\n`;
                    report += `  - Найдено блоков: ${blocksData.totalBlocks}\n`;
                    
                    // Показываем примеры блоков
                    for (const block of blocksData.blocks.slice(0, 3)) {
                        const classesStr = block.classes.length > 0 ? ` (${block.classes.slice(0, 2).join(', ')})` : '';
                        report += `  - ${block.tagName}${classesStr}: ${block.text.substring(0, 80)}...\n`;
                    }
                    report += '\n';
                }
            } else {
                report += '⚠️ Подблоки не найдены\n\n';
            }
        }
    }

    report += `## ✅ Рекомендации для миграции

### 1. Стратегия разделения секций

Для секций с множественными совпадениями компонентов:

1. **Извлечь HTML блоки** для каждого компонента из анализа подблоков
2. **Создать отдельные компоненты** в Strapi для каждого типа контента
3. **Сохранить порядок** компонентов в соответствии с порядком на исходной странице
4. **Проверить целостность** контента после разделения

### 2. Типичные случаи разделения

#### Комбинация: Section Text + Service Tariffs
- **Section Text** → заголовок секции (например, "Тарифы для телефонии в офис")
- **Service Tariffs** → блоки с тарифами (tariff-cards-container, tariff-card элементы)

**Действие:** Создать отдельный компонент Hero/Section Text для заголовка и Service Tariffs для тарифов.

#### Комбинация: Section Text + Service FAQ
- **Section Text** → заголовок секции (например, "Часто задаваемые вопросы")
- **Service FAQ** → блоки с вопросами-ответами (accordion-row элементы)

**Действие:** Создать отдельный компонент Section Text для заголовка и Service FAQ для вопросов.

#### Комбинация: Section Text + Section Cards
- **Section Text** → текстовые блоки и заголовки
- **Section Cards** → карточки преимуществ/услуг

**Действие:** Разделить текстовый контент и карточки на отдельные компоненты.

### 3. Автоматизация процесса

Используйте результаты анализа (файл section-sub-blocks-analysis.json) для автоматического разделения секций:

1. Для каждой секции с множественными совпадениями
2. Извлечь HTML блоки для каждого компонента
3. Создать соответствующие компоненты в Strapi
4. Сохранить порядок и структуру

### 4. Ручная проверка

После автоматического разделения рекомендуется:

- Проверить целостность контента
- Убедиться, что все блоки правильно распределены
- Проверить стили и форматирование
- Убедиться, что порядок компонентов сохранен

## 📁 Файлы

- section-sub-blocks-analysis.json - Детальный анализ подблоков для каждой секции
- detailed-sections-classification.json - Полная классификация секций
- detailed-classification-report.md - Отчет по классификации

## 📊 Выводы

1. **${data.totalMultiMatchSections} секций (${((data.totalMultiMatchSections / 150) * 100).toFixed(1)}%)** требуют разделения на несколько компонентов
2. Наиболее распространенные комбинации: **Section Text + Section Cards** (${combinations['Section Cards + Section Text'] || 0} секций), **Section Text + Service FAQ** (${combinations['Section Text + Service FAQ'] || 0} секций)
3. Анализ подблоков позволяет точно определить, какие HTML элементы относятся к каждому компоненту
4. **Рекомендуется использовать результаты анализа для автоматизации миграции**

`;

    fs.writeFileSync(OUTPUT_REPORT, report, 'utf-8');
    console.log('✅ Отчет сгенерирован:', OUTPUT_REPORT);
    return report;
}

if (require.main === module) {
    generateReport();
}

module.exports = { generateReport };

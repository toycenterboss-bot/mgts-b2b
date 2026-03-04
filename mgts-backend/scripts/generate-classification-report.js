/**
 * Генерация отчета по классификации контента
 */

const fs = require('fs');
const path = require('path');

const CLASSIFICATION_FILE = path.join(__dirname, '../../temp/services-extraction/content-classification.json');
const REPORT_FILE = path.join(__dirname, '../../temp/services-extraction/content-classification-report.md');

function generateReport() {
    if (!fs.existsSync(CLASSIFICATION_FILE)) {
        console.error('❌ Файл классификации не найден:', CLASSIFICATION_FILE);
        process.exit(1);
    }
    
    const data = JSON.parse(fs.readFileSync(CLASSIFICATION_FILE, 'utf-8'));
    
    const report = [];
    report.push('# Отчет по классификации контента');
    report.push('');
    report.push(`**Дата:** ${new Date(data.timestamp).toLocaleString('ru-RU')}`);
    report.push(`**Всего проанализировано страниц:** ${data.totalPages}`);
    report.push('');
    
    // Статистика по типам контента
    report.push('## 📊 Статистика по типам контента');
    report.push('');
    const contentTypeEntries = Object.entries(data.statistics.byContentType)
        .sort((a, b) => b[1] - a[1]);
    
    contentTypeEntries.forEach(([type, count]) => {
        const percentage = ((count / data.totalPages) * 100).toFixed(1);
        report.push(`- **${type}**: ${count} (${percentage}%)`);
    });
    report.push('');
    
    // Статистика по блокам контента
    report.push('## 📦 Статистика по блокам контента');
    report.push('');
    const blockEntries = Object.entries(data.statistics.byContentBlock)
        .sort((a, b) => b[1] - a[1]);
    
    blockEntries.forEach(([block, count]) => {
        const percentage = ((count / data.totalPages) * 100).toFixed(1);
        report.push(`- **${block}**: ${count} (${percentage}%)`);
    });
    report.push('');
    
    // Статистика по разделам
    report.push('## 📁 Статистика по разделам');
    report.push('');
    const sectionEntries = Object.entries(data.statistics.bySection)
        .sort((a, b) => b[1] - a[1]);
    
    sectionEntries.forEach(([section, count]) => {
        report.push(`- **${section}**: ${count}`);
    });
    report.push('');
    
    // Статистика по категориям
    report.push('## 🏷️ Статистика по категориям');
    report.push('');
    const categoryEntries = Object.entries(data.statistics.byCategory)
        .sort((a, b) => b[1] - a[1]);
    
    categoryEntries.forEach(([category, count]) => {
        report.push(`- **${category}**: ${count}`);
    });
    report.push('');
    
    // Соответствие CMS типам
    report.push('## ✅ Соответствие CMS типам');
    report.push('');
    report.push('### Существующие типы:');
    Object.keys(data.cmsTypes.contentTypes).forEach(type => {
        const count = data.statistics.byContentType[type] || 0;
        report.push(`- **${type}**: ${count} страниц`);
    });
    report.push('');
    
    // Недостающие типы
    if (data.missingTypes.length > 0) {
        report.push('### ⚠️ Недостающие типы:');
        data.missingTypes.forEach(type => {
            report.push(`- **${type.type}** (${type.category}, ${type.section})`);
            report.push(`  - Пример: ${type.example}`);
        });
        report.push('');
    }
    
    // Рекомендации
    report.push('## 💡 Рекомендации');
    report.push('');
    
    if (data.recommendations.newTypesNeeded.length > 0) {
        report.push('### Новые типы, которые необходимо создать:');
        data.recommendations.newTypesNeeded.forEach(type => {
            report.push(`- **${type.type}**`);
            report.push(`  - Количество страниц: ${type.count}`);
            report.push(`  - Категория: ${type.category}`);
            report.push(`  - Раздел: ${type.section}`);
        });
        report.push('');
    }
    
    // Примеры классификации
    report.push('## 📋 Примеры классификации');
    report.push('');
    
    const examples = data.classifications.slice(0, 10);
    examples.forEach((classification, i) => {
        report.push(`### ${i + 1}. ${classification.title}`);
        report.push(`- **URL:** ${classification.url}`);
        report.push(`- **Тип контента:** ${classification.contentType}`);
        report.push(`- **Категория:** ${classification.category}`);
        report.push(`- **Раздел:** ${classification.section}`);
        report.push(`- **Блоки контента:** ${classification.contentBlocks.join(', ') || 'нет'}`);
        report.push('');
    });
    
    // План миграции
    report.push('## 🎯 План миграции');
    report.push('');
    report.push('### Этап 1: Подготовка');
    report.push('1. Создать недостающие типы контента в CMS');
    report.push('2. Настроить структуру блоков контента');
    report.push('3. Подготовить шаблоны миграции');
    report.push('');
    
    report.push('### Этап 2: Миграция по типам');
    contentTypeEntries.forEach(([type, count]) => {
        report.push(`1. Мигрировать ${type} (${count} страниц)`);
    });
    report.push('');
    
    report.push('### Этап 3: Проверка и тестирование');
    report.push('1. Проверить корректность миграции');
    report.push('2. Протестировать отображение контента');
    report.push('3. Исправить ошибки');
    report.push('');
    
    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, report.join('\n'), 'utf-8');
    
    console.log('✅ Отчет создан:', REPORT_FILE);
    console.log('\n📊 Краткая статистика:');
    console.log(`   Всего страниц: ${data.totalPages}`);
    console.log(`   Типов контента: ${Object.keys(data.statistics.byContentType).length}`);
    console.log(`   Блоков контента: ${Object.keys(data.statistics.byContentBlock).length}`);
    console.log(`   Разделов: ${Object.keys(data.statistics.bySection).length}`);
    console.log(`   Недостающих типов: ${data.missingTypes.length}`);
}

if (require.main === module) {
    generateReport();
}

module.exports = { generateReport };

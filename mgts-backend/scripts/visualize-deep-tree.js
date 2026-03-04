/**
 * Визуализация глубокого дерева услуг
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../../temp/services-extraction/services-deep-tree.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/services-deep-tree-visualized.txt');

function visualizeTree(service, indent = '', isLast = true, output = []) {
    const marker = isLast ? '└── ' : '├── ';
    const title = service.title || service.name || 'Без названия';
    const url = service.url || '';
    const level = service.level || 0;
    
    output.push(`${indent}${marker}${title} (уровень ${level})`);
    if (url) {
        output.push(`${indent}${isLast ? '    ' : '│   '}    ${url}`);
    }
    if (service.description) {
        const desc = service.description.substring(0, 100);
        output.push(`${indent}${isLast ? '    ' : '│   '}    ${desc}...`);
    }
    
    if (service.children && service.children.length > 0) {
        const childIndent = indent + (isLast ? '    ' : '│   ');
        service.children.forEach((child, index) => {
            const isLastChild = index === service.children.length - 1;
            visualizeTree(child, childIndent, isLastChild, output);
        });
    }
    
    return output;
}

function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Файл не найден:', INPUT_FILE);
        process.exit(1);
    }
    
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    
    console.log('🌳 ВИЗУАЛИЗАЦИЯ ГЛУБОКОГО ДЕРЕВА УСЛУГ');
    console.log('='.repeat(70));
    
    const output = [];
    output.push('ПОЛНАЯ СТРУКТУРА ДЕРЕВА УСЛУГ МГТС (ГЛУБОКИЙ ОБХОД)');
    output.push('='.repeat(70));
    output.push(`Дата: ${new Date(data.timestamp).toLocaleString('ru-RU')}`);
    output.push(`URL: ${data.baseUrl}`);
    output.push(`Начальных услуг: ${data.initialServices}`);
    output.push(`Всего найдено услуг: ${data.totalServices}`);
    output.push(`Категорий: ${data.summary.categories}`);
    output.push(`Максимальный уровень: ${data.summary.maxLevel}`);
    output.push('');
    
    // Дерево по категориям
    output.push('🌳 ДЕРЕВО ПО КАТЕГОРИЯМ:');
    output.push('');
    
    for (const [category, services] of Object.entries(data.tree)) {
        output.push(`\n📁 ${category.toUpperCase()}:`);
        output.push('');
        services.forEach((service, index) => {
            const isLast = index === services.length - 1;
            visualizeTree(service, '', isLast, output);
        });
    }
    
    // Плоский список
    output.push('\n\n📋 ПЛОСКИЙ СПИСОК ВСЕХ УСЛУГ:');
    output.push('');
    data.flat.forEach((service, i) => {
        const levelMarker = '  '.repeat(service.level - 1) + (service.level > 1 ? '└─ ' : '');
        output.push(`${i + 1}. ${levelMarker}${service.title}`);
        output.push(`   Уровень: ${service.level}`);
        output.push(`   URL: ${service.url}`);
        if (service.parent) {
            output.push(`   Родитель: ${service.parent}`);
        }
        if (service.description) {
            output.push(`   Описание: ${service.description.substring(0, 150)}...`);
        }
        output.push('');
    });
    
    // Статистика по уровням
    output.push('\n📊 СТАТИСТИКА ПО УРОВНЯМ:');
    const byLevel = {};
    data.flat.forEach(service => {
        const level = service.level || 0;
        if (!byLevel[level]) {
            byLevel[level] = [];
        }
        byLevel[level].push(service);
    });
    
    for (const [level, services] of Object.entries(byLevel).sort()) {
        output.push(`   Уровень ${level}: ${services.length} услуг`);
    }
    
    // Сохраняем
    const text = output.join('\n');
    fs.writeFileSync(OUTPUT_FILE, text, 'utf-8');
    
    // Выводим на экран
    console.log(text);
    console.log('='.repeat(70));
    console.log(`📁 Визуализация сохранена в: ${OUTPUT_FILE}`);
}

if (require.main === module) {
    main();
}

module.exports = { visualizeTree };

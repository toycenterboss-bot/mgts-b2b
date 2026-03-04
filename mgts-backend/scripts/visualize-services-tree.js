/**
 * Скрипт для визуализации дерева услуг в читаемом формате
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../../temp/services-extraction/services-tree.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/services-tree-visualized.txt');

function visualizeTree(node, indent = '', isLast = true, output = []) {
    const marker = isLast ? '└── ' : '├── ';
    const title = node.title || node.name;
    const url = node.url || '';
    
    output.push(`${indent}${marker}${title}`);
    if (url && url !== 'https://business.mgts.ru') {
        output.push(`${indent}${isLast ? '    ' : '│   '}    ${url}`);
    }
    
    if (node.children && node.children.length > 0) {
        const childIndent = indent + (isLast ? '    ' : '│   ');
        node.children.forEach((child, index) => {
            const isLastChild = index === node.children.length - 1;
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
    
    console.log('🌳 ВИЗУАЛИЗАЦИЯ ДЕРЕВА УСЛУГ');
    console.log('='.repeat(70));
    
    const output = [];
    output.push('СТРУКТУРА ДЕРЕВА УСЛУГ МГТС');
    output.push('='.repeat(70));
    output.push(`Дата: ${new Date(data.timestamp).toLocaleString('ru-RU')}`);
    output.push(`URL: ${data.url}`);
    output.push('');
    
    // Дерево услуг
    output.push('🌳 ДЕРЕВО УСЛУГ:');
    output.push('');
    const treeLines = visualizeTree(data.servicesTree.root);
    output.push(...treeLines);
    output.push('');
    
    // Плоский список
    output.push('📋 ПЛОСКИЙ СПИСОК УСЛУГ:');
    output.push('');
    data.flatServices.forEach((service, i) => {
        const levelMarker = '  '.repeat(service.level - 1) + (service.level > 1 ? '└─ ' : '');
        output.push(`${i + 1}. ${levelMarker}${service.title}`);
        output.push(`   Категория: ${service.category}`);
        output.push(`   URL: ${service.url}`);
        output.push(`   Путь: ${service.path}`);
        output.push(`   Уровень: ${service.level}`);
        output.push('');
    });
    
    // Статистика
    output.push('📊 СТАТИСТИКА:');
    output.push(`   Всего услуг: ${data.summary.totalServices}`);
    output.push(`   Категорий: ${data.summary.categories}`);
    output.push(`   Элементов меню: ${data.summary.menuItems}`);
    output.push('');
    
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

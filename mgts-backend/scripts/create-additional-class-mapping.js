const fs = require('fs');
const path = require('path');

const ANALYSIS_FILE = path.join(__dirname, '../../temp/services-extraction/remaining-non-normalized-classes.json');
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/additional-class-mapping.json');

// Загружаем анализ
const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));

// Группируем классы по родительским компонентам
const mappingByComponent = {};

analysis.classSummary.forEach(classInfo => {
    // Определяем, к какому компоненту относится класс на основе родительских компонентов
    const parentComponents = classInfo.parentComponents;
    
    if (parentComponents.length === 0) {
        return; // Пропускаем классы без родительских компонентов
    }
    
    // Используем первый родительский компонент (или наиболее частый)
    const parentComponent = parentComponents[0];
    
    if (!mappingByComponent[parentComponent]) {
        mappingByComponent[parentComponent] = [];
    }
    
    // Предлагаем маппинг на основе паттерна имени класса
    let targetClass = null;
    const className = classInfo.className;
    
    // Специальные случаи
    if (className.startsWith('file-')) {
        // Классы файлов уже должны быть в files-table, но проверим
        if (parentComponent === 'files-table' || parentComponent === 'section-text') {
            targetClass = `files-table__${className.replace('file-', '').replace(/-/g, '-')}`;
        }
    } else if (className.startsWith('request-contacts')) {
        // Классы контактов в формах
        if (parentComponent === 'service-order-form') {
            targetClass = `service-order-form__${className.replace('request-contacts', 'contacts').replace(/-/g, '-')}`;
        }
    } else if (className.startsWith('title-h1-wide')) {
        // Заголовки - уже должны быть в маппинге, но проверим
        if (parentComponent === 'service-tariffs') {
            targetClass = `service-tariffs__${className.replace('title-h1-wide', 'title').replace(/-/g, '-')}`;
        } else if (parentComponent === 'service-faq') {
            targetClass = `service-faq__${className.replace('title-h1-wide', 'title').replace(/-/g, '-')}`;
        } else if (parentComponent === 'section-text') {
            targetClass = `section-text__${className.replace('title-h1-wide', 'title').replace(/-/g, '-')}`;
        }
    } else if (className.startsWith('shares-item')) {
        // Элементы акций
        if (parentComponent === 'section-text') {
            targetClass = `section-text__${className.replace('shares-item', 'share').replace(/-/g, '-')}`;
        }
    } else if (className.startsWith('information-list-row')) {
        // Строки информационного списка
        if (parentComponent === 'section-text') {
            targetClass = `section-text__${className.replace('information-list-row', 'info-row').replace(/-/g, '-')}`;
        }
    } else if (className === 'mb-32' || className === 'mt-32' || className === 'mb-56' || className === 'mt-56') {
        // Служебные классы отступов - удаляем
        targetClass = '';
    } else if (className === 'marker') {
        // Маркер на карте - может остаться как есть или быть частью section-map
        if (parentComponent === 'section-map') {
            targetClass = 'section-map__marker';
        }
    } else if (className === 'b2b_connection_request') {
        // Служебный класс - удаляем
        targetClass = '';
    } else if (className.startsWith('request-lk__')) {
        // Классы личного кабинета в формах
        if (parentComponent === 'service-order-form') {
            targetClass = `service-order-form__${className.replace('request-lk', 'lk').replace(/-/g, '-')}`;
        }
    } else if (className.startsWith('tag-box')) {
        // Теги
        if (parentComponent === 'section-text') {
            targetClass = `section-text__${className.replace('tag-box', 'tag').replace(/-/g, '-')}`;
        }
    }
    
    if (targetClass !== null) {
        mappingByComponent[parentComponent].push({
            oldClass: className,
            newClass: targetClass,
            count: classInfo.totalCount,
            files: classInfo.filesCount,
        });
    }
});

// Формируем итоговый маппинг
const additionalMapping = {};

Object.keys(mappingByComponent).forEach(component => {
    if (mappingByComponent[component].length > 0) {
        additionalMapping[component] = {};
        mappingByComponent[component].forEach(item => {
            additionalMapping[component][item.oldClass] = item.newClass;
        });
    }
});

// Сохраняем результат
const result = {
    timestamp: new Date().toISOString(),
    totalClasses: analysis.classSummary.length,
    mappedClasses: Object.values(additionalMapping).reduce((sum, comp) => sum + Object.keys(comp).length, 0),
    mapping: additionalMapping,
    statistics: Object.keys(mappingByComponent).map(component => ({
        component: component,
        classes: mappingByComponent[component].length,
        totalCount: mappingByComponent[component].reduce((sum, item) => sum + item.count, 0),
    })),
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');

console.log('📋 СОЗДАНИЕ ДОПОЛНИТЕЛЬНОГО МАППИНГА КЛАССОВ');
console.log('='.repeat(70));
console.log(`Всего уникальных классов: ${result.totalClasses}`);
console.log(`Предложено маппингов: ${result.mappedClasses}`);
console.log(`\nМаппинг по компонентам:`);
result.statistics.forEach(stat => {
    console.log(`  ${stat.component}: ${stat.classes} классов (${stat.totalCount} использований)`);
});
console.log(`\n📁 Результаты сохранены в: ${OUTPUT_FILE}`);
console.log('='.repeat(70));

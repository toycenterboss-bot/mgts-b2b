const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const normalizedDir = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const files = fs.readdirSync(normalizedDir).filter(f => f.endsWith('.json') && f !== 'index.json');

console.log('Анализ всех классов в нормализованных файлах...\n');

// Определяем правильные классы для каждого компонента
const validClasses = {
    'hero': ['hero__title', 'hero__subtitle', 'hero__content'],
    'section-text': ['section-text__title', 'section-text__subtitle', 'section-text__content', 'section-text__content--narrow'],
    'section-cards': ['section-cards__title', 'section-cards__container', 'section-cards__card'],
    'service-tariffs': ['service-tariffs__title', 'service-tariffs__container', 'service-tariffs__tariff'],
    'service-faq': ['service-faq__title', 'service-faq__items', 'service-faq__item', 'service-faq__question', 'service-faq__answer'],
    'service-order-form': ['service-order-form__title', 'service-order-form__form'],
    'section-map': ['section-map__title', 'section-map__container'],
    'history-timeline': ['history-timeline__title', 'history-timeline__tabs', 'history-timeline__tabs-container', 'history-timeline__tab-button', 'history-timeline__content', 'history-timeline__content-box', 'history-timeline__periods-list', 'history-timeline__period', 'history-timeline__period-title', 'history-timeline__period-content', 'history-timeline__image-container', 'history-timeline__image', 'history-timeline__image-img', 'history-timeline__image-description', 'history-timeline__note'],
    'files-table': ['files-table__title', 'files-table__container', 'files-table__item'],
    'tariff-table': ['tariff-table__title', 'tariff-table__table'],
    'how-to-connect': ['how-to-connect__title', 'how-to-connect__steps', 'how-to-connect__step'],
    'image-carousel': ['image-carousel__title', 'image-carousel__container', 'image-carousel__item'],
    'image-switcher': ['image-switcher__title', 'image-switcher__container', 'image-switcher__item'],
    'crm-cards': ['crm-cards__title', 'crm-cards__container', 'crm-cards__card'],
    'mobile-app-section': ['mobile-app-section__title', 'mobile-app-section__content']
};

const allClasses = new Set();
const classCounts = {};
const componentTypes = new Set();
const invalidClasses = new Set();
const classToComponent = {};
const classExamples = {};

files.forEach(file => {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(normalizedDir, file), 'utf-8'));
        const html = data.normalizedHTML || '';
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        
        const sections = doc.querySelectorAll('section');
        sections.forEach(section => {
            const sectionClass = section.className || '';
            if (sectionClass) {
                componentTypes.add(sectionClass);
            }
            
            const validForComponent = validClasses[sectionClass] || [];
            const elements = section.querySelectorAll('[class]');
            
            elements.forEach(el => {
                const className = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
                const classes = (className || '').split(' ').filter(c => c && c.trim());
                classes.forEach(c => {
                    allClasses.add(c);
                    classCounts[c] = (classCounts[c] || 0) + 1;
                    
                    // Пропускаем служебные классы
                    if (c.includes('active') || c.includes('type-size') || c.includes('disable-scrollbar') || 
                        c.includes('last-') || c === 'c-6' || c === 'c-4' || c === 'mb-56') {
                        return;
                    }
                    
                    // Проверяем, является ли класс правильным для компонента
                    const isValid = validForComponent.some(vc => 
                        c === vc || 
                        c.startsWith(vc + '__') || 
                        c.startsWith(vc + '--') ||
                        c === sectionClass ||
                        c.startsWith(sectionClass + '__') ||
                        c.startsWith(sectionClass + '--')
                    );
                    
                    if (!isValid && sectionClass) {
                        invalidClasses.add(c);
                        if (!classToComponent[c]) {
                            classToComponent[c] = new Set();
                        }
                        classToComponent[c].add(sectionClass);
                        
                        // Сохраняем пример использования
                        if (!classExamples[c]) {
                            classExamples[c] = {
                                file: file,
                                tag: el.tagName.toLowerCase(),
                                context: el.outerHTML.substring(0, 150)
                            };
                        }
                    }
                });
            });
        });
    } catch (e) {
        console.error(`Ошибка при обработке ${file}:`, e.message);
    }
});

console.log(`Найдено уникальных классов: ${allClasses.size}`);
console.log(`Найдено типов компонентов: ${componentTypes.size}`);
console.log(`\nТипы компонентов:`, Array.from(componentTypes).sort().join(', '));
console.log(`\nНекорректных классов: ${invalidClasses.size}`);

if (invalidClasses.size > 0) {
    console.log('\n\nСписок некорректных классов:');
    Array.from(invalidClasses).sort().forEach(cls => {
        const components = Array.from(classToComponent[cls] || []).join(', ');
        const example = classExamples[cls];
        console.log(`\n  - ${cls}`);
        console.log(`    В компонентах: ${components}`);
        console.log(`    Пример: ${example.tag} в ${example.file}`);
        console.log(`    Контекст: ${example.context}...`);
    });
}

// Сохраняем результаты
const report = {
    totalClasses: allClasses.size,
    componentTypes: Array.from(componentTypes).sort(),
    invalidClasses: Array.from(invalidClasses).sort().map(cls => ({
        class: cls,
        components: Array.from(classToComponent[cls] || []),
        example: classExamples[cls]
    })),
    topClasses: Object.entries(classCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([cls, count]) => ({ class: cls, count }))
};

fs.writeFileSync(
    path.join(__dirname, '../../temp/services-extraction/normalized-classes-analysis.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
);

console.log(`\n\nОтчет сохранен в: temp/services-extraction/normalized-classes-analysis.json`);

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const normalizedDir = path.join(__dirname, '../../temp/services-extraction/pages-content-normalized');
const files = fs.readdirSync(normalizedDir).filter(f => f.endsWith('.json') && f !== 'index.json');

console.log('Анализ классов во всех тегах (не только section и div)...\n');

const tagClasses = {}; // tag -> { class -> { components: [], count: number } }
const componentTypes = new Set();

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
            
            // Находим ВСЕ элементы с классами внутри секции (не только div)
            const elements = section.querySelectorAll('[class]');
            
            elements.forEach(el => {
                const tagName = el.tagName.toLowerCase();
                const className = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
                const classes = (className || '').split(' ').filter(c => c && c.trim());
                
                if (!tagClasses[tagName]) {
                    tagClasses[tagName] = {};
                }
                
                classes.forEach(c => {
                    // Пропускаем служебные классы
                    if (c.includes('active') || c.includes('type-size') || c.includes('disable-scrollbar') || 
                        c.includes('last-') || c === 'c-6' || c === 'c-4' || c.includes('mb-') || c.includes('mt-') ||
                        c.startsWith('ymaps3x0--') || c.startsWith('Logo_svg__') || c.includes('__cls-')) {
                        return;
                    }
                    
                    if (!tagClasses[tagName][c]) {
                        tagClasses[tagName][c] = {
                            components: new Set(),
                            count: 0,
                            examples: []
                        };
                    }
                    
                    tagClasses[tagName][c].components.add(sectionClass);
                    tagClasses[tagName][c].count++;
                    
                    if (tagClasses[tagName][c].examples.length < 3) {
                        tagClasses[tagName][c].examples.push({
                            file: file,
                            context: el.outerHTML.substring(0, 150)
                        });
                    }
                });
            });
        });
    } catch (e) {
        console.error(`Ошибка при обработке ${file}:`, e.message);
    }
});

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

console.log('Классы по тегам:\n');
const invalidByTag = {};

Object.keys(tagClasses).sort().forEach(tag => {
    const classes = tagClasses[tag];
    const invalid = [];
    
    Object.entries(classes).forEach(([cls, info]) => {
        const components = Array.from(info.components);
        let isValid = false;
        
        components.forEach(comp => {
            const validForComponent = validClasses[comp] || [];
            const isClassValid = validForComponent.some(vc => 
                cls === vc || 
                cls.startsWith(vc + '__') || 
                cls.startsWith(vc + '--') ||
                cls === comp ||
                cls.startsWith(comp + '__') ||
                cls.startsWith(comp + '--')
            );
            if (isClassValid) {
                isValid = true;
            }
        });
        
        if (!isValid && components.length > 0) {
            invalid.push({
                class: cls,
                components: components,
                count: info.count,
                examples: info.examples
            });
        }
    });
    
    if (invalid.length > 0) {
        invalidByTag[tag] = invalid;
        console.log(`\n${tag.toUpperCase()} (${invalid.length} некорректных классов из ${Object.keys(classes).length}):`);
        invalid.slice(0, 10).forEach(item => {
            console.log(`  - ${item.class} (${item.count} раз, в компонентах: ${item.components.join(', ')})`);
        });
        if (invalid.length > 10) {
            console.log(`  ... и еще ${invalid.length - 10} классов`);
        }
    }
});

// Сохраняем результаты
const report = {
    totalTags: Object.keys(tagClasses).length,
    tags: Object.keys(tagClasses).sort(),
    invalidByTag: Object.keys(invalidByTag).reduce((acc, tag) => {
        acc[tag] = invalidByTag[tag].map(item => ({
            class: item.class,
            components: item.components,
            count: item.count,
            examples: item.examples
        }));
        return acc;
    }, {}),
    summary: Object.keys(invalidByTag).reduce((acc, tag) => {
        acc[tag] = invalidByTag[tag].length;
        return acc;
    }, {})
};

fs.writeFileSync(
    path.join(__dirname, '../../temp/services-extraction/all-tags-classes-analysis.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
);

console.log(`\n\nОтчет сохранен в: temp/services-extraction/all-tags-classes-analysis.json`);

// Подсчитываем общую статистику
const totalInvalid = Object.values(invalidByTag).reduce((sum, arr) => sum + arr.length, 0);
console.log(`\nВсего некорректных классов во всех тегах: ${totalInvalid}`);

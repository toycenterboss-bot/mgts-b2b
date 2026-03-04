const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const fetch = globalThis.fetch;
const cheerio = require('cheerio');

// Симулируем DOM API для Node.js
class MockElement {
    constructor(tagName, attributes = {}) {
        this.tagName = tagName.toUpperCase();
        this.attributes = {};
        this.classList = new Set();
        this.children = [];
        this.parentNode = null;
        this.innerHTML = '';
        this.textContent = '';
        this.style = {};
        
        // Установить атрибуты
        Object.keys(attributes).forEach(key => {
            if (key === 'class') {
                attributes[key].split(' ').forEach(cls => {
                    if (cls) this.classList.add(cls);
                });
            } else {
                this.attributes[key] = attributes[key];
            }
        });
    }
    
    setAttribute(name, value) {
        if (name === 'class') {
            this.classList.clear();
            value.split(' ').forEach(cls => {
                if (cls) this.classList.add(cls);
            });
        } else {
            this.attributes[name] = value;
        }
    }
    
    getAttribute(name) {
        if (name === 'class') {
            return Array.from(this.classList).join(' ');
        }
        return this.attributes[name];
    }
    
    hasAttribute(name) {
        return name === 'class' ? this.classList.size > 0 : name in this.attributes;
    }
    
    removeAttribute(name) {
        if (name === 'class') {
            this.classList.clear();
        } else {
            delete this.attributes[name];
        }
    }
    
    querySelector(selector) {
        // Упрощенная версия для тестирования
        return null;
    }
    
    querySelectorAll(selector) {
        const results = [];
        if (selector.includes('h1') || selector.includes('h2') || selector.includes('h3')) {
            this.children.forEach(child => {
                if (child.tagName && child.tagName.match(/^H[1-6]$/)) {
                    results.push(child);
                }
                results.push(...child.querySelectorAll(selector));
            });
        }
        return results;
    }
    
    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
    }
    
    remove() {
        if (this.parentNode) {
            const index = this.parentNode.children.indexOf(this);
            if (index > -1) {
                this.parentNode.children.splice(index, 1);
            }
        }
    }
    
    cloneNode(deep = false) {
        const clone = new MockElement(this.tagName, {});
        clone.classList = new Set(this.classList);
        clone.attributes = {...this.attributes};
        clone.innerHTML = this.innerHTML;
        clone.textContent = this.textContent;
        if (deep) {
            this.children.forEach(child => {
                clone.appendChild(child.cloneNode(true));
            });
        }
        return clone;
    }
}

// Симулируем обработку как в cms-loader.js
async function simulateProcessing() {
    const slug = 'business';
    const url = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    
    console.log('=== СИМУЛЯЦИЯ ОБРАБОТКИ СЕКЦИЙ ===\n');
    console.log('Загружаю страницу из Strapi...');
    
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`
        }
    });
    
    const data = await res.json();
    const page = data.data[0];
    const pageAttributes = page.attributes || page;
    const content = pageAttributes.content || '';
    
    const $ = cheerio.load(content);
    
    // Находим все секции
    const sections = $('section.section');
    console.log(`\nНайдено секций: ${sections.length}\n`);
    
    sections.each((index, sectionEl) => {
        const $section = $(sectionEl);
        console.log(`\n[LOG] ========== ОБРАБОТКА СЕКЦИИ ${index + 1} из ${sections.length} ==========`);
        
        // Найти заголовок секции
        const titleElement = $section.find('.title-promo-short, h2, h1, .section-title').first();
        const sectionTitle = titleElement.text().trim();
        console.log(`[LOG] Заголовок секции из CMS: "${sectionTitle}"`);
        
        // Логируем все заголовки в исходной секции
        const headingsInOriginal = $section.find('h1, h2, h3, h4, h5, h6');
        console.log(`[LOG] Заголовков в исходной секции из CMS: ${headingsInOriginal.length}`);
        headingsInOriginal.each((i, h) => {
            const $h = $(h);
            console.log(`[LOG]   Заголовок ${i + 1}: <${h.tagName}> "${$h.text().trim().substring(0, 50)}"`);
        });
        
        // Извлечь содержимое
        let sectionContent = '';
        const sectionContainer = $section.find('.container').first();
        
        if (sectionContainer.length > 0) {
            console.log(`[LOG] Секция содержит .container, извлекаем содержимое из него`);
            sectionContent = sectionContainer.html() || '';
            console.log(`[LOG] Извлечено содержимое из .container, длина: ${sectionContent.length}`);
            
            // Логируем заголовки в извлеченном контенте
            const $tempCheck = cheerio.load(sectionContent);
            const headingsInExtracted = $tempCheck('h1, h2, h3, h4, h5, h6');
            console.log(`[LOG] Заголовков в извлеченном контенте из .container: ${headingsInExtracted.length}`);
            headingsInExtracted.each((i, h) => {
                const $h = $tempCheck(h);
                console.log(`[LOG]   Заголовок ${i + 1} в контенте: <${h.tagName}> "${$h.text().trim().substring(0, 50)}"`);
            });
        } else {
            console.log(`[LOG] Секция не содержит .container, извлекаем весь innerHTML`);
            sectionContent = $section.html() || '';
            console.log(`[LOG] Извлечено содержимое из секции целиком, длина: ${sectionContent.length}`);
            
            // Логируем заголовки в извлеченном контенте
            const $tempCheck = cheerio.load(sectionContent);
            const headingsInExtracted = $tempCheck('h1, h2, h3, h4, h5, h6');
            console.log(`[LOG] Заголовков в извлеченном контенте из секции: ${headingsInExtracted.length}`);
            headingsInExtracted.each((i, h) => {
                const $h = $tempCheck(h);
                console.log(`[LOG]   Заголовок ${i + 1} в контенте: <${h.tagName}> "${$h.text().trim().substring(0, 50)}"`);
            });
        }
        
        // Симулируем удаление дубликата заголовка секции
        if (sectionTitle && sectionContent) {
            const $tempContainer = cheerio.load(sectionContent);
            const headingsInContent = $tempContainer('h1, h2, h3, h4, h5, h6');
            console.log(`[LOG] Заголовков в tempContainer ПЕРЕД удалением дубликатов: ${headingsInContent.length}`);
            headingsInContent.each((i, h) => {
                const $h = $tempContainer(h);
                console.log(`[LOG]   Заголовок ${i + 1} ПЕРЕД: <${h.tagName}> "${$h.text().trim().substring(0, 50)}"`);
            });
            
            let removedCount = 0;
            headingsInContent.each((i, h) => {
                const $h = $tempContainer(h);
                const headingText = $h.text().trim();
                if (headingText === sectionTitle) {
                    console.log(`[LOG] ⚠️ Удаляем дубликат заголовка "${sectionTitle}" из контента`);
                    $tempContainer(h).remove();
                    removedCount++;
                }
            });
            console.log(`[LOG] Удалено дубликатов заголовка секции: ${removedCount}`);
            
            const headingsAfterDedup = $tempContainer('h1, h2, h3, h4, h5, h6');
            console.log(`[LOG] Заголовков в tempContainer ПОСЛЕ удаления дубликатов: ${headingsAfterDedup.length}`);
            headingsAfterDedup.each((i, h) => {
                const $h = $tempContainer(h);
                console.log(`[LOG]   Заголовок ${i + 1} ПОСЛЕ: <${h.tagName}> "${$h.text().trim().substring(0, 50)}"`);
            });
            
            // Обновляем sectionContent
            sectionContent = $tempContainer.html() || '';
        }
        
        // Симулируем проверку дубликатов после вставки
        if (sectionContent) {
            const $finalCheck = cheerio.load(sectionContent);
            const finalHeadings = $finalCheck('h1, h2, h3, h4, h5, h6');
            console.log(`[LOG] ========== ФИНАЛЬНОЕ СОСТОЯНИЕ СЕКЦИИ ==========`);
            console.log(`[LOG] Заголовков в секции после всех обработок: ${finalHeadings.length}`);
            
            const seenTexts = new Set();
            const duplicates = [];
            finalHeadings.each((i, h) => {
                const $h = $finalCheck(h);
                const text = $h.text().trim();
                if (text && seenTexts.has(text)) {
                    duplicates.push({index: i + 1, tag: h.tagName, text: text.substring(0, 50)});
                } else if (text) {
                    seenTexts.add(text);
                }
            });
            
            if (duplicates.length > 0) {
                console.log(`[LOG] ⚠️ НАЙДЕНЫ ДУБЛИКАТЫ В ФИНАЛЬНОМ СОСТОЯНИИ:`);
                duplicates.forEach(dup => {
                    console.log(`[LOG]   Дубликат #${dup.index}: <${dup.tag}> "${dup.text}"`);
                });
            } else {
                console.log(`[LOG] Дубликатов не найдено`);
            }
            
            finalHeadings.each((i, h) => {
                const $h = $finalCheck(h);
                const classes = $h.attr('class') || '';
                console.log(`[LOG]   ФИНАЛЬНЫЙ заголовок ${i + 1}: <${h.tagName}> "${$h.text().trim().substring(0, 50)}" class="${classes}"`);
            });
            console.log(`[LOG] ================================================\n`);
        }
    });
}

simulateProcessing().catch(console.error);



/**
 * Скрипт для извлечения или генерации hero секций для страниц
 * 
 * Задачи:
 * 1. Проверить, есть ли в старом HTML секции, похожие на hero
 * 2. Если есть - извлечь heroTitle и heroSubtitle
 * 3. Если нет - сгенерировать на основе контентного анализа страницы
 * 4. Обновить нормализованный HTML, добавив секции hero
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const PAGES_CONTENT_DIR = path.join(OUTPUT_DIR, 'pages-content');
const NORMALIZED_DIR = path.join(OUTPUT_DIR, 'pages-content-normalized');
const REPORT_FILE = path.join(OUTPUT_DIR, 'hero-extraction-report.json');
const REPORT_MD_FILE = path.join(__dirname, '../../docs/HERO_EXTRACTION_REPORT.md');

/**
 * Извлечь hero из старого HTML
 */
function extractHeroFromOldHTML(html, slug) {
    if (!html) return null;
    
    try {
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        
        // Ищем различные варианты hero секций
        const heroSelectors = [
            '.title-promo-long',
            '.title-promo',
            '.hero',
            '.page-hero',
            'section.hero',
            '.title-h1-wide',
            '.title-h1',
            'h1.title',
            '.main-title',
            '.page-title'
        ];
        
        let heroElement = null;
        for (const selector of heroSelectors) {
            heroElement = doc.querySelector(selector);
            if (heroElement) break;
        }
        
        if (!heroElement) {
            // Ищем первый h1 на странице
            heroElement = doc.querySelector('h1');
        }
        
        if (!heroElement) {
            // Ищем первый заголовок в main или в начале body
            const main = doc.querySelector('main') || doc.body;
            if (main) {
                heroElement = main.querySelector('h1, h2, .title, [class*="title"]');
            }
        }
        
            if (heroElement) {
            // Извлекаем title - ищем первый h1 на странице
            let titleElement = doc.querySelector('h1');
            if (!titleElement) {
                titleElement = heroElement.querySelector('.title-promo-long__title-text, .title-text, h1, .title') || heroElement;
            }
            
            let title = titleElement.textContent.trim();
            
            // Очищаем title от лишних символов
            title = title.replace(/\s+/g, ' ').trim();
            
            // Если title слишком длинный или не подходит, используем title из метаданных
            if (title.length > 100 || title.toLowerCase().includes('преимущества') || title.toLowerCase().includes('особенности')) {
                // Пропускаем такие заголовки, будем генерировать
                return null;
            }
            
            // Извлекаем subtitle
            let subtitle = '';
            
            // Ищем subtitle в hero элементе
            const subtitleElement = heroElement.querySelector('.title-promo-long__description-text, .description-text, .subtitle, p.description, p.subtitle');
            if (subtitleElement) {
                subtitle = subtitleElement.textContent.trim();
            }
            
            // Если subtitle не найден, ищем в следующем элементе
            if (!subtitle && heroElement.nextElementSibling) {
                const next = heroElement.nextElementSibling;
                if (next.tagName === 'P' || next.classList.contains('description') || next.classList.contains('text') || next.classList.contains('subtitle')) {
                    subtitle = next.textContent.trim();
                }
            }
            
            // Если subtitle не найден, ищем первый параграф после h1
            if (!subtitle) {
                const h1 = doc.querySelector('h1');
                if (h1 && h1.nextElementSibling) {
                    let next = h1.nextElementSibling;
                    let attempts = 0;
                    while (next && attempts < 3) {
                        if (next.tagName === 'P' && next.textContent.trim().length > 20) {
                            subtitle = next.textContent.trim();
                            break;
                        }
                        next = next.nextElementSibling;
                        attempts++;
                    }
                }
            }
            
            // Очищаем и ограничиваем subtitle
            if (subtitle) {
                subtitle = subtitle.replace(/\s+/g, ' ').trim();
                // Берем первое предложение или первые 200 символов
                if (subtitle.length > 200) {
                    const firstSentence = subtitle.match(/^[^.!?]+[.!?]+/);
                    if (firstSentence && firstSentence[0].length <= 200) {
                        subtitle = firstSentence[0].trim();
                    } else {
                        subtitle = subtitle.substring(0, 197).trim() + '...';
                    }
                }
            }
            
            if (title && title.length > 0) {
                return {
                    heroTitle: title,
                    heroSubtitle: subtitle || null,
                    source: 'extracted',
                    selector: heroElement.className || heroElement.tagName
                };
            }
        }
    } catch (error) {
        console.warn(`⚠️  Ошибка при извлечении hero из ${slug}:`, error.message);
    }
    
    return null;
}

/**
 * Генерировать hero на основе контентного анализа
 */
function generateHeroFromContent(pageData) {
    const title = pageData.title || pageData.heroTitle || '';
    const slug = pageData.slug || '';
    const content = pageData.content || pageData.normalizedHTML || '';
    const metaDescription = pageData.metaDescription || '';
    
    // Извлекаем текст из HTML
    let textContent = '';
    if (content) {
        try {
            const dom = new JSDOM(content);
            const doc = dom.window.document;
            textContent = doc.body.textContent || '';
        } catch (error) {
            textContent = String(content).replace(/<[^>]+>/g, ' ');
        }
    }
    
    // Очищаем текст
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    // Если есть metaDescription, используем его как основу для heroSubtitle
    if (metaDescription && metaDescription.length > 20 && metaDescription.length < 250) {
        textContent = metaDescription + ' ' + textContent;
    }
    
    // Генерируем heroTitle на основе title или slug
    let heroTitle = title;
    
    // Если title не подходит, используем slug
    if (!heroTitle || heroTitle.length < 3 || heroTitle.length > 100) {
        // Генерируем из slug
        const slugParts = slug
            .split(/[\/_]/)
            .filter(p => p && p !== 'business' && p !== 'operators' && p !== 'government' && p !== 'partners' && p !== 'developers' && p !== 'all' && p !== 'services');
        
        if (slugParts.length > 0) {
            heroTitle = slugParts
                .map(p => {
                    // Преобразуем snake_case в Title Case
                    return p.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                })
                .join(' ');
        } else {
            heroTitle = slug.charAt(0).toUpperCase() + slug.slice(1);
        }
    }
    
    // Ограничиваем длину heroTitle
    if (heroTitle.length > 80) {
        heroTitle = heroTitle.substring(0, 77) + '...';
    }
    
    // Генерируем heroSubtitle на основе контента
    let heroSubtitle = '';
    
    // Приоритет 1: Используем metaDescription, если он есть и подходит
    if (metaDescription && metaDescription.length > 20 && metaDescription.length < 250) {
        heroSubtitle = metaDescription.trim();
    }
    
    // Приоритет 2: Извлекаем из HTML - ищем первый параграф
    if (!heroSubtitle && content) {
        try {
            const dom = new JSDOM(content);
            const doc = dom.window.document;
            
            // Ищем первый параграф в section-text или в начале контента
            const firstP = doc.querySelector('section.section-text p, .section-text__content p, section p, p');
            if (firstP) {
                const pText = firstP.textContent.trim();
                if (pText.length > 20 && pText.length < 250) {
                    heroSubtitle = pText;
                }
            }
        } catch (error) {
            // Игнорируем ошибки парсинга
        }
    }
    
    // Приоритет 3: Ищем первое значимое предложение в текстовом контенте
    if (!heroSubtitle && textContent.length > 0) {
        const sentences = textContent.match(/[^.!?]+[.!?]+/g) || [];
        
        // Фильтруем слишком короткие или длинные предложения
        const goodSentences = sentences.filter(s => {
            const cleaned = s.trim();
            return cleaned.length > 30 && cleaned.length < 200;
        });
        
        if (goodSentences.length > 0) {
            heroSubtitle = goodSentences[0].trim();
        } else if (textContent.length > 20) {
            // Берем первые 200 символов
            heroSubtitle = textContent.substring(0, 200).trim();
            if (textContent.length > 200) {
                heroSubtitle += '...';
            }
        }
    }
    
    // Ограничиваем длину heroSubtitle
    if (heroSubtitle && heroSubtitle.length > 250) {
        heroSubtitle = heroSubtitle.substring(0, 247).trim() + '...';
    }
    
    // Если subtitle все еще пустой, генерируем на основе типа страницы
    if (!heroSubtitle) {
        const section = pageData.section || '';
        const pageType = pageData.pageType || '';
        
        if (section === 'business') {
            heroSubtitle = 'Комплексные решения для вашего бизнеса от МГТС';
        } else if (section === 'operators') {
            heroSubtitle = 'Услуги для операторов связи от МГТС';
        } else if (section === 'government') {
            heroSubtitle = 'Цифровые решения для государственного сектора';
        } else if (section === 'partners') {
            heroSubtitle = 'Партнерская программа МГТС';
        } else if (section === 'developers') {
            heroSubtitle = 'Решения для застройщиков от МГТС';
        } else if (pageType === 'news') {
            heroSubtitle = 'Актуальные новости и события МГТС';
        } else {
            heroSubtitle = 'Официальный сайт МГТС';
        }
    }
    
    return {
        heroTitle: heroTitle,
        heroSubtitle: heroSubtitle || null,
        source: 'generated'
    };
}

/**
 * Обработать все страницы
 */
function processAllPages() {
    console.log('🔍 Извлечение и генерация hero секций...\n');
    
    if (!fs.existsSync(PAGES_CONTENT_DIR)) {
        console.error(`❌ Директория не найдена: ${PAGES_CONTENT_DIR}`);
        process.exit(1);
    }
    
    if (!fs.existsSync(NORMALIZED_DIR)) {
        console.error(`❌ Директория не найдена: ${NORMALIZED_DIR}`);
        process.exit(1);
    }
    
    const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.json'));
    console.log(`📁 Найдено файлов: ${files.length}\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        total: files.length,
        extracted: 0,
        generated: 0,
        updated: 0,
        errors: [],
        details: []
    };
    
    files.forEach((file, index) => {
        if ((index + 1) % 10 === 0) {
            console.log(`  Обработано: ${index + 1}/${files.length} страниц...`);
        }
        
        try {
            const normalizedPath = path.join(NORMALIZED_DIR, file);
            const normalizedData = JSON.parse(fs.readFileSync(normalizedPath, 'utf-8'));
            
            const slug = normalizedData.slug || file.replace('.json', '');
            
            // Проверяем качество существующего hero
            let needsUpdate = false;
            
            // Проверяем heroTitle
            if (normalizedData.heroTitle) {
                const existingTitle = String(normalizedData.heroTitle).trim();
                // Если title слишком длинный или содержит неподходящие слова, обновляем
                if (existingTitle.length > 100 || 
                    existingTitle.toLowerCase().includes('преимущества') || 
                    existingTitle.toLowerCase().includes('особенности') ||
                    existingTitle.toLowerCase().includes('наши') ||
                    existingTitle === '[object Object]') {
                    needsUpdate = true;
                }
            } else {
                needsUpdate = true;
            }
            
            // Проверяем heroSubtitle
            if (normalizedData.heroSubtitle) {
                const existingSubtitle = String(normalizedData.heroSubtitle).trim();
                // Если subtitle слишком длинный, является объектом или содержит [object Object], обновляем
                if (existingSubtitle.length > 250 || 
                    existingSubtitle === '[object Object]' ||
                    typeof normalizedData.heroSubtitle === 'object') {
                    needsUpdate = true;
                }
            } else {
                needsUpdate = true;
            }
            
            if (!needsUpdate && normalizedData.heroTitle && normalizedData.heroSubtitle) {
                results.details.push({
                    slug: slug,
                    status: 'already_exists',
                    heroTitle: String(normalizedData.heroTitle),
                    heroSubtitle: String(normalizedData.heroSubtitle)
                });
                return;
            }
            
            // Пытаемся извлечь из старого HTML
            const oldPagePath = path.join(PAGES_CONTENT_DIR, file);
            let hero = null;
            
            if (fs.existsSync(oldPagePath)) {
                const oldPageData = JSON.parse(fs.readFileSync(oldPagePath, 'utf-8'));
                const oldHTML = oldPageData.content?.html || oldPageData.fullHTML || '';
                hero = extractHeroFromOldHTML(oldHTML, slug);
            }
            
            // Проверяем качество извлеченного hero
            if (hero) {
                const title = hero.heroTitle || '';
                // Если title не подходит (слишком длинный, содержит неподходящие слова), генерируем новый
                if (title.length > 100 || 
                    title.toLowerCase().includes('преимущества') || 
                    title.toLowerCase().includes('особенности') ||
                    title.toLowerCase().includes('наши') ||
                    title.toLowerCase().includes('связаться') ||
                    title.toLowerCase().includes('подобрать')) {
                    hero = null; // Будем генерировать
                }
            }
            
            // Если не удалось извлечь или качество плохое, генерируем
            if (!hero) {
                hero = generateHeroFromContent(normalizedData);
                results.generated++;
            } else {
                results.extracted++;
            }
            
            // Обновляем нормализованный файл
            // Убеждаемся, что heroTitle и heroSubtitle - строки
            normalizedData.heroTitle = String(hero.heroTitle || '').trim();
            
            // Обрабатываем heroSubtitle
            let heroSubtitleValue = null;
            if (hero.heroSubtitle) {
                // Если это объект, игнорируем
                if (typeof hero.heroSubtitle === 'object') {
                    heroSubtitleValue = null;
                } else {
                    const subtitleStr = String(hero.heroSubtitle).trim();
                    // Игнорируем "[object Object]"
                    if (subtitleStr !== '[object Object]' && subtitleStr.length > 0) {
                        heroSubtitleValue = subtitleStr;
                        // Если слишком длинный, обрезаем
                        if (heroSubtitleValue.length > 250) {
                            heroSubtitleValue = heroSubtitleValue.substring(0, 247).trim() + '...';
                        }
                    }
                }
            }
            
            normalizedData.heroSubtitle = heroSubtitleValue;
            
            // Сохраняем обновленный файл
            fs.writeFileSync(normalizedPath, JSON.stringify(normalizedData, null, 2), 'utf-8');
            results.updated++;
            
            results.details.push({
                slug: slug,
                status: hero.source === 'extracted' ? 'extracted' : 'generated',
                heroTitle: hero.heroTitle,
                heroSubtitle: hero.heroSubtitle,
                source: hero.source
            });
            
        } catch (error) {
            results.errors.push({
                file: file,
                error: error.message
            });
            console.warn(`⚠️  Ошибка при обработке ${file}:`, error.message);
        }
    });
    
    console.log(`\n✅ Обработка завершена:\n`);
    console.log(`   Извлечено из старого HTML: ${results.extracted}`);
    console.log(`   Сгенерировано: ${results.generated}`);
    console.log(`   Обновлено файлов: ${results.updated}`);
    console.log(`   Ошибок: ${results.errors.length}\n`);
    
    // Сохраняем отчет
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`📄 JSON отчет сохранен: ${REPORT_FILE}\n`);
    
    // Создаем Markdown отчет
    createMarkdownReport(results);
    
    return results;
}

/**
 * Создать Markdown отчет
 */
function createMarkdownReport(results) {
    let md = `# Отчет по извлечению и генерации hero секций\n\n`;
    md += `**Дата:** ${new Date().toISOString()}\n\n`;
    md += `## 📊 Сводка\n\n`;
    md += `- **Всего страниц:** ${results.total}\n`;
    md += `- **Извлечено из старого HTML:** ${results.extracted}\n`;
    md += `- **Сгенерировано:** ${results.generated}\n`;
    md += `- **Обновлено файлов:** ${results.updated}\n`;
    md += `- **Ошибок:** ${results.errors.length}\n\n`;
    
    if (results.extracted > 0) {
        md += `## ✅ Извлеченные hero секции\n\n`;
        md += `| Slug | Hero Title | Hero Subtitle |\n`;
        md += `|------|------------|---------------|\n`;
        
        results.details
            .filter(d => d.status === 'extracted')
            .slice(0, 20)
            .forEach(d => {
                md += `| ${d.slug} | ${d.heroTitle} | ${d.heroSubtitle || '-'} |\n`;
            });
        
        if (results.extracted > 20) {
            md += `\n*... и еще ${results.extracted - 20} страниц*\n`;
        }
        md += `\n`;
    }
    
    if (results.generated > 0) {
        md += `## 🤖 Сгенерированные hero секции\n\n`;
        md += `| Slug | Hero Title | Hero Subtitle |\n`;
        md += `|------|------------|---------------|\n`;
        
        results.details
            .filter(d => d.status === 'generated')
            .slice(0, 20)
            .forEach(d => {
                md += `| ${d.slug} | ${d.heroTitle} | ${d.heroSubtitle || '-'} |\n`;
            });
        
        if (results.generated > 20) {
            md += `\n*... и еще ${results.generated - 20} страниц*\n`;
        }
        md += `\n`;
    }
    
    if (results.errors.length > 0) {
        md += `## ❌ Ошибки\n\n`;
        md += `| Файл | Ошибка |\n`;
        md += `|------|--------|\n`;
        
        results.errors.forEach(e => {
            md += `| ${e.file} | ${e.error} |\n`;
        });
        md += `\n`;
    }
    
    md += `## 📝 Выводы\n\n`;
    md += `1. **${results.extracted} страниц** имеют hero секции в старом HTML\n`;
    md += `2. **${results.generated} страниц** получили сгенерированные hero секции\n`;
    md += `3. Все нормализованные файлы обновлены с hero секциями\n\n`;
    
    fs.writeFileSync(REPORT_MD_FILE, md, 'utf-8');
    console.log(`📄 Markdown отчет сохранен: ${REPORT_MD_FILE}\n`);
}

/**
 * Главная функция
 */
function main() {
    console.log('🎯 Извлечение и генерация hero секций\n');
    console.log('='.repeat(60) + '\n');
    
    try {
        const results = processAllPages();
        console.log('✅ Готово!\n');
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    }
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main, extractHeroFromOldHTML, generateHeroFromContent };

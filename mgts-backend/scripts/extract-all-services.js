/**
 * Скрипт для сбора информации по всем услугам с действующего сайта МГТС
 * Собирает структуру услуг, их описание, тарифы и другую информацию
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'all-services.json');

// Создаем директорию для результатов
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Извлечь структуру меню услуг с главной страницы
 */
async function extractServicesMenu() {
    console.log('📋 Извлечение структуры меню услуг...');
    
    try {
        const response = await axios.get(BASE_URL, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const services = [];
        
        // Ищем меню услуг (может быть в разных местах)
        // Вариант 1: Mega menu
        $('.mega-menu, [class*="menu"], nav').each((i, elem) => {
            const $menu = $(elem);
            const text = $menu.text().toLowerCase();
            
            if (text.includes('услуг') || text.includes('интернет') || text.includes('телефон')) {
                $menu.find('a[href*="/business"], a[href*="/service"]').each((j, link) => {
                    const $link = $(link);
                    const href = $link.attr('href');
                    const title = $link.text().trim();
                    
                    if (href && title && !services.find(s => s.url === href)) {
                        services.push({
                            title: title,
                            url: href.startsWith('http') ? href : BASE_URL + href,
                            category: extractCategory(href, title)
                        });
                    }
                });
            }
        });
        
        // Вариант 2: Ищем ссылки на услуги в навигации
        $('nav a, .nav a, [class*="nav"] a').each((i, link) => {
            const $link = $(link);
            const href = $link.attr('href');
            const title = $link.text().trim();
            
            if (href && (href.includes('/business') || href.includes('/service')) && title) {
                const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
                if (!services.find(s => s.url === fullUrl)) {
                    services.push({
                        title: title,
                        url: fullUrl,
                        category: extractCategory(href, title)
                    });
                }
            }
        });
        
        // Вариант 3: Ищем карточки услуг на главной странице
        $('[class*="service"], [class*="card"], [class*="product"]').each((i, card) => {
            const $card = $(card);
            const $link = $card.find('a').first();
            
            if ($link.length) {
                const href = $link.attr('href');
                const title = $link.text().trim() || $card.find('h2, h3, h4').first().text().trim();
                
                if (href && title && (href.includes('/business') || href.includes('/service'))) {
                    const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
                    if (!services.find(s => s.url === fullUrl)) {
                        services.push({
                            title: title,
                            url: fullUrl,
                            category: extractCategory(href, title)
                        });
                    }
                }
            }
        });
        
        console.log(`✅ Найдено услуг в меню: ${services.length}`);
        return services;
        
    } catch (error) {
        console.error('❌ Ошибка при извлечении меню:', error.message);
        return [];
    }
}

/**
 * Определить категорию услуги по URL и названию
 */
function extractCategory(url, title) {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    if (urlLower.includes('internet') || urlLower.includes('интернет') || titleLower.includes('интернет')) {
        return 'internet';
    }
    if (urlLower.includes('telephony') || urlLower.includes('телефон') || titleLower.includes('телефон')) {
        return 'telephony';
    }
    if (urlLower.includes('security') || urlLower.includes('безопасн') || titleLower.includes('безопасн')) {
        return 'security';
    }
    if (urlLower.includes('cloud') || urlLower.includes('облак') || titleLower.includes('облак')) {
        return 'cloud';
    }
    if (urlLower.includes('tv') || urlLower.includes('тв') || titleLower.includes('тв')) {
        return 'tv';
    }
    
    return 'other';
}

/**
 * Извлечь детальную информацию об услуге со страницы
 */
async function extractServiceDetails(service) {
    console.log(`  📄 Обработка: ${service.title}`);
    
    try {
        const response = await axios.get(service.url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        // Извлекаем основную информацию
        const details = {
            title: service.title,
            url: service.url,
            category: service.category,
            slug: extractSlug(service.url),
            description: '',
            features: [],
            tariffs: [],
            images: [],
            content: ''
        };
        
        // Описание (из meta description или первого параграфа)
        const metaDesc = $('meta[name="description"]').attr('content');
        if (metaDesc) {
            details.description = metaDesc.trim();
        } else {
            const firstP = $('main p, .content p, article p').first().text().trim();
            if (firstP) {
                details.description = firstP.substring(0, 300);
            }
        }
        
        // Заголовок страницы
        const pageTitle = $('h1').first().text().trim() || 
                         $('title').text().trim() || 
                         service.title;
        details.title = pageTitle;
        
        // Основной контент
        const mainContent = $('main, .content, article, [class*="content"]').first();
        if (mainContent.length) {
            // Удаляем скрипты и стили
            mainContent.find('script, style').remove();
            details.content = mainContent.html() || '';
        }
        
        // Особенности/преимущества
        $('[class*="feature"], [class*="advantage"], [class*="benefit"], ul li').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text && text.length > 10 && text.length < 200) {
                details.features.push(text);
            }
        });
        
        // Тарифы (ищем цены и тарифные планы)
        $('[class*="tariff"], [class*="price"], [class*="plan"]').each((i, elem) => {
            const $tariff = $(elem);
            const title = $tariff.find('h2, h3, h4, .title').first().text().trim();
            const price = $tariff.text().match(/(\d+[\s,.]?\d*)\s*(руб|₽|рублей|руб\.)/i);
            
            if (title || price) {
                details.tariffs.push({
                    title: title || 'Тариф',
                    price: price ? price[0] : '',
                    description: $tariff.text().trim().substring(0, 200)
                });
            }
        });
        
        // Изображения
        $('img').each((i, img) => {
            const src = $(img).attr('src');
            if (src && !src.includes('logo') && !src.includes('icon')) {
                const fullSrc = src.startsWith('http') ? src : BASE_URL + src;
                details.images.push(fullSrc);
            }
        });
        
        // Сохраняем HTML страницы для дальнейшего анализа
        const htmlFile = path.join(OUTPUT_DIR, `${details.slug}.html`);
        fs.writeFileSync(htmlFile, response.data, 'utf-8');
        
        return details;
        
    } catch (error) {
        console.error(`  ❌ Ошибка при обработке ${service.title}:`, error.message);
        return {
            ...service,
            error: error.message
        };
    }
}

/**
 * Извлечь slug из URL
 */
function extractSlug(url) {
    const match = url.match(/\/([^\/]+)\/?$/);
    return match ? match[1] : url.split('/').pop().replace('.html', '');
}

/**
 * Основная функция
 */
async function main() {
    console.log('🚀 НАЧАЛО СБОРА ИНФОРМАЦИИ ОБ УСЛУГАХ');
    console.log('='.repeat(70));
    console.log(`🌐 Базовый URL: ${BASE_URL}`);
    console.log(`📁 Директория результатов: ${OUTPUT_DIR}`);
    console.log('='.repeat(70));
    
    const startTime = Date.now();
    const results = {
        services: [],
        summary: {
            total: 0,
            processed: 0,
            errors: 0,
            categories: {}
        }
    };
    
    // Шаг 1: Извлечь структуру меню
    const servicesMenu = await extractServicesMenu();
    
    if (servicesMenu.length === 0) {
        console.log('\n⚠️  Не удалось автоматически извлечь услуги из меню.');
        console.log('💡 Попробуем альтернативный метод...');
        
        // Альтернативный метод: известные категории услуг
        const knownServices = [
            { title: 'GPON для бизнеса', url: '/business/internet/gpon', category: 'internet' },
            { title: 'Выделенный интернет', url: '/business/internet/dedicated', category: 'internet' },
            { title: 'Офисный интернет', url: '/business/internet/office', category: 'internet' },
            { title: 'Фиксированная связь', url: '/business/telephony/fixed', category: 'telephony' },
            { title: 'IP-телефония', url: '/business/telephony/ip', category: 'telephony' },
            { title: 'Виртуальная АТС', url: '/business/telephony/vpbx', category: 'telephony' },
            { title: 'Корпоративная мобильная связь', url: '/business/telephony/mobile', category: 'telephony' },
            { title: 'Видеонаблюдение', url: '/business/security/video-surveillance', category: 'security' },
            { title: 'Контроль доступа', url: '/business/security/access-control', category: 'security' },
            { title: 'Охранная сигнализация', url: '/business/security/alarm', category: 'security' },
            { title: 'Облачное хранилище', url: '/business/cloud/storage', category: 'cloud' },
            { title: 'Виртуальные серверы', url: '/business/cloud/vps', category: 'cloud' },
            { title: 'Облачные сервисы', url: '/business/cloud/services', category: 'cloud' },
            { title: 'IPTV для бизнеса', url: '/business/tv/iptv', category: 'tv' },
            { title: 'Корпоративное ТВ', url: '/business/tv/office', category: 'tv' }
        ];
        
        for (const service of knownServices) {
            servicesMenu.push({
                title: service.title,
                url: BASE_URL + service.url,
                category: service.category
            });
        }
    }
    
    results.summary.total = servicesMenu.length;
    console.log(`\n📊 Всего услуг для обработки: ${servicesMenu.length}`);
    
    // Шаг 2: Обработать каждую услугу
    for (let i = 0; i < servicesMenu.length; i++) {
        const service = servicesMenu[i];
        console.log(`\n[${i + 1}/${servicesMenu.length}] Обработка услуги...`);
        
        const details = await extractServiceDetails(service);
        results.services.push(details);
        
        if (details.error) {
            results.summary.errors++;
        } else {
            results.summary.processed++;
            results.summary.categories[details.category] = 
                (results.summary.categories[details.category] || 0) + 1;
        }
        
        // Небольшая задержка между запросами
        if (i < servicesMenu.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Сохранение результатов
    console.log('\n💾 Сохранение результатов...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Итоговый отчет
    console.log('\n' + '='.repeat(70));
    console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
    console.log('='.repeat(70));
    console.log(`⏱️  Время выполнения: ${duration}с`);
    console.log(`✅ Успешно обработано: ${results.summary.processed}`);
    console.log(`❌ Ошибок: ${results.summary.errors}`);
    console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
    console.log('\n📊 По категориям:');
    for (const [category, count] of Object.entries(results.summary.categories)) {
        console.log(`   ${category}: ${count}`);
    }
    console.log('='.repeat(70));
}

// Запуск
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { extractServicesMenu, extractServiceDetails };

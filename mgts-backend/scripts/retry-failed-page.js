/**
 * Повторная попытка загрузки страницы с таймаутом
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FAILED_URL = 'https://business.mgts.ru/business/security_alarm';
const OUTPUT_FILE = path.join(__dirname, '../../temp/services-extraction/security_alarm-content.json');

async function retryFailedPage() {
    console.log('🔄 ПОВТОРНАЯ ПОПЫТКА ЗАГРУЗКИ СТРАНИЦЫ');
    console.log('='.repeat(70));
    console.log(`URL: ${FAILED_URL}`);
    console.log('='.repeat(70));
    
    let browser;
    
    try {
        console.log('\n🌐 Запуск браузера...');
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        console.log('\n📄 Загрузка страницы с увеличенным таймаутом (60 секунд)...');
        
        try {
            await page.goto(FAILED_URL, {
                waitUntil: 'networkidle2',
                timeout: 60000 // Увеличиваем таймаут до 60 секунд
            });
            
            // Дополнительное ожидание для загрузки динамического контента
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            console.log('✅ Страница загружена успешно!');
            
            // Делаем скриншот
            const screenshotPath = path.join(__dirname, '../../temp/services-extraction/security_alarm-screenshot.png');
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Скриншот сохранен: security_alarm-screenshot.png`);
            
            // Извлекаем контент
            const html = await page.content();
            const title = await page.title();
            
            // Анализируем структуру
            const structure = await page.evaluate(() => {
                return {
                    title: document.title,
                    hasHero: !!document.querySelector('.hero, .hero-content, [class*="hero"]'),
                    hasSections: document.querySelectorAll('.section, section').length,
                    hasTariffs: !!document.querySelector('.service-tariffs, .tariffs-grid, .tariff-card'),
                    hasFAQ: !!document.querySelector('.service-faq, .faq-list, .faq-item'),
                    hasFeatures: !!document.querySelector('.service-features, .features-grid, .feature-card'),
                    hasOrderForm: !!document.querySelector('.service-order, .order-form, #order-form'),
                    hasSpecs: !!document.querySelector('.service-specs, .specs-grid, .spec-item'),
                    hasCases: !!document.querySelector('.service-cases, .cases-grid, .case-card'),
                    hasServiceCards: !!document.querySelector('.service-card'),
                    hasTariffCards: !!document.querySelector('.tariff-card'),
                    imagesCount: document.querySelectorAll('img').length,
                    linksCount: document.querySelectorAll('a[href]').length,
                    contentLength: document.body.innerHTML.length
                };
            });
            
            const result = {
                timestamp: new Date().toISOString(),
                url: FAILED_URL,
                success: true,
                title: title,
                html: html,
                structure: structure,
                contentLength: html.length
            };
            
            // Сохраняем результаты
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
            
            console.log('\n' + '='.repeat(70));
            console.log('📊 РЕЗУЛЬТАТЫ');
            console.log('='.repeat(70));
            console.log(`✅ Заголовок: ${title}`);
            console.log(`📏 Длина HTML: ${html.length} символов`);
            console.log(`📦 Секций: ${structure.hasSections}`);
            console.log(`🖼️  Изображений: ${structure.imagesCount}`);
            console.log(`🔗 Ссылок: ${structure.linksCount}`);
            console.log(`\n📋 Блоки контента:`);
            console.log(`  Hero: ${structure.hasHero ? '✅' : '❌'}`);
            console.log(`  Тарифы: ${structure.hasTariffs ? '✅' : '❌'}`);
            console.log(`  FAQ: ${structure.hasFAQ ? '✅' : '❌'}`);
            console.log(`  Преимущества: ${structure.hasFeatures ? '✅' : '❌'}`);
            console.log(`  Форма заказа: ${structure.hasOrderForm ? '✅' : '❌'}`);
            console.log(`  Характеристики: ${structure.hasSpecs ? '✅' : '❌'}`);
            console.log(`  Кейсы: ${structure.hasCases ? '✅' : '❌'}`);
            console.log(`  Карточки услуг: ${structure.hasServiceCards ? '✅' : '❌'}`);
            console.log(`  Карточки тарифов: ${structure.hasTariffCards ? '✅' : '❌'}`);
            
            console.log('\n' + '='.repeat(70));
            console.log(`📁 Результаты сохранены в: ${OUTPUT_FILE}`);
            console.log('='.repeat(70));
            
            // Ждем перед закрытием
            console.log('\n⏳ Браузер останется открытым 5 секунд...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            return result;
            
        } catch (error) {
            console.error(`\n❌ Ошибка при загрузке: ${error.message}`);
            
            const result = {
                timestamp: new Date().toISOString(),
                url: FAILED_URL,
                success: false,
                error: error.message,
                errorType: error.name
            };
            
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
            
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

if (require.main === module) {
    retryFailedPage().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { retryFailedPage };

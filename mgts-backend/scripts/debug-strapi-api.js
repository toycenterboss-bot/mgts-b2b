#!/usr/bin/env node
/**
 * Скрипт для отладки загрузки контента из Strapi API
 * Проверяет доступность API и загрузку конкретной страницы
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8001';
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337/api';
const TEST_SLUG = process.env.TEST_SLUG || 'about_mgts';
const TEST_PAGE_URL = `${BASE_URL}/${TEST_SLUG}/index.html`;

async function debugStrapiAPI() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 ОТЛАДКА ЗАГРУЗКИ КОНТЕНТА ИЗ STRAPI API');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log(`📡 Настройки:`);
    console.log(`   - Базовый URL: ${BASE_URL}`);
    console.log(`   - Strapi API: ${STRAPI_URL}`);
    console.log(`   - Тестовая страница: ${TEST_PAGE_URL}`);
    console.log(`   - Slug: ${TEST_SLUG}\n`);
    
    const browser = await puppeteer.launch({
        headless: false, // Показываем браузер для отладки
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Слушаем консольные сообщения
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        const location = msg.location();
        
        if (type === 'error' || text.includes('Strapi') || text.includes('CMS') || text.includes('API')) {
            console.log(`\n[${type.toUpperCase()}] ${text}`);
            if (location.url) {
                console.log(`   📍 ${location.url}:${location.lineNumber}`);
            }
        }
    });
    
    // Слушаем ошибки загрузки
    page.on('response', response => {
        const url = response.url();
        if (url.includes('localhost:1337') || url.includes('api/pages')) {
            const status = response.status();
            console.log(`\n📡 API Request: ${url}`);
            console.log(`   Status: ${status}`);
            
            if (status === 200) {
                response.text().then(text => {
                    try {
                        const data = JSON.parse(text);
                        console.log(`   ✅ Успешный ответ`);
                        if (data.data && data.data.length > 0) {
                            const pageData = data.data[0];
                            const content = pageData.attributes?.content || pageData.content || '';
                            console.log(`   📄 Контент: ${content.length} символов`);
                            if (content.length < 50) {
                                console.log(`   ⚠️  Контент слишком короткий: "${content.substring(0, 100)}"`);
                            }
                        } else {
                            console.log(`   ⚠️  Страница не найдена в API`);
                        }
                    } catch (e) {
                        console.log(`   ⚠️  Не удалось распарсить ответ: ${e.message}`);
                    }
                }).catch(e => console.log(`   ❌ Ошибка чтения ответа: ${e.message}`));
            } else {
                console.log(`   ❌ Ошибка: ${status} ${response.statusText()}`);
            }
        }
    });
    
    try {
        console.log(`\n🌐 Открываю страницу: ${TEST_PAGE_URL}\n`);
        
        await page.goto(TEST_PAGE_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        console.log(`\n⏳ Ожидание загрузки контента (5 секунд)...\n`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Проверяем, загружен ли StrapiAPI
        const strapiApiExists = await page.evaluate(() => {
            return typeof window.StrapiAPI !== 'undefined';
        });
        
        console.log(`\n📊 Проверка окружения:`);
        console.log(`   - window.StrapiAPI доступен: ${strapiApiExists ? '✅' : '❌'}`);
        
        if (strapiApiExists) {
            const apiBaseUrl = await page.evaluate(() => {
                return window.StrapiAPI ? window.StrapiAPI.baseUrl : 'не определен';
            });
            console.log(`   - API Base URL: ${apiBaseUrl}`);
        }
        
        // Проверяем контент страницы
        const contentInfo = await page.evaluate(() => {
            const mainContent = document.querySelector('main, article, .content, [class*="content"]');
            const sections = document.querySelectorAll('section');
            const cmsLoaded = document.querySelector('[data-cms-loaded]');
            
            return {
                hasMainContent: !!mainContent,
                contentLength: mainContent ? mainContent.textContent.length : 0,
                sectionsCount: sections.length,
                hasCMSLoaded: !!cmsLoaded,
                htmlLength: document.documentElement.innerHTML.length
            };
        });
        
        console.log(`\n📄 Контент страницы:`);
        console.log(`   - Основной контент: ${contentInfo.hasMainContent ? '✅' : '❌'}`);
        console.log(`   - Длина контента: ${contentInfo.contentLength} символов`);
        console.log(`   - Секций: ${contentInfo.sectionsCount}`);
        console.log(`   - data-cms-loaded: ${contentInfo.hasCMSLoaded ? '✅' : '❌'}`);
        console.log(`   - Общая длина HTML: ${contentInfo.htmlLength} символов`);
        
        // Пытаемся загрузить страницу через API вручную
        if (strapiApiExists) {
            console.log(`\n🔍 Тестирую загрузку через API...\n`);
            const apiResult = await page.evaluate(async (slug) => {
                try {
                    const pageData = await window.StrapiAPI.getPage(slug);
                    return {
                        success: true,
                        hasData: !!pageData,
                        hasContent: !!(pageData?.data?.content || pageData?.content),
                        contentLength: (pageData?.data?.content || pageData?.content || '').length
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }, TEST_SLUG);
            
            console.log(`   Результат API запроса:`);
            if (apiResult.success) {
                console.log(`   ✅ API запрос выполнен`);
                console.log(`   - Данные получены: ${apiResult.hasData ? '✅' : '❌'}`);
                console.log(`   - Контент есть: ${apiResult.hasContent ? '✅' : '❌'}`);
                console.log(`   - Длина контента: ${apiResult.contentLength} символов`);
            } else {
                console.log(`   ❌ Ошибка API: ${apiResult.error}`);
            }
        }
        
        console.log(`\n⏳ Ожидание 3 секунды для просмотра логов...\n`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
    } catch (error) {
        console.error(`\n❌ Ошибка: ${error.message}`);
    } finally {
        console.log(`\n🔚 Закрываю браузер...\n`);
        await browser.close();
    }
}

if (require.main === module) {
    debugStrapiAPI().catch(error => {
        console.error('\n❌ Критическая ошибка:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { debugStrapiAPI };

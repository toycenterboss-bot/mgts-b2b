const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://business.mgts.ru';
const OUTPUT_DIR = path.join(__dirname, '../../temp/services-extraction/pages-content');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');

// Список дополнительных страниц для сбора
const ADDITIONAL_PAGES = [
  '/',
  '/operators/all_services',
  '/government/all_services',
  '/developers/all_services',
  '/business/all_services',
  '/licenses',
  '/offers',
  '/forms_doc',
  '/operinfo',
  '/wca',
  '/stockholder_copies_document',
  '/timing_malfunctions',
  '/data_processing',
  '/labor_safety',
  '/company/investors/stockholder/translation2019/',
  '/company/investors/stockholder/translation2017/',
  '/company/investors/stockholder/translation/',
  '/partners/creating_work_order',
  // Новости (из списка найденных ссылок)
  '/news/aaa4c17b-30c7-4ae2-bea2-c1a3cd1aa54f',
  '/news/78eefe6b-844c-4be4-8e93-1c13f0f61bff',
  '/news/15cd2f80-a6f0-4c21-9131-32a6561754d8',
  '/news/e4029016-0a2a-45f6-90a8-e157842a7c3a',
  '/news/2db8eaab-50e6-4f55-bd4b-f2b2d53bbbf5',
  '/news/4381279f-4de4-403c-9f9b-c63598e26991',
  '/news/f8f40002-c329-4064-97d5-07a9790dcc91',
  '/news/93779b5f-a05d-4c89-a13c-2ec3a5613d2d',
  '/news/707301f0-66e9-4336-92e1-d5709744b0b1',
  '/news/209e326f-60fb-410d-8fc6-aa555e60894e',
];

// Загружаем индекс уже собранных страниц
let collectedUrls = new Set();
if (fs.existsSync(INDEX_FILE)) {
  try {
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    // Проверяем разные форматы индекса
    if (index.results) {
      index.results.forEach(page => {
        if (page.url) {
          collectedUrls.add(page.url);
        }
      });
    } else if (index.pages) {
      index.pages.forEach(page => {
        if (page.url) {
          collectedUrls.add(page.url);
        }
      });
    }
  } catch (e) {
    console.error('Ошибка при загрузке индекса:', e.message);
  }
}

// Также загружаем URL из всех JSON файлов в директории
if (fs.existsSync(OUTPUT_DIR)) {
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
  files.forEach(file => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8'));
      if (data.url) {
        collectedUrls.add(data.url);
      }
    } catch (e) {
      // Пропускаем ошибки
    }
  });
}

async function extractPageContent(page, url) {
  try {
    console.log(`📄 Загрузка: ${url}`);
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Ждем загрузки контента
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pageData = await page.evaluate((baseUrl) => {
      // Извлекаем метаданные
      const title = document.title || '';
      const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
      const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
      
      // Определяем slug из URL
      const urlPath = new URL(window.location.href).pathname;
      const slug = urlPath === '/' ? 'home' : urlPath.replace(/^\//, '').replace(/\//g, '_').replace(/\/$/, '');
      
      // Определяем секцию из URL
      let section = 'home';
      if (urlPath.startsWith('/business')) section = 'business';
      else if (urlPath.startsWith('/operators')) section = 'operators';
      else if (urlPath.startsWith('/government')) section = 'government';
      else if (urlPath.startsWith('/developers')) section = 'developers';
      else if (urlPath.startsWith('/partners')) section = 'partners';
      else if (urlPath.startsWith('/news')) section = 'news';
      else if (urlPath.startsWith('/about_mgts') || urlPath.startsWith('/mgts_')) section = 'about_mgts';
      else if (urlPath.startsWith('/contact')) section = 'contacts';
      
      // Извлекаем основной контент
      const mainContent = document.querySelector('.container-mgts, main, article, .page-content, .content');
      const contentHTML = mainContent ? mainContent.innerHTML : document.body.innerHTML;
      
      // Извлекаем полный HTML
      const fullHTML = document.documentElement.outerHTML;
      
      // Извлекаем H1
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      
      // Извлекаем H2
      const h2Elements = Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).filter(Boolean);
      
      // Извлекаем изображения
      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src.startsWith('http') ? img.src : new URL(img.src, baseUrl).href,
        alt: img.alt || '',
        title: img.title || ''
      }));
      
      // Извлекаем ссылки
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => {
        const href = a.getAttribute('href');
        return {
          href: href.startsWith('http') ? href : new URL(href, baseUrl).href,
          text: a.textContent?.trim() || '',
          title: a.title || ''
        };
      });
      
      return {
        url: window.location.href,
        title,
        slug,
        section,
        content: {
          html: contentHTML,
          title,
          metaDescription,
          metaKeywords,
          h1,
          h2: h2Elements,
          images,
          links
        },
        fullHTML
      };
    }, BASE_URL);

    pageData.extractedAt = new Date().toISOString();

    // Сохраняем в файл
    const filename = `${pageData.slug || 'page'}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(pageData, null, 2), 'utf-8');

    console.log(`✅ Сохранено: ${filename}`);
    return { success: true, data: pageData };
  } catch (error) {
    console.error(`❌ Ошибка при извлечении ${url}:`, error.message);
    return { success: false, url, error: error.message };
  }
}

async function main() {
  console.log('🚀 Начало извлечения дополнительных страниц');
  console.log('='.repeat(70));
  console.log(`Всего страниц для проверки: ${ADDITIONAL_PAGES.length}`);
  console.log('');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const results = [];
  let successCount = 0;
  let skipCount = 0;

  for (const pagePath of ADDITIONAL_PAGES) {
    const fullUrl = BASE_URL + pagePath;
    
    // Пропускаем уже собранные страницы
    if (collectedUrls.has(fullUrl)) {
      console.log(`⏭️  Пропущено (уже собрано): ${fullUrl}`);
      skipCount++;
      continue;
    }

    const result = await extractPageContent(page, fullUrl);
    results.push(result);
    
    if (result.success) {
      successCount++;
      collectedUrls.add(fullUrl);
    }

    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await browser.close();

  // Обновляем индекс (сохраняем в формате, совместимом с extract-missing-pages.js)
  const index = {
    totalPages: collectedUrls.size,
    lastUpdated: new Date().toISOString(),
    results: Array.from(collectedUrls).map(url => ({ url }))
  };
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');

  console.log('');
  console.log('='.repeat(70));
  console.log('📊 ИТОГИ:');
  console.log(`✅ Успешно собрано: ${successCount}`);
  console.log(`⏭️  Пропущено (уже собрано): ${skipCount}`);
  console.log(`❌ Ошибок: ${results.filter(r => !r.success).length}`);
  console.log(`📁 Всего страниц в индексе: ${collectedUrls.size}`);
  console.log('');

  // Сохраняем отчет об ошибках
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    const failedFile = path.join(__dirname, '../../temp/services-extraction/additional-failed-pages.json');
    fs.writeFileSync(failedFile, JSON.stringify(failed, null, 2), 'utf-8');
    console.log(`📝 Отчет об ошибках сохранен: additional-failed-pages.json`);
  }
}

main().catch(console.error);

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
  console.log('Начинаем пересборку...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Загружаем страницу...');
  await page.goto('https://business.mgts.ru/developers/connecting_objects/connecting_construction', { waitUntil: 'networkidle2' });
  console.log('Страница загружена\n');
  
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: path.join(os.homedir(), 'Downloads')
  });
  
  console.log('Раскрываем аккордеоны...');
  await page.evaluate(async () => {
    const buttons = Array.from(document.querySelectorAll('button[aria-expanded], [class*="accordion"], [class*="collapse"]'));
    console.log(`Найдено ${buttons.length} кнопок`);
    for (const btn of buttons) {
      if (btn.getAttribute('aria-expanded') !== 'true') {
        btn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  });
  console.log('Аккордеоны раскрыты\n');
  
  console.log('Ищем файлы...');
  const files = await page.evaluate(() => {
    const result = [];
    const links = Array.from(document.querySelectorAll('a[href]'));
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      const text = (link.textContent || '').trim();
      if (href && /\.(doc|docx|pdf)$/i.test(href)) {
        let absHref = href.startsWith('/') ? `https://business.mgts.ru${href}` : 
                      href.startsWith('http') ? href : `https://business.mgts.ru/${href}`;
        result.push({ text, href: absHref });
      }
    });
    return result;
  });
  
  console.log(`Найдено ${files.length} файлов:`);
  files.forEach((f, i) => console.log(`  ${i+1}. ${f.text}`));
  console.log('');
  
  const targetDir = path.join(__dirname, '../temp/page-analysis-llm/connecting_construction_files');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  const extracted = {};
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[${i+1}/${files.length}] Скачиваем: ${file.text.substring(0, 50)}...`);
    
    const before = new Set(fs.readdirSync(downloadsDir));
    await page.goto(file.href, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const after = fs.readdirSync(downloadsDir);
    const newFiles = after.filter(f => !before.has(f) && /\.(docx?|pdf)$/i.test(f));
    
    if (newFiles.length > 0) {
      const downloaded = newFiles[0];
      const safeName = downloaded.replace(/[^a-zA-Z0-9._-]/g, '_');
      const source = path.join(downloadsDir, downloaded);
      const target = path.join(targetDir, safeName);
      
      if (fs.existsSync(source)) {
        fs.renameSync(source, target);
        extracted[file.text] = {
          localPath: `connecting_construction_files/${safeName}`,
          fileName: safeName,
          fileType: 'docx',
          href: file.href
        };
        console.log(`  ✓ Сохранен: ${safeName}\n`);
      }
    } else {
      console.log(`  ⚠️  Не скачан\n`);
    }
    
    if (i < files.length - 1) {
      await page.goto('https://business.mgts.ru/developers/connecting_objects/connecting_construction', { waitUntil: 'networkidle2' });
      await page.evaluate(async () => {
        const buttons = Array.from(document.querySelectorAll('button[aria-expanded], [class*="accordion"]'));
        for (const btn of buttons) {
          if (btn.getAttribute('aria-expanded') !== 'true') {
            btn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      });
    }
  }
  
  await browser.close();
  
  const linksPath = path.join(__dirname, '../temp/page-analysis-llm/connecting_construction_extracted_file_links.json');
  fs.writeFileSync(linksPath, JSON.stringify(extracted, null, 2));
  
  const finalFiles = fs.readdirSync(targetDir).filter(f => !f.startsWith('.'));
  console.log(`\n✅ Готово! Скачано ${finalFiles.length} файлов:`);
  finalFiles.forEach(f => console.log(`  - ${f}`));
})();

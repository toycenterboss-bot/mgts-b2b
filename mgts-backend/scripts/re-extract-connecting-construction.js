const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔄 ПЕРЕСБОРКА ДАННЫХ ДЛЯ connecting_construction');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('📥 Шаг 1: Загрузка страницы...');
    await page.goto('https://business.mgts.ru/developers/connecting_objects/connecting_construction', { waitUntil: 'networkidle2' });
    console.log('   ✓ Страница загружена\n');
    
    // Настраиваем загрузку файлов
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: path.join(os.homedir(), 'Downloads')
    });
    
    // Раскрываем все аккордеоны
    console.log('📂 Шаг 2: Раскрываем аккордеоны...');
    const accordionsInfo = await page.evaluate(async () => {
      let openedCount = 0;
      const accordionButtons = Array.from(document.querySelectorAll(
        'button[aria-expanded], ' +
        '[class*="accordion"], ' +
        '[class*="collapse"], ' +
        '[data-toggle="collapse"]'
      ));
      
      const buttonsInfo = [];
      
      for (let i = 0; i < accordionButtons.length; i++) {
        const btn = accordionButtons[i];
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        const isCollapsed = btn.classList.contains('collapsed');
        const btnText = (btn.textContent || '').trim().substring(0, 40);
        
        if (!isExpanded || isCollapsed) {
          try {
            btn.click();
            openedCount++;
            buttonsInfo.push({ index: i+1, total: accordionButtons.length, text: btnText, action: 'opened' });
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (e) {
            buttonsInfo.push({ index: i+1, total: accordionButtons.length, text: btnText, action: 'error', error: e.message });
          }
        } else {
          buttonsInfo.push({ index: i+1, total: accordionButtons.length, text: btnText, action: 'already_open' });
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { openedCount, totalButtons: accordionButtons.length, buttonsInfo };
    });
    
    console.log(`   Найдено кнопок аккордеонов: ${accordionsInfo.totalButtons}`);
    accordionsInfo.buttonsInfo.forEach(info => {
      if (info.action === 'opened') {
        console.log(`   [${info.index}/${info.total}] ✓ Раскрыт: "${info.text}..."`);
      } else if (info.action === 'already_open') {
        console.log(`   [${info.index}/${info.total}] → Уже открыт: "${info.text}..."`);
      } else if (info.action === 'error') {
        console.log(`   [${info.index}/${info.total}] ⚠️  Ошибка: "${info.text}..." - ${info.error}`);
      }
    });
    console.log(`   ✓ Раскрыто аккордеонов: ${accordionsInfo.openedCount} из ${accordionsInfo.totalButtons}\n`);
    
    // Ищем все файлы на странице
    console.log('🔍 Шаг 3: Ищем файлы на странице...');
    const searchResult = await page.evaluate(() => {
      const files = [];
      const links = Array.from(document.querySelectorAll('a[href], [class*="file"], button[class*="file"]'));
      
      links.forEach((link, index) => {
        const href = link.getAttribute('href') || '';
        const text = (link.textContent || '').trim();
        
        // Проверяем по href
        if (href && /\.(doc|docx|pdf|xls|xlsx|zip)$/i.test(href)) {
          let absoluteHref = href;
          if (href.startsWith('/')) {
            absoluteHref = `https://business.mgts.ru${href}`;
          } else if (!href.startsWith('http')) {
            absoluteHref = `https://business.mgts.ru/${href}`;
          }
          
          const alreadyAdded = files.some(f => f.href === absoluteHref || f.text === text);
          if (!alreadyAdded && text && text.length > 0) {
            files.push({
              text: text,
              href: absoluteHref,
              elementIndex: index
            });
          }
        }
        // Проверяем по тексту (для элементов без href, но с текстом файла)
        else if (text && (text.includes('.doc') || text.includes('.docx') || text.includes('.pdf'))) {
          const alreadyAdded = files.some(f => f.text === text);
          if (!alreadyAdded) {
            files.push({
              text: text,
              href: '',
              elementIndex: index,
              needsClick: true
            });
          }
        }
      });
      
      return { files, totalLinks: links.length };
    });
    
    console.log(`   Проверено элементов: ${searchResult.totalLinks}`);
    console.log(`   ✓ Найдено файлов: ${searchResult.files.length}`);
    searchResult.files.forEach((f, i) => {
      const status = f.href ? '✓' : '⚠️';
      console.log(`      ${i+1}. ${status} ${f.text.substring(0, 70)}${f.text.length > 70 ? '...' : ''}`);
      if (f.href) {
        console.log(`         URL: ${f.href.substring(0, 80)}...`);
      } else {
        console.log(`         Требуется клик по элементу`);
      }
    });
    console.log('');
    
    const filesToProcess = searchResult.files;
    
    // Скачиваем файлы
    console.log('📥 Шаг 4: Скачиваем файлы...\n');
    const targetDir = path.join(__dirname, '../temp/page-analysis-llm/connecting_construction_files');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`   ✓ Создана папка: ${targetDir}\n`);
    }
    
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const extractedFileLinks = {};
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const progress = `[${i+1}/${filesToProcess.length}]`;
      
      try {
        console.log(`${progress} Обрабатываем: "${file.text.substring(0, 60)}..."`);
        
        if (file.href) {
          // Файл с прямой ссылкой
          console.log(`   → Открываем URL: ${file.href.substring(0, 70)}...`);
          const filesBefore = new Set(fs.readdirSync(downloadsDir));
          
          await page.goto(file.href, { waitUntil: 'networkidle2', timeout: 30000 });
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const filesAfter = fs.readdirSync(downloadsDir);
          const newFiles = filesAfter.filter(f => !filesBefore.has(f) && (f.endsWith('.docx') || f.endsWith('.doc') || f.endsWith('.pdf')));
          
          if (newFiles.length > 0) {
            const downloadedFile = newFiles[0];
            const safeFileName = downloadedFile
              .replace(/[^a-zA-Z0-9._-]/g, '_')
              .replace(/_+/g, '_');
            const sourcePath = path.join(downloadsDir, downloadedFile);
            const targetPath = path.join(targetDir, safeFileName);
            
            if (fs.existsSync(sourcePath)) {
              fs.renameSync(sourcePath, targetPath);
              extractedFileLinks[file.text] = {
                localPath: `connecting_construction_files/${safeFileName}`,
                fileName: safeFileName,
                fileType: file.href.match(/\.([^.]+)$/i)?.[1]?.toLowerCase() || 'unknown',
                href: file.href,
                title: ''
              };
              console.log(`   ✓ Файл скачан и сохранен: ${safeFileName}`);
            }
          } else {
            console.log(`   ⚠️  Файл не был скачан автоматически`);
          }
        } else if (file.needsClick) {
          // Файл требует клика по элементу
          console.log(`   → Кликаем по элементу для скачивания...`);
          const filesBefore = new Set(fs.readdirSync(downloadsDir));
          
          const clicked = await page.evaluate((elementIndex) => {
            const links = Array.from(document.querySelectorAll('a[href], [class*="file"], button[class*="file"]'));
            if (links[elementIndex]) {
              links[elementIndex].click();
              return true;
            }
            return false;
          }, file.elementIndex);
          
          if (clicked) {
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            const filesAfter = fs.readdirSync(downloadsDir);
            const newFiles = filesAfter.filter(f => !filesBefore.has(f) && (f.endsWith('.docx') || f.endsWith('.doc') || f.endsWith('.pdf')));
            
            if (newFiles.length > 0) {
              const downloadedFile = newFiles[0];
              const safeFileName = downloadedFile
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .replace(/_+/g, '_');
              const sourcePath = path.join(downloadsDir, downloadedFile);
              const targetPath = path.join(targetDir, safeFileName);
              
              if (fs.existsSync(sourcePath)) {
                fs.renameSync(sourcePath, targetPath);
                extractedFileLinks[file.text] = {
                  localPath: `connecting_construction_files/${safeFileName}`,
                  fileName: safeFileName,
                  fileType: 'docx',
                  href: '',
                  title: ''
                };
                console.log(`   ✓ Файл скачан и сохранен: ${safeFileName}`);
              }
            } else {
              console.log(`   ⚠️  Файл не был скачан после клика`);
            }
          } else {
            console.log(`   ⚠️  Не удалось кликнуть по элементу`);
          }
        }
        
        // Возвращаемся на страницу и снова раскрываем аккордеоны
        if (i < filesToProcess.length - 1) {
          console.log(`   → Возвращаемся на страницу...`);
          await page.goto('https://business.mgts.ru/developers/connecting_objects/connecting_construction', { waitUntil: 'networkidle2' });
          await page.evaluate(async () => {
            const accordionButtons = Array.from(document.querySelectorAll('button[aria-expanded], [class*="accordion"], [class*="collapse"]'));
            for (const btn of accordionButtons) {
              if (btn.getAttribute('aria-expanded') !== 'true') {
                btn.click();
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          });
        }
        console.log('');
        
      } catch (e) {
        console.log(`   ❌ Ошибка: ${e.message}\n`);
      }
    }
    
    await browser.close();
    
    // Сохраняем extracted_file_links.json
    console.log('💾 Шаг 5: Сохраняем данные...');
    const extractedLinksPath = path.join(__dirname, '../temp/page-analysis-llm/connecting_construction_extracted_file_links.json');
    fs.writeFileSync(extractedLinksPath, JSON.stringify(extractedFileLinks, null, 2), 'utf-8');
    console.log(`   ✓ Данные сохранены в: ${extractedLinksPath}\n`);
    
    // Проверяем результат
    const finalFiles = fs.readdirSync(targetDir).filter(f => !f.startsWith('.'));
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ РЕЗУЛЬТАТЫ ПЕРЕСБОРКИ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📁 Скачано файлов: ${finalFiles.length}`);
    if (finalFiles.length > 0) {
      finalFiles.forEach((f, i) => {
        console.log(`   ${i+1}. ${f}`);
      });
    } else {
      console.log('   ⚠️  Файлы не найдены');
    }
    console.log(`\n📄 Извлечено ссылок: ${Object.keys(extractedFileLinks).length}`);
    Object.keys(extractedFileLinks).forEach((text, i) => {
      console.log(`   ${i+1}. ${text.substring(0, 60)}...`);
      console.log(`      → ${extractedFileLinks[text].localPath}`);
    });
    console.log('\n✅ Пересборка завершена!');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

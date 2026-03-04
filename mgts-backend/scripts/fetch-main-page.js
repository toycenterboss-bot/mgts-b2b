/**
 * Скрипт для получения главной страницы с business.mgts.ru
 * и сохранения в файл для дальнейшей обработки
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://business.mgts.ru';
const OUTPUT_FILE = path.join(__dirname, '../../main_page_from_site.html');

https.get(URL, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    fs.writeFileSync(OUTPUT_FILE, data, 'utf-8');
    console.log(`✅ HTML сохранен в: ${OUTPUT_FILE}`);
    console.log(`📊 Размер: ${(data.length / 1024).toFixed(2)} KB`);
  });
}).on('error', (err) => {
  console.error('❌ Ошибка при получении страницы:', err.message);
  process.exit(1);
});




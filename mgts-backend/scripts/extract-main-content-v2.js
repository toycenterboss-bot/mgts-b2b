/**
 * Улучшенный скрипт для извлечения основного контента из HTML главной страницы
 * Использует более точное извлечение контента
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../../main_page_from_site.html');
const OUTPUT_FILE = path.join(__dirname, '../../main_page_content.html');

function extractMainContent(html) {
  // Удаляем скрипты
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  // Удаляем стили
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  
  // Удаляем комментарии
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  
  // Ищем основной контент
  // Вариант 1: Ищем <main>
  let mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return mainMatch[1];
  }
  
  // Вариант 2: Ищем контент внутри body, но без header/footer
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    let bodyContent = bodyMatch[1];
    
    // Удаляем header (включая вложенные)
    bodyContent = bodyContent.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    
    // Удаляем footer (включая вложенные)
    bodyContent = bodyContent.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    
    // Удаляем nav (навигацию)
    bodyContent = bodyContent.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    
    // Удаляем элементы с классами header, footer, navigation
    bodyContent = bodyContent.replace(/<[^>]*class="[^"]*\b(header|footer|navigation|nav)\b[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '');
    
    // Удаляем элементы с id header, footer, navigation
    bodyContent = bodyContent.replace(/<[^>]*id="[^"]*\b(header|footer|navigation|nav)\b[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '');
    
    return bodyContent;
  }
  
  return html;
}

function cleanContent(content) {
  // Удаляем пустые строки
  content = content.replace(/^\s*[\r\n]/gm, '');
  
  // Удаляем множественные пробелы (но сохраняем структуру)
  content = content.replace(/[ \t]+/g, ' ');
  
  // Удаляем пустые теги
  content = content.replace(/<(\w+)[^>]*>\s*<\/\1>/gi, '');
  
  // Обновляем пути к изображениям
  content = content.replace(/src="\/images\//g, 'src="images/');
  content = content.replace(/src="\/img\//g, 'src="images/');
  content = content.replace(/src="\/assets\//g, 'src="images/');
  
  // Обновляем пути в href (относительные)
  content = content.replace(/href="\/([^\/])/g, 'href="$1');
  
  // Удаляем inline стили (опционально, можно закомментировать если нужны)
  // content = content.replace(/\s+style="[^"]*"/gi, '');
  
  // Удаляем data-атрибуты которые могут быть специфичными
  content = content.replace(/\s+data-[^=]*="[^"]*"/gi, '');
  
  // Удаляем onclick и другие event handlers
  content = content.replace(/\s+on\w+="[^"]*"/gi, '');
  
  return content.trim();
}

function main() {
  console.log('[Extract] Чтение HTML файла...');
  const html = fs.readFileSync(INPUT_FILE, 'utf-8');
  
  console.log('[Extract] Извлечение основного контента...');
  let content = extractMainContent(html);
  
  console.log('[Extract] Очистка контента...');
  content = cleanContent(content);
  
  console.log('[Extract] Сохранение результата...');
  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  
  console.log(`✅ Контент сохранен в: ${OUTPUT_FILE}`);
  console.log(`📊 Размер: ${(content.length / 1024).toFixed(2)} KB`);
  console.log(`📝 Первые 1000 символов:`);
  console.log(content.substring(0, 1000));
  console.log(`\n📝 Последние 500 символов:`);
  console.log(content.substring(Math.max(0, content.length - 500)));
}

main();




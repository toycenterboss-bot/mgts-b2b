/**
 * Скрипт для извлечения основного контента из HTML главной страницы
 * Удаляет header, footer, скрипты, стили и оставляет только контент
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
  
  // Ищем основной контент - обычно это <main> или контент внутри body
  // Попробуем найти main или section с контентом
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return mainMatch[1];
  }
  
  // Если нет main, ищем контент между header и footer
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    let bodyContent = bodyMatch[1];
    
    // Удаляем header
    bodyContent = bodyContent.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    
    // Удаляем footer
    bodyContent = bodyContent.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    
    // Удаляем nav (навигацию)
    bodyContent = bodyContent.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    
    return bodyContent;
  }
  
  return html;
}

function cleanContent(content) {
  // Удаляем пустые строки
  content = content.replace(/^\s*[\r\n]/gm, '');
  
  // Удаляем множественные пробелы
  content = content.replace(/\s{2,}/g, ' ');
  
  // Удаляем атрибуты data-* которые могут быть специфичными для исходного сайта
  content = content.replace(/\s+data-[^=]*="[^"]*"/gi, '');
  
  // Обновляем пути к изображениям (если они относительные)
  content = content.replace(/src="\/images\//g, 'src="images/');
  content = content.replace(/src="\/img\//g, 'src="images/');
  
  // Обновляем пути к CSS (удаляем, так как стили будут из проекта)
  content = content.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
  
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
  console.log(`📝 Первые 500 символов:`);
  console.log(content.substring(0, 500));
}

main();




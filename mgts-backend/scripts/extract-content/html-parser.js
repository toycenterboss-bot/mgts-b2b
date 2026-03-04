const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class HTMLParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.html = fs.readFileSync(filePath, 'utf-8');
    this.dom = new JSDOM(this.html);
    this.document = this.dom.window.document;
  }
  
  extractSlug() {
    // Определить корень сайта
    const siteRoot = process.env.SITE_ROOT || 
      (() => {
        let currentDir = __dirname;
        while (currentDir !== path.dirname(currentDir)) {
          const siteDir = path.join(currentDir, '..', '..', '..', 'SiteMGTS');
          if (fs.existsSync(siteDir)) {
            return siteDir;
          }
          currentDir = path.dirname(currentDir);
        }
        return path.join(__dirname, '../../SiteMGTS');
      })();
    
    const relativePath = path.relative(siteRoot, this.filePath);
    let slug = relativePath.replace(/\/index\.html$/, '').replace(/\\/g, '/');
    
    // Если slug пустой, значит это главная страница
    if (!slug || slug === 'index.html') {
      slug = 'index';
    }
    
    return slug;
  }
  
  extractTitle() {
    const titleEl = this.document.querySelector('title');
    return titleEl ? titleEl.textContent.trim() : '';
  }
  
  extractMeta() {
    return {
      description: this.document.querySelector('meta[name="description"]')?.content || '',
      keywords: this.document.querySelector('meta[name="keywords"]')?.content || ''
    };
  }
  
  extractHero() {
    const hero = this.document.querySelector('.hero');
    if (!hero) return null;
    
    const heroTitle = hero.querySelector('h1')?.textContent.trim() || '';
    const heroSubtitle = hero.querySelector('p')?.textContent.trim() || '';
    
    // Если нет данных, возвращаем null
    if (!heroTitle && !heroSubtitle) return null;
    
    return {
      title: heroTitle,
      subtitle: heroSubtitle,
      backgroundImage: null, // Можно извлечь из стилей если нужно
      ctaButtons: Array.from(hero.querySelectorAll('a.btn')).map(btn => ({
        text: btn.textContent.trim(),
        href: btn.getAttribute('href') || '',
        style: btn.className.includes('btn-primary') ? 'primary' : 
               btn.className.includes('btn-outline') ? 'outline' : 'secondary'
      }))
    };
  }
  
  extractBreadcrumbs() {
    const breadcrumbs = this.document.querySelector('.breadcrumbs-list, .breadcrumbs');
    if (!breadcrumbs) return [];
    
    return Array.from(breadcrumbs.querySelectorAll('.breadcrumbs-item, li')).map(item => {
      const link = item.querySelector('a');
      return {
        name: (link || item).textContent.trim() || '',
        url: link ? link.getAttribute('href') : null
      };
    }).filter(item => item.name);
  }
  
  extractSections() {
    const sections = [];
    const sectionElements = this.document.querySelectorAll('section.section, section');
    
    sectionElements.forEach(section => {
      const sectionType = this.detectSectionType(section);
      const sectionTitle = section.querySelector('h2, h3, .section-title')?.textContent.trim() || '';
      
      // Пропускаем пустые секции
      if (!sectionTitle && !section.textContent.trim()) return;
      
      const sectionData = {
        type: sectionType,
        title: sectionTitle,
        content: this.extractSectionContent(section, sectionType),
        backgroundColor: this.extractBackgroundColor(section)
      };
      
      sections.push(sectionData);
    });
    
    return sections;
  }
  
  detectSectionType(section) {
    if (section.querySelector('.card, .service-card')) return 'cards';
    if (section.querySelector('.grid')) return 'grid';
    if (section.querySelector('table')) return 'table';
    return 'text';
  }

  /**
   * Извлечь ссылки на файлы из элемента
   */
  extractFileLinksFromElement(element) {
    const fileLinks = [];
    const fileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar', 'txt', 'csv', 'xml', 'json', 'pptx', 'ppt', 'odt', 'ods'];
    
    // Находим все ссылки на файлы
    const links = element.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Проверяем, является ли ссылка файлом
      const ext = path.extname(href).toLowerCase().replace('.', '');
      if (fileExtensions.includes(ext)) {
        const linkText = link.textContent.trim();
        // Извлекаем текст из span.file-name, если есть
        const fileNameSpan = link.querySelector('.file-name, .file-item__section-info .file-text-box .file-name');
        const actualText = fileNameSpan ? fileNameSpan.textContent.trim() : linkText;
        
        fileLinks.push({
          href: href,
          text: actualText || linkText,
          element: link,
          rawText: linkText
        });
      }
    });
    
    return fileLinks;
  }

  /**
   * Нормализовать контент с сохранением ссылок на файлы
   */
  normalizeContentWithFileLinks(htmlContent, parentElement) {
    // 1. Извлекаем все ссылки на файлы
    const fileLinks = this.extractFileLinksFromElement(parentElement);
    
    if (fileLinks.length === 0) {
      return htmlContent;
    }
    
    // 2. Для каждой ссылки проверяем, есть ли она в HTML контенте
    let normalizedContent = htmlContent;
    
    fileLinks.forEach(link => {
      const linkText = link.text;
      const rawText = link.rawText;
      
      // Если текст ссылки есть в контенте, но самой ссылки нет - добавляем её
      // Проверяем разными способами, так как текст может быть в разных местах
      const textVariants = [
        linkText,
        rawText,
        linkText.replace(/\s+/g, ' ').trim(),
        rawText.replace(/\s+/g, ' ').trim()
      ].filter(t => t && t.length > 0);
      
      let linkAdded = false;
      
      for (const text of textVariants) {
        // Экранируем специальные символы для regex
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Если текст есть, но ссылки нет - заменяем текст на ссылку
        if (normalizedContent.includes(text) && !normalizedContent.includes(link.href)) {
          // Пробуем найти текст и заменить на ссылку
          // Ищем паттерны: текст, текст в тегах, текст с пробелами вокруг
          const patterns = [
            new RegExp(`(>|\\s|^)(${escapedText})(<|\\s|$)`, 'gi'),
            new RegExp(`(${escapedText})`, 'gi')
          ];
          
          for (const pattern of patterns) {
            if (pattern.test(normalizedContent)) {
              normalizedContent = normalizedContent.replace(
                pattern,
                (match, before, textMatch, after) => {
                  // Убеждаемся, что это не часть уже существующей ссылки
                  const context = normalizedContent.substring(
                    Math.max(0, normalizedContent.indexOf(match) - 20),
                    Math.min(normalizedContent.length, normalizedContent.indexOf(match) + match.length + 20)
                  );
                  if (context.includes('<a') && context.includes('href')) {
                    return match; // Уже есть ссылка, не заменяем
                  }
                  linkAdded = true;
                  return `${before || ''}<a href="${link.href}" data-file-link="true">${textMatch || match}</a>${after || ''}`;
                }
              );
              if (linkAdded) break;
            }
          }
          
          if (linkAdded) break;
        }
      }
      
      // Если ссылки вообще нет в контенте - добавляем в конец (для случаев, когда файлы в отдельных контейнерах)
      if (!linkAdded && !normalizedContent.includes(link.href)) {
        normalizedContent += ` <a href="${link.href}" data-file-link="true">${linkText || rawText}</a>`;
      }
    });
    
    return normalizedContent;
  }
  
  extractSectionContent(section, type) {
    if (type === 'text') {
      // Для текстовых секций извлекаем HTML контент
      let content = section.innerHTML;
      
      // Нормализуем контент с сохранением ссылок на файлы
      content = this.normalizeContentWithFileLinks(content, section);
      
      // Удаляем заголовки и пустые элементы
      return content.replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '').trim();
    } else if (type === 'cards') {
      // Для секций с карточками
      const cards = [];
      section.querySelectorAll('.card, .service-card').forEach(card => {
        cards.push({
          title: card.querySelector('h3, .card-title')?.textContent.trim() || '',
          description: card.querySelector('p, .card-body')?.textContent.trim() || '',
          link: card.querySelector('a')?.getAttribute('href') || null
        });
      });
      return { cards };
    } else if (type === 'grid') {
      // Для сеток
      const items = [];
      section.querySelectorAll('.grid > *, .grid-item').forEach(item => {
        items.push({
          title: item.querySelector('h3, h4')?.textContent.trim() || '',
          content: item.textContent.trim()
        });
      });
      return { items };
    } else if (type === 'table') {
      // Для таблиц
      const table = section.querySelector('table');
      if (!table) return null;
      
      const rows = [];
      table.querySelectorAll('tr').forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('td, th')).map(cell => cell.textContent.trim());
        if (cells.length > 0) rows.push(cells);
      });
      return { tableData: rows };
    }
    
    return null;
  }
  
  extractBackgroundColor(section) {
    const style = section.getAttribute('style') || '';
    const match = style.match(/background-color:\s*([^;]+)/);
    return match ? match[1].trim() : null;
  }
  
  extractSidebar() {
    return this.document.querySelector('[data-component="sidebar-about"]') ? 'about' : 'none';
  }
  
  parse() {
    try {
      return {
        slug: this.extractSlug(),
        title: this.extractTitle(),
        metaDescription: this.extractMeta().description,
        metaKeywords: this.extractMeta().keywords,
        heroTitle: this.extractHero()?.title || null,
        heroSubtitle: this.extractHero()?.subtitle || null,
        content: this.extractSections().map(s => {
          if (s.type === 'text') {
            return { type: 'text', content: s.content, title: s.title };
          } else if (s.type === 'cards') {
            return { type: 'cards', cards: s.content.cards, title: s.title };
          } else if (s.type === 'grid') {
            return { type: 'grid', items: s.content.items, title: s.title };
          } else if (s.type === 'table') {
            return { type: 'table', tableData: s.content.tableData, title: s.title };
          }
          return null;
        }).filter(Boolean),
        breadcrumbs: this.extractBreadcrumbs(),
        sidebar: this.extractSidebar()
      };
    } catch (error) {
      console.error(`Ошибка при парсинге ${this.filePath}:`, error.message);
      return null;
    }
  }
}

// Проверка наличия inventory.json
const inventoryPath = path.join(__dirname, 'inventory.json');
if (!fs.existsSync(inventoryPath)) {
  console.error('\n❌ Ошибка: Файл inventory.json не найден!');
  console.error('Сначала запустите скрипт инвентаризации:');
  console.error('  node inventory.js\n');
  process.exit(1);
}

console.log('\n📄 Извлечение контента из HTML файлов...\n');

// Загрузить инвентаризацию
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

console.log(`Найдено страниц для обработки: ${inventory.length}\n`);

// Парсить каждую страницу
let processed = 0;
let errors = 0;

const parsedContent = inventory.map((file, index) => {
  process.stdout.write(`\rОбработка: ${index + 1}/${inventory.length}...`);
  
  try {
    const parser = new HTMLParser(file.path);
    const result = parser.parse();
    
    if (result) {
      processed++;
      return result;
    } else {
      errors++;
      return null;
    }
  } catch (error) {
    console.error(`\nОшибка при обработке ${file.path}:`, error.message);
    errors++;
    return null;
  }
}).filter(Boolean);

process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Очистить строку прогресса

// Сохранить результаты
const outputPath = path.join(__dirname, 'parsed-content.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(parsedContent, null, 2)
);

console.log(`✅ Извлечение завершено!`);
console.log(`\n📊 Результаты:`);
console.log(`   - Обработано страниц: ${processed}`);
console.log(`   - Ошибок: ${errors}`);
console.log(`   - Результаты сохранены в: ${outputPath}`);
console.log('');






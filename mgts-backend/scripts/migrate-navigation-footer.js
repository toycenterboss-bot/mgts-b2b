/**
 * Скрипт миграции меню и футера из статических файлов в Strapi
 * 
 * Запуск:
 *   node scripts/migrate-navigation-footer.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Пути к статическим файлам
const headerPath = path.join(__dirname, '../../SiteMGTS/components/header.html');
const footerPath = path.join(__dirname, '../../SiteMGTS/components/footer.html');

/**
 * Парсинг HTML и извлечение данных меню (упрощенная версия без cheerio)
 */
function parseHeaderHTML(html) {
  const navigation = {
    logo: null,
    logoAlt: 'МГТС',
    phone: '+78002500250',
    phoneDisplay: '8 800 250-0-250',
    mainMenuItems: [],
    megaMenus: []
  };
  
  // Логотип
  const logoMatch = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/i);
  if (logoMatch) {
    navigation.logo = logoMatch[1];
    navigation.logoAlt = logoMatch[2] || 'МГТС';
  }
  
  // Телефон
  const phoneMatch = html.match(/<a[^>]*href=["']tel:([^"']+)["'][^>]*>([^<]+)<\/a>/i);
  if (phoneMatch) {
    navigation.phone = phoneMatch[1];
    navigation.phoneDisplay = phoneMatch[2].replace('📞', '').trim();
  }
  
  // Главное меню - извлекаем все nav-link
  // Используем более простой regex, который работает с любыми кавычками
  const navSectionMatch = html.match(/<nav[^>]*id=["']mainNav["'][^>]*>([\s\S]*?)<\/nav>/i);
  if (navSectionMatch) {
    const navContent = navSectionMatch[1];
    
    // Более гибкий regex для поиска ссылок nav-link
    // Ищем все <a> теги внутри nav и фильтруем те, что содержат nav-link в class
    const linkMatches = navContent.matchAll(/<a([^>]*)>([^<]+)<\/a>/gi);
    let index = 0;
    
    for (const linkMatch of linkMatches) {
      const attributes = linkMatch[1];
      const text = linkMatch[2].trim();
      
      // Проверяем, что это nav-link (имеет class="nav-link" или class='nav-link')
      if (!attributes.includes('nav-link') || text.includes('📞')) {
        continue;
      }
      
      // Извлекаем href
      const hrefMatch = attributes.match(/href=["']([^"']+)["']/i);
      const href = hrefMatch ? hrefMatch[1] : '#';
      
      // Извлекаем data-mega-menu
      const megaMenuMatch = attributes.match(/data-mega-menu=["']([^"']+)["']/i);
      const megaMenuId = megaMenuMatch ? megaMenuMatch[1] : null;
      
      // Пропускаем телефонные ссылки
      if (href.startsWith('tel:')) {
        continue;
      }
      
      navigation.mainMenuItems.push({
        label: text,
        href: href,
        isExternal: href.startsWith('http'),
        hasMegaMenu: !!megaMenuId,
        megaMenuId: megaMenuId,
        order: index++,
        isVisible: true
      });
    }
  }
  
  // Mega-menu - извлекаем по id
  const megaMenuRegex = /<div[^>]*id=["']([^"']+)["'][^>]*class=["'][^"']*mega-menu[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  let megaMatch;
  
  while ((megaMatch = megaMenuRegex.exec(html)) !== null) {
    const megaMenuId = megaMatch[1];
    const megaMenuContent = megaMatch[2];
    const sections = [];
    
    // Извлекаем секции
    const sectionRegex = /<div[^>]*class=["'][^"']*mega-menu-section[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    let sectionMatch;
    
    while ((sectionMatch = sectionRegex.exec(megaMenuContent)) !== null) {
      const sectionContent = sectionMatch[1];
      
      // Заголовок
      const titleMatch = sectionContent.match(/<h3[^>]*>(?:<a[^>]*href=["']([^"']+)["'][^>]*>)?([^<]+)(?:<\/a>)?<\/h3>/i);
      const title = titleMatch ? titleMatch[2].trim() : null;
      const titleHref = titleMatch && titleMatch[1] ? titleMatch[1] : null;
      
      // Описание
      const descMatch = sectionContent.match(/<p[^>]*>([^<]+)<\/p>/i);
      const description = descMatch ? descMatch[1].trim() : null;
      
      // Ссылки
      const links = [];
      const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
      let linkMatch;
      
      while ((linkMatch = linkRegex.exec(sectionContent)) !== null) {
        links.push({
          label: linkMatch[2].trim(),
          href: linkMatch[1] || '#',
          isExternal: linkMatch[1] ? linkMatch[1].startsWith('http') : false
        });
      }
      
      if (title) {
        sections.push({
          title: title,
          titleHref: titleHref,
          description: description,
          links: links
        });
      }
    }
    
    if (megaMenuId && sections.length > 0) {
      navigation.megaMenus.push({
        id: megaMenuId,
        title: null,
        sections: sections
      });
    }
  }
  
  return navigation;
}

/**
 * Парсинг HTML и извлечение данных футера (упрощенная версия без cheerio)
 */
function parseFooterHTML(html) {
  const footer = {
    sections: [],
    copyright: '© 2025 МГТС. Все права защищены.',
    legalLinks: [],
    socialLinks: []
  };
  
  // Секции футера - используем более точный regex для каждой секции
  const sectionMatches = html.matchAll(/<div[^>]*class=["'][^"']*footer-section[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]*class=["'][^"']*footer-section|<div[^>]*class=["'][^"']*footer-bottom|<\/div>\s*<\/div>\s*<div[^>]*class=["'][^"']*footer-bottom)/gi);
  let sectionIndex = 0;
  
  for (const sectionMatch of sectionMatches) {
    const sectionContent = sectionMatch[1];
    
    // Заголовок
    const titleMatch = sectionContent.match(/<h4[^>]*>([^<]+)<\/h4>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;
    
    // Ссылки
    const links = [];
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let linkMatch;
    
    while ((linkMatch = linkRegex.exec(sectionContent)) !== null) {
      links.push({
        label: linkMatch[2].trim(),
        href: linkMatch[1] || '#',
        isExternal: linkMatch[1] ? (linkMatch[1].startsWith('http') || linkMatch[1].startsWith('tel:') || linkMatch[1].startsWith('mailto:')) : false
      });
    }
    
    if (title) {
      footer.sections.push({
        title: title,
        links: links,
        order: sectionIndex++
      });
    }
  }
  
  // Copyright и юридические ссылки из footer-bottom
  const footerBottomMatch = html.match(/<div[^>]*class=["'][^"']*footer-bottom[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (footerBottomMatch) {
    const footerBottomContent = footerBottomMatch[1];
    const copyrightMatch = footerBottomContent.match(/<p[^>]*>([^<]+)<\/p>/);
    if (copyrightMatch && copyrightMatch[1].includes('©')) {
      footer.copyright = copyrightMatch[1].trim();
    }
    
    // Legal links из footer-bottom
    const legalLinkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let legalMatch;
    while ((legalMatch = legalLinkRegex.exec(footerBottomContent)) !== null) {
      footer.legalLinks.push({
        label: legalMatch[2].trim(),
        href: legalMatch[1] || '#',
        isExternal: legalMatch[1] ? legalMatch[1].startsWith('http') : false
      });
    }
  }
  
  return footer;
}

/**
 * Миграция Navigation
 */
async function migrateNavigation() {
  try {
    console.log('[Migration] Reading header.html...');
    const headerHTML = fs.readFileSync(headerPath, 'utf-8');
    const parsedData = parseHeaderHTML(headerHTML);
    
    // Подготавливаем данные для JSON полей (mainMenuItems и megaMenus уже в JSON формате)
    const navigationData = {
      logoAlt: parsedData.logoAlt || 'МГТС',
      phone: parsedData.phone || '+78002500250',
      phoneDisplay: parsedData.phoneDisplay || '8 800 250-0-250',
      mainMenuItems: parsedData.mainMenuItems || [],
      megaMenus: parsedData.megaMenus || []
    };
    
    // Logo - если есть путь, оставляем null (загрузится через админ-панель)
    // navigationData.logo = parsedData.logo ? parsedData.logo : null;
    
    console.log('[Migration] Navigation data prepared:', JSON.stringify(navigationData, null, 2));
    
    // Для singleType используем PUT (создание или обновление)
    console.log('[Migration] Creating/updating Navigation...');
    const response = await api.put('/navigation', {
      data: navigationData
    });
    
    console.log('[Migration] ✅ Navigation created/updated successfully');
    console.log('[Migration] Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Error migrating Navigation:', error.message || error);
    if (error.response) {
      console.error('[Migration] Status:', error.response.status);
      console.error('[Migration] Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.stack) {
      console.error('[Migration] Stack:', error.stack);
    }
    return false;
  }
}

/**
 * Миграция Footer
 */
async function migrateFooter() {
  try {
    console.log('[Migration] Reading footer.html...');
    const footerHTML = fs.readFileSync(footerPath, 'utf-8');
    const parsedData = parseFooterHTML(footerHTML);
    
    // Подготавливаем данные
    const footerData = {
      copyright: parsedData.copyright || '© 2025 МГТС. Все права защищены.',
      sections: parsedData.sections || [],
      legalLinks: parsedData.legalLinks || []
    };
    
    console.log('[Migration] Footer data prepared:', JSON.stringify(footerData, null, 2));
    
    // Для singleType используем PUT (создание или обновление)
    console.log('[Migration] Creating/updating Footer...');
    const response = await api.put('/footer', {
      data: footerData
    });
    
    console.log('[Migration] ✅ Footer created/updated successfully');
    console.log('[Migration] Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('[Migration] ❌ Error migrating Footer:', error.message || error);
    if (error.response) {
      console.error('[Migration] Status:', error.response.status);
      console.error('[Migration] Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.stack) {
      console.error('[Migration] Stack:', error.stack);
    }
    return false;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('[Migration] Starting migration of Navigation and Footer...\n');
  
  const navSuccess = await migrateNavigation();
  console.log('');
  const footerSuccess = await migrateFooter();
  
  console.log('\n[Migration] Migration completed!');
  console.log(`  Navigation: ${navSuccess ? '✅' : '❌'}`);
  console.log(`  Footer: ${footerSuccess ? '✅' : '❌'}`);
  
  if (navSuccess && footerSuccess) {
    console.log('\n✅ All migrations successful!');
    console.log('Next steps:');
    console.log('  1. Open Strapi admin: http://localhost:1337/admin');
    console.log('  2. Check Navigation and Footer in Content Manager');
    console.log('  3. Upload logo image to Media Library and link it in Navigation');
    console.log('  4. Test frontend - menu and footer should load from API');
  } else {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('[Migration] ❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { migrateNavigation, migrateFooter };


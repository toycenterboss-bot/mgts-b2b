/**
 * Скрипт для анализа структуры всех страниц в Strapi
 * Проверяет соответствие правилам типизации контента из CMS_CONTENT_TYPES.md
 * 
 * Запуск:
 *   cd mgts-backend
 *   node scripts/analyze-all-pages-structure.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API токен из CONTEXT.md
const API_TOKEN = process.env.STRAPI_API_TOKEN;

// URL Strapi
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

// Создать axios клиент
const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Анализ структуры HTML контента
 */
function analyzeContentStructure(content, slug) {
  const issues = [];
  
  if (!content || typeof content !== 'string') {
    return issues;
  }

  // Создаем временный DOM для парсинга
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(content);
  const document = dom.window.document;

  // 1. Проверка: .card без обертки в .section
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, index) => {
    let parent = card.parentElement;
    let hasSection = false;
    let hasGrid = false;
    let hasContainer = false;
    
    while (parent && parent !== document.body) {
      if (parent.classList && parent.classList.contains('section')) {
        hasSection = true;
      }
      if (parent.classList && parent.classList.contains('grid')) {
        hasGrid = true;
      }
      if (parent.classList && parent.classList.contains('container')) {
        hasContainer = true;
      }
      parent = parent.parentElement;
    }
    
    if (!hasSection) {
      issues.push({
        type: 'card_without_section',
        severity: 'high',
        message: `Карточка #${index + 1} не обернута в <section class="section">`,
        element: card.outerHTML.substring(0, 100)
      });
    }
    
    // Если карточка в контейнере, но не в секции и не в сетке - это проблема
    if (hasContainer && !hasSection && !hasGrid) {
      issues.push({
        type: 'card_in_container_without_grid',
        severity: 'medium',
        message: `Карточка #${index + 1} в контейнере, но не в секции и не в сетке`,
        element: card.outerHTML.substring(0, 100)
      });
    }
  });

  // 2. Проверка: .grid-item без .grid
  const gridItems = document.querySelectorAll('.grid-item');
  gridItems.forEach((item, index) => {
    let parent = item.parentElement;
    let hasGrid = false;
    
    while (parent && parent !== document.body) {
      if (parent.classList && parent.classList.contains('grid')) {
        hasGrid = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!hasGrid) {
      issues.push({
        type: 'grid_item_without_grid',
        severity: 'high',
        message: `.grid-item #${index + 1} не находится внутри .grid`,
        element: item.outerHTML.substring(0, 100)
      });
    }
  });

  // 3. Проверка: .card внутри .container без .section и без .grid
  const containers = document.querySelectorAll('.container');
  containers.forEach((container, containerIndex) => {
    // Проверяем, находится ли контейнер внутри секции
    let parent = container.parentElement;
    let hasSection = false;
    
    while (parent && parent !== document.body) {
      if (parent.tagName === 'SECTION' && parent.classList && parent.classList.contains('section')) {
        hasSection = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    // Если контейнер не в секции, проверяем его содержимое
    if (!hasSection) {
      const directCards = container.querySelectorAll(':scope > .card');
      if (directCards.length > 0) {
        issues.push({
          type: 'container_with_cards_without_section',
          severity: 'high',
          message: `Контейнер #${containerIndex + 1} содержит карточки, но не обернут в <section class="section">`,
          count: directCards.length
        });
      }
      
      // Проверяем заголовки h2 без section-title (только если не в специальных секциях)
      const h2s = container.querySelectorAll(':scope > h2');
      h2s.forEach((h2, h2Index) => {
        // Пропускаем заголовки в service-order
        const inServiceOrder = h2.closest('section.service-order');
        if (inServiceOrder) {
          return;
        }
        
        if (!h2.classList.contains('section-title')) {
          issues.push({
            type: 'h2_without_section_title_class',
            severity: 'medium',
            message: `Заголовок h2 #${h2Index + 1} не имеет класса section-title`,
            element: h2.outerHTML.substring(0, 100)
          });
        }
      });
    }
  });

  // Список специальных секций (не считаются проблемными)
  const specialSectionClasses = [
    'service-order', 'service-tariffs', 'service-faq', 
    'service-features', 'service-specs', 'service-cases', 'service-howto'
  ];
  
  // Функция проверки, находится ли элемент в специальной секции
  function isInSpecialSection(element) {
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (parent.tagName === 'SECTION' && parent.classList) {
        for (const specialClass of specialSectionClasses) {
          if (parent.classList.contains(specialClass)) {
            return true;
          }
        }
      }
      parent = parent.parentElement;
    }
    return false;
  }

  // 4. Проверка: заголовки h2 без обертки в section
  const allH2s = document.querySelectorAll('h2');
  allH2s.forEach((h2, index) => {
    // Проверяем, в какой специальной секции находится заголовок
    const inServiceOrder = h2.closest('section.service-order');
    const inServiceTariffs = h2.closest('section.service-tariffs');
    const inServiceFaq = h2.closest('section.service-faq');
    const inOtherSpecial = isInSpecialSection(h2) && !inServiceOrder && !inServiceTariffs && !inServiceFaq;
    
    // Пропускаем заголовки в service-order (там заголовок может быть без section-title) - это нормально
    if (inServiceOrder) {
      return;
    }
    
    // Для остальных специальных секций проверяем section-title
    if (inServiceTariffs || inServiceFaq || inOtherSpecial) {
      if (!h2.classList.contains('section-title')) {
        issues.push({
          type: 'h2_without_section_title_class',
          severity: 'low',
          message: `Заголовок h2 #${index + 1} в специальной секции не имеет класса section-title`,
          element: h2.outerHTML.substring(0, 100)
        });
      }
      return; // Специальные секции не должны быть в section.section
    }
    
    // Для обычных заголовков проверяем наличие section.section
    let parent = h2.parentElement;
    let hasSection = false;
    
    while (parent && parent !== document.body) {
      if (parent.tagName === 'SECTION' && parent.classList && parent.classList.contains('section')) {
        hasSection = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!hasSection) {
      issues.push({
        type: 'h2_without_section',
        severity: 'medium',
        message: `Заголовок h2 #${index + 1} не находится внутри <section class="section">`,
        element: h2.outerHTML.substring(0, 100)
      });
    }
    
    // Проверка класса section-title (только для обычных секций)
    if (!h2.classList.contains('section-title')) {
      issues.push({
        type: 'h2_without_section_title_class',
        severity: 'medium',
        message: `Заголовок h2 #${index + 1} не имеет класса section-title`,
        element: h2.outerHTML.substring(0, 100)
      });
    }
  });

  // 5. Проверка: карточки в контейнере без сетки (если их несколько)
  containers.forEach((container, containerIndex) => {
    // Пропускаем контейнеры в специальных секциях
    if (isInSpecialSection(container)) {
      return;
    }
    
    // Проверяем только прямые дочерние карточки
    const directCards = Array.from(container.children).filter(
      child => child.classList && child.classList.contains('card')
    );
    
    if (directCards.length > 1) {
      // Проверяем, есть ли grid внутри контейнера
      const gridInContainer = container.querySelector('.grid');
      
      if (!gridInContainer) {
        issues.push({
          type: 'multiple_cards_without_grid',
          severity: 'medium',
          message: `Контейнер #${containerIndex + 1} содержит ${directCards.length} карточек, но они не обернуты в .grid`,
          count: directCards.length
        });
      }
    }
  });

  // 6. Проверка: .card-body без .card
  const cardBodies = document.querySelectorAll('.card-body');
  cardBodies.forEach((body, index) => {
    let parent = body.parentElement;
    let hasCard = false;
    
    while (parent && parent !== document.body) {
      if (parent.classList && parent.classList.contains('card')) {
        hasCard = true;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!hasCard) {
      issues.push({
        type: 'card_body_without_card',
        severity: 'high',
        message: `.card-body #${index + 1} не находится внутри .card`,
        element: body.outerHTML.substring(0, 100)
      });
    }
  });

  return issues;
}

/**
 * Получить все страницы из Strapi
 */
async function getAllPages() {
  try {
    console.log('[Analyze] Получение всех страниц из Strapi...\n');
    
    const response = await api.get('/pages', {
      params: {
        'pagination[pageSize]': 100,
        'populate': '*'
      }
    });
    
    if (!response.data.data) {
      console.error('❌ Не удалось получить страницы');
      return [];
    }
    
    console.log(`[Analyze] Найдено страниц: ${response.data.data.length}\n`);
    return response.data.data;
  } catch (error) {
    console.error('❌ Ошибка при получении страниц:', error.message);
    if (error.response) {
      console.error('   Статус:', error.response.status);
      console.error('   Данные:', JSON.stringify(error.response.data, null, 2));
    }
    return [];
  }
}

/**
 * Основная функция анализа
 */
async function analyzeAllPages() {
  try {
    const pages = await getAllPages();
    
    if (pages.length === 0) {
      console.log('⚠️  Страницы не найдены');
      return;
    }
    
    const results = [];
    let totalIssues = 0;
    
    console.log('[Analyze] Анализ структуры контента...\n');
    
    for (const page of pages) {
      const slug = page.slug || 'unknown';
      const title = page.title || 'без названия';
      const content = page.content || '';
      
      if (!content) {
        continue;
      }
      
      const issues = analyzeContentStructure(content, slug);
      
      if (issues.length > 0) {
        results.push({
          slug,
          title,
          issues,
          issueCount: issues.length
        });
        totalIssues += issues.length;
      }
    }
    
    // Сортировка по количеству проблем
    results.sort((a, b) => b.issueCount - a.issueCount);
    
    // Вывод результатов
    console.log('\n' + '='.repeat(80));
    console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА СТРУКТУРЫ СТРАНИЦ');
    console.log('='.repeat(80));
    console.log(`\nВсего страниц проанализировано: ${pages.length}`);
    console.log(`Страниц с проблемами: ${results.length}`);
    console.log(`Всего проблем найдено: ${totalIssues}\n`);
    
    if (results.length === 0) {
      console.log('✅ Все страницы соответствуют правилам типизации!\n');
      return;
    }
    
    // Группировка по типам проблем
    const issuesByType = {};
    results.forEach(page => {
      page.issues.forEach(issue => {
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = {
            count: 0,
            pages: new Set(),
            severity: issue.severity
          };
        }
        issuesByType[issue.type].count++;
        issuesByType[issue.type].pages.add(page.slug);
      });
    });
    
    console.log('📋 ПРОБЛЕМЫ ПО ТИПАМ:');
    console.log('-'.repeat(80));
    
    const severityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
    const sortedTypes = Object.entries(issuesByType).sort((a, b) => {
      const severityDiff = severityOrder[a[1].severity] - severityOrder[b[1].severity];
      if (severityDiff !== 0) return severityDiff;
      return b[1].count - a[1].count;
    });
    
    sortedTypes.forEach(([type, data]) => {
      const severityIcon = data.severity === 'high' ? '🔴' : data.severity === 'medium' ? '🟡' : '🟢';
      console.log(`\n${severityIcon} ${type} (${data.severity.toUpperCase()})`);
      console.log(`   Количество: ${data.count}`);
      console.log(`   Затронуто страниц: ${data.pages.size}`);
      console.log(`   Страницы: ${Array.from(data.pages).slice(0, 5).join(', ')}${data.pages.size > 5 ? '...' : ''}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📄 ДЕТАЛЬНЫЙ ОТЧЕТ ПО СТРАНИЦАМ');
    console.log('='.repeat(80) + '\n');
    
    results.forEach((page, index) => {
      console.log(`${index + 1}. ${page.title} (${page.slug})`);
      console.log(`   Проблем: ${page.issueCount}\n`);
      
      // Группировка проблем по типу
      const issuesByType = {};
      page.issues.forEach(issue => {
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push(issue);
      });
      
      Object.entries(issuesByType).forEach(([type, issues]) => {
        const severityIcon = issues[0].severity === 'high' ? '🔴' : issues[0].severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${severityIcon} ${type}: ${issues.length} проблем(ы)`);
        issues.slice(0, 3).forEach(issue => {
          console.log(`      - ${issue.message}`);
        });
        if (issues.length > 3) {
          console.log(`      ... и еще ${issues.length - 3} проблем(ы)`);
        }
      });
      
      console.log('');
    });
    
    // Сохранение результатов в файл
    const reportPath = path.join(__dirname, '../../analysis-results.json');
    const report = {
      analyzedAt: new Date().toISOString(),
      totalPages: pages.length,
      pagesWithIssues: results.length,
      totalIssues: totalIssues,
      issuesByType: Object.fromEntries(
        Object.entries(issuesByType).map(([type, data]) => [
          type,
          {
            count: data.count,
            pages: Array.from(data.pages),
            severity: data.severity
          }
        ])
      ),
      pages: results
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n💾 Детальный отчет сохранен в: ${reportPath}\n`);
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Запуск
if (require.main === module) {
  analyzeAllPages()
    .then(() => {
      console.log('✅ Анализ завершен!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { analyzeAllPages, analyzeContentStructure };


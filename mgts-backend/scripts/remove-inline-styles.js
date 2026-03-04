/**
 * Скрипт для удаления inline стилей из HTML контента в Strapi
 * Запуск: через Strapi console или bootstrap
 */

const { JSDOM } = require('jsdom');

/**
 * Удаляет все inline стили из HTML, кроме критически важных
 */
function removeInlineStyles(html) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;
  const body = document.body;

  // Найти все элементы с inline стилями
  const styledElements = body.querySelectorAll('[style]');
  let removedCount = 0;

  styledElements.forEach((el) => {
    const style = el.getAttribute('style');
    
    // Сохранить только критически важные стили
    // (например, display: none для скрытых элементов)
    if (style && !style.includes('display: none') && !style.includes('display:none')) {
      el.removeAttribute('style');
      removedCount++;
    }
  });

  const cleanedHTML = body.innerHTML;
  
  if (removedCount > 0) {
    console.log(`[Remove Inline Styles] Removed styles from ${removedCount} element(s)`);
  }
  
  return cleanedHTML;
}

/**
 * Обновляет контент всех страниц в Strapi, удаляя inline стили
 */
async function updateAllPages({ strapi }) {
  try {
    console.log('🔍 Поиск всех страниц в Strapi...');
    
    const pages = await strapi.entityService.findMany('api::page.page', {
      fields: ['id', 'slug', 'content'],
      limit: 1000,
    });

    console.log(`✅ Найдено ${pages.length} страниц`);

    let updatedCount = 0;
    let totalRemovedStyles = 0;

    for (const page of pages) {
      if (!page.content || typeof page.content !== 'string') {
        continue;
      }

      // Подсчитать количество элементов со стилями до очистки
      const beforeCount = (page.content.match(/style\s*=/g) || []).length;

      // Удалить inline стили
      const cleanedContent = removeInlineStyles(page.content);

      // Подсчитать количество элементов со стилями после очистки
      const afterCount = (cleanedContent.match(/style\s*=/g) || []).length;
      const removedStyles = beforeCount - afterCount;

      if (removedStyles > 0) {
        // Обновить страницу в Strapi
        await strapi.entityService.update('api::page.page', page.id, {
          data: {
            content: cleanedContent,
          },
        });

        updatedCount++;
        totalRemovedStyles += removedStyles;
        console.log(`✅ Обновлена страница "${page.slug}": удалено ${removedStyles} inline стилей`);
      }
    }

    console.log(`\n📊 ИТОГОВЫЙ ОТЧЕТ:`);
    console.log(`   - Обновлено страниц: ${updatedCount}`);
    console.log(`   - Всего удалено inline стилей: ${totalRemovedStyles}`);
    
    if (updatedCount === 0) {
      console.log(`   ✅ Все страницы уже очищены от inline стилей`);
    }
  } catch (error) {
    console.error('❌ Ошибка при обновлении страниц:', error);
    throw error;
  }
}

module.exports = { removeInlineStyles, updateAllPages };





/**
 * Page Lifecycle Hooks
 * Автоматическое обновление Navigation и Footer при изменении страниц
 */

export default {
  /**
   * После создания страницы
   */
  async afterCreate(event) {
    if (process.env.MGTS_DISABLE_PAGE_LIFECYCLES === '1') return;
    const { result } = event;
    const s = getStrapiFromEvent(event);
    if (!s) return;
    if (result.publishedAt) {
      await updateNavigationFromPages(s);
      await updateFooterFromPages(s);
    }
  },

  /**
   * После обновления страницы
   */
  async afterUpdate(event) {
    if (process.env.MGTS_DISABLE_PAGE_LIFECYCLES === '1') return;
    const s = getStrapiFromEvent(event);
    if (!s) return;
    await updateNavigationFromPages(s);
    await updateFooterFromPages(s);
  },

  /**
   * После удаления страницы
   */
  async afterDelete(event) {
    if (process.env.MGTS_DISABLE_PAGE_LIFECYCLES === '1') return;
    const s = getStrapiFromEvent(event);
    if (!s) return;
    await updateNavigationFromPages(s);
    await updateFooterFromPages(s);
  },
};

function getStrapiFromEvent(event: any) {
  // Strapi lifecycle events may not include `strapi` in v5.
  // Use global fallback to keep hooks safe in CLI/entityService runs.
  const s = event?.strapi || (globalThis as any).strapi;
  if (!s) {
    console.warn('[Page Lifecycle] strapi instance not found; skipping nav/footer sync');
    return null;
  }
  return s;
}

/**
 * Обновить Navigation на основе всех опубликованных страниц
 */
async function updateNavigationFromPages(strapi) {
  try {
    // Получаем все опубликованные страницы
    const pages = await strapi.entityService.findMany('api::page.page', {
      filters: {
        publishedAt: { $notNull: true }
      },
      fields: ['slug', 'title'],
      sort: { slug: 'asc' }
    });

    // Получаем текущий Navigation
    const navigationList = await strapi.entityService.findMany('api::navigation.navigation');
    const navigation = Array.isArray(navigationList) ? navigationList[0] : navigationList;
    
    if (!navigation) {
      console.warn('[Page Lifecycle] Navigation not found, skipping update');
      return;
    }

    // Обновляем mainMenuItems на основе страниц
    // Можно добавить логику для автоматического построения меню
    // Пока оставляем существующие mainMenuItems без изменений
    // В будущем можно добавить автоматическое построение меню из страниц
    
    console.log('[Page Lifecycle] Navigation update triggered (pages count:', pages.length, ')');
  } catch (error) {
    console.error('[Page Lifecycle] Error updating Navigation:', error);
  }
}

/**
 * Обновить Footer на основе всех опубликованных страниц
 */
async function updateFooterFromPages(strapi) {
  try {
    // Получаем все опубликованные страницы
    const pages = await strapi.entityService.findMany('api::page.page', {
      filters: {
        publishedAt: { $notNull: true }
      },
      fields: ['slug', 'title'],
      sort: { slug: 'asc' }
    });

    // Получаем текущий Footer
    const footerList = await strapi.entityService.findMany('api::footer.footer');
    const footer = Array.isArray(footerList) ? footerList[0] : footerList;
    
    if (!footer) {
      console.warn('[Page Lifecycle] Footer not found, skipping update');
      return;
    }

    // Обновляем Footer на основе страниц
    // Можно добавить логику для автоматического построения секций футера
    // Пока оставляем существующий Footer без изменений
    // В будущем можно добавить автоматическое построение футера из страниц
    
    console.log('[Page Lifecycle] Footer update triggered (pages count:', pages.length, ')');
  } catch (error) {
    console.error('[Page Lifecycle] Error updating Footer:', error);
  }
}

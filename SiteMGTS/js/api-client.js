/**
 * API Client для работы с Strapi CMS
 */

const API_BASE_URL = window.STRAPI_URL || 'http://localhost:1337/api';

class StrapiAPI {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8',
        ...options.headers
      },
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Убедиться, что ответ декодируется как UTF-8
      const text = await response.text();
      const data = JSON.parse(text);
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Получить страницу по slug
   * @param {boolean} bypassCache - обойти кэш (для получения свежих данных)
   */
  async getPage(slug, bypassCache = false) {
    const cacheKey = `page:${slug}`;
    
    if (!bypassCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
      // Сначала пробуем метод через фильтр (работаем в Strapi v5)
      // Используем простой populate=* - сложные вложенные форматы вызывают 400 ошибку
      try {
        const encodedSlug = encodeURIComponent(slug);
        // Strapi v5: простой populate=* работает лучше, чем сложные вложенные форматы
        const populateQuery = 'populate=*';
        const data = await this.request(`/pages?filters[slug][$eq]=${encodedSlug}&${populateQuery}`);
      
      if (data.data && data.data.length > 0) {
        const page = data.data[0];
        // Нормализуем структуру для Strapi v5 (данные на верхнем уровне, нет attributes)
        const pageData = page.attributes || page;
        
        // Строим breadcrumbs из parent иерархии
        if (pageData.parent) {
          pageData.breadcrumbs = this.buildBreadcrumbs(pageData);
        }
        
        const normalizedPage = {
          data: pageData
        };
        this.cache.set(cacheKey, normalizedPage);
        return normalizedPage;
      }
    } catch (error) {
      console.log(`[API] Filter method failed for "${slug}", trying alternative...`);
    }
    
    // Fallback: пробуем метод /pages/slug/ (может работать в некоторых конфигурациях)
    try {
      const data = await this.request(`/pages/slug/${encodeURIComponent(slug)}`);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      // Не логируем ошибку 404 как критическую - страница может просто не существовать в CMS
      if (error.message && error.message.includes('404')) {
        console.log(`[API] Page "${slug}" not found in CMS (404) - this is OK if page doesn't exist in Strapi`);
        return null;
      }
      console.error(`Failed to get page ${slug}:`, error);
      return null;
    }
  }
  
  /**
   * Получить все страницы
   */
  async getAllPages() {
    const cacheKey = 'pages:all';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const data = await this.request('/pages?pagination[pageSize]=100');
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to get all pages:', error);
      return null;
    }
  }
  
  /**
   * Получить страницу по slug (альтернативный метод через фильтр)
   */
  async getPageBySlug(slug) {
    const cacheKey = `page:${slug}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const encodedSlug = encodeURIComponent(slug);
      // Strapi v5: простой populate=* работает лучше, чем сложные вложенные форматы
      const populateQuery = 'populate=*';
      const data = await this.request(`/pages?filters[slug][$eq]=${encodedSlug}&${populateQuery}`);
      
      if (data.data && data.data.length > 0) {
        const page = data.data[0];
        // Нормализуем структуру для Strapi v5 (данные на верхнем уровне, нет attributes)
        const pageData = page.attributes || page;
        
        // Строим breadcrumbs из parent иерархии
        if (pageData.parent) {
          pageData.breadcrumbs = this.buildBreadcrumbs(pageData);
        }
        
        // Возвращаем в формате { data: page } для совместимости
        const normalizedPage = {
          data: pageData
        };
        this.cache.set(cacheKey, normalizedPage);
        return normalizedPage;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get page ${slug}:`, error);
      return null;
    }
  }
  
  /**
   * Получить меню навигации
   */
  async getMenu() {
    const cacheKey = 'menu';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const data = await this.request('/menu');
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to get menu:', error);
      return null;
    }
  }

  /**
   * Получить структуру главного меню из страниц Strapi
   * Использует кастомный endpoint для получения меню с правильными parent связями
   */
  async getMainMenu() {
    const cacheKey = 'mainMenu';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      // Используем кастомный endpoint для получения меню с правильными parent связями
      const data = await this.request('/pages/main-menu');
      
      if (!data) {
        console.warn('[API] No menu data returned');
        return null;
      }
      
      // Данные уже в правильном формате из endpoint
      const menuData = {
        bySection: data.bySection || {},
        allPages: data.allPages || [],
        rootPages: data.rootPages || []
      };
      
      this.cache.set(cacheKey, menuData);
      return menuData;
    } catch (error) {
      console.error('[API] Failed to get main menu:', error);
      return null;
    }
  }

  /**
   * Получить главное меню (Navigation)
   */
  async getNavigation() {
    const cacheKey = 'navigation';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const data = await this.request('/navigation');
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to get navigation:', error);
      return null;
    }
  }

  /**
   * Получить структуру футера из страниц Strapi
   * Строит футер на основе страниц, группируя их по секциям
   */
  async getFooter() {
    const cacheKey = 'footer';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      // Используем кастомный endpoint для получения структуры футера
      const data = await this.request('/pages/footer');
      
      if (!data) {
        console.warn('[API] No footer data returned');
        return null;
      }
      
      // Данные уже в правильном формате из endpoint
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[API] Failed to get footer:', error);
      return null;
    }
  }

  /**
   * Получить новости
   */
  async getNews(options = {}) {
    const { limit = 10, category, featured = false } = options;
    let endpoint = '/news';
    
    if (featured) {
      endpoint = '/news/featured';
    } else if (category) {
      endpoint = `/news/category/${encodeURIComponent(category)}`;
    }
    
    if (limit) {
      endpoint += `${endpoint.includes('?') ? '&' : '?'}pagination[limit]=${limit}`;
    }
    
    try {
      const data = await this.request(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to get news:', error);
      return null;
    }
  }

  /**
   * Получить новость по slug
   */
  async getNewsBySlug(slug) {
    const cacheKey = `news:${slug}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const data = await this.request(`/news/slug/${encodeURIComponent(slug)}`);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Failed to get news ${slug}:`, error);
      return null;
    }
  }

  /**
   * Получить товары
   */
  async getProducts(options = {}) {
    const { limit = 20, category, search } = options;
    let endpoint = '/products';
    
    if (category) {
      endpoint = `/products/category/${encodeURIComponent(category)}`;
    } else if (search) {
      endpoint = `/products/search?q=${encodeURIComponent(search)}`;
    }
    
    if (limit && !search) {
      endpoint += `${endpoint.includes('?') ? '&' : '?'}pagination[limit]=${limit}`;
    }
    
    try {
      const data = await this.request(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to get products:', error);
      return null;
    }
  }

  /**
   * Получить товар по slug
   */
  async getProductBySlug(slug) {
    const cacheKey = `product:${slug}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const data = await this.request(`/products/slug/${encodeURIComponent(slug)}`);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Failed to get product ${slug}:`, error);
      return null;
    }
  }
  
  /**
   * Очистить кэш
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * Очистить кэш для конкретной страницы
   */
  clearPageCache(slug) {
    this.cache.delete(`page:${slug}`);
    this.cache.delete('pages:all');
    this.cache.delete('menu');
    this.cache.delete('navigation');
    this.cache.delete('footer');
  }

  /**
   * Построить breadcrumbs из parent иерархии
   * @param {Object} page - данные страницы из Strapi
   * @returns {Array} массив breadcrumbs элементов
   */
  buildBreadcrumbs(page) {
    const breadcrumbs = [];
    
    // Нормализуем структуру страницы (Strapi v5 может не иметь attributes)
    const pageData = page.attributes || page;
    
    // Сначала добавляем "Главная"
    breadcrumbs.push({
      name: 'Главная',
      url: '/index.html',
      slug: 'home'
    });
    
    // Рекурсивно собираем родителей (от корня к текущей странице)
    const parentChain = [];
    let parent = pageData.parent;
    let depth = 0;
    const maxDepth = 10; // Защита от бесконечного цикла
    
    while (parent && depth < maxDepth) {
      // Нормализуем структуру parent (Strapi v5 может не иметь attributes)
      const parentData = parent.attributes || parent;
      
      // Проверяем, что у parent есть slug (может быть null если не загружен полностью)
      if (parentData && parentData.slug) {
        parentChain.unshift({
          name: parentData.title || parentData.slug,
          url: `/${parentData.slug}/index.html`,
          slug: parentData.slug
        });
        
        // Переходим к следующему уровню parent
        parent = parentData.parent;
        depth++;
      } else {
        // Если parent не загружен полностью, прерываем цикл
        console.warn('[API] Parent chain incomplete, parent data missing at depth', depth);
        break;
      }
    }
    
    if (depth >= maxDepth) {
      console.warn('[API] Parent chain too deep, stopped at max depth', maxDepth);
    }
    
    // Добавляем цепочку родителей
    breadcrumbs.push(...parentChain);
    
    // Добавляем текущую страницу в конец (как активный элемент)
    breadcrumbs.push({
      name: pageData.title || pageData.slug,
      url: `/${pageData.slug}/index.html`,
      slug: pageData.slug
    });
    
    return breadcrumbs;
  }
}

// Создать глобальный экземпляр
window.StrapiAPI = new StrapiAPI();

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StrapiAPI;
}


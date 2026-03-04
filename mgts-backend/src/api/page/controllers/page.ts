/**
 * page controller
 */

import { factories } from '@strapi/strapi';
import fs from 'node:fs';
import path from 'node:path';

export default factories.createCoreController('api::page.page', ({ strapi }) => ({
  async deleteAll(ctx) {
    try {
      // Получаем все страницы
      const pages = await strapi.entityService.findMany('api::page.page', {
        limit: -1,
      });
      
      let deleted = 0;
      let failed = 0;
      
      // Удаляем каждую страницу
      for (const page of pages) {
        try {
          await strapi.entityService.delete('api::page.page', page.id);
          deleted++;
        } catch (error) {
          failed++;
          console.error(`Ошибка при удалении страницы ${page.id}:`, error);
        }
      }
      
      return {
        success: true,
        deleted,
        failed,
        total: pages.length
      };
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  
  async updateParentRelations(ctx) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Загружаем иерархию
      // Пробуем несколько путей
      const possiblePaths = [
        path.join(process.cwd(), 'temp/services-extraction/pages-hierarchy.json'),
        path.join(__dirname, '../../../temp/services-extraction/pages-hierarchy.json'),
        path.join(process.cwd(), '../temp/services-extraction/pages-hierarchy.json'),
        '/Users/andrey_efremov/Downloads/runs/temp/services-extraction/pages-hierarchy.json'
      ];
      
      let hierarchyFile = null;
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          hierarchyFile = possiblePath;
          break;
        }
      }
      
      if (!hierarchyFile) {
        return ctx.badRequest(`Файл иерархии не найден. Проверенные пути: ${possiblePaths.join(', ')}`);
      }
      
      const hierarchy = JSON.parse(fs.readFileSync(hierarchyFile, 'utf-8'));
      
      // Получаем все страницы
      const pages = await strapi.entityService.findMany('api::page.page', {
        limit: -1,
        populate: ['parent']
      });
      
      // Создаем карту slug -> id
      const slugToId = new Map();
      pages.forEach((page: any) => {
        if (page.slug) {
          slugToId.set(page.slug, page.id);
        }
      });
      
      let updated = 0;
      let failed = 0;
      const results: any[] = [];
      
      // Обновляем parent связи
      for (const page of pages as any[]) {
        const hierarchyInfo = hierarchy.flat?.find((p: any) => p.slug === page.slug);
        
        if (!hierarchyInfo) continue;
        
        if (!hierarchyInfo.parentSlug) {
          // Страница без родителя - очищаем parent если есть
          const currentParent = (page as any).parent;
          if (currentParent) {
            try {
              await strapi.entityService.update('api::page.page', page.id, {
                data: {
                  parent: null
                }
              });
              updated++;
            } catch (error: any) {
              failed++;
              results.push({ slug: page.slug, error: error.message });
            }
          }
          continue;
        }
        
        const parentId = slugToId.get(hierarchyInfo.parentSlug);
        if (!parentId) {
          failed++;
          results.push({ slug: page.slug, reason: 'Родительская страница не найдена' });
          continue;
        }
        
        if (parentId === page.id) {
          failed++;
          results.push({ slug: page.slug, reason: 'Циклическая зависимость' });
          continue;
        }
        
        const currentParent = (page as any).parent;
        const currentParentId = currentParent?.id || null;
        
        // Проверяем, нужно ли обновлять
        // Если parent уже установлен правильно, пропускаем
        if (currentParentId === parentId) {
          continue; // Уже установлено правильно
        }
        
        // Если parent не установлен (null) или установлен неправильно - обновляем
        try {
          await strapi.entityService.update('api::page.page', page.id, {
            data: {
              parent: parentId
            }
          });
          updated++;
        } catch (error: any) {
          failed++;
          results.push({ slug: page.slug, error: error.message });
        }
      }
      
      return {
        success: true,
        updated,
        failed,
        total: pages.length,
        results
      };
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  
  async checkParentRelations(ctx) {
    try {
      // Получаем все страницы с parent
      const pages = await strapi.entityService.findMany('api::page.page', {
        limit: -1,
        populate: ['parent']
      });
      
      const stats = {
        total: pages.length,
        withParent: 0,
        withoutParent: 0,
        examples: []
      };
      
      pages.forEach((page: any) => {
        if (page.parent) {
          stats.withParent++;
          if (stats.examples.length < 5) {
            stats.examples.push({
              slug: page.slug,
              parentSlug: page.parent.slug
            });
          }
        } else {
          stats.withoutParent++;
        }
      });
      
      return stats;
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  
  async getMainMenu(ctx) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Загружаем иерархию из файла для получения parentSlug
      const possiblePaths = [
        path.join(process.cwd(), 'temp/services-extraction/pages-hierarchy.json'),
        path.join(__dirname, '../../../temp/services-extraction/pages-hierarchy.json'),
        path.join(process.cwd(), '../temp/services-extraction/pages-hierarchy.json'),
        '/Users/andrey_efremov/Downloads/runs/temp/services-extraction/pages-hierarchy.json'
      ];
      
      let hierarchy: any = null;
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          hierarchy = JSON.parse(fs.readFileSync(possiblePath, 'utf-8'));
          break;
        }
      }
      
      // Создаем карту slug -> parentSlug из иерархии
      const parentSlugMap = new Map();
      if (hierarchy && hierarchy.flat) {
        hierarchy.flat.forEach((page: any) => {
          if (page.slug && page.parentSlug) {
            parentSlugMap.set(page.slug, page.parentSlug);
          }
        });
      }
      
      // Получаем все страницы с isMenuVisible: true, сортируем по order
      const pages = await strapi.entityService.findMany('api::page.page', {
        filters: {
          isMenuVisible: true
        },
        sort: { order: 'asc' },
        limit: -1
      });
      
      if (!pages || pages.length === 0) {
        return {
          bySection: {},
          allPages: [],
          rootPages: []
        };
      }
      
      // Нормализуем структуру и добавляем parentSlug из иерархии
      const normalizedPages = (pages as any[]).map(page => {
        const parentSlug = parentSlugMap.get(page.slug) || null;
        return {
          id: page.id,
          documentId: page.documentId,
          slug: page.slug,
          title: page.title,
          section: page.section || 'other',
          order: page.order || 0,
          parentSlug: parentSlug,
          children: []
        };
      });
      
      // Создаем карту страниц по slug для быстрого доступа
      const pageMapBySlug = new Map();
      normalizedPages.forEach(page => {
        pageMapBySlug.set(page.slug, page);
      });
      
      // Строим иерархию - привязываем children к parent по parentSlug
      const rootPages = [];
      normalizedPages.forEach(page => {
        if (page.parentSlug) {
          const parent = pageMapBySlug.get(page.parentSlug);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(page);
          } else {
            // Родитель не найден в списке (не видим в меню) - добавляем как корневой элемент
            rootPages.push(page);
          }
        } else {
          rootPages.push(page);
        }
      });
      
      // Сортируем children по order
      normalizedPages.forEach(page => {
        if (page.children && page.children.length > 0) {
          page.children.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      });
      
      // Сортируем корневые элементы по order
      rootPages.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Группируем по секциям
      // ВАЖНО: Включаем ВСЕ страницы секции (не только корневые), чтобы фронтенд мог правильно построить мега-меню
      const menuBySection: any = {};
      normalizedPages.forEach(page => {
        const section = page.section || 'other';
        if (!menuBySection[section]) {
          menuBySection[section] = [];
        }
        menuBySection[section].push(page);
      });
      
      // Сортируем страницы в каждой секции по order
      Object.keys(menuBySection).forEach(section => {
        menuBySection[section].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      });
      
      return {
        bySection: menuBySection,
        allPages: normalizedPages,
        rootPages: rootPages
      };
    } catch (error: any) {
      ctx.throw(500, error);
    }
  },
  
  async getFooter(ctx) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Функция для получения названия секции
      const getSectionLabel = (section: string): string => {
        const labels: { [key: string]: string } = {
          'business': 'Бизнес',
          'operators': 'Операторам',
          'government': 'Госсектор',
          'partners': 'Партнерам',
          'developers': 'Застройщикам',
          'about_mgts': 'О компании',
          'news': 'Новости',
          'other': 'Прочее'
        };
        return labels[section] || section;
      };
      
      // Загружаем иерархию из файла для получения parentSlug
      const possiblePaths = [
        path.join(process.cwd(), 'temp/services-extraction/pages-hierarchy.json'),
        path.join(__dirname, '../../../temp/services-extraction/pages-hierarchy.json'),
        path.join(process.cwd(), '../temp/services-extraction/pages-hierarchy.json'),
        '/Users/andrey_efremov/Downloads/runs/temp/services-extraction/pages-hierarchy.json'
      ];
      
      let hierarchy: any = null;
      const parentSlugMap = new Map();
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          hierarchy = JSON.parse(fs.readFileSync(possiblePath, 'utf-8'));
          if (hierarchy && hierarchy.flat) {
            hierarchy.flat.forEach((page: any) => {
              if (page.slug && page.parentSlug) {
                parentSlugMap.set(page.slug, page.parentSlug);
              }
            });
          }
          break;
        }
      }
      
      // Получаем важные страницы для футера
      // Футер должен содержать ссылки по секциям и важные служебные страницы
      const sections = ['business', 'operators', 'government', 'partners', 'developers', 'about_mgts'] as const;
      
      // Получаем корневые страницы для каждой секции (первые по order)
      const footerSections: any[] = [];
      
      for (const section of sections) {
        const pages = await strapi.entityService.findMany('api::page.page', {
          filters: {
            section: { $eq: section as any },
            isMenuVisible: { $eq: true }
          },
          sort: { order: 'asc' },
          limit: 10,
          fields: ['slug', 'title', 'section', 'order']
        });
        
        if (pages && pages.length > 0) {
          // Получаем только корневые страницы (без parentSlug в иерархии)
          const rootPages = (pages as any[]).filter(page => !parentSlugMap.has(page.slug));
          
          // Берем первые 5 корневых страниц
          const topRootPages = rootPages.slice(0, 5);
          
          if (topRootPages.length > 0) {
            footerSections.push({
              title: getSectionLabel(section),
              links: topRootPages.map((page: any) => ({
                label: page.title,
                href: `${page.slug}/index.html`
              }))
            });
          }
        }
      }
      
      // Добавляем важные служебные страницы (контакты, документы, политика конфиденциальности)
      const importantPages = await strapi.entityService.findMany('api::page.page', {
        filters: {
          slug: { $in: ['contacts', 'contact_details', 'data_processing', 'offers', 'licenses'] }
        },
        fields: ['slug', 'title']
      });
      
      const footerLinks: any[] = [];
      if (importantPages && importantPages.length > 0) {
        importantPages.forEach((page: any) => {
          let label = page.title;
          if (page.slug === 'contacts' || page.slug === 'contact_details') {
            label = 'Контакты';
          } else if (page.slug === 'data_processing') {
            label = 'Политика конфиденциальности';
          } else if (page.slug === 'offers') {
            label = 'Оферты';
          } else if (page.slug === 'licenses') {
            label = 'Лицензии';
          }
          
          footerLinks.push({
            label: label,
            href: `${page.slug}/index.html`
          });
        });
      }
      
      // Если есть важные ссылки, добавляем их как отдельную секцию
      if (footerLinks.length > 0) {
        footerSections.push({
          title: 'Информация',
          links: footerLinks
        });
      }
      
      // Добавляем контакты (телефоны, email)
      const contactSection = {
        title: 'Контакты',
        links: [
          { label: '8 800 250-0-250', href: 'tel:+78002500250' },
          { label: '8 (495) 636-0-636', href: 'tel:+749563600636' },
          { label: 'business@mgts.ru', href: 'mailto:business@mgts.ru' },
          { label: 'Адреса офисов', href: 'contacts/index.html' }
        ]
      };
      footerSections.push(contactSection);
      
      // Legal links (политика конфиденциальности, условия использования)
      const legalLinks = [];
      const privacyPage = importantPages?.find((p: any) => p.slug === 'data_processing');
      if (privacyPage) {
        legalLinks.push({
          label: 'Политика конфиденциальности',
          href: 'data_processing/index.html'
        });
      }
      
      const offersPage = importantPages?.find((p: any) => p.slug === 'offers');
      if (offersPage) {
        legalLinks.push({
          label: 'Условия использования',
          href: 'offers/index.html'
        });
      }
      
      const footerData = {
        sections: footerSections,
        copyright: '© 2025 МГТС. Все права защищены.',
        legalLinks: legalLinks
      };
      
      return {
        data: footerData
      };
    } catch (error: any) {
      ctx.throw(500, error);
    }
  },

  async seedServiceSections(ctx) {
    try {
      const slug =
        (ctx?.params && (ctx.params as any).slug) ||
        (ctx?.query && (ctx.query as any).slug) ||
        (ctx?.request?.body && (ctx.request.body as any).slug);

      const forceRaw =
        (ctx?.query && (ctx.query as any).force) ||
        (ctx?.request?.body && (ctx.request.body as any).force);
      const force = String(forceRaw || '').trim() === '1' || String(forceRaw || '').trim().toLowerCase() === 'true';

      if (!slug) return ctx.badRequest('Missing slug');

      const pages = await strapi.db.query('api::page.page').findMany({
        where: { slug: String(slug) },
        limit: 10,
        populate: {
          hero: {
            populate: {
              backgroundImage: true,
              ctaButtons: true,
            },
          },
          sections: {
            populate: {
              items: true,
              cards: true,
              files: { populate: { file: true } },
              periods: { populate: { image: true } },
              steps: { populate: { image: true } },
            },
          },
        },
      });

      if (!pages || pages.length === 0) return ctx.notFound('Page not found');

      const pick =
        (pages as any[]).find((p: any) => !p?.publishedAt) || // draft first
        (pages as any[]).find((p: any) => !!p?.publishedAt) || // then published
        (pages as any[])[0];

      const currentSections = Array.isArray(pick.sections) ? pick.sections.filter(Boolean) : [];
      const has = (c: string) => currentSections.some((s: any) => s && s.__component === c);

      const wanted = ['page.tariff-table', 'page.service-faq', 'page.service-order-form'];
      if (!force && wanted.some((c) => has(c))) {
        return {
          data: {
            slug: pick.slug,
            updated: false,
            reason: 'Already has some structured service sections. Use ?force=true to re-seed.',
            present: wanted.filter((c) => has(c)),
          },
        };
      }

      const inferSection = (s: string): any => {
        const x = String(s || '');
        if (x.startsWith('business/')) return 'business';
        if (x.startsWith('operators/')) return 'operators';
        if (x.startsWith('government/')) return 'government';
        if (x.startsWith('partners/')) return 'partners';
        if (x.startsWith('developers/')) return 'developers';
        if (x.startsWith('about_')) return 'about_mgts';
        if (x.startsWith('news/')) return 'news';
        return 'other';
      };

      /** Basic demo tariff table (JSON columns/rows are required). */
      const tariffTable = {
        __component: 'page.tariff-table',
        title: 'Тарифы и спецификации',
        description: 'Демо-таблица (заполните реальными тарифами в Strapi).',
        columns: [
          { name: 'Параметры', key: 'param' },
          { name: 'Базовый', key: 'basic' },
          { name: 'Бизнес', key: 'business' },
          { name: 'Enterprise', key: 'enterprise' },
        ],
        rows: [
          { param: 'Доступность сервиса', basic: '99.9%', business: '99.95%', enterprise: '99.99%' },
          { param: 'Время реакции', basic: '4 часа', business: '1 час', enterprise: '15 минут' },
          { param: 'Режим работы техподдержки', basic: '8/5', business: '24/7', enterprise: '24/7 VIP Line' },
        ],
      };

      const serviceFaq = {
        __component: 'page.service-faq',
        title: 'Часто задаваемые вопросы',
        items: [
          { question: 'Как быстро подключаете?', answer: '<p>Срок подключения зависит от адреса и доступности инфраструктуры. Обычно — от нескольких дней.</p>' },
          { question: 'Есть ли SLA?', answer: '<p>Да, SLA фиксируется в договоре. Уровень зависит от выбранного решения.</p>' },
          { question: 'Можно ли масштабировать скорость?', answer: '<p>Да, скорость и набор опций можно расширять по мере роста потребностей.</p>' },
        ],
      };

      const serviceOrderForm = {
        __component: 'page.service-order-form',
        title: 'Подобрать решение',
        subtitle: 'Оставьте заявку, и наш специалист свяжется с вами в течение 15 минут.',
        formAction: '#',
        formMethod: 'POST',
        formType: 'general-request',
        section: inferSection(pick.slug),
      };

      // Preserve existing sections, but (re)append structured service blocks.
      const nextSections = currentSections.filter((s: any) => s && !wanted.includes(s.__component));
      nextSections.push(tariffTable, serviceFaq, serviceOrderForm);

      const updated = await strapi.entityService.update('api::page.page', pick.id, {
        data: {
          sections: nextSections,
        },
      });

      return {
        data: {
          slug: pick.slug,
          updated: true,
          id: updated?.id,
          seeded: wanted,
        },
      };
    } catch (error: any) {
      ctx.throw(500, error);
    }
  },

  async seedDocSections(ctx) {
    try {
      const slug =
        (ctx?.params && (ctx.params as any).slug) ||
        (ctx?.query && (ctx.query as any).slug) ||
        (ctx?.request?.body && (ctx.request.body as any).slug);

      const forceRaw =
        (ctx?.query && (ctx.query as any).force) ||
        (ctx?.request?.body && (ctx.request.body as any).force);
      const force = String(forceRaw || '').trim() === '1' || String(forceRaw || '').trim().toLowerCase() === 'true';

      if (!slug) return ctx.badRequest('Missing slug');

      const pages = await strapi.db.query('api::page.page').findMany({
        where: { slug: String(slug) },
        limit: 10,
        populate: {
          sections: {
            populate: {
              tabs: true,
              files: {
                populate: { file: true },
              },
            },
          },
        },
      });

      if (!pages || pages.length === 0) return ctx.notFound('Page not found');

      const pick =
        (pages as any[]).find((p: any) => !p?.publishedAt) || // draft first
        (pages as any[]).find((p: any) => !!p?.publishedAt) || // then published
        (pages as any[])[0];

      const currentSections = Array.isArray(pick.sections) ? pick.sections.filter(Boolean) : [];
      const wanted = ['page.document-tabs', 'page.files-table'];
      const has = (c: string) => currentSections.some((s: any) => s && s.__component === c);

      if (!force && wanted.some((c) => has(c))) {
        return {
          data: {
            slug: pick.slug,
            updated: false,
            reason: 'Already has some doc structured sections. Use ?force=true to re-seed.',
            present: wanted.filter((c) => has(c)),
          },
        };
      }

      // Prepare small local sample files and upload them to Strapi media library.
      const seedDir = path.join(process.cwd(), '.tmp', 'seed-docs');
      fs.mkdirSync(seedDir, { recursive: true });

      const mkFile = (name: string, content: string) => {
        const p = path.join(seedDir, name);
        fs.writeFileSync(p, content, 'utf-8');
        const st = fs.statSync(p);
        return {
          // Strapi upload service expects a "file" object similar to what koa-body/multer provides.
          // Different adapters use `filepath` vs `path`, so we provide both.
          path: p,
          filepath: p,
          name,
          originalFilename: name,
          type: 'text/plain',
          mimetype: 'text/plain',
          size: st.size,
        };
      };

      const f1 = mkFile(
        'offers_demo.txt',
        'MGTS • Demo document\n\nКатегория: offers\n\nЭто тестовый файл, загруженный сидером, чтобы проверить files-table + preview modal.'
      );
      const f2 = mkFile(
        'archive_demo.txt',
        'MGTS • Demo document\n\nКатегория: archive\n\nЭто тестовый файл, загруженный сидером, чтобы проверить фильтры по категориям.'
      );

      const uploadService: any = strapi.plugin('upload')?.service('upload');
      if (!uploadService || typeof uploadService.upload !== 'function') {
        return ctx.throw(500, 'Upload plugin not available (strapi.plugin("upload").service("upload") missing)');
      }

      const uploaded1 = await uploadService.upload({
        data: { fileInfo: { name: f1.name, alternativeText: 'Demo doc' } },
        files: f1,
      });
      const uploaded2 = await uploadService.upload({
        data: { fileInfo: { name: f2.name, alternativeText: 'Demo doc' } },
        files: f2,
      });

      const m1 = Array.isArray(uploaded1) ? uploaded1[0] : uploaded1;
      const m2 = Array.isArray(uploaded2) ? uploaded2[0] : uploaded2;
      if (!m1?.id || !m2?.id) {
        return ctx.throw(500, 'Upload failed (no media id returned)');
      }

      const documentTabs = {
        __component: 'page.document-tabs',
        title: 'Категории документов',
        defaultTab: 0,
        tabs: [
          {
            name: 'Все',
            filterKey: '',
            order: 0,
            content:
              '<p>Выберите категорию документов. Список ниже можно фильтровать по названию и типу файла.</p>',
          },
          {
            name: 'Оферты',
            filterKey: 'offers',
            order: 1,
            content: '<p>Документы категории <strong>Оферты</strong>.</p>',
          },
          {
            name: 'Архив',
            filterKey: 'archive',
            order: 2,
            content: '<p>Документы категории <strong>Архив</strong>.</p>',
          },
        ],
      };

      const filesTable = {
        __component: 'page.files-table',
        title: 'Документы для скачивания',
        files: [
          {
            name: 'Условия оказания дополнительных услуг (demo)',
            file: m1.id,
            fileType: 'other',
            categoryKey: 'offers',
            size: `${f1.size} B`,
            description: 'Демо-файл (сидер).',
            order: 0,
          },
          {
            name: 'Архивный документ (demo)',
            file: m2.id,
            fileType: 'other',
            categoryKey: 'archive',
            size: `${f2.size} B`,
            description: 'Демо-файл (сидер).',
            order: 1,
          },
        ],
      };

      const nextSections = currentSections.filter((s: any) => s && !wanted.includes(s.__component));
      nextSections.push(documentTabs, filesTable);

      const updated = await strapi.entityService.update('api::page.page', pick.id, {
        data: { sections: nextSections },
      });

      return {
        data: {
          slug: pick.slug,
          updated: true,
          id: updated?.id,
          seeded: wanted,
          uploadedMediaIds: [m1.id, m2.id],
        },
      };
    } catch (error: any) {
      ctx.throw(500, error);
    }
  },

  async seedContactHub(ctx) {
    try {
      const slug =
        (ctx?.params && (ctx.params as any).slug) ||
        (ctx?.query && (ctx.query as any).slug) ||
        (ctx?.request?.body && (ctx.request.body as any).slug);

      const forceRaw =
        (ctx?.query && (ctx.query as any).force) ||
        (ctx?.request?.body && (ctx.request.body as any).force);
      const force = String(forceRaw || '').trim() === '1' || String(forceRaw || '').trim().toLowerCase() === 'true';

      if (!slug) return ctx.badRequest('Missing slug');

      const pages = await strapi.db.query('api::page.page').findMany({
        where: { slug: String(slug) },
        limit: 10,
        populate: {
          sections: true,
        },
      });

      if (!pages || pages.length === 0) return ctx.notFound('Page not found');

      const pick =
        (pages as any[]).find((p: any) => !p?.publishedAt) || // draft first
        (pages as any[]).find((p: any) => !!p?.publishedAt) || // then published
        (pages as any[])[0];

      const currentSections = Array.isArray(pick.sections) ? pick.sections.filter(Boolean) : [];
      const wanted = ['page.section-map'];
      const hasMap = currentSections.some((s: any) => s && s.__component === 'page.section-map');

      if (!force && hasMap) {
        return {
          data: {
            slug: pick.slug,
            updated: false,
            reason: 'Already has section-map. Use ?force=true to re-seed.',
          },
        };
      }

      // Markers JSON is consumed by cms-adapter-example.js for tpl_contact_hub
      // and should include at least: id/slug/title/name, category/type, lat/lng, label, address/description.
      const markers = [
        {
          id: 'office_north',
          category: 'offices',
          title: 'Офис "Северный"',
          label: 'OFFICE NORTH',
          address: 'ул. Тимирязевская, 2/3',
          badge: 'Открыто',
          lat: 55.818,
          lng: 37.574,
        },
        {
          id: 'dc_s1',
          category: 'network',
          title: 'Дата-центр S1',
          label: 'DC S1',
          address: 'Москва, (демо-локация)',
          badge: 'Узел связи',
          lat: 55.752,
          lng: 37.618,
        },
        {
          id: 'node_misc',
          category: 'offices',
          title: 'Центр "Восток"',
          label: 'EAST',
          address: 'ш. Энтузиастов, 56',
          badge: 'Открыто',
          lat: 55.75,
          lng: 37.64,
        },
      ];

      const mapSection = {
        __component: 'page.section-map',
        title: 'Контактные точки',
        mapType: 'yandex',
        centerLat: 55.76,
        centerLng: 37.62,
        zoom: 10,
        description: 'Демо-маркеры (заполните реальными локациями в Strapi).',
        markers,
      };

      const nextSections = currentSections.filter((s: any) => s && s.__component !== 'page.section-map');
      nextSections.push(mapSection);

      const updated = await strapi.entityService.update('api::page.page', pick.id, {
        data: { sections: nextSections },
      });

      return {
        data: {
          slug: pick.slug,
          updated: true,
          id: updated?.id,
          seeded: wanted,
          markersCount: markers.length,
        },
      };
    } catch (error: any) {
      ctx.throw(500, error);
    }
  },

  async seedSegmentLanding(ctx) {
    try {
      const slug =
        (ctx?.params && (ctx.params as any).slug) ||
        (ctx?.query && (ctx.query as any).slug) ||
        (ctx?.request?.body && (ctx.request.body as any).slug);

      const forceRaw =
        (ctx?.query && (ctx.query as any).force) ||
        (ctx?.request?.body && (ctx.request.body as any).force);
      const force = String(forceRaw || '').trim() === '1' || String(forceRaw || '').trim().toLowerCase() === 'true';

      if (!slug) return ctx.badRequest('Missing slug');

      const pages = await strapi.db.query('api::page.page').findMany({
        where: { slug: String(slug) },
        limit: 10,
        populate: { sections: true },
      });

      if (!pages || pages.length === 0) return ctx.notFound('Page not found');

      const pick =
        (pages as any[]).find((p: any) => !p?.publishedAt) || // draft first
        (pages as any[]).find((p: any) => !!p?.publishedAt) || // then published
        (pages as any[])[0];

      const currentSections = Array.isArray(pick.sections) ? pick.sections.filter(Boolean) : [];
      const existingCards = currentSections.filter((s: any) => s && s.__component === 'page.section-cards');
      if (!force && existingCards.length >= 2) {
        return {
          data: {
            slug: pick.slug,
            updated: false,
            reason: 'Already has 2+ section-cards blocks. Use ?force=true to re-seed.',
          },
        };
      }

      const servicesSection = {
        __component: 'page.section-cards',
        title: 'Основные услуги',
        cards: [
          {
            title: 'Интернет для бизнеса',
            description: 'Оптоволоконные каналы до 10 Гбит/с с гарантированным аптаймом.',
            link: 'tpl_service.html?slug=business/access_internet',
            cardType: 'service',
          },
          {
            title: 'Облачные решения',
            description: 'Облачная инфраструктура Tier III с быстрым масштабированием.',
            link: 'tpl_cms_page.html?slug=cloud',
            cardType: 'service',
          },
          {
            title: 'Кибербезопасность',
            description: 'Защита от DDoS, аудит уязвимостей и шифрование по ГОСТ.',
            link: 'tpl_cms_page.html?slug=security',
            cardType: 'service',
          },
          {
            title: 'IP-телефония',
            description: 'Виртуальная АТС, многоканальные номера и интеграция с CRM.',
            link: 'tpl_cms_page.html?slug=telephony',
            cardType: 'service',
          },
        ],
      };

      const scenariosSection = {
        __component: 'page.section-cards',
        title: 'Отраслевые сценарии',
        cards: [
          {
            title: 'Для Ритейла',
            description: 'Wi‑Fi аналитика, умное видеонаблюдение и кассовые решения.',
            link: 'tpl_scenario.html?slug=scenario_demo',
            cardType: 'navigation',
          },
          {
            title: 'Для Застройщиков',
            description: 'Цифровизация ЖК: домофоны, диспетчеризация и безопасность.',
            link: 'tpl_scenario.html?slug=scenario_demo',
            cardType: 'navigation',
          },
          {
            title: 'Для Госсектора',
            description: 'Защищенные каналы связи, импортозамещение и облачные платформы.',
            link: 'tpl_scenario.html?slug=scenario_demo',
            cardType: 'navigation',
          },
        ],
      };

      // Keep everything else, but ensure at least 2 section-cards exist (appended at the end).
      const stripped = currentSections.filter((s: any) => s && s.__component !== 'page.section-cards');
      const nextSections = [...stripped, servicesSection, scenariosSection];

      const updated = await strapi.entityService.update('api::page.page', pick.id, {
        data: { sections: nextSections },
      });

      return {
        data: {
          slug: pick.slug,
          updated: true,
          id: updated?.id,
          seeded: ['page.section-cards', 'page.section-cards'],
        },
      };
    } catch (error: any) {
      ctx.throw(500, error);
    }
  },
  
  async findBySlug(ctx) {
    const slug =
      (ctx?.params && (ctx.params as any).slug) ||
      (ctx?.query && (ctx.query as any).slug);
    
    if (!slug) {
      ctx.throw(400, 'Missing slug');
    }
    
    // NOTE (Strapi v5): entityService populate for Dynamic Zones is often shallow.
    // We use the query engine directly to ensure nested repeatable components inside DZ
    // (e.g. `page.service-faq.items`, `page.section-cards.cards`) are populated.
    const pages = await strapi.db.query('api::page.page').findMany({
      where: {
        slug,
      },
      // A given slug can have both a draft + a published entry (same documentId).
      // For our demo adapter we prefer the draft if it exists, otherwise fallback to published.
      limit: 10,
      populate: {
        hero: {
          populate: {
            backgroundImage: true,
            ctaButtons: true,
            slaItems: true,
          },
        },
        sections: {
          // These keys exist on different DZ components; Strapi ignores missing ones per component.
          populate: {
            items: {
              // page.service-faq.items, page.section-grid.items, page.image-carousel.items, page.image-switcher.items, etc.
              // Some of these nested components include media fields (e.g. items[*].image).
              populate: {
                image: true,
                icon: {
                  populate: {
                    preview: true,
                  },
                },
              },
            },
            perks: true,
            cards: {
              // page.section-cards.cards, page.crm-cards.cards[*].image, etc.
              populate: {
                image: true,
                backgroundImage: true,
                icon: {
                  populate: {
                    preview: true,
                  },
                },
                items: {
                  populate: {
                    icon: {
                      populate: {
                        preview: true,
                      },
                    },
                  },
                }, // page.career-why-card.items
              },
            },
            vacancies: {
              // page.career-vacancies.vacancies[*].meta/tags
              populate: {
                meta: {
                  populate: {
                    icon: {
                      populate: {
                        preview: true,
                      },
                    },
                  },
                },
                tags: true,
              },
            },
            filters: true, // page.career-vacancies.filters
            tabs: true, // page.document-tabs.tabs
            files: {
              // page.files-table.files[*].file is media relation
              populate: {
                file: true,
              },
            },
            periods: {
              // page.history-timeline.periods[*].image
              populate: {
                image: true,
              },
            },
            steps: {
              // page.how-to-connect.steps[*].image
              populate: {
                image: true,
              },
            },
            elements: true,
            icon: {
              populate: {
                preview: true,
              },
            },
            backgroundImage: true,
            socialLinks: {
              populate: {
                items: {
                  populate: {
                    icon: {
                      populate: {
                        preview: true,
                      },
                    },
                  },
                },
              },
            },
            portraitImage: true,
            video: true,
          },
        },
        parent: {
          populate: {
            parent: {
              populate: {
                parent: {
                  populate: {
                    parent: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!pages || pages.length === 0) {
      return ctx.notFound('Page not found');
    }

    const pick =
      (pages as any[]).find((p: any) => !p?.publishedAt) || // draft first
      (pages as any[]).find((p: any) => !!p?.publishedAt) || // then published
      (pages as any[])[0];
    
    return this.transformResponse(pick);
  },

  async getSectionsStats(ctx) {
    const pages = await strapi.entityService.findMany('api::page.page', {
      // NOTE: For stats we include drafts too (some envs treat draft/publish differently).
      limit: 5000,
      populate: '*',
    });

    const counts: Record<string, number> = {};
    const examples: Record<string, any> = {};

    for (const p of (pages as any[]) || []) {
      const sections = (p && p.sections) || [];
      for (const s of sections || []) {
        const comp = s && s.__component;
        if (!comp) continue;
        counts[comp] = (counts[comp] || 0) + 1;
        if (!examples[comp]) {
          examples[comp] = {
            slug: p.slug,
            template: p.template,
            section: s,
          };
        }
      }
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return {
      data: {
        totalPages: (pages as any[])?.length || 0,
        sectionCounts: Object.fromEntries(sorted),
        examples,
      },
    };
  },
  
  async getMenu(ctx) {
    const pages = await strapi.entityService.findMany('api::page.page', {
      filters: { 
        publishedAt: { $notNull: true }
      },
      fields: ['slug', 'title'],
      sort: { slug: 'asc' }
    });
    
    // Построить иерархию меню на основе slug
    const menu = buildMenuHierarchy(pages);
    
    return menu;
  }
}));

function buildMenuHierarchy(pages: any[]) {
  const menu: any = {};
  
  pages.forEach((page: any) => {
    const parts = page.slug.split('/');
    let current = menu;
    
    parts.forEach((part: string, index: number) => {
      if (!current[part]) {
        current[part] = {
          name: part,
          children: {},
          page: index === parts.length - 1 ? page : null
        };
      }
      current = current[part].children;
    });
  });
  
  return menu;
}

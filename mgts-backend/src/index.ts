// import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Автоматический импорт/миграции при первом запуске (legacy).
    // IMPORTANT: Disabled by default to avoid interfering with the new CMS_TARGET_SCHEMA/import v2 pipeline.
    try {
      const pagesCount = await strapi.entityService.findMany('api::page.page', {});
      
      const ENABLE_BOOTSTRAP_IMPORT = process.env.MGTS_BOOTSTRAP_IMPORT === '1';

      if (ENABLE_BOOTSTRAP_IMPORT && pagesCount.length === 0) {
        console.log('\n📥 Импорт контента при первом запуске...\n');
        
        const fs = require('fs');
        const path = require('path');
        
        const parsedContentPath = path.join(__dirname, '../../scripts/extract-content/parsed-content.json');
        
        if (fs.existsSync(parsedContentPath)) {
          const parsedContent = JSON.parse(fs.readFileSync(parsedContentPath, 'utf-8'));
          
          console.log(`Найдено страниц для импорта: ${parsedContent.length}\n`);
          
          // Адаптация данных
          function adaptPageData(pageData) {
            const heroTitle = pageData.heroTitle || pageData.title;
            
            let contentHtml = '';
            
            if (pageData.content && Array.isArray(pageData.content)) {
              pageData.content.forEach((section: any) => {
                if (section.title) {
                  contentHtml += `<h2>${section.title}</h2>\n`;
                }
                
                if (section.type === 'text' && section.content) {
                  contentHtml += section.content + '\n';
                } else if (section.type === 'cards' && section.cards) {
                  section.cards.forEach((card: any) => {
                    contentHtml += `<div class="card">\n`;
                    if (card.title) contentHtml += `  <h3>${card.title}</h3>\n`;
                    if (card.description) contentHtml += `  <p>${card.description}</p>\n`;
                    contentHtml += `</div>\n`;
                  });
                } else if (section.type === 'grid' && section.items) {
                  contentHtml += `<div class="grid">\n`;
                  section.items.forEach((item: any) => {
                    contentHtml += `  <div class="grid-item">\n`;
                    if (item.title) contentHtml += `    <h3>${item.title}</h3>\n`;
                    if (item.content) contentHtml += `    <p>${item.content}</p>\n`;
                    contentHtml += `  </div>\n`;
                  });
                  contentHtml += `</div>\n`;
                }
              });
            }
            
            const breadcrumbsJson = pageData.breadcrumbs && pageData.breadcrumbs.length > 0
              ? JSON.stringify(pageData.breadcrumbs)
              : null;
            
            return {
              slug: pageData.slug,
              title: pageData.title,
              metaDescription: pageData.metaDescription || '',
              metaKeywords: pageData.metaKeywords || '',
              heroTitle: heroTitle,
              heroSubtitle: pageData.heroSubtitle || null,
              content: contentHtml || null,
              breadcrumbs: breadcrumbsJson,
              sidebar: pageData.sidebar || 'none',
              publishedAt: new Date().toISOString()
            };
          }
          
          let success = 0;
          let errors = 0;
          
          for (const pageData of parsedContent) {
            try {
              const adaptedData = adaptPageData(pageData);
              
              // Проверить существование
              const existing = await strapi.entityService.findMany('api::page.page', {
                filters: { slug: adaptedData.slug },
              });
              
              if (existing && existing.length > 0) {
                await strapi.entityService.update('api::page.page', existing[0].id, {
                  data: adaptedData,
                });
                success++;
              } else {
                await strapi.entityService.create('api::page.page', {
                  data: adaptedData,
                });
                success++;
              }
            } catch (error: any) {
              console.error(`❌ Ошибка при импорте ${pageData.slug}:`, error.message);
              errors++;
            }
          }
          
          console.log(`\n✅ Импорт завершен!`);
          console.log(`   - ✅ Успешно: ${success}`);
          console.log(`   - ❌ Ошибок: ${errors}\n`);
        } else {
          console.log('⚠️  Файл parsed-content.json не найден. Пропускаем импорт.\n');
        }
      } else if (!ENABLE_BOOTSTRAP_IMPORT && pagesCount.length === 0) {
        console.log('\nℹ️  Bootstrap import disabled (set MGTS_BOOTSTRAP_IMPORT=1 to enable legacy import).\n');
      }
      
      const ENABLE_BOOTSTRAP_MAINTENANCE = process.env.MGTS_BOOTSTRAP_MAINTENANCE === '1';

      // Автоматическая миграция типов карточек (legacy)
      try {
        if (!ENABLE_BOOTSTRAP_MAINTENANCE) {
          console.log('\nℹ️  Bootstrap maintenance disabled (set MGTS_BOOTSTRAP_MAINTENANCE=1 to enable legacy maintenance).\n');
          return;
        }
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '../../scripts/migration/assign-card-types.js');
        if (fs.existsSync(migrationPath)) {
          console.log('\n🔄 Проверка необходимости миграции типов карточек...\n');
          
          // Проверить, есть ли страницы без типов карточек
          const aboutPages = await strapi.entityService.findMany('api::page.page', {
            filters: {
              slug: {
                $startsWith: 'about/'
              }
            },
            limit: 1
          });
          
          if (aboutPages && aboutPages.length > 0) {
            const samplePage = aboutPages[0];
            const hasCardTypes = samplePage.content && samplePage.content.includes('data-card-type');
            
            if (!hasCardTypes) {
              console.log('📝 Запуск миграции типов карточек...\n');
              const assignCardTypes = require(migrationPath);
              await assignCardTypes({ strapi });
              console.log('✅ Миграция типов карточек завершена!\n');
            } else {
              console.log('ℹ️  Типы карточек уже назначены. Пропускаем миграцию.\n');
            }
          }
        }
      } catch (error: any) {
        console.error('⚠️  Ошибка при миграции типов карточек:', error.message);
        console.log('💡 Вы можете выполнить миграцию вручную через консоль Strapi\n');
      }
      
      // Очистка HTML контента главной страницы от дублирования (legacy)
      try {
        if (!ENABLE_BOOTSTRAP_MAINTENANCE) return;
        const path = require('path');
        const updateMainPagePath = path.join(__dirname, '../../scripts/update-main-page-content.js');
        if (require('fs').existsSync(updateMainPagePath)) {
          console.log('\n🧹 Проверка и очистка HTML контента главной страницы...\n');
          const { updateMainPageContent } = require(updateMainPagePath);
          await updateMainPageContent(strapi);
          console.log('');
        }
      } catch (error: any) {
        console.error('⚠️  Ошибка при очистке HTML контента:', error.message);
        console.log('💡 Вы можете выполнить очистку вручную через Admin Panel\n');
      }
    } catch (error: any) {
      console.error('⚠️  Ошибка при импорте контента:', error.message);
    }
  },
};

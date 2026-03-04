/**
 * news controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::news.news', ({ strapi }) => ({
  /**
   * List endpoint for the news listing page with pagination + optional filters.
   *
   * Query:
   * - page (default 1)
   * - pageSize (default 12)
   * - q (optional search in title)
   * - category (optional category slug)
   * - tag (optional tag slug)
   * - year (optional publish year, e.g. 2025)
   */
  async list(ctx) {
    const page = Math.max(1, parseInt(String(ctx.query.page || '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(ctx.query.pageSize || '12'), 10) || 12));
    const q = String(ctx.query.q || '').trim();
    const categorySlug = String(ctx.query.category || '').trim();
    const tagSlug = String(ctx.query.tag || '').trim();
    const year = ctx.query.year ? parseInt(String(ctx.query.year), 10) : null;

    const where: any = {
      publishedAt: { $notNull: true },
    };
    if (q) {
      where.title = { $containsi: q };
    }

    if (categorySlug) {
      const cats = await strapi.entityService.findMany('api::news-category.news-category', {
        filters: { slug: categorySlug },
        limit: 1,
      });
      if (!cats || cats.length === 0) {
        return this.transformResponse([], {
          pagination: { page, pageSize, pageCount: 0, total: 0 },
        });
      }
      where.category = { id: { $eq: cats[0].id } };
    }

    if (tagSlug) {
      const tags = await strapi.entityService.findMany('api::news-tag.news-tag', {
        filters: { slug: tagSlug },
        limit: 1,
      });
      if (!tags || tags.length === 0) {
        return this.transformResponse([], {
          pagination: { page, pageSize, pageCount: 0, total: 0 },
        });
      }
      // Many-to-many filter by tag id.
      where.tags = { id: { $eq: tags[0].id } };
    }

    if (year && Number.isFinite(year) && year >= 1970 && year <= 2100) {
      const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString();
      const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)).toISOString();
      where.publishDate = { $gte: start, $lt: end };
    }

    const total = await strapi.db.query('api::news.news').count({ where });
    const pageCount = total ? Math.ceil(total / pageSize) : 0;
    const offset = (page - 1) * pageSize;

    const items = await strapi.db.query('api::news.news').findMany({
      where,
      orderBy: { publishDate: 'desc' },
      offset,
      limit: pageSize,
      populate: {
        featuredImage: true,
        category: true,
        tags: true,
      },
    });

    // Match Strapi REST-ish meta.pagination shape
    return this.transformResponse(items, {
      pagination: { page, pageSize, pageCount, total },
    });
  },

  async listYears(ctx) {
    const items = await strapi.db.query('api::news.news').findMany({
      where: { publishedAt: { $notNull: true } },
      orderBy: { publishDate: 'desc' },
      limit: 5000,
      select: ['publishDate'],
    });

    const years = new Set<number>();
    for (const it of items || []) {
      const d = (it as any).publishDate;
      if (!d) continue;
      const dt = new Date(String(d));
      if (Number.isNaN(dt.getTime())) continue;
      years.add(dt.getUTCFullYear());
    }

    const out = Array.from(years).sort((a, b) => b - a).map((y) => ({ year: y }));
    return this.transformResponse(out);
  },

  async findBySlug(ctx) {
    const { slug } = ctx.params;
    
    // NOTE: entityService + filters behaves inconsistently in our current setup,
    // but db.query works reliably (same as /news/list). Use db.query for detail.
    const news = await strapi.db.query('api::news.news').findMany({
      where: {
        slug: String(slug),
        publishedAt: { $notNull: true },
      },
      limit: 1,
      populate: {
        featuredImage: true,
        gallery: true,
        category: true,
        tags: true,
      },
    });
    
    if (!news || news.length === 0) {
      return ctx.notFound('News not found');
    }

    // Best-effort view counter increment (non-blocking for response)
    try {
      await strapi.entityService.update('api::news.news', news[0].id, {
        data: { viewsCount: (news[0].viewsCount || 0) + 1 },
      });
    } catch (e) {
      // ignore
    }
    
    return this.transformResponse(news[0]);
  },

  async getFeatured(ctx) {
    const limit = ctx.query.limit ? parseInt(String(ctx.query.limit), 10) : 5;
    const whereFeatured: any = { isFeatured: true, publishedAt: { $notNull: true } };

    let items = await strapi.db.query('api::news.news').findMany({
      where: whereFeatured,
      orderBy: { publishDate: 'desc' },
      limit,
      populate: { featuredImage: true, category: true, tags: true },
    });

    // Fallback: if no featured set, return latest news so the block isn't empty
    if (!items || items.length === 0) {
      items = await strapi.db.query('api::news.news').findMany({
        where: { publishedAt: { $notNull: true } },
        orderBy: { publishDate: 'desc' },
        limit,
        populate: { featuredImage: true, category: true, tags: true },
      });
    }

    return this.transformResponse(items);
  },

  async listCategories(ctx) {
    const items = await strapi.db.query('api::news-category.news-category').findMany({
      orderBy: { name: 'asc' },
    });
    return this.transformResponse(items);
  },

  async listTags(ctx) {
    const items = await strapi.db.query('api::news-tag.news-tag').findMany({
      orderBy: { name: 'asc' },
    });
    return this.transformResponse(items);
  },

  async getByCategory(ctx) {
    const { slug } = ctx.params;
    const page = Math.max(1, parseInt(String(ctx.query.page || '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(ctx.query.pageSize || '12'), 10) || 12));
    
    // Найти категорию
    const category = await strapi.entityService.findMany('api::news-category.news-category', {
      filters: { slug: String(slug) },
      limit: 1,
    });

    if (!category || category.length === 0) {
      return ctx.notFound('Category not found');
    }

    const categoryId = category[0].id;
    const where: any = {
        category: { id: { $eq: categoryId } },
        publishedAt: { $notNull: true }
    };

    const total = await strapi.db.query('api::news.news').count({ where });
    const pageCount = total ? Math.ceil(total / pageSize) : 0;
    const offset = (page - 1) * pageSize;

    const items = await strapi.db.query('api::news.news').findMany({
      where,
      orderBy: { publishDate: 'desc' },
      offset,
      limit: pageSize,
      populate: {
        featuredImage: true,
        category: true,
        tags: true,
      },
    });

    return this.transformResponse(items, {
      pagination: { page, pageSize, pageCount, total },
    });
  }

  ,

  async getByTag(ctx) {
    const { slug } = ctx.params;
    const page = Math.max(1, parseInt(String(ctx.query.page || '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(ctx.query.pageSize || '12'), 10) || 12));

    const tag = await strapi.entityService.findMany('api::news-tag.news-tag', {
      filters: { slug: String(slug) },
      limit: 1,
    });

    if (!tag || tag.length === 0) {
      return ctx.notFound('Tag not found');
    }

    const where: any = {
      tags: { id: { $eq: tag[0].id } },
      publishedAt: { $notNull: true },
    };

    const total = await strapi.db.query('api::news.news').count({ where });
    const pageCount = total ? Math.ceil(total / pageSize) : 0;
    const offset = (page - 1) * pageSize;

    const items = await strapi.db.query('api::news.news').findMany({
      where,
      orderBy: { publishDate: 'desc' },
      offset,
      limit: pageSize,
      populate: {
        featuredImage: true,
        category: true,
        tags: true,
      },
    });

    return this.transformResponse(items, {
      pagination: { page, pageSize, pageCount, total },
    });
  },
}));


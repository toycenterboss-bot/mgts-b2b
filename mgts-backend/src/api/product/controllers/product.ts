/**
 * product controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    
    const products = await strapi.entityService.findMany('api::product.product', {
      filters: { 
        slug,
        publishedAt: { $notNull: true }
      },
      populate: {
        images: true,
        category: {
          populate: {
            parent: true
          }
        },
        specifications: true,
        variants: true,
        relatedProducts: {
          populate: {
            images: true
          }
        }
      },
    });
    
    if (!products || products.length === 0) {
      return ctx.notFound('Product not found');
    }
    
    return this.transformResponse(products[0]);
  },

  async getByCategory(ctx) {
    const { slug } = ctx.params;
    
    // Найти категорию
    const category = await strapi.entityService.findMany('api::product-category.product-category', {
      filters: { slug: String(slug) }
    });

    if (!category || category.length === 0) {
      return ctx.notFound('Category not found');
    }

    const categoryId = category[0].id;
    const products = await strapi.entityService.findMany('api::product.product', {
      filters: {
        category: { id: { $eq: categoryId } },
        publishedAt: { $notNull: true }
      },
      populate: {
        images: true,
        category: true
      },
      sort: { name: 'asc' }
    });

    return this.transformResponse(products);
  },

  async search(ctx) {
    const q = ctx.query.q;
    
    if (!q || typeof q !== 'string') {
      return ctx.badRequest('Search query is required');
    }

    const limit = ctx.query.limit ? parseInt(String(ctx.query.limit), 10) : 20;

    const products = await strapi.entityService.findMany('api::product.product', {
      filters: {
        $or: [
          { name: { $containsi: String(q) } },
          { shortDescription: { $containsi: String(q) } },
          { sku: { $containsi: String(q) } }
        ],
        publishedAt: { $notNull: true }
      },
      populate: {
        images: true,
        category: true
      },
      limit: Number(limit)
    });

    return this.transformResponse(products);
  }
}));


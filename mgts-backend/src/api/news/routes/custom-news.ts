/**
 * custom news routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/news/list',
      handler: 'news.list',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news/categories',
      handler: 'news.listCategories',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news/tags',
      handler: 'news.listTags',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news/years',
      handler: 'news.listYears',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news/slug/:slug',
      handler: 'news.findBySlug',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news/featured',
      handler: 'news.getFeatured',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news/category/:slug',
      handler: 'news.getByCategory',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/news/tag/:slug',
      handler: 'news.getByTag',
      config: {
        auth: false,
      },
    },
  ],
};




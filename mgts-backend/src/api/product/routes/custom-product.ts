/**
 * custom product routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/products/slug/:slug',
      handler: 'product.findBySlug',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/products/category/:slug',
      handler: 'product.getByCategory',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/products/search',
      handler: 'product.search',
      config: {
        auth: false,
      },
    },
  ],
};




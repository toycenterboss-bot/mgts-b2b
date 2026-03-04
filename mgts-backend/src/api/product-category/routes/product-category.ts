/**
 * product-category router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::product-category.product-category', {
  config: {
    find: {
      auth: false,
    },
    findOne: {
      auth: false,
    },
  },
});




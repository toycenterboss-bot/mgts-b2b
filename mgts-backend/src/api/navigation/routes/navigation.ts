/**
 * navigation router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::navigation.navigation', {
  config: {
    find: {
      auth: false,
    },
  },
});




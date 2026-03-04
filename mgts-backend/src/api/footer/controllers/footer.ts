/**
 * footer controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::footer.footer', ({ strapi }) => ({
  async find(ctx) {
    // Для singleType используем findMany
    const footerList = await strapi.entityService.findMany('api::footer.footer', {
      populate: {
        sections: {
          populate: {
            links: true,
          },
        },
        legalLinks: true,
        socialLinks: true,
      },
    });

    const footer = Array.isArray(footerList) ? footerList[0] : footerList;
    
    if (!footer) {
      return ctx.notFound('Footer not found');
    }

    return this.transformResponse(footer);
  }
}));


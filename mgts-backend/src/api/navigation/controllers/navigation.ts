/**
 * navigation controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::navigation.navigation', ({ strapi }) => ({
  async find(ctx) {
    // Для singleType используем findMany
    const populate: any = {
      logo: true,
      mainMenuItems: true,
      megaMenus: {
        populate: {
          sections: {
            populate: {
              links: true,
            },
          },
        },
      },
      megaMenuCta: true,
      deepNavTrees: {
        populate: {
          items: {
            populate: {
              children: true,
            },
          },
        },
      },
    };

    const navigationList = await strapi.entityService.findMany('api::navigation.navigation', {
      populate,
    });

    const navigation = Array.isArray(navigationList) ? navigationList[0] : navigationList;
    
    if (!navigation) {
      return ctx.notFound('Navigation not found');
    }

    return this.transformResponse(navigation);
  }

  ,

  async getDeepNavTree(ctx) {
    const { key } = ctx.params;
    const k = String(key || '').trim();
    if (!k) return ctx.badRequest('Missing key');

    const populate: any = {
      deepNavTrees: {
        populate: {
          items: {
            populate: {
              children: true,
            },
          },
        },
      },
    };

    const navigationList = await strapi.entityService.findMany('api::navigation.navigation', {
      populate,
    });

    const navigation = Array.isArray(navigationList) ? navigationList[0] : navigationList;
    const trees = (navigation && (navigation as any).deepNavTrees) || [];
    const tree = Array.isArray(trees) ? trees.find((t: any) => t && t.key === k) : null;

    if (!tree) return ctx.notFound('DeepNav tree not found');
    return this.transformResponse(tree);
  },
}));


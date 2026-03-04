/**
 * Custom navigation routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/navigation/deep-nav/:key',
      handler: 'navigation.getDeepNavTree',
      config: {
        auth: false,
      },
    },
  ],
};


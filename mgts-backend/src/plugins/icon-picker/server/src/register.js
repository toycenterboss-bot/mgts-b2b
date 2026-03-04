"use strict";

module.exports = ({ strapi }) => {
  if (strapi?.customFields) {
    strapi.customFields.register({
      name: "icon",
      plugin: "icon-picker",
      type: "string",
    });
  }
};

"use strict";

module.exports = {
  "content-api": [
    {
      method: "GET",
      path: "/icon-picker/icons",
      handler: "plugin::icon-picker.icon-picker.list",
      config: {
        auth: false,
      },
    },
  ],
};

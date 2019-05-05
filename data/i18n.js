/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const browser = require("./browserAPI");

export default {
  install: function(Vue)
  {
    Vue.prototype.$t = function(id, ...params)
    {
      let message = browser.i18n.getMessage(id);
      for (let i = 0; i < params.length; i++)
        message = message.replace(new RegExp(`\\{${i + 1}\\}`, "g"), params[i]);
      return message;
    };
  }
};

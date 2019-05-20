/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {i18n} from "./browserAPI";

export default {
  install: function(Vue)
  {
    Vue.prototype.$t = function(id, ...params)
    {
      let message = i18n.getMessage(id);
      for (let i = 0; i < params.length; i++)
        message = message.replace(new RegExp(`\\{${i + 1}\\}`, "g"), params[i]);
      return message;
    };
  }
};

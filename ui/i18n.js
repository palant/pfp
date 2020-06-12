/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {i18n} from "./browserAPI.js";

export function $t(id, ...params)
{
  let path;
  if (id.length && id[0] == "/")
  {
    path = "";
    id = id.substr(1);
  }
  else if (this.$options.localePath)
    path = this.$options.localePath;
  else
    throw new Error("Components without localePath option can only use absolute string paths");

  while (id.length)
  {
    if (id[0] == ".")
    {
      path = path.replace(/\/?[^/]+$/, "");
      id = id.substr(1);
    }
    else if (id[0] == "(")
    {
      let index = id.indexOf(")");
      if (index < 0)
        throw new Error("Unclosed path component in string ID.");

      if (path)
        path += "/";
      path += id.substring(1, index);
      id = id.substr(index + 1);
    }
    else
      break;
  }

  if (path)
    id = path.replace(/\//g, "@") + "@" + id;

  let message = i18n.getMessage(id);
  for (let i = 0; i < params.length; i++)
    message = message.replace(new RegExp(`\\{${i + 1}\\}`, "g"), params[i]);
  return message;
}

export default {
  install: function(Vue)
  {
    Vue.prototype.$t = $t;
  }
};

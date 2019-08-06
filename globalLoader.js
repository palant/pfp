/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

module.exports = function(map)
{
  return {
    name: "global-loader",
    resolveId(id)
    {
      if (!map.hasOwnProperty(id))
        return null;
      return id;
    },
    load(id)
    {
      if (!map.hasOwnProperty(id))
        return null;

      return "export default " + map[id];
    }
  };
};

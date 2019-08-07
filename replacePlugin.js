/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const path = require("path");

module.exports = function(map)
{
  map = new Map(Object.entries(map).map(([key, value]) => [path.normalize(key), path.normalize(value)]));

  return {
    name: "replace",
    resolveId(id, importer)
    {
      if (!id.endsWith(".js"))
        id += ".js";
      if (!importer)
        importer = __dirname;
      let resolved = path.normalize(path.join(path.dirname(importer), ...id.split("/")));
      let mapped = map.get(resolved);
      if (mapped)
        return mapped;
      else
        return null;
    }
  };
};

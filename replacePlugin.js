/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const fs = require("fs");
const path = require("path");

module.exports = function(map)
{
  map = new Map(Object.entries(map).map(([key, value]) => [path.normalize(key), path.normalize(value)]));

  return {
    name: "replace",
    load(id)
    {
      let newId = map.get(id);
      if (!newId)
        return null;

      return new Promise((resolve, reject) =>
      {
        fs.readFile(newId, {encoding: "utf-8"}, (err, data) =>
        {
          if (err)
            reject(err);
          else
            resolve(data);
        });
      });
    }
  };
};

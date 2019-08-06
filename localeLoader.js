/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const fs = require("fs");
const path = require("path");

function walkDirectory(dir, callback)
{
  return new Promise((resolve, reject) =>
  {
    fs.readdir(dir, {withFileTypes: true}, (err, files) =>
    {
      if (err)
      {
        reject(err);
        return;
      }

      let subdirs = [];
      for (let file of files)
      {
        let filePath = path.join(dir, file.name);
        if (file.isDirectory())
          subdirs.push(walkDirectory(filePath, callback));
        else if (file.isFile && file.name.endsWith(".json"))
          callback(filePath);
      }
      resolve(Promise.all(subdirs));
    });
  });
}

module.exports = function(localeRoot)
{
  return {
    name: "locale-loader",
    resolveId(id)
    {
      return id == "locale" ? id : null;
    },

    load(id)
    {
      if (id != "locale")
        return null;

      let locale = {};

      return walkDirectory(localeRoot, file =>
      {
        let parts = path.relative(localeRoot, file).split(path.sep);

        let fileName = parts.pop();
        if (!fileName.startsWith("_"))
          parts.push(path.basename(fileName, ".json"));

        let prefix = "";
        if (parts.length)
          prefix = parts.join("@") + "@";

        let data = JSON.parse(fs.readFileSync(file, {
          encoding: "utf-8"
        }));

        for (let name of Object.keys(data))
          locale[prefix + name] = data[name];
      }).then(() =>
      {
        return "export default " + JSON.stringify(locale, null, 2);
      });
    }
  };
};

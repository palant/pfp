/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let masterPassword = require("./masterPassword");
let storage = require("./storage");
let importer = require("./importers/legacy");

const STORAGE_PREFIX = "site:";

function migrateData(master, setSite, setPassword)
{
  return storage.getAllByPrefix(STORAGE_PREFIX, null).then(sites =>
  {
    return Promise.all([
      sites,
      masterPassword.changePassword(master, true),
      storage.delete("masterPassword")
    ]);
  }).then(([sites]) =>
  {
    let mergeActions = [];

    for (let site in sites)
    {
      let siteData = sites[site];
      site = site.substr(STORAGE_PREFIX.length);
      if (siteData.alias)
      {
        mergeActions.push(setSite({site, alias: siteData.alias}));
        continue;
      }

      mergeActions.push(setSite({site}));

      for (let key in siteData.passwords)
      {
        let name = key;
        let revision = "";
        let index = key.indexOf("\n");
        if (index >= 0)
        {
          name = key.substr(0, index);
          revision = key.substr(index + 1);
        }

        mergeActions.push(
          importer.importPassword(site, name, revision, siteData.passwords[key], setPassword)
        );
      }
    }

    return Promise.all(mergeActions);
  });
}
exports.migrateData = migrateData;

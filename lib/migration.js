/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {derivePasswordLegacy} from "./crypto.js";
import storage from "./storage.js";

export function migrateData(masterPassword, STORAGE_PREFIX, setPassword)
{
  return storage.getAllByPrefix(STORAGE_PREFIX).then(data =>
  {
    let actions = [];
    let entries = Object.keys(data).map(key => data[key]);
    for (let passwordData of entries)
    {
      if (passwordData.type != "generated")
        continue;

      let {site, name, revision, length, lower, upper, number, symbol, notes} = passwordData;
      let params = {
        masterPassword,
        domain: site,
        name, revision, length, lower, upper, number, symbol
      };
      actions.push(derivePasswordLegacy(params).then(password =>
      {
        let entry = {
          type: "stored",
          site, name, revision, password
        };
        if (notes)
          entry.notes = notes;
        return setPassword(entry);
      }));
    }
    return Promise.all(actions);
  }).then(() =>
  {
    return storage.set("format", 3, null);
  });
}

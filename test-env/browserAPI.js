/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import path from "path";

let browser = {};

browser.runtime = {
  getURL: filepath =>
  {
    return path.resolve(process.cwd(), ...filepath.split("/"));
  }
};

export const storageData = Object.create(null);

function clone(value)
{
  return JSON.parse(JSON.stringify(value));
}

browser.storage = {
  local: {
    get: function(keys)
    {
      let items = {};
      if (typeof keys == "string")
        keys = [keys];
      if (!keys)
        keys = Object.keys(storageData);
      for (let key of keys)
        if (key in storageData)
          items[key] = clone(storageData[key]);
      return Promise.resolve(items);
    },

    set: function(items)
    {
      return Promise.resolve().then(() =>
      {
        for (let key of Object.keys(items))
          storageData[key] = clone(items[key]);
      });
    },

    remove: function(keys)
    {
      return Promise.resolve().then(() =>
      {
        if (typeof keys == "string")
          keys = [keys];
        for (let key of keys)
          delete storageData[key];
      });
    }
  }
};

export default browser;

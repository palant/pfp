/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import path from "path";
import url from "url";

let browser = {};

browser.runtime = {
  getURL: filepath =>
  {
    return url.pathToFileURL(path.resolve(process.cwd(), ...filepath.split("/"))).href;
  }
};

export const storageData = Object.create(null);
export const sessionStorage = Object.create(null);

function clone(value)
{
  return JSON.parse(JSON.stringify(value));
}

function setupStorage(storageData)
{
  return {
    get: async function(keys)
    {
      let items = {};
      if (typeof keys == "string")
        keys = [keys];
      if (!keys)
        keys = Object.keys(storageData);
      for (let key of keys)
        if (key in storageData)
          items[key] = clone(storageData[key]);
      return items;
    },

    set: async function(items)
    {
      for (let key of Object.keys(items))
        storageData[key] = clone(items[key]);
    },

    remove: async function(keys)
    {
      if (typeof keys == "string")
        keys = [keys];
      for (let key of keys)
        delete storageData[key];
    }
  };
}

browser.storage = {
  local: setupStorage(storageData),
  session: setupStorage(sessionStorage)
};

browser.alarms = {
  onAlarm: {
    addListener(callback)
    {
    },
    removeListener(callback)
    {
    }
  },
  create(name, alarmInfo)
  {
  },
  clear(name)
  {
  }
}

export default browser;

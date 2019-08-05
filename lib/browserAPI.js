/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

function promisify(method, numArgs, ...args)
{
  return new Promise((resolve, reject) =>
  {
    if (args.length != numArgs)
    {
      throw new Error("Unexpected number of arguments: got " + args.length +
                      ", expected " + numArgs);
    }

    this[method](...args, result =>
    {
      if (browser.runtime.lastError)
        reject(browser.runtime.lastError.message);
      else
        resolve(result);
    });
  });
}

function promisifyAPI(api)
{
  return {
    storage: {
      local: {
        get: promisify.bind(api.storage.local, "get", 1),
        getBytesInUse: promisify.bind(api.storage.local, "getBytesInUse", 1),
        set: promisify.bind(api.storage.local, "set", 1),
        remove: promisify.bind(api.storage.local, "remove", 1),
        clear: promisify.bind(api.storage.local, "clear", 0)
      }
    },
    tabs: {
      query: promisify.bind(api.tabs, "query", 1),
      create: promisify.bind(api.tabs, "create", 1),
      remove: promisify.bind(api.tabs, "remove", 1),
      update: promisify.bind(api.tabs, "update", 2),
      executeScript: promisify.bind(api.tabs, "executeScript", 1),
      sendMessage: promisify.bind(api.tabs, "sendMessage", 2),
      onUpdated: api.tabs.onUpdated,
      onRemoved: api.tabs.onRemoved
    },
    runtime: api.runtime,
    browserAction: api.browserAction
  };
}

let browser = window.browser;
if (!browser)
  browser = promisifyAPI(chrome);

export default browser;

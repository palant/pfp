/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome, browser */

let browser_ = (typeof browser != "undefined" ? browser : {});

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
      if (chrome.runtime.lastError)
        reject(chrome.runtime.lastError.message);
      else
        resolve(result);
    });
  });
}

if (typeof browser_.storage == "undefined")
{
  browser_.storage = {
    local: {
      get: promisify.bind(chrome.storage.local, "get", 1),
      getBytesInUse: promisify.bind(chrome.storage.local, "getBytesInUse", 1),
      set: promisify.bind(chrome.storage.local, "set", 1),
      remove: promisify.bind(chrome.storage.local, "remove", 1),
      clear: promisify.bind(chrome.storage.local, "clear", 0)
    }
  };
}

if (typeof browser_.tabs == "undefined")
{
  browser_.tabs = {
    query: promisify.bind(chrome.tabs, "query", 1),
    create: promisify.bind(chrome.tabs, "create", 1),
    remove: promisify.bind(chrome.tabs, "remove", 1),
    update: promisify.bind(chrome.tabs, "update", 2),
    executeScript: promisify.bind(chrome.tabs, "executeScript", 2),
    sendMessage: promisify.bind(chrome.tabs, "sendMessage", 2),
    onUpdated: chrome.tabs.onUpdated,
    onRemoved: chrome.tabs.onRemoved
  };
}

if (typeof browser_.runtime == "undefined")
  browser_.runtime = chrome.runtime;

module.exports = browser_;

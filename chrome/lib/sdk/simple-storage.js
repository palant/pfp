/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let storage = {};

let wrapper = {
  get: function(target, property, receiver)
  {
    let result = target[property];
    if (typeof result == "object")
      return new Proxy(result, wrapper);
    else
      return result;
  },

  set: function(target, property, value, receiver)
  {
    scheduleWrite();
    return target[property] = value;
  },

  deleteProperty: function(target, property)
  {
    scheduleWrite();
    return delete target[property];
  }
};

exports.init = new Promise((resolve, reject) =>
{
  chrome.storage.local.get("passwords", function(items)
  {
    if (chrome.runtime.lastError)
      reject(chrome.runtime.lastError);
    else
    {
      if (items.passwords)
        storage = items.passwords;
      resolve();
    }
  });
});

let writeTimeout = null;

function scheduleWrite()
{
  if (writeTimeout)
    clearTimeout(writeTimeout);
  writeTimeout = setTimeout(function()
  {
    writeTimeout = null;
    chrome.storage.local.set({passwords: storage});
  }, 0);
}

Object.defineProperty(exports, "storage", {
  enumerable: true,
  get: () => new Proxy(storage, wrapper)
});

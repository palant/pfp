/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global window, chrome, browser */

let hasBrowserAPIs = (typeof browser != "undefined");

// Debugging - Edge won't let us see errors during startup, log them.
window.loggedErrors = [];
window.onerror = function(...args)
{
  window.loggedErrors.push(args);
};

// TextEncoder and TextDecoder are unsupported in Edge
if (typeof window.TextEncoder == "undefined")
{
  window.TextEncoder = function(encoding)
  {
    if (encoding != "utf-8")
      throw new Error("Unsupported encoding");
  };
  window.TextEncoder.prototype = {
    encode: function(str)
    {
      let bytes = [];
      let encoded = window.encodeURIComponent(str);
      for (let i = 0; i < encoded.length; i++)
      {
        if (encoded[i] == "%")
        {
          bytes.push(parseInt(encoded.substr(i + 1, 2), 16));
          i += 2;
        }
        else
          bytes.push(encoded.charCodeAt(i));
      }
      return Uint8Array.from(bytes);
    }
  };
}

if (typeof window.TextDecoder == "undefined")
{
  window.TextDecoder = function(encoding)
  {
    if (encoding != "utf-8")
      throw new Error("Unsupported encoding");
  };
  window.TextDecoder.prototype = {
    decode: function(buffer)
    {
      let array = new Uint8Array(buffer);
      let bytes = [];
      for (let i = 0; i < array.length; i++)
        bytes.push((array[i] < 16 ? "%0" : "%") + array[i].toString(16));
      return window.decodeURIComponent(bytes.join(""));
    }
  };
}

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
      if (exports.runtime.lastError)
        reject(exports.runtime.lastError.message);
      else
        resolve(result);
    });
  });
}

if (hasBrowserAPIs && typeof browser.storage != "undefined")
{
  try
  {
    browser.storage.local.get("dummy");

    // The above didn't throw, meaning we can use browser.storage directly.
    exports.storage = browser.storage;
  }
  catch (e)
  {
    // browser.storage API expects callbacks on Edge, see
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/9420301/
    let storage = browser.storage.local;
    exports.storage = {
      local: {
        get: promisify.bind(storage, "get", 1),
        getBytesInUse: promisify.bind(storage, "getBytesInUse", 1),
        set: promisify.bind(storage, "set", 1),
        remove: promisify.bind(storage, "remove", 1),
        clear: promisify.bind(storage, "clear", 0)
      }
    };
  }
}
else
{
  exports.storage = {
    local: {
      get: promisify.bind(chrome.storage.local, "get", 1),
      getBytesInUse: promisify.bind(chrome.storage.local, "getBytesInUse", 1),
      set: promisify.bind(chrome.storage.local, "set", 1),
      remove: promisify.bind(chrome.storage.local, "remove", 1),
      clear: promisify.bind(chrome.storage.local, "clear", 0)
    }
  };
}

if (hasBrowserAPIs && typeof browser.tabs != "undefined")
{
  try
  {
    browser.tabs.query({});

    // The above didn't throw, meaning we can use browser.tabs directly.
    exports.tabs = browser.tabs;
  }
  catch (e)
  {
    // browser.tabs API expects callbacks on Edge, see
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/9421085/
    let tabs = browser.tabs;
    exports.tabs = {
      query: promisify.bind(tabs, "query", 1),
      create: promisify.bind(tabs, "create", 1),
      remove: promisify.bind(tabs, "remove", 1),
      update: promisify.bind(tabs, "update", 2),
      executeScript: promisify.bind(tabs, "executeScript", 1),
      sendMessage: promisify.bind(tabs, "sendMessage", 2),
      onUpdated: tabs.onUpdated,
      onRemoved: tabs.onRemoved
    };
  }
}
else
{
  exports.tabs = {
    query: promisify.bind(chrome.tabs, "query", 1),
    create: promisify.bind(chrome.tabs, "create", 1),
    remove: promisify.bind(chrome.tabs, "remove", 1),
    update: promisify.bind(chrome.tabs, "update", 2),
    executeScript: promisify.bind(chrome.tabs, "executeScript", 1),
    sendMessage: promisify.bind(chrome.tabs, "sendMessage", 2),
    onUpdated: chrome.tabs.onUpdated,
    onRemoved: chrome.tabs.onRemoved
  };
}

if (hasBrowserAPIs && typeof browser.runtime != "undefined")
  exports.runtime = browser.runtime;
else
  exports.runtime = chrome.runtime;

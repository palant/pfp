/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global window, chrome, browser */

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
      if (module.exports.runtime.lastError)
        reject(module.exports.runtime.lastError.message);
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
    runtime: api.runtime
  };
}

let browser = window.browser;
if (browser)
{
  try
  {
    browser.tabs.query({});
  }
  catch (e)
  {
    // Edge exposes the browser namespace but still expects callbacks.
    browser = promisifyAPI(browser);
  }
}
else
  browser = promisifyAPI(chrome);

module.exports = browser;

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

exports.init = new Promise((resolve, reject) =>
{
  chrome.storage.local.get("passwords", function(items)
  {
    if (chrome.runtime.lastError)
      reject(chrome.runtime.lastError);
    else
    {
      exports.storage = items.passwords;
      setTimeout(function()
      {
        chrome.storage.local.set({passwords: exports.storage});
      }, 30000);
      resolve();
    }
  });
});

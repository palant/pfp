/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");

exports.openAndWait = function(url, expectedUrl)
{
  return browser.tabs.create({url, active: true}).then(tab =>
  {
    let id = tab.id;
    return new Promise((resolve, reject) =>
    {
      let updateCallback = (tabId, changeInfo, tab) =>
      {
        if (tabId == id && tab.url.startsWith(expectedUrl))
        {
          resolve(tab.url);
          browser.tabs.remove(id);
          browser.tabs.onUpdated.removeListener(updateCallback);
          browser.tabs.onRemoved.removeListener(removeCallback);
        }
      };
      let removeCallback = (tabId, removeInfo) =>
      {
        if (tabId == id)
        {
          reject("tab-closed");
          browser.tabs.onUpdated.removeListener(updateCallback);
          browser.tabs.onRemoved.removeListener(removeCallback);
        }
      };
      browser.tabs.onUpdated.addListener(updateCallback);
      browser.tabs.onRemoved.addListener(removeCallback);
    });
  });
};

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let api = (typeof browser != "undefined" ? browser : chrome);

if (!api.scripting)
{
  api.scripting = {
    executeScript(details)
    {
      function convertDetails(details)
      {
        if (details.func)
        {
          return {
            code: `(${details.func})(...${JSON.stringify(details.args)})`
          };
        }
        else
        {
          if (!details.files || details.files.length != 1)
            throw new Error("Exactly one file has to be specified");

          return {
            file: chrome.runtime.getURL(details.files[0])
          };
        }
      }

      return api.tabs.executeScript(details.target.tabId, convertDetails(details));
    }
  };
}

export default api;

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");
let {getCurrentHost} = require("./ui");
let passwords = require("./passwords");

let maxScriptID = 0;

function fillIn(site, name, revision)
{
  return Promise.all([
    passwords.getPassword(site, name, revision),
    getCurrentHost().then(currentHost => Promise.all([currentHost, passwords.getAlias(currentHost)]))
  ]).then(([password, [currentHost, [_, currentSite]]]) =>
  {
    if (currentSite != site)
      return Promise.reject("wrong_site_message");

    return new Promise((resolve, reject) =>
    {
      let scriptID = ++maxScriptID;
      let port = require("./messaging").getPort("contentScript");

      port.on("done", function doneHandler({scriptID: source, result})
      {
        if (source != scriptID)
          return;

        port.off("done", doneHandler);
        if (result)
          reject(result);
        else
        {
          resolve();

          // Make sure that the popup is closed on Firefox Android,
          // work-around for https://bugzil.la/1433604
          browser.tabs.update({active: true});
        }
      });

      browser.tabs.executeScript({
        code: "var _parameters = " + JSON.stringify({
          scriptID,
          host: currentHost,
          name, password
        })
      }).catch(reject);

      browser.tabs.executeScript({file: "data/fillIn.js"}).catch(reject);
    });
  });
}
exports.fillIn = fillIn;

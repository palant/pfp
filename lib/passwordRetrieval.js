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
      return Promise.reject("wrong-site-message");

    return new Promise((resolve, reject) =>
    {
      let scriptID = ++maxScriptID;
      let port = require("./messaging").getPort("contentScript");

      function connectHandler()
      {
        port.emit("fillIn", {
          target: scriptID,
          host: currentHost,
          name, password
        });
      }

      function doneHandler({source, result})
      {
        if (source != scriptID)
          return;

        port.off("connect", connectHandler);
        port.off("done", doneHandler);
        if (result)
          reject(result);
        else
          resolve();
      }

      port.on("connect", connectHandler);
      port.on("done", doneHandler);

      browser.tabs.executeScript({code: "var scriptID = " + JSON.stringify(scriptID)});
      browser.tabs.executeScript({file: "data/fillIn.js"});
    });
  });
}
exports.fillIn = fillIn;

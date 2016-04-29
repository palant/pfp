/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {data} = require("sdk/self");
let tabs = require("sdk/tabs");
let clipboard = require("sdk/clipboard");

let {getCurrentHost} = require("./utils");
let passwords = require("../passwords");

function fillIn(site, password)
{
  return new Promise((resolve, reject) =>
  {
    let currentHost = getCurrentHost();
    let [_, currentSite] = passwords.getAlias(currentHost);
    if (currentSite != site)
    {
      reject("wrong-site-message");
      return;
    }

    let worker = tabs.activeTab.attach({
      contentScriptFile: data.url("fillIn.js"),
      contentScriptOptions: {
        host: currentHost,
        password: password
      }
    });
    worker.port.on("success", () =>
    {
      worker.destroy();
      resolve();
    });
    worker.port.on("failure", () =>
    {
      worker.destroy();
      reject("no-password-fields");
    });
    worker.on("error", (e) =>
    {
      worker.destroy();
      reject(e);
    });
  });
}

module.exports = function(panel)
{
  panel.port.on("fillIn", ({site, name}) =>
  {
    passwords.getPassword(site, name).then(password =>
    {
      return fillIn(site, password).then(() =>
      {
        panel.hide();

        // Huge hack: closing a sidebar is the only way to set focus to the content
        // area.
        let sidebar = require("sdk/ui").Sidebar({
          id: "dummy",
          title: "dummy",
          url: data.url("dummy")
        });
        sidebar.show(tabs.activeTab.window);
        sidebar.hide(tabs.activeTab.window);
        sidebar.dispose();
      });
    }).catch(reason =>
    {
      if (typeof reason == "string")
        panel.port.emit("fillInFailed", reason);
      else
        console.error(reason);
    });
  });

  panel.port.on("copyToClipboard", ({site, name}) =>
  {
    passwords.getPassword(site, name).then(password =>
    {
      clipboard.set(password, "text");
      panel.port.emit("passwordCopied");
    }).catch(reason =>
    {
      if (typeof reason == "string")
        panel.port.emit("passwordCopyFailed", reason);
      else
        console.error(reason);
    });
  });
};

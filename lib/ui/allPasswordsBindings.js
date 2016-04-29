/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {data} = require("sdk/self");
let windows = require("sdk/windows");
let tabs = require("sdk/tabs");
let clipboard = require("sdk/clipboard");
let {PageMod} = require("sdk/page-mod");

let passwords = require("../passwords");

let pageURL = data.url("allpasswords/allpasswords.html");

PageMod({
  include: pageURL,
  contentScriptFile: data.url("allpasswords/allpasswords.js"),
  contentScriptWhen: "ready",
  onAttach: function(worker)
  {
    worker.port.emit("init", passwords.getAllPasswords());
    worker.port.on("removePassword", removePassword.bind(null, worker));
    worker.port.on("copyToClipboard", copyToClipboard.bind(null, worker));
    worker.port.on("importPasswordData", importPasswordData.bind(null, worker));
  }
});

function removePassword(worker, {site, name, id})
{
  let promise = passwords.removePassword({site, name});
  promise.then(() => worker.port.emit("passwordRemoved", id))
         .catch(reason => worker.port.emit("passwordError", String(reason)));
}

function copyToClipboard(worker, {site, name, id})
{
  let promise = passwords.getPassword(site, name);
  promise.then(password =>
  {
    clipboard.set(password, "text");
    worker.port.emit("passwordCopied", id);
  }).catch(reason => worker.port.emit("passwordError", String(reason)));
}

function importPasswordData(worker, sites)
{
  for (let site in sites)
  {
    let siteInfo = sites[site];
    if (!siteInfo || typeof siteInfo != "object")
      continue;

    passwords.removeAlias(site);
    if (siteInfo.passwords && typeof siteInfo.passwords == "object")
      for (let name in siteInfo.passwords)
        passwords.addRawPassword(site, name, siteInfo.passwords[name]);

    if (siteInfo.aliases && Symbol.iterator in siteInfo.aliases)
    {
      for (let alias of siteInfo.aliases)
      {
        if (!alias || typeof alias != "string")
          continue;

        if (!passwords.hasPasswords(alias))
          passwords.addAlias(alias, site);
      }
    }
  }
  worker.port.emit("dataImported");
}

module.exports = function(panel)
{
  panel.port.on("showAllPasswords", function()
  {
    // Only look for existing tab in the active window, don't activate
    // background windows to avoid unexpected effects.
    let wnd = windows.browserWindows.activeWindow;
    for (let tab of wnd.tabs)
    {
      if (tab.url == pageURL)
      {
        tab.activate();
        panel.hide();
        return;
      }
    }

    tabs.open(pageURL);
    panel.hide();
  });
};

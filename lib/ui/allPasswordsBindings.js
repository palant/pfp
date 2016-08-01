/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {PageMod} = require("sdk/page-mod");

let passwords = require("../passwords");

let pageURL = external.getURL("allpasswords/allpasswords.html");

PageMod({
  include: pageURL,
  contentScriptFile: external.getURL("allpasswords/allpasswords.js"),
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
    external.setClipboard(password);
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
    external.openTab(pageURL);
    panel.hide();
  });
};

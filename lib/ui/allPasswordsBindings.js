/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

require("contentPage").on("connect", function(port)
{
  port.emit("init", passwords.getAllPasswords());
  port.on("removePassword", removePassword.bind(null, port));
  port.on("copyToClipboard", copyToClipboard.bind(null, port));
  port.on("importPasswordData", importPasswordData.bind(null, port));
});

let passwords = require("../passwords");

function removePassword(port, {site, name, id})
{
  let promise = passwords.removePassword({site, name});
  promise.then(() => port.emit("passwordRemoved", id))
         .catch(reason => port.emit("passwordError", String(reason)));
}

function copyToClipboard(port, {site, name, id})
{
  let promise = passwords.getPassword(site, name);
  promise.then(password =>
  {
    external.setClipboard(password);
    port.emit("passwordCopied", id);
  }).catch(reason => port.emit("passwordError", String(reason)));
}

function importPasswordData(port, sites)
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
  port.emit("dataImported");
}

module.exports = function(panel)
{
  panel.port.on("showAllPasswords", function()
  {
    external.openTab(external.getURL("allpasswords/allpasswords.html"));
    panel.hide();
  });
};

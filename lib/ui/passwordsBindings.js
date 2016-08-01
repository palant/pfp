/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let passwords = require("../passwords");
let utils = require("./utils");

module.exports = function(panel)
{
  function passwordOp(func, successMessage, data)
  {
    func(data)
      .then(pwdList => panel.port.emit(successMessage, pwdList))
      .catch(e =>
      {
        if (e == "alreadyExists")
          panel.port.emit("passwordAlreadyExists");
        else
        {
          let message = String(e || "");
          if (e && e.stack)
            message += "\n" + e.stack;
          panel.port.emit("cryptoError", message);
          if (e)
            console.error(e);
        }
      });
  }

  panel.port.on("addGeneratedPassword", passwordOp.bind(null, passwords.addGenerated, "passwordAdded"));
  panel.port.on("addLegacyPassword", passwordOp.bind(null, passwords.addLegacy, "passwordAdded"));
  panel.port.on("removePassword", passwordOp.bind(null, passwords.removePassword, "passwordRemoved"));

  panel.port.on("getPasswords", function(host)
  {
    let [origSite, site, pwdList] = passwords.getPasswords(host);
    panel.port.emit("setPasswords", {origSite, site, pwdList});
  });

  panel.port.on("addAlias", function({site, alias})
  {
    utils.getCurrentHost().then(currentHost =>
    {
      passwords.addAlias(site, alias);
      let [origSite, newSite, pwdList] = passwords.getPasswords(currentHost);
      panel.port.emit("setPasswords", {origSite, site: newSite, pwdList});
    });
  });

  panel.port.on("removeAlias", function(site)
  {
    utils.getCurrentHost().then(currentHost =>
    {
      passwords.removeAlias(site);
      let [origSite, newSite, pwdList] = passwords.getPasswords(currentHost);
      panel.port.emit("setPasswords", {origSite, site: newSite, pwdList});
    });
  });
};

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let passwords = require("../passwords");
let {getPasswords, addAlias, removeAlias} = passwords;
let {getCurrentHost} = require("./utils");

module.exports = function(panel)
{
  function passwordOp(func, successMessage, data)
  {
    func(data)
      .then(passwords => panel.port.emit(successMessage, passwords))
      .catch(e =>
      {
        if (e == "alreadyExists")
          panel.port.emit("passwordAlreadyExists");
        else if (e)
          console.error(e);
      });
  }

  panel.port.on("addGeneratedPassword", passwordOp.bind(null, passwords.addGenerated, "passwordAdded"));
  panel.port.on("addLegacyPassword", passwordOp.bind(null, passwords.addLegacy, "passwordAdded"));
  panel.port.on("removePassword", passwordOp.bind(null, passwords.removePassword, "passwordRemoved"));

  panel.port.on("getPasswords", function(host)
  {
    let [origSite, site, passwords] = getPasswords(host);
    panel.port.emit("setPasswords", {origSite, site, passwords});
  });

  panel.port.on("addAlias", function({site, alias})
  {
    addAlias(site, alias);
    let [origSite, newSite, passwords] = getPasswords(getCurrentHost());
    panel.port.emit("setPasswords", {origSite, site: newSite, passwords});
  });

  panel.port.on("removeAlias", function(site)
  {
    removeAlias(site);
    let [origSite, newSite, passwords] = getPasswords(getCurrentHost());
    panel.port.emit("setPasswords", {origSite, site: newSite, passwords});
  });
};

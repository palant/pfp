/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let masterPassword = require("../masterPassword");
let passwords = require("../passwords");
let utils = require("./utils");

module.exports = function(panel)
{
  function masterPasswordOp(func, successMessage, data)
  {
    func(data)
      .then(() =>
      {
        let [origSite, site, pwdList] = passwords.getPasswords(utils.getCurrentHost());
        panel.port.emit(successMessage, {origSite, site, pwdList});
      })
      .catch(e =>
      {
        if (e == "declined")
          panel.port.emit("masterPasswordDeclined");
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

  panel.on("show", masterPassword.suspendAutoLock);
  panel.on("hide", masterPassword.resumeAutoLock);
  panel.port.on("changeMasterPassword", masterPasswordOp.bind(null, masterPassword.changePassword, "masterPasswordAccepted"));
  panel.port.on("checkMasterPassword", masterPasswordOp.bind(null, masterPassword.checkPassword, "masterPasswordAccepted"));
  panel.port.on("forgetMasterPassword", masterPasswordOp.bind(null, masterPassword.forgetPassword, "masterPasswordForgotten"));

  masterPassword.on("forgotten", () => panel.port.emit("masterPasswordForgotten"));
};

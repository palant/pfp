/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {i18n} = require("../browserAPI");
let {masterPassword, passwords} = require("../proxy");
let {setCommandHandler, setSubmitHandler} = require("./events");
let {setValidator, markInvalid} = require("./formValidation");
let state = require("./state");
let {$, setActivePanel, showUnknownError} = require("./utils");

let {validateMasterPassword} = require("./changeMaster");

setCommandHandler("reset-master-link", () => setActivePanel("change-master"));
setCommandHandler("generate-password-link", () => setActivePanel("generate-password"));
setCommandHandler("stored-password-link", () => setActivePanel("stored-password"));

setValidator("master-password", validateMasterPassword);
setSubmitHandler("enter-master", () =>
{
  masterPassword.checkPassword($("master-password").value.trim())
    .then(() => passwords.getPasswords(state.origSite))
    .then(([origSite, site, pwdList]) =>
    {
      state.set({origSite, site, pwdList, masterPasswordState: "known"});
    }).catch(error =>
    {
      if (error == "declined")
        markInvalid("master-password", i18n.getMessage("password_declined"));
      else if (error == "migrating")
        state.set({masterPasswordState: "migrating"});
      else
        showUnknownError(error);
    });
});

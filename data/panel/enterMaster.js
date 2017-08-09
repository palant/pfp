/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {masterPassword} = require("../proxy");
let {setCommandHandler, setSubmitHandler} = require("./events");
let {setValidator, markInvalid} = require("./formValidation");
let state = require("./state");
let {$, setActivePanel, showUnknownError, messages} = require("./utils");

let {validateMasterPassword} = require("./changeMaster");

setCommandHandler("reset-master-link", () => setActivePanel("change-master"));
setCommandHandler("generate-password-link", () => setActivePanel("generate-password"));
setCommandHandler("stored-password-link", () => setActivePanel("stored-password"));

setValidator("master-password", validateMasterPassword);
setSubmitHandler("enter-master", () =>
{
  masterPassword.checkPassword($("master-password").value.trim())
    .then(() => state.set({masterPasswordState: "known"}))
    .catch(error =>
    {
      if (error == "declined")
        markInvalid("master-password", messages["password-declined"]);
      else
        showUnknownError(error);
    });
});

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {port} = require("platform");
let {setCommandHandler, setSubmitHandler} = require("./events");
let {setValidator, markInvalid} = require("./formValidation");
let {$, setActivePanel, messages} = require("./utils");

let {validateMasterPassword} = require("./changeMaster");

setCommandHandler("reset-master-link", () => setActivePanel("change-master"));
setCommandHandler("generate-password-link", () => setActivePanel("generate-password"));
setCommandHandler("legacy-password-link", () => setActivePanel("legacy-password"));

setValidator("master-password", validateMasterPassword);
setSubmitHandler("enter-master", () => port.emit("checkMasterPassword", $("master-password").value.trim()));

port.on("masterPasswordDeclined", () => markInvalid("master-password", messages["password-declined"]));

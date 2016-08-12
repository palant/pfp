/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {port} = require("platform");
let {passwords} = require("../proxy");
let {setSubmitHandler, setResetHandler} = require("./events");
let {setValidator, markInvalid, enforceValue} = require("./formValidation");
let state = require("./state");
let {$, setActivePanel, showUnknownError, messages} = require("./utils");

$("legacy-password-name").setAttribute("placeholder", messages["password-name-hint"]);

setValidator("legacy-password-name", enforceValue.bind(null, "password-name-required"));
setValidator("legacy-password-value", enforceValue.bind(null, "password-value-required"));

setSubmitHandler("legacy-password", addLegacyPassword);
setResetHandler("legacy-password", () => setActivePanel("password-list"));

state.on("update", updateSite);
updateSite();

function updateSite()
{
  $("legacy-password-site").textContent = state.site;
}

function enforcePasswordValue(element)
{
  let value = element.value.trim();
  if (value.length < 1)
    return messages["password-value-required"];

  return null;
}

function addLegacyPassword()
{
  passwords.addLegacy({
    site: state.site,
    name: $("legacy-password-name").value,
    password: $("legacy-password-value").value
  }).then(pwdList =>
  {
    state.set({pwdList});
    setActivePanel("password-list");
  }).catch(error =>
  {
    if (error == "alreadyExists")
      markInvalid("legacy-password-name", messages["password-name-exists"]);
    else
      showUnknownError(error);
  });
}

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {passwords} = require("../proxy");
let {setSubmitHandler, setResetHandler} = require("./events");
let {setValidator, markInvalid, enforceValue} = require("./formValidation");
let state = require("./state");
let {$, setActivePanel, showUnknownError, messages} = require("./utils");

setValidator("stored-password-user-name", enforceValue.bind(null, "user-name-required"));
setValidator("stored-password-value", enforceValue.bind(null, "password-value-required"));

setSubmitHandler("stored-password", addStoredPassword);
setResetHandler("stored-password", () => setActivePanel("password-list"));

state.on("update", updateSite);
updateSite();

function updateSite()
{
  $("stored-password-site").textContent = state.site;
}

function enforcePasswordValue(element)
{
  let value = element.value.trim();
  if (value.length < 1)
    return messages["password-value-required"];

  return null;
}

function addStoredPassword()
{
  passwords.addStored({
    site: state.site,
    name: $("stored-password-user-name").value,
    password: $("stored-password-value").value
  }).then(pwdList =>
  {
    state.set({pwdList});
    setActivePanel("password-list");
  }).catch(error =>
  {
    if (error == "alreadyExists")
      markInvalid("stored-password-user-name", messages["user-name-exists"]);
    else
      showUnknownError(error);
  });
}

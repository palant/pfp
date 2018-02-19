/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {i18n} = require("../browserAPI");
let {passwords} = require("../proxy");
let {setCommandHandler, setSubmitHandler, setResetHandler} = require("./events");
let {setValidator, markInvalid, enforceValue} = require("./formValidation");
let state = require("./state");
let {$, setActivePanel, showUnknownError} = require("./utils");

setValidator("stored-password-user-name", enforceValue.bind(null, "user_name_required"));
setValidator("stored-password-value", enforceValue.bind(null, "password_value_required"));

// Dummy validator makes sure validation state is reset when necessary.
setValidator("stored-password-revision", () => null);

setCommandHandler("stored-change-password-revision", showRevision);
setCommandHandler("stored-use-recovery", showRecovery);

setSubmitHandler("stored-password", addStoredPassword);
setResetHandler("stored-password", () => setActivePanel("password-list"));

state.on("update", updateSite);
updateSite();

function updateSite()
{
  $("stored-password-site").textContent = state.site;
}

function showRevision()
{
  $("stored-change-password-revision").hidden = true;
  $("stored-password-revision-container").hidden = false;
  $("stored-password-revision").focus();
}

function showRecovery()
{
  require("./recoveryCode").show($("stored-password-value"));
}

function addStoredPassword()
{
  let revision = $("stored-password-revision").value.trim();
  if (revision == "1")
    revision = "";

  passwords.addStored({
    site: state.site,
    name: $("stored-password-user-name").value,
    revision,
    password: $("stored-password-value").value
  }).then(pwdList =>
  {
    state.set({pwdList});
    setActivePanel("password-list");
  }).catch(error =>
  {
    if (error == "alreadyExists")
      markInvalid([$("stored-password-user-name"), $("stored-password-revision")], i18n.getMessage("user_name_exists"));
    else
      showUnknownError(error);
  });
}

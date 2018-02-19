/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {i18n} = require("../browserAPI");
let {passwords, masterPassword} = require("../proxy");
let {setSubmitHandler, setResetHandler} = require("./events");
let {setValidator} = require("./formValidation");
let state = require("./state");
let {$, setActivePanel, showUnknownError} = require("./utils");

let {confirm} = require("./confirm");

let zxcvbn = require("./zxcvbn-4.4.2");

setValidator("new-master", validateMasterPassword);
setValidator("new-master-repeat", validateMasterPasswordRepeat);
$("new-master").addEventListener("input", checkPasswordScore);

setSubmitHandler("change-master", changeMasterPassword);
setResetHandler("change-master", () => setActivePanel("enter-master"));

state.on("update", updateMasterPasswordState);
updateMasterPasswordState();

function updateMasterPasswordState()
{
  let {masterPasswordState} = state;
  $("new-master-message").hidden = masterPasswordState != "unset";
  $("reset-master-message").hidden = masterPasswordState == "unset";
  $("reset-master-cancel").hidden = masterPasswordState == "unset";
}

function validateMasterPassword(element)
{
  let value = element.value.trim();
  if (value.length < 6)
    return i18n.getMessage("password_too_short");

  return null;
}
exports.validateMasterPassword = validateMasterPassword;

function validateMasterPasswordRepeat(element)
{
  let value = element.value.trim();
  if (value != $("new-master").value.trim())
    return i18n.getMessage("passwords_differ");

  return null;
}

function checkPasswordScore()
{
  let score = zxcvbn($("new-master").value.trim()).score;
  $("password-score").setAttribute("data-score", score);
  return score;
}

function changeMasterPassword()
{
  let newPassword = $("new-master").value.trim();
  let score = checkPasswordScore();
  let ask = score < 3 ? confirm(i18n.getMessage("weak_password")) : Promise.resolve(true);
  ask.then(accepted =>
  {
    if (accepted)
    {
      masterPassword.changePassword(newPassword)
        .then(() => passwords.getPasswords(state.origSite))
        .then(([origSite, site, pwdList]) =>
        {
          state.set({origSite, site, pwdList, masterPasswordState: "known"});
        })
        .catch(showUnknownError);
    }
  });
}

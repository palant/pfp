/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {
  $, onShow, setValidator, setActivePanel, setSubmitHandler,
  setResetHandler, messages
} = require("./utils");

let {confirm} = require("./confirm");

let zxcvbn = require("zxcvbn");

setValidator("new-master", validateMasterPassword);
setValidator("new-master-repeat", validateMasterPasswordRepeat);
$("new-master").addEventListener("input", checkPasswordScore);

setSubmitHandler("change-master", changeMasterPassword);
setResetHandler("change-master", () => setActivePanel("enter-master"));

onShow(function({masterPasswordState})
{
  $("new-master-message").hidden = masterPasswordState != "unset";
  $("reset-master-message").hidden = masterPasswordState == "unset";
  $("reset-master-cancel").hidden = masterPasswordState == "unset";
});

function validateMasterPassword(element)
{
  let value = element.value.trim();
  if (value.length < 6)
    return messages["password-too-short"];

  return null;
}
exports.validateMasterPassword = validateMasterPassword;

function validateMasterPasswordRepeat(element)
{
  let value = element.value.trim();
  if (value != $("new-master").value.trim())
    return messages["passwords-differ"];

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
  let masterPassword = $("new-master").value.trim();
  let score = checkPasswordScore();
  let ask = score < 3 ? confirm(messages["weak-password"]) : Promise.resolve(true);
  ask.then(accepted =>
  {
    if (accepted)
      self.port.emit("changeMasterPassword", masterPassword);
  });
}

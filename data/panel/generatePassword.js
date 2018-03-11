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
let {$, setActivePanel, setSiteName, showUnknownError} = require("./utils");

$("password-length").addEventListener("input", updatePasswordLengthDisplay);
$("generate-password").addEventListener("reset", () =>
{
  setTimeout(updatePasswordLengthDisplay, 0);
});
$("generate-legacy").addEventListener("click", () =>
{
  $("generate-legacy-warning").hidden = !$("generate-legacy").checked;
});
updatePasswordLengthDisplay();

setValidator("generate-password-user-name", enforceValue.bind(null, "user_name_required"));
setValidator(["charset-lower", "charset-upper", "charset-number", "charset-symbol"], validateCharsets);

// Dummy validator makes sure validation state is reset when necessary.
setValidator("generate-password-revision", () => null);

setCommandHandler("generate-change-password-revision", showRevision);

setSubmitHandler("generate-password", addGeneratedPassword);
setResetHandler("generate-password", () => setActivePanel("password-list"));

state.on("update", updateSite);
updateSite();

function updateSite()
{
  setSiteName("generate-password-site");
}

function updatePasswordLengthDisplay()
{
  $("password-length-value").textContent = $("password-length").value;
}

function validateCharsets(element1, element2, element3, element4)
{
  if (!element1.checked && !element2.checked && !element3.checked && !element4.checked)
    return i18n.getMessage("no_characters_selected");

  return null;
}

function showRevision()
{
  $("generate-change-password-revision").hidden = true;
  $("generate-password-revision-container").hidden = false;
  $("generate-password-revision").focus();
}
exports.showRevision = showRevision;

function addGeneratedPassword()
{
  let revision = $("generate-password-revision").value.trim();
  if (revision == "1")
    revision = "";

  passwords.addGenerated({
    site: state.site,
    name: $("generate-password-user-name").value,
    revision,
    length: $("password-length").value,
    lower: $("charset-lower").checked,
    upper: $("charset-upper").checked,
    number: $("charset-number").checked,
    symbol: $("charset-symbol").checked,
    legacy: $("generate-legacy").checked
  }, $("generate-password-user-name").hasAttribute("readonly")).then(pwdList =>
  {
    state.set({pwdList});
    setActivePanel("password-list");
  }).catch(error =>
  {
    if (error == "alreadyExists")
    {
      markInvalid([$("generate-password-user-name"), $("generate-password-revision")], i18n.getMessage("user_name_exists_generated"));
      showRevision();
    }
    else
      showUnknownError(error);
  });
}

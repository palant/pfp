/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {prefs, passwords, passwordRetrieval} = require("../proxy");
let {setCommandHandler, setSubmitHandler, setResetHandler} = require("./events");
let {setValidator, markInvalid, enforceValue} = require("./formValidation");
let state = require("./state");
let {$, setActivePanel, showUnknownError, showSuccessMessage, messages} = require("./utils");

$("password-length").addEventListener("input", updatePasswordLengthDisplay);
$("generate-password").addEventListener("reset", () =>
{
  setTimeout(updatePasswordLengthDisplay, 0);
});
updatePasswordLengthDisplay();

setValidator("generate-password-user-name", enforceValue.bind(null, "user-name-required"));
setValidator(["charset-lower", "charset-upper", "charset-number", "charset-symbol"], validateCharsets);

// Dummy validator makes sure validation state is reset when necessary.
setValidator("password-revision", () => null);

setCommandHandler("change-password-revision", showRevision);

setSubmitHandler("generate-password", addGeneratedPassword);
setResetHandler("generate-password", () => setActivePanel("password-list"));

state.on("update", updateSite);
updateSite();

function updateSite()
{
  $("generate-password-site").textContent = state.site;
  $("generate-password-site").setAttribute("value", state.site);
}

function updatePasswordLengthDisplay()
{
  $("password-length-value").textContent = $("password-length").value;
}

function validateCharsets(element1, element2, element3, element4)
{
  if (!element1.checked && !element2.checked && !element3.checked && !element4.checked)
    return messages["no-characters-selected"];

  return null;
}

function showRevision()
{
  $("change-password-revision").hidden = true;
  $("password-revision-container").hidden = false;
  $("password-revision").focus();
}
exports.showRevision = showRevision;

function addGeneratedPassword()
{
  let revision = $("password-revision").value.trim();
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
    symbol: $("charset-symbol").checked
  }).then(pwdList =>
  {
    state.set({pwdList});
    prefs.get("site_storage").then(site_storage =>
    {
      if (site_storage)
        setActivePanel("password-list");
      else
        passwordRetrieval.copyToClipboard(state.site, pwdList[0].name, revision)
        .then(() => showSuccessMessage(messages["password-copied-message"]))
        .catch(showUnknownError);
    });
  }).catch(error =>
  {
    if (error == "alreadyExists")
    {
      markInvalid([$("generate-password-user-name"), $("password-revision")], messages["user-name-exists-generated"]);
      showRevision();
    }
    else
      showUnknownError(error);
  });
}

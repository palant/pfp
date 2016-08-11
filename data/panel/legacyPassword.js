/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {
  $, onShow, setValidator, setActivePanel, setSubmitHandler,
  setResetHandler, markInvalid, enforceValue, messages
} = require("./utils");

$("legacy-password-name").setAttribute("placeholder", messages["password-name-hint"]);

self.port.on("passwordAdded", () => setActivePanel("password-list"));
self.port.on("passwordAlreadyExists", () => markInvalid("legacy-password-name", messages["password-name-exists"]));

setValidator("legacy-password-name", enforceValue.bind(null, "password-name-required"));
setValidator("legacy-password-value", enforceValue.bind(null, "password-value-required"));

setSubmitHandler("legacy-password", addLegacyPassword);
setResetHandler("legacy-password", () => setActivePanel("password-list"));

onShow(function({site})
{
  $("legacy-password-site").textContent = site;
});

function enforcePasswordValue(element)
{
  let value = element.value.trim();
  if (value.length < 1)
    return messages["password-value-required"];

  return null;
}

function addLegacyPassword()
{
  self.port.emit("addLegacyPassword", {
    site: $("site").value,
    name: $("legacy-password-name").value,
    password: $("legacy-password-value").value
  });
}

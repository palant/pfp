"use strict";

onInit(function()
{
  self.port.on("passwordAdded", () => setActivePanel("password-list"));
  self.port.on("passwordAlreadyExists", () => validateElement("legacy-password-name", messages["password-name-exists"]));

  setSubmitHandler("legacy-password", addLegacyPassword);
  setResetHandler("legacy-password", () => setActivePanel("password-list"));

  setValidator("legacy-password-name", enforceValue.bind(null, "password-name-required"));
  setValidator("legacy-password-value", enforceValue.bind(null, "password-value-required"));
});

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

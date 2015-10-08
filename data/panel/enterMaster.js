"use strict";

onInit(function()
{
  setSubmitHandler("enter-master", () => self.port.emit("checkMasterPassword", $("master-password").value.trim()));
  setCommandHandler("reset-master-link", () => setActivePanel("change-master"));
  setCommandHandler("generate-password-link", () => setActivePanel("generate-password"));
  setCommandHandler("legacy-password-link", () => setActivePanel("legacy-password"));

  setValidator("master-password", validateMasterPassword);

  self.port.on("masterPasswordDeclined", () => validateElement("master-password", messages["password-declined"]));
});

"use strict";

onInit(function()
{
  setSubmitHandler("change-master", () => self.port.emit("changeMasterPassword", $("new-master").value.trim()));
  setResetHandler("change-master", () => setActivePanel("enter-master"));

  setValidator("new-master", validateMasterPassword);
  setValidator("new-master-repeat", validateMasterPasswordRepeat);
});

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

function validateMasterPasswordRepeat(element)
{
  let value = element.value.trim();
  if (value != $("new-master").value.trim())
    return messages["passwords-differ"];

  return null;
}

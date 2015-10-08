"use strict";

let promiseAccept = null;
let originalSelection = null;

onInit(function()
{
  setSubmitHandler("confirm", () => {
    if (promiseAccept)
      promiseAccept(true);
    promiseAccept = null;

    if (originalSelection)
      setActivePanel(originalSelection);
  });

  setResetHandler("confirm", () => {
    if (promiseAccept)
      promiseAccept(false);
    promiseAccept = null;

    if (originalSelection)
      setActivePanel(originalSelection);
  });
});

function confirm(message)
{
  $("confirm-message").textContent = message;

  originalSelection = getActivePanel();
  setActivePanel("confirm");

  return new Promise((accept, reject) => {
    promiseAccept = accept;
  });
}

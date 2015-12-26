/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

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

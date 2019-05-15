/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {i18n} from "../browserAPI";
import {$, showError} from "./utils";
import {show as showModal, hide as hideModal, active as activeModal} from "./modal";
import {setErrorHandler, masterPassword} from "../proxy";

let currentAction = null;
let previousModal = null;

export function enterMaster(warning, noValidate)
{
  let warningElement = $("master-password-warning");
  warningElement.hidden = !warning;
  if (warning)
    warningElement.textContent = i18n.getMessage(warning);

  return new Promise((resolve, reject) =>
  {
    currentAction = {resolve, reject, noValidate};
    previousModal = activeModal();
    showModal("enter-master");
    $("master-password").focus();
  });
}

window.addEventListener("DOMContentLoaded", function()
{
  let form = $("enter-master");

  form.addEventListener("submit", event =>
  {
    event.preventDefault();

    let value = $("master-password").value.trim();
    if (value.length < 6)
    {
      showError("password_too_short");
      return;
    }

    if (currentAction.noValidate)
    {
      currentAction.resolve(value);
      return;
    }

    masterPassword.checkPassword(value).then(() =>
    {
      if (previousModal)
        showModal(previousModal);
      else
        hideModal();
      previousModal = null;

      currentAction.resolve(value);
      currentAction = null;
      form.reset();
    }).catch(error =>
    {
      showError(error == "declined" ? "password_declined" : error);
    });
  });

  form.addEventListener("reset", event =>
  {
    if (!currentAction)
      return;

    hideModal();
    currentAction.reject("canceled");
    currentAction = null;

    setTimeout(() => form.reset(), 0);
  });

  form.addEventListener("keydown", event =>
  {
    if (event.key == "Escape")
      form.reset();
  });
});

setErrorHandler("master_password_required", () => enterMaster());

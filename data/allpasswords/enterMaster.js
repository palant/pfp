/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {$, showError} = require("./utils");
let modal = require("./modal");
let proxy = require("../proxy");
let {masterPassword} = proxy;

let currentAction = null;
let previousModal = null;

function enterMaster()
{
  return new Promise((resolve, reject) =>
  {
    currentAction = {resolve, reject};
    previousModal = modal.active();
    modal.show("enter-master");
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
      showError("password-too-short");
      return;
    }

    masterPassword.checkPassword(value).then(() =>
    {
      if (previousModal)
        modal.show(previousModal);
      else
        modal.hide();
      previousModal = null;

      currentAction.resolve();
      currentAction = null;
      form.reset();
    }).catch(error =>
    {
      showError(error == "declined" ? "password-declined" : error);
    });
  });

  form.addEventListener("reset", event =>
  {
    if (!currentAction)
      return;

    modal.hide();
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

proxy.setErrorHandler("master-password-required", enterMaster);

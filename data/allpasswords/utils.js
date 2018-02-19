/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {i18n} = require("../browserAPI");

function $(id)
{
  return document.getElementById(id);
}
exports.$ = $;

function setCommandHandler(element, handler)
{
  if (typeof element == "string")
    element = $(element);
  let wrapper = (event) =>
  {
    event.preventDefault();
    handler.call(element, event);
  };
  element.addEventListener("click", wrapper);
}
exports.setCommandHandler = setCommandHandler;

function showError(error)
{
  if (error == "canceled")
    return;

  try
  {
    alert(i18n.getMessage(String(error).replace(/-/g, "_")) || error);
  }
  catch (e)
  {
    // Edge will throw for unknown messages
    alert(error);
  }
}
exports.showError = showError;

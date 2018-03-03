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

function localize(error)
{
  if (/\s/.test(error))
    return error;

  try
  {
    return i18n.getMessage(error) || error;
  }
  catch (e)
  {
    // Edge will throw for unknown messages
    return error;
  }
}

function showError(error)
{
  if (error == "canceled")
    return;

  alert(localize(error));
}
exports.showError = showError;

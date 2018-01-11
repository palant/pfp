/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

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

  let message = $(error);
  if (message && message.parentNode.id == "messages")
    message = message.textContent;
  else
    message = error;
  alert(message);
}
exports.showError = showError;

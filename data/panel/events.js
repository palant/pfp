/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {$} = require("./utils");

exports.disableResetHandlers = false;

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

function setSubmitHandler(element, handler)
{
  if (typeof element == "string")
    element = $(element);
  let wrapper = event =>
  {
    if (event.defaultPrevented)
      return;

    event.preventDefault();
    handler.call(element, event);
  };
  element.addEventListener("submit", wrapper);
}
exports.setSubmitHandler = setSubmitHandler;

function setResetHandler(element, handler)
{
  if (typeof element == "string")
    element = $(element);
  let wrapper = (event) =>
  {
    if (exports.disableResetHandlers)
      return;

    handler.call(element, event);
  };
  element.addEventListener("reset", wrapper);
}
exports.setResetHandler = setResetHandler;

document.addEventListener("keydown", event =>
{
  // This currently doesn't work in Firefox: https://bugzil.la/1443758
  if (event.key == "Escape")
  {
    let activePanel = require("./utils").getActivePanel();
    if (activePanel)
    {
      let button = $(activePanel).querySelector("button[type='reset']");
      if (button)
      {
        button.click();
        event.preventDefault();
      }
    }
  }
});

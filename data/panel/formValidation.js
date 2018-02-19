/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {i18n} = require("../browserAPI");
let {$} = require("./utils");

function setValidator(id, validator)
{
  let elements;
  if (typeof id == "string")
    elements = [$(id)];
  else
    elements = id.map($);

  let eagerValidation = false;
  let handler = event =>
  {
    if (event.type == "reset")
    {
      eagerValidation = false;
      for (let element of elements)
        element.setCustomValidity("");
    }
    else if (event.type == "submit")
    {
      eagerValidation = !validateElement(elements, validator);
      if (eagerValidation)
      {
        event.preventDefault();

        if (!document.activeElement || !document.activeElement.validationMessage)
          elements[0].focus();
      }
    }
    else if ((event.type == "input" || event.type == "change") && eagerValidation)
      validateElement(elements, validator);
  };

  for (let element of elements)
  {
    element.form.addEventListener("submit", handler, true);
    element.form.addEventListener("reset", handler);
    element.addEventListener("input", handler);
    element.addEventListener("change", handler);
  }
}
exports.setValidator = setValidator;

function validateElement(elements, validator)
{
  if (typeof elements == "string")
    elements = [$(elements)];
  else if (!(elements instanceof Array))
    elements = [elements];

  let result = validator(...elements);
  for (let element of elements)
  {
    element.setCustomValidity(result || "");
    updateForm(element.form);
  }
  return !result;
}

function markInvalid(elements, message)
{
  if (typeof elements == "string")
    elements = [$(elements)];
  else if (!(elements instanceof Array))
    elements = [elements];

  // Clear message after a change
  let handler = event =>
  {
    for (let element of elements)
    {
      element.removeEventListener("input", handler);
      element.removeEventListener("change", handler);

      if (element.validationMessage == message)
      {
        element.setCustomValidity("");
        updateForm(element.form);
      }
    }
  };

  for (let element of elements)
  {
    element.setCustomValidity(message);
    updateForm(element.form);

    element.addEventListener("input", handler);
    element.addEventListener("change", handler);
  }

  if (!document.activeElement || !document.activeElement.validationMessage)
    elements[0].focus();
}
exports.markInvalid = markInvalid;

function updateForm(form)
{
  let valid = true;
  for (let i = 0; i < form.length; i++)
  {
    let messageElement;
    if (form[i].dataset.error)
      messageElement = $(form[i].dataset.error);
    else
      messageElement = form[i].nextElementSibling;
    if (messageElement && messageElement.classList.contains("error"))
    {
      messageElement.textContent = form[i].validationMessage;
      messageElement.hidden = form[i].validity.valid;
    }
    if (!form[i].validity.valid)
      valid = false;
  }
  form._isValid = valid;
}
exports.updateForm = updateForm;

function enforceValue(messageId, element)
{
  let value = element.value.trim();
  if (value.length < 1)
    return i18n.getMessage(messageId);

  return null;
}
exports.enforceValue = enforceValue;

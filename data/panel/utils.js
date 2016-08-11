/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let disableResetHandlers = false;

let messages = exports.messages = {};
let messageElements = $("messages").children;
for (let i = 0; i < messageElements.length; i++)
{
  let messageElement = messageElements[i];
  messages[messageElement.getAttribute("data-l10n-id")] = messageElement.textContent;
}

let showHandlers = [];

function $(id)
{
  return document.getElementById(id);
}
exports.$ = $;

function onShow(callback)
{
  showHandlers.push(callback);
}
exports.onShow = onShow;

function show(message)
{
  let {masterPasswordState} = message;
  let stateToPanel = {
    "unset": "change-master",
    "set": "enter-master",
    "known": "password-list"
  };
  setActivePanel(stateToPanel[masterPasswordState]);

  setFocus();

  // Run panel initializers
  for (let handler of showHandlers)
    handler.call(null, message);
}
exports.show = show;

function hide()
{
  setActivePanel(null);

  // Make sure we don't have any sensitive data stuck in the forms
  resetForms();
}

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

function markInvalid(element, message)
{
  if (typeof element == "string")
    element = $(element);

  element.setCustomValidity(message);
  if (!document.activeElement || !document.activeElement.validationMessage)
    element.focus();
  updateForm(element.form);

  // Clear message after a change
  let handler = event =>
  {
    element.removeEventListener("input", handler);
    element.removeEventListener("change", handler);

    if (element.validationMessage == message)
    {
      element.setCustomValidity("");
      updateForm(element.form);
    }
  };
  element.addEventListener("input", handler);
  element.addEventListener("change", handler);
}
exports.markInvalid = markInvalid;

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
    if (disableResetHandlers)
      return;

    handler.call(element, event);
  };
  element.addEventListener("reset", wrapper);
}
exports.setResetHandler = setResetHandler;

function setFocus()
{
  let activePanel = getActivePanel();
  if (!activePanel)
    return;

  let defaultElement = $(activePanel).getAttribute("data-default-element");
  if (defaultElement)
    $(defaultElement).focus();
}

function resetForm(form)
{
  disableResetHandlers = true;
  try
  {
    form.reset();
    let custom = form.dataset.customReset;
    if (custom)
    {
      let match = /^([^\.]+)\.([^=]+)=(.*)/.exec(custom);
      if (match)
        $(match[1]).setAttribute(match[2], match[3]);
    }
    updateForm(form);
  }
  finally
  {
    disableResetHandlers = false;
  }
}

function resetForms()
{
  let forms = document.forms;
  for (let i = 0; i < forms.length; i++)
    resetForm(forms[i]);
}

function resize()
{
  // Force reflow
  document.body.offsetHeight;

  self.port.emit("resize", [
    document.documentElement.scrollWidth,
    Math.min(document.documentElement.offsetHeight, document.documentElement.scrollHeight)
  ]);
}
new window.MutationObserver(resize).observe(document.documentElement, {
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true
});

function getActivePanel()
{
  let selection = document.querySelector("[data-active='true']");
  return selection ? selection.id : null;
}
exports.getActivePanel = getActivePanel;

function setActivePanel(id)
{
  let oldSelection = getActivePanel();
  if (oldSelection == id)
    return;

  if (oldSelection)
    $(oldSelection).removeAttribute("data-active");

  if (id)
  {
    let form = $(id);
    resetForm(form);
    form.setAttribute("data-active", "true");
    $("crypto-error").hidden = true;

    setFocus();
  }
}
exports.setActivePanel = setActivePanel;

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

function enforceValue(messageId, element)
{
  let value = element.value.trim();
  if (value.length < 1)
    return messages[messageId];

  return null;
}
exports.enforceValue = enforceValue;

function showCryptoError(e)
{
  $("crypto-error-details").textContent = e;
  $("crypto-error").hidden = false;
  $("crypto-error-more").hidden = false;
  $("crypto-error-details").hidden = true;
}

setCommandHandler("crypto-error-more", () =>
{
  $("crypto-error-more").hidden = true;
  $("crypto-error-details").hidden = false;
});

self.port.on("show", show);
self.port.on("hide", hide);
self.port.on("cryptoError", showCryptoError);

"use strict";

let disableResetHandlers = false;

let messages = {};
let initHandlers = [];
let showHandlers = [];

function $(id)
{
  return document.getElementById(id);
}

function onInit(callback)
{
  initHandlers.push(callback);
}

function onShow(callback)
{
  showHandlers.push(callback);
}

function init()
{
  window.removeEventListener("load", init, false);

  for (let messageElement of $("messages").children)
    messages[messageElement.getAttribute("data-l10n-id")] = messageElement.textContent;

  self.port.on("masterPasswordAccepted", () => setActivePanel("password-list"));
  self.port.on("masterPasswordForgotten", () => setActivePanel("enter-master"));

  // Run panel initializers
  for (let handler of initHandlers)
    handler.call(null);
}
window.addEventListener("load", init);

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

  let handler = () => validateElement(elements, validator);
  for (let element of elements)
  {
    element.addEventListener("blur", handler);
    element.addEventListener("change", handler);
    element.addEventListener("input", () => element.validity.customError && handler());

    if (!element.form._validators)
      element.form._validators = [];

    if (element.form._validators.indexOf(handler) < 0)
      element.form._validators.push(handler);
  }
}

function validateElement(elements, validator)
{
  if (typeof elements == "string")
    elements = [$(elements)];
  else if (!(elements instanceof Array))
    elements = [elements];

  let result = typeof validator == "string" ? validator : validator.apply(null, elements);
  for (let element of elements)
  {
    element.setCustomValidity(result || "");
    updateForm(element.form);
  }
}

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

function setSubmitHandler(element, handler)
{
  if (typeof element == "string")
    element = $(element);
  let wrapper = (event) =>
  {
    event.preventDefault();

    if (element._validators)
    {
      element._validators.forEach(v => v());
      if (!element._isValid)
        return;
    }

    handler.call(element, event);
  };
  element.addEventListener("submit", wrapper);
}

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
    for (let i = 0; i < form.length; i++)
      form[i].setCustomValidity("");
    updateForm(form);
  }
  finally
  {
    disableResetHandlers = false;
  }
}

function resetForms()
{
  for (let form of document.forms)
    resetForm(form);
}

function resize()
{
  // Force reflow
  document.body.offsetHeight;

  self.port.emit("resize", [
    document.documentElement.scrollWidth + 2,
    Math.min(document.documentElement.offsetHeight, document.documentElement.scrollHeight) + 2
  ]);
}

function getActivePanel()
{
  let selection = document.querySelector("[data-active='true']");
  return selection ? selection.id : null;
}

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

    resize();
    setFocus();
  }
}

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
  resize();
}

function enforceValue(messageId, element)
{
  let value = element.value.trim();
  if (value.length < 1)
    return messages[messageId];

  return null;
}

self.port.on("show", show);
self.port.on("hide", hide);

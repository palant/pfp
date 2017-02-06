/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {port} = require("platform");
let {prefs} = require("../proxy");

let messages = exports.messages = {};
let messageElements = $("messages").children;
for (let i = 0; i < messageElements.length; i++)
{
  let messageElement = messageElements[i];
  messages[messageElement.getAttribute("data-l10n-id")] = messageElement.textContent;
}

function $(id)
{
  return document.getElementById(id);
}
exports.$ = $;

function hide()
{
  setActivePanel(null);

  // Make sure we don't have any sensitive data stuck in the forms
  resetForms();
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

function _processFormCustomRules(custom, toggle = false)
{
  for (let statement of custom.split(/\s*,\s*/))
  {
    let match = /^([^\.]+)\.([^=]+)(?:=(.*))?/.exec(statement);
    if (match && match[3])
      if (toggle)
        $(match[1]).removeAttribute(match[2]);
      else
        $(match[1]).setAttribute(match[2], match[3]);
    else if (match)
      if (toggle)
        $(match[1]).setAttribute(match[2], match[2]);
      else
        $(match[1]).removeAttribute(match[2]);
  }
}

function resetForm(form)
{
  prefs.get("site_storage").then(site_storage =>
  {
    require("./events").disableResetHandlers = true;
    try
    {
      form.reset();
      let custom = form.dataset.customReset;
      if (custom)
        _processFormCustomRules(custom);
      let toggle = form.dataset.toggleSiteStorage;
      if (toggle)
        _processFormCustomRules(toggle, !site_storage);
      require("./formValidation").updateForm(form);
    }
    finally
    {
      require("./events").disableResetHandlers = false;
    }
  });
}

function resetForms()
{
  let forms = document.forms;
  for (let i = 0; i < forms.length; i++)
    resetForm(forms[i]);
}

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
    $("unknown-error").hidden = true;
    $("success-message").hidden = true;

    setFocus();
  }
}
exports.setActivePanel = setActivePanel;

function showSuccessMessage(msg)
{
  $("success-message").textContent = msg;
  $("success-message").hidden = false;
}
exports.showSuccessMessage = showSuccessMessage;

function showUnknownError(e)
{
  $("unknown-error-details").textContent = e;
  $("unknown-error").hidden = false;
  $("unknown-error-more").hidden = false;
  $("unknown-error-details").hidden = true;
}
exports.showUnknownError = showUnknownError;

// Avoid circular references here
Promise.resolve().then(() =>
{
  require("./events").setCommandHandler("unknown-error-more", () =>
  {
    $("unknown-error-more").hidden = true;
    $("unknown-error-details").hidden = false;
  });
});

port.on("hide", hide);

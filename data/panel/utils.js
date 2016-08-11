/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

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
  require("./events").disableResetHandlers = true;
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
    require("./formValidation").updateForm(form);
  }
  finally
  {
    require("./events").disableResetHandlers = false;
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

function showCryptoError(e)
{
  $("crypto-error-details").textContent = e;
  $("crypto-error").hidden = false;
  $("crypto-error-more").hidden = false;
  $("crypto-error-details").hidden = true;
}

// Avoid circular references here
Promise.resolve().then(() =>
{
  require("./events").setCommandHandler("crypto-error-more", () =>
  {
    $("crypto-error-more").hidden = true;
    $("crypto-error-details").hidden = false;
  });
});

self.port.on("show", show);
self.port.on("hide", hide);
self.port.on("cryptoError", showCryptoError);

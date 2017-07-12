/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global scriptID */

let {port} = require("./messaging");

port.on("fillIn", ({target, host, name, password}) =>
{
  if (target != scriptID)
    return;

  let result = null;
  if (window.location.hostname != host)
    result = "wrong-site-message";
  else if (!fillIn(window, name, password))
    result = "no-password-fields";

  port.emit("done", {
    source: scriptID,
    result
  });
  port.disconnect();
});

function getActiveElement(doc)
{
  let result = doc.activeElement;
  if (result && result.contentDocument)
    return getActiveElement(result.contentDocument);
  else
    return result;
}

function fakeInput(field, value)
{
  field.value = value;
  field.dispatchEvent(new Event("change", {bubbles: true}));
}

const userNameFieldTypes = new Set(["", "text", "email", "url"]);

function findNameField(passwordField)
{
  if (!passwordField.form)
    return null;

  let nameField = null;
  let elements = passwordField.form.elements;
  for (let i = 0; i < elements.length; i++)
  {
    let element = elements[i];
    if (element == passwordField)
      break;
    if (element instanceof HTMLInputElement && userNameFieldTypes.has(element.type))
      nameField = element;
  }
  return nameField;
}

function fillInName(passwordField, name)
{
  let nameField = findNameField(passwordField);
  if (nameField && nameField.value.trim() == "")
    fakeInput(nameField, name);
}

function fillIn(wnd, name, password, noFocus)
{
  if (wnd == wnd.top)
  {
    let field = getActiveElement(wnd.document);
    if (field instanceof HTMLInputElement && field.type == "password")
    {
      fakeInput(field, password);
      fillInName(field, name);
      return true;
    }
  }

  let fields = wnd.document.querySelectorAll("input[type=password]");
  let result = false;

  if (wnd.location.host != "accounts.google.com")
  {
    // accounts.google.com has the password field hidden while email is being
    // entered, fill in here despite being hidden.
    fields = [].filter.call(fields, element => element.offsetHeight && element.offsetWidth);
  }
  if (fields.length > 0)
  {
    result = true;
    for (let field of fields)
      fakeInput(field, password);
    if (!noFocus)
      fields[0].focus();
    fillInName(fields[0], name);
  }

  for (let i = 0; i < wnd.frames.length; i++)
  {
    try
    {
      wnd.frames[i].document;
    }
    catch (e)
    {
      // Forbidden by same-origin policy, ignore
      continue;
    }

    if (fillIn(wnd.frames[i], name, password, noFocus || fields.length > 0))
      result = true;
  }

  return result;
}

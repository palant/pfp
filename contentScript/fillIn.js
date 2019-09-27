/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global _parameters */

import {port} from "../ui/messaging";

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
  field.dispatchEvent(new KeyboardEvent("keydown", {key: "v", ctrlKey: true}));
  field.dispatchEvent(new KeyboardEvent("keypress", {key: "v", ctrlKey: true}));
  field.dispatchEvent(new KeyboardEvent("keyup", {key: "v", ctrlKey: true}));
  field.dispatchEvent(new UIEvent("input", {bubbles: true}));
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
    if (element.localName == "input" && userNameFieldTypes.has(element.type))
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

function fillInPassword(fields, name, password, noFocus)
{
  if (!fields.length)
    return false;

  for (let field of fields)
    fakeInput(field, password);

  if (!noFocus)
    fields[0].focus();
  fillInName(fields[0], name);
  return true;
}

function fillInPartialPassword(fields, name, password, noFocus)
{
  if (fields.length < 3)
    return false;

  // See #57, this appears to be a partial password request, each field
  // asks for a single password letter. Try to find a common name prefix.
  let match = /^(.*?)(\d+)$/.exec(fields[0].name);
  if (!match)
    return false;

  let prefix = match[1];
  let zeroBased = !!fields[0].ownerDocument.getElementById(prefix + "0");

  function isValidField(field)
  {
    let match = /^(.*?)(\d+)$/.exec(field.name);
    if (!match)
      return false;

    if (match[1] != prefix)
      return false;

    let index = parseInt(match[2]);
    if (!zeroBased)
      index--;
    if (index >= password.length)
      return false;

    field.__index = index;
    return true;
  }

  if (!fields.every(isValidField))
    return false;

  for (let field of fields)
    fakeInput(field, password[field.__index]);

  if (!noFocus)
    fields[0].focus();
  fillInName(fields[0], name);
  return true;
}

function fillIn(wnd, name, password, noFocus)
{
  if (wnd == wnd.top)
  {
    let field = getActiveElement(wnd.document);
    if (field.localName == "input" && field.type == "password" && field.maxLength != 1)
    {
      fakeInput(field, password);
      fillInName(field, name);
      return true;
    }
  }

  let fields = [];
  let oneCharFields = [];
  for (let field of wnd.document.querySelectorAll("input[type=password]"))
  {
    if (field.maxLength == 1)
      oneCharFields.push(field);
    else
      fields.push(field);
  }

  if (wnd.location.host != "accounts.google.com")
  {
    // accounts.google.com has the password field hidden while email is being
    // entered, fill in here despite being hidden.
    fields = fields.filter(element => element.offsetHeight && element.offsetWidth);
  }

  let result = false;
  if (fillInPassword(fields, name, password, noFocus))
    result = true;
  if (fillInPartialPassword(oneCharFields, name, password, noFocus))
    result = true;

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

  if (!result && wnd == wnd.top)
  {
    // Try finding user name
    let field = getActiveElement(wnd.document);
    if (field.localName == "input" && userNameFieldTypes.has(field.type) && field.form)
    {
      fakeInput(field, name);

      let button = field.form.querySelector("input[type=submit], button[type=submit]");
      if (button)
        button.click();
      else
        field.form.dispatchEvent(new Event("submit", {bubbles: true}));
      result = true;

      window.setTimeout(() => fillIn(wnd, name, password, noFocus), 100);
    }
  }

  return result;
}

(function({scriptID, host, name, password})
{
  let result = null;
  if (window.location.hostname != host)
    result = "wrong_site";
  else if (!fillIn(window, name, password))
    result = "no_password_fields";

  port.emit("done", {
    scriptID,
    result
  });
  port.disconnect();
})(_parameters);

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

function getActiveElement(doc)
{
  let result = doc.activeElement;
  if (result && result.contentDocument)
    return getActiveElement(result.contentDocument);
  else
    return result;
}

function fillIn(wnd)
{
  if (wnd == wnd.top)
  {
    let field = getActiveElement(wnd.document);
    if (field instanceof HTMLInputElement && field.type == "password")
    {
      field.value = password;
      return true;
    }
  }

  let fields = wnd.document.querySelectorAll("input[type=password]");
  let result = false;
  fields = Array.filter(fields, element => element.offsetHeight && element.offsetWidth);
  if (fields.length > 0)
  {
    result = true;
    for (let field of fields)
    {
      field.value = password;
      field.dispatchEvent(new Event("change", {bubbles: true}));
    }
    fields[0].focus();
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
    result = result || fillIn(wnd.frames[i]);
  }

  return result;
}

let {host, password} = self.options;
if (window.location.hostname != host)
  throw new Error("Password is meant for a different website, not filling in.");

if (fillIn(window))
  self.port.emit("success");
else
  self.port.emit("failure");

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {host, password} = self.options;
if (location.hostname != host)
  throw new Error("Password is meant for a different website, not filling in.");

let fields = document.querySelectorAll("input[type=password]");
fields = Array.filter(fields, element => element.offsetHeight && element.offsetWidth);
if (fields.length > 0)
{
  for (let field of fields)
  {
    field.value = password;
    field.dispatchEvent(new Event("change", {bubbles: true}));
  }
  fields[0].focus();
  self.port.emit("success");
}
else
  self.port.emit("failure");

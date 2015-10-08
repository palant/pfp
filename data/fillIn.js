"use strict";

let {host, password} = self.options;
if (location.hostname != host)
  throw new Error("Password is meant for a different website, not filling in.");

let fields = document.querySelectorAll("input[type=password]");
fields = Array.filter(fields, element => element.offsetHeight && element.offsetWidth);
if (fields.length > 0)
{
  for (let field of fields)
    field.value = password;
  fields[0].focus();
  self.port.emit("success");
}
else
  self.port.emit("failure");

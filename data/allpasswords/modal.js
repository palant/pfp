/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {$} = require("./utils");

function show(id)
{
  hide();

  let element = $(id);
  if (!element || element.parentNode.id != "modalOverlay")
    throw new Error("Invalid modal dialog ID");

  element.setAttribute("active", "true");
  element.parentNode.hidden = false;
}
exports.show = show;

function hide()
{
  let active = document.querySelector("#modalOverlay > [active='true']");
  if (active)
    active.removeAttribute("active");
  $("modalOverlay").hidden = true;
}
exports.hide = hide;

function active()
{
  let active = document.querySelector("#modalOverlay > [active='true']");
  return active ? active.id : null;
}
exports.active = active;

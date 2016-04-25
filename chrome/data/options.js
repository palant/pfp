/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

function $(id)
{
  return document.getElementById(id);
}

window.addEventListener("DOMContentLoaded", function()
{
  let autolock = $("autolock");
  autolock.checked = (window.localStorage.autolock !== "false");
  autolock.addEventListener("click", function()
  {
    window.localStorage.autolock = autolock.checked;
  });

  let autolock_delay = $("autolock_delay");
  let value = parseInt(window.localStorage.autolock_delay, 10);
  autolock_delay.value = isNaN(value) ? 10 : value;
  autolock_delay.addEventListener("input", function()
  {
    window.localStorage.autolock_delay = autolock_delay.value;
  });
});

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
  if ("autolock" in window.localStorage)
    autolock.checked = (window.localStorage.autolock == "true");
  else
    autolock.checked = true;
  autolock.addEventListener("click", function()
  {
    window.localStorage.autolock = autolock.checked;
  });

  let autolock_delay = $("autolock_delay");
  if ("autolock_delay" in window.localStorage)
    autolock_delay.value = parseInt(window.localStorage.autolock_delay, 10);
  else
    autolock_delay.value = 10;
  autolock_delay.addEventListener("input", function()
  {
    window.localStorage.autolock_delay = autolock_delay.value;
  });
});

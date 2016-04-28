/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

function $(id)
{
  return document.getElementById(id);
}

window.addEventListener("DOMContentLoaded", function()
{
  chrome.runtime.getBackgroundPage(background =>
  {
    let prefs = background.getPrefs();

    let autolock = $("autolock");
    autolock.checked = prefs.autolock;
    autolock.addEventListener("click", function()
    {
      prefs.autolock = autolock.checked;
    });

    let autolock_delay = $("autolock_delay");
    autolock_delay.value = prefs.autolock_delay;
    autolock_delay.addEventListener("input", function()
    {
      prefs.autolock_delay = autolock_delay.value;
    });
  });
});

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

require("platform");

let {prefs} = require("../../../data/proxy");

function $(id)
{
  return document.getElementById(id);
}

window.addEventListener("DOMContentLoaded", function()
{
  Promise.all([
    prefs.get("autolock"),
    prefs.get("autolock_delay")
  ]).then(([autolock, autolock_delay]) =>
  {
    let autolockElement = $("autolock");
    autolockElement.checked = autolock;
    autolockElement.addEventListener("click", function()
    {
      prefs.set("autolock", autolockElement.checked);
    });

    let autolockDelayElement = $("autolock_delay");
    autolockDelayElement.value = autolock_delay;
    autolockDelayElement.addEventListener("input", function()
    {
      prefs.set("autolock_delay", autolockDelayElement.value);
    });
  });
});

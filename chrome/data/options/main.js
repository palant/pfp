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
    prefs.get("site_storage"),
    prefs.get("autolock"),
    prefs.get("autolock_delay")
  ]).then(([site_storage, autolock, autolock_delay]) =>
  {
    let storageElement = $("site_storage");
    storageElement.checked = site_storage;
    storageElement.addEventListener("click", function()
    {
      prefs.set("site_storage", storageElement.checked);
    });

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

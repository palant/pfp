/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let random = null;

async function checkReload(alarm)
{
  if (alarm.name != "reloader")
    return;

  chrome.alarms.create("reloader", {
    when: Date.now() + 1000
  });

  let response = await fetch(chrome.runtime.getURL("random.json"));
  response = await response.json();

  if (random === null)
    random = response;
  else if (random != response)
    chrome.runtime.reload();
}

chrome.alarms.onAlarm.addListener(checkReload);
checkReload({name: "reloader"});

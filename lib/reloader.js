/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {storage} = (typeof browser != "undefined" ? browser : chrome);

let random = null;

async function getCurrent()
{
  if (storage.local)
    return (await storage.local.get("random")).random;
  else
    return random;
}

async function setCurrent(current)
{
  if (storage.local)
    await storage.local.set({random: current});
  else
    random = current;
}

async function checkReload(alarm)
{
  if (alarm && alarm.name != "reloader")
    return;

  chrome.alarms.create("reloader", {
    when: Date.now() + 1000
  });

  let response = await fetch(chrome.runtime.getURL("random.json"));
  response = await response.json();

  if (!alarm)
    await setCurrent(response);
  else if (await getCurrent() != response)
    chrome.runtime.reload();
}

chrome.alarms.onAlarm.addListener(checkReload);
checkReload(null);

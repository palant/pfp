/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";

const prefsPrefix = "pref:";

export async function getPref(name, defaultValue)
{
  let key = prefsPrefix + name;
  let items = await browser.storage.local.get(key);
  if (key in items)
    return items[key];
  else
    return defaultValue;
}

export async function setPref(name, value)
{
  let key = prefsPrefix + name;
  await browser.storage.local.set({[key]: value});
}

async function updateFontSize()
{
  document.documentElement.setAttribute("data-size", await getPref("font_size", "normal"));
}

export async function initFontSize()
{
  await updateFontSize();

  browser.storage.local.onChanged.addListener(changes =>
  {
    let key = prefsPrefix + "font_size";
    if (key in changes)
      updateFontSize();
  });
}

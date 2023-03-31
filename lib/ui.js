/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";
import {getPref, setPref} from "./prefs.js";

export async function getCurrentHost()
{
  let tabs = await browser.tabs.query({
    lastFocusedWindow: true,
    active: true
  });
  if (!tabs.length)
    return null;

  let url = new URL(tabs[0].url);
  if (url.protocol != "http:" && url.protocol != "https:")
    return null;

  return url.hostname || null;
}

let deprecationAccepted = false;

export async function isDeprecationAccepted()
{
  if (deprecationAccepted)
    return true;

  return await getPref("deprecationAccepted", false);
}

export async function acceptDeprecation(permanent)
{
  deprecationAccepted = true;
  if (permanent)
    await setPref("deprecationAccepted", true);
}

export async function showAllPasswords()
{
  let url = browser.runtime.getURL("ui/allpasswords/allpasswords.html");

  // Only look for existing tab in the active window, don't activate
  // background windows to avoid unexpected effects.
  let tabs = await browser.tabs.query({
    url,
    lastFocusedWindow: true
  });

  if (tabs.length)
    await browser.tabs.update(tabs[0].id, {active: true});
  else
  {
    await browser.tabs.create({
      url,
      active: true
    });
  }
}

export function getLink({type, param})
{
  if (type == "url")
    return param;
  else if (type == "relnotes")
    return `https://pfp.works/release-notes/${param}`;
  else if (type == "documentation")
    return `https://pfp.works/documentation/${param}/`;

  throw new Error("Unexpected link type");
}

export async function openLink(options)
{
  await browser.tabs.create({
    url: getLink(options),
    active: true
  });
}

export async function openAndWait(url, expectedUrl)
{
  let tab = await browser.tabs.create({url, active: true});
  let id = tab.id;
  return await new Promise((resolve, reject) =>
  {
    let updateCallback = (tabId, changeInfo, tab) =>
    {
      if (tabId == id && tab.url.startsWith(expectedUrl))
      {
        resolve(tab.url);
        browser.tabs.remove(id);
        browser.tabs.onUpdated.removeListener(updateCallback);
        browser.tabs.onRemoved.removeListener(removeCallback);
      }
    };
    let removeCallback = (tabId, removeInfo) =>
    {
      if (tabId == id)
      {
        reject("tab-closed");
        browser.tabs.onUpdated.removeListener(updateCallback);
        browser.tabs.onRemoved.removeListener(removeCallback);
      }
    };
    browser.tabs.onUpdated.addListener(updateCallback);
    browser.tabs.onRemoved.addListener(removeCallback);
  });
}
